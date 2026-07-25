import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, X, Save, Paperclip, FileCheck, Download, Filter, Edit, Loader, Trash2, Upload, AlertCircle, FileSpreadsheet, LayoutGrid, Database, Printer, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';

const formatToExcelDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`; 
};

// ==========================================
// COMPONENT: Ô NHẬP NGÀY THÁNG
// ==========================================
const CustomDateInput = ({ value, onChange, disabled, className, placeholder }) => {
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = value ? formatToExcelDate(value) : '';
  return (
    <input type={isFocused && !disabled ? "date" : "text"} value={isFocused ? (value || '') : displayValue} disabled={disabled} placeholder={placeholder || "dd-mmm-yy"} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={(e) => onChange(e.target.value)} className={className} />
  );
};

// ==========================================
// COMPONENT: Ô TEXT TỰ ĐỘNG CO GIÃN CHIỀU CAO (CẢM BIẾN PIXEL)
// ==========================================
const AutoResizeTextarea = ({ value, onChange, onBlur, className, placeholder }) => {
  const textareaRef = useRef(null);

  const resize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => { resize(); }, [value]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    
    let lastWidth = el.offsetWidth;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width !== lastWidth) {
          lastWidth = entry.contentRect.width;
          resize();
        }
      }
    });
    
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value || ''}
      onChange={(e) => { onChange(e); resize(); }}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={1}
      className={`${className} overflow-hidden resize-none block w-full leading-relaxed`}
    />
  );
};

// ==========================================
// COMPONENT: MRIR CELL
// ==========================================
const MrirCell = ({ item, handleLocalChange, saveToDatabase }) => {
  const fileInputRef = useRef(null); 
  const [isUploading, setIsUploading] = useState(false); 
  
  const mrirNo = item.mrir_no || ''; 
  const recDate = item.receiving_date || ''; 
  const fileUrl = item.mrir_file; 
  const hasFile = !!fileUrl && fileUrl.startsWith('http');
  
  const handleFileUpload = async (e) => { 
      const file = e.target.files[0]; 
      if (!file) return; 
      setIsUploading(true); 
      try { 
          const fileName = `${item.tag_no.replace(/[^a-zA-Z0-9]/g, '_')}_MRIR_${Date.now()}.${file.name.split('.').pop()}`; 
          await supabase.storage.from('equipment_files').upload(fileName, file); 
          const { data } = supabase.storage.from('equipment_files').getPublicUrl(fileName); 
          handleLocalChange(item.id, 'mrir_file', data.publicUrl); 
          saveToDatabase(item.id, 'mrir_file', data.publicUrl); 
      } catch (err) { console.error(err); } finally { setIsUploading(false); e.target.value = null; } 
  };

  const handleRemoveFile = () => { 
      if (window.confirm("Gỡ file đính kèm MRIR?")) { 
          handleLocalChange(item.id, 'mrir_file', null); 
          saveToDatabase(item.id, 'mrir_file', null); 
      } 
  };

  const handleMrirBlur = (e) => {
      const val = e.target.value;
      saveToDatabase(item.id, 'mrir_no', val);
      if (val.trim() === '') {
          handleLocalChange(item.id, 'receiving_date', null);
          saveToDatabase(item.id, 'receiving_date', null);
      }
  }

  const isDateEnabled = mrirNo.trim().length > 0;
  
  const inputStyle = isDateEnabled 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 focus:border-emerald-500 placeholder:text-emerald-300' 
      : 'bg-white text-slate-700 border-slate-300 focus:border-blue-400 hover:bg-slate-50';
  
  return (
    <div className="flex flex-col gap-1 w-full bg-white p-1 rounded border border-slate-300 shadow-sm">
      <div className="flex items-center gap-1">
        <input 
          type="text" 
          value={mrirNo} 
          placeholder="MRIR..." 
          onChange={(e) => handleLocalChange(item.id, 'mrir_no', e.target.value)} 
          onBlur={handleMrirBlur} 
          className={`flex-1 px-1.5 py-1 border rounded text-[10px] font-black uppercase outline-none text-left transition-colors min-w-0 ${inputStyle}`} 
        />
        {isUploading ? (
            <div className="p-1.5 bg-slate-50 border border-slate-200 w-[26px] h-[26px] flex items-center justify-center rounded"><Loader size={12} className="animate-spin text-blue-600"/></div>
        ) : hasFile ? (
            <div className="flex h-[26px] border border-emerald-300 rounded overflow-hidden shadow-sm">
              <button onClick={()=>window.open(fileUrl)} className="px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"><FileCheck size={12}/></button>
              <button onClick={handleRemoveFile} className="px-1 bg-white hover:bg-red-50 text-red-400 hover:text-red-500 border-l border-emerald-300 transition-colors"><X size={10} strokeWidth={3}/></button>
            </div>
        ) : (
            <button onClick={()=>fileInputRef.current.click()} className="p-1.5 border border-slate-300 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 w-[26px] h-[26px] flex items-center justify-center rounded text-slate-400 transition-colors"><Paperclip size={12}/></button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
      </div>

      <CustomDateInput 
        value={recDate} 
        placeholder="Rec Date" 
        disabled={!isDateEnabled}
        onChange={(val) => { 
          handleLocalChange(item.id, 'receiving_date', val); 
          saveToDatabase(item.id, 'receiving_date', val); 
          if(val && item.pres_required !== 'Yes') { 
              handleLocalChange(item.id, 'pres_required', 'Yes'); 
              saveToDatabase(item.id, 'pres_required', 'Yes'); 
          } 
        }} 
        className={`w-full px-1.5 py-1 border rounded text-[11px] font-bold text-left outline-none transition-colors ${isDateEnabled ? (recDate ? 'bg-white text-slate-800 border-slate-300 cursor-pointer hover:border-blue-400' : 'bg-white text-slate-500 border-slate-300 cursor-pointer hover:border-blue-400') : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'}`} 
      />
    </div>
  );
};

// ==========================================
// COMPONENT: MILESTONE CELL
// ==========================================
const MilestoneCell = ({ item, fieldPrefix, handleLocalChange, saveToDatabase }) => {
  const fileInputRef = useRef(null); 
  const [isUploading, setIsUploading] = useState(false); 
  const statusField = `${fieldPrefix}_status`; 
  const dateField = `${fieldPrefix}_date`; 
  const fileField = `${fieldPrefix}_file`; 
  
  const currentStatus = item[statusField] || 'Not yet'; 
  const currentDate = item[dateField] || ''; 
  const fileUrl = item[fileField]; 
  const hasFile = !!fileUrl && fileUrl.startsWith('http');
  
  const handleFileUpload = async (e) => { const file = e.target.files[0]; if (!file) return; setIsUploading(true); try { const fileName = `${item.tag_no.replace(/[^a-zA-Z0-9]/g, '_')}_${fieldPrefix}_${Date.now()}.${file.name.split('.').pop()}`; await supabase.storage.from('equipment_files').upload(fileName, file); const { data } = supabase.storage.from('equipment_files').getPublicUrl(fileName); handleLocalChange(item.id, fileField, data.publicUrl); saveToDatabase(item.id, fileField, data.publicUrl); } catch (err) {} finally { setIsUploading(false); e.target.value = null; } };
  const handleRemoveFile = () => { if (window.confirm("Gỡ file?")) { handleLocalChange(item.id, fileField, null); saveToDatabase(item.id, fileField, null); } };
  
  const handleStatusChange = (val) => {
      handleLocalChange(item.id, statusField, val); 
      saveToDatabase(item.id, statusField, val); 
      if (val !== 'Completed' && val !== 'N/A') { 
          handleLocalChange(item.id, dateField, null); 
          saveToDatabase(item.id, dateField, null); 
      } 
  };

  const handleDateChange = (val) => { 
      handleLocalChange(item.id, dateField, val); 
      saveToDatabase(item.id, dateField, val); 
      if (val && currentStatus !== 'Completed') { 
          handleLocalChange(item.id, statusField, 'Completed'); 
          saveToDatabase(item.id, statusField, 'Completed'); 
      } 
  };
  
  const isDateEnabled = currentStatus === 'Completed';

  const styles = { 
      'Not yet': 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50', 
      'In progress': 'bg-blue-50 text-blue-700 border-blue-300', 
      'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-300', 
      'N/A': 'bg-slate-100 text-slate-400 opacity-60 border-slate-300' 
  };
  
  return (
    <div className="flex flex-col gap-1 w-full bg-white p-1 rounded border border-slate-300 shadow-sm">
      <div className="flex items-center gap-1">
        <select value={currentStatus} onChange={(e) => handleStatusChange(e.target.value)} className={`flex-1 px-1 py-1 border rounded text-[10px] font-black uppercase outline-none cursor-pointer text-left ${styles[currentStatus] || styles['Not yet']}`}>
          <option value="Not yet">NOT YET</option><option value="In progress">IN PROG</option><option value="Completed">DONE</option><option value="N/A">N/A</option>
        </select>
        {isUploading ? <div className="p-1.5 bg-slate-50 border border-slate-200 w-[26px] h-[26px] flex items-center justify-center rounded"><Loader size={12} className="animate-spin text-blue-600"/></div> : hasFile ? <div className="flex h-[26px] border border-emerald-300 rounded overflow-hidden"><button onClick={()=>window.open(fileUrl)} className="px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"><FileCheck size={12}/></button><button onClick={handleRemoveFile} className="px-1 bg-white hover:bg-red-50 text-red-400 hover:text-red-500 border-l border-emerald-300 transition-colors"><X size={10} strokeWidth={3}/></button></div> : <button onClick={()=>fileInputRef.current.click()} className="p-1.5 border border-slate-300 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 w-[26px] h-[26px] flex items-center justify-center rounded text-slate-400 transition-colors"><Paperclip size={12}/></button>}
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
      </div>
      <CustomDateInput 
          value={currentDate} 
          onChange={handleDateChange} 
          disabled={!isDateEnabled} 
          className={`w-full px-1.5 py-1 border rounded text-[11px] font-bold text-left outline-none transition-colors ${isDateEnabled ? (currentDate ? 'bg-white text-slate-800 border-slate-300 cursor-pointer hover:border-blue-400' : 'bg-white text-slate-500 border-slate-300 cursor-pointer hover:border-blue-400') : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'}`} 
      />
    </div>
  );
};

// ==========================================
// TRANG CHÍNH: MATRIX
// ==========================================
export default function Matrix() {
  const [equipList, setEquipList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeck, setFilterDeck] = useState('All');
  const [statusFilters, setStatusFilters] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [colWidths, setColWidths] = useState({
    tag: 160, pkg: 105, desc: 220, deck: 130, mrir: 140, install: 125, welding: 125, bolting: 125, dim: 125, leveling: 125, align: 125, overall: 110, notes: 180
  });
  const importFileRef = useRef(null);
  const [formData, setFormData] = useState({ tag_no: '', description: '', package: '', deck_level: '', mrir_no: '', receiving_date: '', installation_date: '', notes: '' });

  async function fetchData() {
    const { data: listData } = await supabase.from('master_equipment').select('*').order('tag_no', { ascending: true });
    if (listData) setEquipList(listData);
  }
  useEffect(() => { fetchData(); }, []);

  const isReceived = (item) => !!item.receiving_date || !!item.mrir_no;
  const isInstalled = (item) => item.installation_status === 'Completed' || item.installation_status === 'N/A' || !!item.installation_date;
  const isCompleted = (item) => {
    if (!isInstalled(item)) return false;
    const isDone = (s, d) => s === 'Completed' || s === 'N/A' || d;
    return isDone(item.welding_status, item.welding_date) && isDone(item.bolting_status, item.bolting_date) && isDone(item.dim_status, item.dim_date) && isDone(item.leveling_status, item.leveling_date) && isDone(item.align_status, item.align_date);
  };

  const calculateRowStatus = (item) => {
    if (isCompleted(item)) return { label: 'COMPLETED', style: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black' };
    if (isInstalled(item)) return { label: 'INSTALLED', style: 'bg-blue-50 text-blue-700 border-blue-200 font-black' };
    if (isReceived(item)) return { label: 'RECEIVED', style: 'bg-sky-50 text-sky-700 border-sky-200 font-black' };
    return { label: 'NOT DELIVERED', style: 'bg-slate-50 text-slate-500 border-slate-200 font-bold' };
  };

  const uniqueDecks = ['All', ...new Set(equipList.map(item => item.deck_level).filter(Boolean))];
  
  const duplicateTags = useMemo(() => {
    const tagCounts = equipList.reduce((acc, item) => {
      const tag = item.tag_no?.trim().toUpperCase();
      if (tag) acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});
    return new Set(Object.keys(tagCounts).filter(tag => tagCounts[tag] > 1));
  }, [equipList]);

  const filteredList = equipList.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = (item.tag_no?.toLowerCase().includes(searchLower)) || (item.description?.toLowerCase().includes(searchLower)) || (item.package?.toLowerCase().includes(searchLower)) || (item.deck_level?.toLowerCase().includes(searchLower)) || (item.mrir_no?.toLowerCase().includes(searchLower)) || (item.notes?.toLowerCase().includes(searchLower));
    const matchDeck = filterDeck === 'All' || item.deck_level === filterDeck;
    
    let matchStatus = true;
    if (statusFilters.length > 0) {
      matchStatus = statusFilters.some(f => {
        if (f === 'RECEIVED') return isReceived(item);
        if (f === 'INSTALLED') return isInstalled(item);
        if (f === 'COMPLETED') return isCompleted(item);
        if (f === 'NOT DELIVERED') return !isReceived(item);
        return false;
      });
    }
    return matchSearch && matchDeck && matchStatus;
  });

  const stats = { 
    total: equipList.length, 
    received: equipList.filter(isReceived).length,
    installed: equipList.filter(isInstalled).length,
    completed: equipList.filter(isCompleted).length,
    notDelivered: equipList.filter(i => !isReceived(i)).length
  };

  const handleToggleFilter = (filterKey) => {
    if (filterKey === 'All') setStatusFilters([]);
    else {
      setStatusFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
    }
  };

  const handleResizeStart = (e, colKey) => {
    e.preventDefault();
    const startX = e.clientX; const startWidth = colWidths[colKey];
    const doDrag = (dragEvent) => { requestAnimationFrame(() => { setColWidths(prev => ({ ...prev, [colKey]: Math.max(60, startWidth + (dragEvent.clientX - startX)) })); }); };
    const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
    document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', stopDrag);
  };
  const Resizer = ({ colKey }) => <div onMouseDown={(e) => handleResizeStart(e, colKey)} className="absolute top-0 right-0 w-[6px] h-full cursor-col-resize hover:bg-blue-400 z-30 transition-colors" style={{ transform: 'translateX(50%)' }} />;

  const handleModalInputChange = (e) => { const val = ['tag_no', 'package', 'deck_level'].includes(e.target.name) ? e.target.value.toUpperCase() : e.target.value; setFormData({ ...formData, [e.target.name]: val }); };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, receiving_date: formData.receiving_date || null, installation_status: 'Not yet', welding_status: 'Not yet', bolting_status: 'Not yet', dim_status: 'Not yet', leveling_status: 'Not yet', align_status: 'Not yet', discipline: 'Mechanical', phase: 'CC' };
    try { const { error } = await supabase.from('master_equipment').insert([payload]); if (error) return alert("Lỗi: " + error.message); setShowAddModal(false); setFormData({ tag_no: '', description: '', package: '', deck_level: '', mrir_no: '', receiving_date: '', installation_date: '', notes: '' }); fetchData(); } catch (err) {}
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try { const { error } = await supabase.from('master_equipment').update({ tag_no: editingItem.tag_no.toUpperCase(), package: editingItem.package?.toUpperCase(), deck_level: editingItem.deck_level?.toUpperCase(), description: editingItem.description }).eq('id', editingItem.id); if (error) return alert("Lỗi: " + error.message); setEditingItem(null); fetchData(); } catch (err) {}
  };

  const handleDeleteEquipment = async (id, tagNo) => {
    if (!window.confirm(`Xóa vĩnh viễn thiết bị [${tagNo}]?`)) return;
    const { error } = await supabase.from('master_equipment').delete().eq('id', id);
    if (!error) setEquipList(equipList.filter(item => item.id !== id));
  };

  const handleLocalChange = (id, field, value) => setEquipList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  const saveToDatabase = async (id, field, value) => { try { const finalValue = (field.includes('date') && value === '') ? null : value; await supabase.from('master_equipment').update({ [field]: finalValue }).eq('id', id); } catch (err) {} };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]; if (!file) return; setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result); const workbook = XLSX.read(data, { type: 'array', cellDates: true }); const worksheet = workbook.Sheets[workbook.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(worksheet);
        if (json.length === 0) throw new Error("File rỗng!");
        const normalizeDate = (val) => { if (!val) return null; if (val instanceof Date && !isNaN(val)) return val.toISOString().split('T')[0]; const d = new Date(val); return isNaN(d) ? null : d.toISOString().split('T')[0]; };
        const normalizeStatusAndDate = (val) => {
          if (!val) return { status: 'Not yet', date: null }; if (val instanceof Date && !isNaN(val)) return { status: 'Completed', date: val.toISOString().split('T')[0] };
          const s = String(val).trim().toUpperCase(); const parsedDate = new Date(s);
          if (!isNaN(parsedDate.getTime()) && s.length >= 6) return { status: 'Completed', date: parsedDate.toISOString().split('T')[0] };
          if (['DONE', 'COMPLETED', 'OK', 'YES', 'Y'].includes(s)) return { status: 'Completed', date: null };
          if (['IN PROG', 'IN PROGRESS', 'WIP'].includes(s)) return { status: 'In progress', date: null };
          if (['N/A', 'NA', '-'].includes(s)) return { status: 'N/A', date: null }; return { status: 'Not yet', date: null };
        };
        const payloads = json.map(row => {
          const instData = normalizeStatusAndDate(row['Install Date'] || row['Installation']); const weldData = normalizeStatusAndDate(row['Welding']); const boltData = normalizeStatusAndDate(row['Bolting']); const dimData = normalizeStatusAndDate(row['Dim Check']); const levData = normalizeStatusAndDate(row['Leveling']); const alignData = normalizeStatusAndDate(row['Alignment']);
          return { tag_no: (row['Tag No'] || row['Tag_No'] || row['TAG NO'] || '').toString().toUpperCase().trim(), package: (row['Package'] || '').toString().toUpperCase().trim(), description: (row['Description'] || '').toString().trim(), deck_level: (row['Deck Level'] || row['Deck'] || '').toString().toUpperCase().trim(), mrir_no: (row['MRIR No'] || '').toString().trim(), receiving_date: normalizeDate(row['Receiving Date']), installation_status: instData.status, installation_date: instData.date, welding_status: weldData.status, welding_date: weldData.date, bolting_status: boltData.status, bolting_date: boltData.date, dim_status: dimData.status, dim_date: dimData.date, leveling_status: levData.status, leveling_date: levData.date, align_status: alignData.status, align_date: alignData.date, notes: (row['Notes'] || '').toString().trim(), pres_initial_method: (row['Initial Method'] || row['Pres Method'] || '').toString().trim(), pres_alternate_method: (row['Alternate Method'] || '').toString().trim(), pres_checksheet: (row['Pres Checksheet'] || row['Checksheet'] || '').toString().trim(), pres_freq: (row['Freq'] || row['Frequency'] || '').toString().trim(), pres_start_date: normalizeDate(row['Pres Start Date'] || row['Receiving Date']), pres_last_date: normalizeDate(row['Last Done Date'] || row['Last Done']), pres_notes: (row['Pres Notes'] || '').toString().trim(), discipline: 'Mechanical', phase: 'CC' };
        }).filter(item => item.tag_no !== '');
        await supabase.from('master_equipment').insert(payloads); alert(`Thành công ${payloads.length} dòng!`); fetchData();
      } catch (err) { alert("Lỗi: " + err.message); } finally { setIsImporting(false); e.target.value = null; }
    }; reader.readAsArrayBuffer(file);
  };

  const handleExportExcelSelection = (mode) => {
    let dataToExport = [];
    if (mode === 'INSTALL_ONLY') { dataToExport = filteredList.map(item => ({ 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Installation': item.installation_date ? formatToExcelDate(item.installation_date) : item.installation_status, 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Overall Status': calculateRowStatus(item).label, 'Notes': item.notes })); }
    else if (mode === 'PRES_ONLY') { dataToExport = filteredList.map(item => ({ 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Pres Notes': item.pres_notes })); }
    else { dataToExport = filteredList.map(item => ({ 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Installation': item.installation_date ? formatToExcelDate(item.installation_date) : item.installation_status, 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Pres Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Overall Status': calculateRowStatus(item).label, 'Notes': item.notes, 'Pres Notes': item.pres_notes })); }
    const ws = XLSX.utils.json_to_sheet(dataToExport); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Export"); XLSX.writeFile(wb, `${mode}_Matrix.xlsx`); setShowExportModal(false); 
  };

  const exportToWord = () => { const printContent = document.getElementById('printable-matrix').innerHTML; const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Installation Matrix</title><style>@page { size: landscape; margin: 1cm; } table {width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 10px;} th, td {border: 1px solid black; padding: 4px; text-align: left;} th {background-color: #f8fafc; font-weight: bold; text-align: center;}</style></head><body>`; const sourceHTML = header + printContent + `</body></html>`; const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML); const fileDownload = document.createElement("a"); document.body.appendChild(fileDownload); fileDownload.href = source; fileDownload.download = `Installation_Matrix_${new Date().toISOString().split('T')[0]}.doc`; fileDownload.click(); document.body.removeChild(fileDownload); };
  
  const exportToPDF = () => {
    const printContent = document.getElementById('printable-matrix').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div id="print-container">
        <style>
          @media print {
            body { background: white !important; margin: 0; padding: 0; }
            #print-container { width: 100%; font-family: Arial, sans-serif; padding: 8mm; }
            @page { size: A4 landscape; margin: 5mm; }
            table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
            th, td { border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc !important; font-weight: bold; text-transform: uppercase; text-align: center; }
            .text-left { text-align: left !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
        ${printContent}
      </div>`;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); 
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <input type="file" accept=".xlsx, .xls, .csv" ref={importFileRef} className="hidden" onChange={handleImportExcel} />

      {/* MODAL EXCEL */}
      {showExportModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between bg-slate-50 items-center">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-emerald-600" size={24}/> Export</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-red-500 p-2"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <button onClick={() => handleExportExcelSelection('INSTALL_ONLY')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 text-left group">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white"><LayoutGrid size={24} /></div>
                <div><h4 className="font-black text-sm">Installation Matrix Only</h4><p className="text-xs text-slate-500">Only construction columns.</p></div>
              </button>
              <button onClick={() => handleExportExcelSelection('PRES_ONLY')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50 text-left group">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-lg group-hover:bg-amber-600 group-hover:text-white"><FileCheck size={24} /></div>
                <div><h4 className="font-black text-sm">Preservation Tracker Only</h4><p className="text-xs text-slate-500">Only preservation columns.</p></div>
              </button>
              <button onClick={() => handleExportExcelSelection('MASTER_FULL')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:border-purple-500 hover:bg-purple-100 text-left group">
                <div className="bg-purple-200 text-purple-700 p-3 rounded-lg group-hover:bg-purple-600 group-hover:text-white"><Database size={24} /></div>
                <div><h4 className="font-black text-purple-900 text-sm">Master Full Database</h4><p className="text-xs text-purple-700/80">Export all columns.</p></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-black text-xl flex items-center gap-2"><Plus className="text-blue-600"/> Add New</h3>
              <button onClick={()=>setShowAddModal(false)} className="p-2"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6">
              <div className="bg-slate-50 p-5 rounded-xl border grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="text-xs font-bold uppercase">Tag No *</label>
                  <input required type="text" name="tag_no" onChange={handleModalInputChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-bold uppercase outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-bold uppercase">Package</label>
                  <input type="text" name="package" onChange={handleModalInputChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm uppercase outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-bold uppercase">Deck</label>
                  <input type="text" name="deck_level" onChange={handleModalInputChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm uppercase outline-none" />
                </div>
                <div className="col-span-3">
                  <label className="text-xs font-bold uppercase">Description</label>
                  <input type="text" name="description" onChange={handleModalInputChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={()=>setShowAddModal(false)} className="px-6 py-2 font-bold bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-8 py-2 font-bold text-white bg-blue-600 rounded-xl">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-black text-xl flex items-center gap-2"><Edit className="text-emerald-600"/> Edit</h3>
              <button onClick={()=>setEditingItem(null)} className="p-2"><X size={20}/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="text-xs font-bold uppercase">Tag No *</label>
                  <input required type="text" value={editingItem.tag_no} onChange={(e)=>setEditingItem({...editingItem, tag_no: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-bold uppercase outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-bold uppercase">Package</label>
                  <input type="text" value={editingItem.package || ''} onChange={(e)=>setEditingItem({...editingItem, package: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm uppercase outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-bold uppercase">Deck</label>
                  <input type="text" value={editingItem.deck_level || ''} onChange={(e)=>setEditingItem({...editingItem, deck_level: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm uppercase outline-none" />
                </div>
                <div className="col-span-3">
                  <label className="text-xs font-bold uppercase">Description</label>
                  <input type="text" value={editingItem.description || ''} onChange={(e)=>setEditingItem({...editingItem, description: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={()=>setEditingItem(null)} className="px-6 py-2 font-bold bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-8 py-2 font-bold text-white bg-emerald-600 rounded-xl">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER BỘ LỌC ĐỒNG BỘ MÀU CHUẨN */}
      <div className="flex-none border-b border-slate-200 p-3 px-6 flex justify-between items-center bg-white z-20 min-h-[70px]">
         <div className="flex gap-2 shrink-0">
           <button onClick={() => handleToggleFilter('All')} className={`flex flex-col items-center justify-center min-w-[75px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.length === 0 ? 'bg-purple-50 border-purple-300 shadow-inner' : 'bg-white border-slate-200 opacity-60 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.length === 0 ? 'text-purple-600' : 'text-slate-500'}`}>Total</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.length === 0 ? 'text-purple-700' : 'text-purple-600'}`}>{stats.total}</span>
           </button>
           <button onClick={() => handleToggleFilter('RECEIVED')} className={`flex flex-col items-center justify-center min-w-[75px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('RECEIVED') ? 'bg-sky-50 border-sky-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('RECEIVED') ? 'text-sky-600' : 'text-slate-500'}`}>Received</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('RECEIVED') ? 'text-sky-700' : 'text-sky-600'}`}>{stats.received}</span>
           </button>
           <button onClick={() => handleToggleFilter('INSTALLED')} className={`flex flex-col items-center justify-center min-w-[75px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('INSTALLED') ? 'bg-blue-50 border-blue-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('INSTALLED') ? 'text-blue-600' : 'text-slate-500'}`}>Installed</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('INSTALLED') ? 'text-blue-700' : 'text-blue-600'}`}>{stats.installed}</span>
           </button>
           <button onClick={() => handleToggleFilter('NOT DELIVERED')} className={`flex flex-col items-center justify-center min-w-[85px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('NOT DELIVERED') ? 'bg-slate-100 border-slate-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('NOT DELIVERED') ? 'text-slate-600' : 'text-slate-500'}`}>Not Delivered</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('NOT DELIVERED') ? 'text-slate-700' : 'text-slate-400'}`}>{stats.notDelivered}</span>
           </button>
           <button onClick={() => handleToggleFilter('COMPLETED')} className={`flex flex-col items-center justify-center min-w-[75px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('COMPLETED') ? 'bg-emerald-50 border-emerald-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('COMPLETED') ? 'text-emerald-600' : 'text-slate-500'}`}>Completed</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('COMPLETED') ? 'text-emerald-700' : 'text-emerald-600'}`}>{stats.completed}</span>
           </button>
         </div>
         
         {/* ACTION BUTTONS */}
         <div className="flex items-center gap-2 shrink-0">
           <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 h-[36px]">
              <Filter size={14} className="text-slate-400 mr-2" />
              <select value={filterDeck} onChange={(e) => setFilterDeck(e.target.value)} className="bg-transparent py-1 text-xs font-bold text-slate-600 outline-none pr-2 cursor-pointer uppercase max-w-[150px]">
                {uniqueDecks.map(d => <option key={d} value={d}>{d === 'All' ? 'ALL DECKS' : d}</option>)}
              </select>
           </div>
           <div className="relative w-48">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full pl-8 pr-3 py-1.5 h-[36px] bg-slate-50 border border-slate-200 rounded-md text-xs font-bold focus:outline-none"/>
           </div>
           <button onClick={() => importFileRef.current.click()} disabled={isImporting} className="px-3 h-[36px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-md flex items-center gap-1">
             {isImporting ? <Loader size={12} className="animate-spin"/> : <Upload size={12}/>} Import
           </button>
           <button onClick={exportToPDF} className="px-3 h-[36px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-md flex items-center gap-1"><Printer size={12}/> PDF</button>
           <button onClick={exportToWord} className="px-3 h-[36px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-md flex items-center gap-1"><Download size={12}/> Word</button>
           <button onClick={() => setShowExportModal(true)} className="px-3 h-[36px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-md flex items-center gap-1"><Download size={12}/> Excel</button>
           <button onClick={() => setShowAddModal(true)} className="px-5 h-[36px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-sm flex items-center gap-1"><Plus size={14}/> Add Tag</button>
           <button onClick={fetchData} className="p-2 h-[36px] border border-slate-300 rounded-md bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><RefreshCw size={14}/></button>
         </div>
      </div>

      {/* LƯỚI DATA CÓ KÉO GIÃN */}
      <div className="flex-1 p-4 overflow-hidden min-w-0">
          <div className="w-full h-full overflow-auto bg-white shadow-sm border border-slate-300 rounded-lg">
            <table className="w-full text-left border-collapse min-w-max relative table-fixed">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black border-b-2 border-slate-300">
                  <th style={{ width: colWidths.tag }} className="p-3 border-r border-slate-300 sticky left-0 top-0 bg-slate-50 z-20 text-center">Tag No <Resizer colKey="tag" /></th>
                  <th style={{ width: colWidths.pkg }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Package <Resizer colKey="pkg" /></th>
                  <th style={{ width: colWidths.desc }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Description <Resizer colKey="desc" /></th>
                  <th style={{ width: colWidths.deck }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Deck <Resizer colKey="deck" /></th>
                  
                  <th style={{ width: colWidths.mrir }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">MRIR & Rec <Resizer colKey="mrir" /></th>
                  
                  <th style={{ width: colWidths.install }} className="p-3 border-r border-slate-300 sticky top-0 bg-amber-50/50 z-10 text-center text-slate-600">INSTALLATION <Resizer colKey="install" /></th>
                  
                  <th style={{ width: colWidths.welding }} className="p-3 border-r border-slate-300 sticky top-0 bg-amber-50/50 z-10 text-center text-slate-600">Welding <Resizer colKey="welding" /></th>
                  <th style={{ width: colWidths.bolting }} className="p-3 border-r border-slate-300 sticky top-0 bg-amber-50/50 z-10 text-center text-slate-600">Bolting <Resizer colKey="bolting" /></th>
                  <th style={{ width: colWidths.dim }} className="p-3 border-r border-slate-300 sticky top-0 bg-amber-50/50 z-10 text-center text-slate-600">Dim Check <Resizer colKey="dim" /></th>
                  <th style={{ width: colWidths.leveling }} className="p-3 border-r border-slate-300 sticky top-0 bg-sky-50/50 z-10 text-center text-slate-600">Leveling <Resizer colKey="leveling" /></th>
                  <th style={{ width: colWidths.align }} className="p-3 border-r border-slate-300 sticky top-0 bg-sky-50/50 z-10 text-center text-slate-600">Alignment <Resizer colKey="align" /></th>
                  
                  <th style={{ width: colWidths.overall }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Overall <Resizer colKey="overall" /></th>
                  <th style={{ width: colWidths.notes }} className="p-3 sticky top-0 bg-slate-50 z-10 text-center">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredList.map((item) => {
                  const rowStatus = calculateRowStatus(item);
                  const isDuplicate = duplicateTags.has(item.tag_no?.trim().toUpperCase());
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 group">
                      <td className={`p-3 border-r border-b border-slate-300 align-top sticky left-0 z-10 bg-white group-hover:bg-slate-50 overflow-hidden text-left ${isDuplicate ? 'bg-red-50 border-y border-y-red-300' : ''}`}>
                        <div className="flex flex-col gap-1.5">
                          <span className={`font-black text-sm w-full whitespace-normal break-words ${isDuplicate ? 'text-red-600' : 'text-slate-800'}`} title={item.tag_no}>{isDuplicate && <AlertCircle size={14} className="inline mr-1 animate-pulse"/>}{item.tag_no}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0"><button onClick={() => setEditingItem(item)} className="p-1 border bg-white text-slate-400 hover:text-blue-600 rounded"><Edit size={12} /></button><button onClick={() => handleDeleteEquipment(item.id, item.tag_no)} className="p-1 border bg-white text-slate-400 hover:text-red-600 rounded"><Trash2 size={12} /></button></div>
                        </div>
                      </td>
                      
                      <td className="p-2 border-r border-b border-slate-300 align-top text-left">
                        <AutoResizeTextarea 
                          value={item.package || ''} 
                          onChange={(e) => handleLocalChange(item.id, 'package', e.target.value.toUpperCase())} 
                          onBlur={(e) => saveToDatabase(item.id, 'package', e.target.value.toUpperCase())} 
                          className="text-left bg-transparent font-bold text-[11px] uppercase outline-none hover:bg-slate-100 focus:bg-white rounded px-1"
                        />
                      </td>
                      
                      <td className="p-2 border-r border-b border-slate-300 align-top text-left">
                        <AutoResizeTextarea 
                          value={item.description || ''} 
                          onChange={(e) => handleLocalChange(item.id, 'description', e.target.value)} 
                          onBlur={(e) => saveToDatabase(item.id, 'description', e.target.value)} 
                          className="text-left bg-transparent font-bold text-xs outline-none hover:bg-slate-100 focus:bg-white rounded px-1" 
                        />
                      </td>
                      
                      {/* DECK ĐÃ TRỞ THÀNH Ô NHẬP TEXT TỰ ĐỘNG XUỐNG DÒNG */}
                      <td className="p-3 border-r border-b border-slate-300 align-top text-left">
                        <AutoResizeTextarea 
                          value={item.deck_level || ''} 
                          onChange={(e) => handleLocalChange(item.id, 'deck_level', e.target.value.toUpperCase())} 
                          onBlur={(e) => saveToDatabase(item.id, 'deck_level', e.target.value.toUpperCase())} 
                          className="text-left bg-transparent font-medium text-[11px] uppercase outline-none hover:bg-slate-100 focus:bg-white rounded px-1"
                        />
                      </td>
                      
                      <td className="p-2 border-r border-b border-slate-300 align-top">
                        <MrirCell item={item} handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} />
                      </td>

                      <td className="p-2 border-r border-b border-slate-300 align-top">
                        <MilestoneCell item={item} fieldPrefix="installation" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} />
                      </td>
                      
                      <td className="p-2 border-r border-b border-slate-300 align-top"><MilestoneCell item={item} fieldPrefix="welding" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-2 border-r border-b border-slate-300 align-top"><MilestoneCell item={item} fieldPrefix="bolting" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-2 border-r border-b border-slate-300 align-top"><MilestoneCell item={item} fieldPrefix="dim" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-2 border-r border-b border-slate-300 align-top"><MilestoneCell item={item} fieldPrefix="leveling" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-2 border-r border-b border-slate-300 align-top"><MilestoneCell item={item} fieldPrefix="align" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      
                      <td className="p-3 border-r border-b border-slate-300 align-top"><span className={`px-2 py-1.5 rounded text-[9px] uppercase block w-full text-center border ${rowStatus.style}`}>{rowStatus.label}</span></td>
                      
                      <td className="p-3 border-b border-slate-300 align-top text-left">
                        <AutoResizeTextarea 
                          value={item.notes || ''} 
                          placeholder="Notes..." 
                          onChange={(e) => handleLocalChange(item.id, 'notes', e.target.value)} 
                          onBlur={(e) => saveToDatabase(item.id, 'notes', e.target.value)} 
                          className="text-left bg-transparent hover:bg-slate-100 focus:bg-white rounded text-[10px] text-slate-500 outline-none" 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>

      {/* BẢNG IN CHUẨN ĐỒNG BỘ VỚI PRESERVATION TRACKER */}
      <div id="printable-matrix" className="hidden">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px' }}>MCDERMOTT<br/>PTSC</div>
          <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '18px', textTransform: 'uppercase' }}>
            VIETNAM BLOCK B GAS PROJECT<br/>INSTALLATION PROGRESS MATRIX
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'right' }}>
            PETROVIETNAM<br/>PQPOC
            <div style={{ fontWeight: 'normal', fontSize: '10px', marginTop: '4px' }}>Printed: {formatToExcelDate(new Date().toISOString())}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#f1f5f9', padding: '10px', border: '1px solid black' }}>
          <span style={{ color: '#7e22ce' }}>TOTAL: {stats.total}</span>
          <span style={{ color: '#0284c7' }}>RECEIVED: {stats.received}</span>
          <span style={{ color: '#2563eb' }}>INSTALLED: {stats.installed}</span>
          <span style={{ color: '#64748b' }}>NOT DELIVERED: {stats.notDelivered}</span>
          <span style={{ color: '#059669' }}>COMPLETED: {stats.completed}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Tag No</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Package</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Description</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Deck</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>MRIR</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Rec Date</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>INSTALLATION</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Welding</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Bolting</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Dim Check</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Leveling</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Alignment</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map(item => {
              const instStatus = item.installation_status || 'NOT YET';
              const instDate = item.installation_date ? `\n(${formatToExcelDate(item.installation_date)})` : '';
              
              const weldStatus = item.welding_status === 'Completed' ? 'DONE' : (item.welding_status || 'NOT YET');
              const weldDate = item.welding_date ? `\n(${formatToExcelDate(item.welding_date)})` : '';

              const boltStatus = item.bolting_status === 'Completed' ? 'DONE' : (item.bolting_status || 'NOT YET');
              const boltDate = item.bolting_date ? `\n(${formatToExcelDate(item.bolting_date)})` : '';

              const dimStatus = item.dim_status === 'Completed' ? 'DONE' : (item.dim_status || 'NOT YET');
              const dimDate = item.dim_date ? `\n(${formatToExcelDate(item.dim_date)})` : '';

              const levStatus = item.leveling_status === 'Completed' ? 'DONE' : (item.leveling_status || 'NOT YET');
              const levDate = item.leveling_date ? `\n(${formatToExcelDate(item.leveling_date)})` : '';

              const alignStatus = item.align_status === 'Completed' ? 'DONE' : (item.align_status || 'NOT YET');
              const alignDate = item.align_date ? `\n(${formatToExcelDate(item.align_date)})` : '';

              return (
                <tr key={`print-${item.id}`}>
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', textAlign: 'left' }}>{item.tag_no}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.package}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.description}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.deck_level}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left', color: '#1d4ed8', fontWeight: 'bold' }}>{item.mrir_no}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>{formatToExcelDate(item.receiving_date)}</td>
                  
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', whiteSpace: 'pre-line' }}>{instStatus === 'Completed' ? 'DONE' : instStatus}{instDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', whiteSpace: 'pre-line' }}>{weldStatus}{weldDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', whiteSpace: 'pre-line' }}>{boltStatus}{boltDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', whiteSpace: 'pre-line' }}>{dimStatus}{dimDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', whiteSpace: 'pre-line' }}>{levStatus}{levDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', whiteSpace: 'pre-line' }}>{alignStatus}{alignDate}</td>
                  
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', textAlign: 'center' }}>{calculateRowStatus(item).label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}