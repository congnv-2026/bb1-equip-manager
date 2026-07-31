import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, X, Save, Paperclip, FileCheck, Download, Filter, Edit, Loader, Trash2, Upload, AlertCircle, FileSpreadsheet, LayoutGrid, Database, Printer, RefreshCw, AlertTriangle, Palette } from 'lucide-react';
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
// COMPONENT: Ô TEXT TỰ ĐỘNG CO GIÃN CHIỀU CAO
// ==========================================
const AutoResizeTextarea = ({ value, onChange, onBlur, className, placeholder, textColor = 'text-slate-600' }) => {
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
    <textarea ref={textareaRef} value={value || ''} onChange={(e) => { onChange(e); resize(); }} onBlur={onBlur} placeholder={placeholder} rows={1} className={`${className} ${textColor} overflow-hidden resize-none block w-full leading-relaxed`} />
  );
};

// ==========================================
// COMPONENT: Ô NOTES CÓ TÔ MÀU CHỮ
// ==========================================
const ColorNotesCell = ({ item, handleLocalChange, saveToDatabase }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const currentColor = item.notes_color || 'text-slate-600';

  const handleColorChange = (colorClass) => {
    handleLocalChange(item.id, 'notes_color', colorClass);
    saveToDatabase(item.id, 'notes_color', colorClass);
    setShowColorPicker(false);
  };

  return (
    <div className="relative flex flex-col justify-center w-full h-full group">
      <AutoResizeTextarea 
        value={item.notes || ''} 
        placeholder="Notes..." 
        textColor={currentColor}
        onChange={(e) => handleLocalChange(item.id, 'notes', e.target.value)} 
        onBlur={(e) => saveToDatabase(item.id, 'notes', e.target.value)} 
        className="w-full px-1 py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 rounded text-[10px] font-medium outline-none resize-none text-left pr-6" 
      />
      <button 
        onClick={() => setShowColorPicker(!showColorPicker)}
        className="absolute right-1 top-1 p-1 rounded hover:bg-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Đổi màu chữ Notes"
      >
        <Palette size={12} />
      </button>

      {showColorPicker && (
        <div className="absolute right-0 top-6 bg-white border border-slate-200 shadow-xl rounded-md p-1.5 flex gap-1 z-[100]">
          <button onClick={() => handleColorChange('text-slate-600')} className="w-5 h-5 rounded-full bg-slate-600 hover:ring-2 ring-slate-300 transition-all" title="Mặc định"></button>
          <button onClick={() => handleColorChange('text-red-600 font-bold')} className="w-5 h-5 rounded-full bg-red-600 hover:ring-2 ring-red-300 transition-all" title="Đỏ"></button>
          <button onClick={() => handleColorChange('text-amber-500 font-bold')} className="w-5 h-5 rounded-full bg-amber-500 hover:ring-2 ring-amber-300 transition-all" title="Vàng"></button>
          <button onClick={() => handleColorChange('text-emerald-600 font-bold')} className="w-5 h-5 rounded-full bg-emerald-600 hover:ring-2 ring-emerald-300 transition-all" title="Xanh lá"></button>
        </div>
      )}
    </div>
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
  const inputStyle = isDateEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-300 focus:border-emerald-500 placeholder:text-emerald-300' : 'bg-white text-slate-700 border-slate-300 focus:border-blue-400 hover:bg-slate-50';
  return (
    <div className="flex flex-col gap-1 w-full bg-white p-1 rounded border border-slate-300 shadow-sm">
      <div className="flex items-center gap-1">
        <input type="text" value={mrirNo} placeholder="MRIR..." onChange={(e) => handleLocalChange(item.id, 'mrir_no', e.target.value)} onBlur={handleMrirBlur} className={`flex-1 px-1.5 py-1 border rounded text-[10px] font-black uppercase outline-none text-left transition-colors min-w-0 ${inputStyle}`} />
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
      <CustomDateInput value={recDate} placeholder="Rec Date" disabled={!isDateEnabled} onChange={(val) => { handleLocalChange(item.id, 'receiving_date', val); saveToDatabase(item.id, 'receiving_date', val); if(val && item.pres_required !== 'Yes') { handleLocalChange(item.id, 'pres_required', 'Yes'); saveToDatabase(item.id, 'pres_required', 'Yes'); } }} className={`w-full px-1.5 py-1 border rounded text-[11px] font-bold text-left outline-none transition-colors ${isDateEnabled ? (recDate ? 'bg-white text-slate-800 border-slate-300 cursor-pointer hover:border-blue-400' : 'bg-white text-slate-500 border-slate-300 cursor-pointer hover:border-blue-400') : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'}`} />
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
      handleLocalChange(item.id, statusField, val); saveToDatabase(item.id, statusField, val); 
      if (val !== 'Completed' && val !== 'N/A') { handleLocalChange(item.id, dateField, null); saveToDatabase(item.id, dateField, null); } 
  };
  const handleDateChange = (val) => { 
      handleLocalChange(item.id, dateField, val); saveToDatabase(item.id, dateField, val); 
      if (val && currentStatus !== 'Completed') { handleLocalChange(item.id, statusField, 'Completed'); saveToDatabase(item.id, statusField, 'Completed'); } 
  };
  const isDateEnabled = currentStatus === 'Completed';
  const styles = { 'Not yet': 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50', 'In progress': 'bg-blue-50 text-blue-700 border-blue-300', 'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-300', 'N/A': 'bg-slate-100 text-slate-400 opacity-60 border-slate-300' };
  
  return (
    <div className="flex flex-col gap-1 w-full bg-white p-1 rounded border border-slate-300 shadow-sm">
      <div className="flex items-center gap-1">
        <select value={currentStatus} onChange={(e) => handleStatusChange(e.target.value)} className={`flex-1 px-1 py-1 border rounded text-[10px] font-black uppercase outline-none cursor-pointer text-left ${styles[currentStatus] || styles['Not yet']}`}>
          <option value="Not yet">NOT YET</option><option value="In progress">IN PROG</option><option value="Completed">DONE</option><option value="N/A">N/A</option>
        </select>
        {isUploading ? <div className="p-1.5 bg-slate-50 border border-slate-200 w-[26px] h-[26px] flex items-center justify-center rounded"><Loader size={12} className="animate-spin text-blue-600"/></div> : hasFile ? <div className="flex h-[26px] border border-emerald-300 rounded overflow-hidden"><button onClick={()=>window.open(fileUrl)} className="px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"><FileCheck size={12}/></button><button onClick={handleRemoveFile} className="px-1 bg-white hover:bg-red-50 text-red-400 hover:text-red-500 border-l border-emerald-300 transition-colors"><X size={10} strokeWidth={3}/></button></div> : <button onClick={()=>fileInputRef.current.click()} className="p-1.5 border border-slate-300 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 w-[26px] h-[26px] flex items-center justify-center rounded text-slate-400 transition-colors"><Paperclip size={12}/></button>}
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
      </div>
      <CustomDateInput value={currentDate} onChange={handleDateChange} disabled={!isDateEnabled} className={`w-full px-1.5 py-1 border rounded text-[11px] font-bold text-left outline-none transition-colors ${isDateEnabled ? (currentDate ? 'bg-white text-slate-800 border-slate-300 cursor-pointer hover:border-blue-400' : 'bg-white text-slate-500 border-slate-300 cursor-pointer hover:border-blue-400') : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'}`} />
    </div>
  );
};

// ==========================================
// MAIN COMPONENT: MATRIX
// ==========================================
export default function Matrix() {
  const [equipList, setEquipList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeck, setFilterDeck] = useState('All');
  const [filterPkg, setFilterPkg] = useState('All');
  const [statusFilters, setStatusFilters] = useState([]);
  const [sortConfig, setSortConfig] = useState([]); 
  
  const defaultColWidths = { tag: 160, pkg: 105, desc: 220, deck: 130, mrir: 140, install: 125, welding: 125, bolting: 125, dim: 125, leveling: 125, align: 125, overall: 110, notes: 180 };
  const [colWidths, setColWidths] = useState(() => {
    const saved = localStorage.getItem('matrix_colWidths');
    return saved ? JSON.parse(saved) : defaultColWidths;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const importFileRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImportData, setPendingImportData] = useState([]);
  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
  const [importSortOption, setImportSortOption] = useState('ORIGINAL');

  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [formData, setFormData] = useState({ tag_no: '', description: '', package: '', deck_level: '', mrir_no: '', receiving_date: '', installation_date: '', notes: '' });

  async function fetchData() {
    const { data: listData } = await supabase.from('master_equipment').select('*').order('created_at', { ascending: true });
    if (listData) setEquipList(listData);
  }
  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    localStorage.setItem('matrix_colWidths', JSON.stringify(colWidths));
  }, [colWidths]);

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
  const uniquePkgs = ['All', ...new Set(equipList.map(item => item.package).filter(Boolean))];

  const duplicateTags = useMemo(() => {
    const tagCounts = equipList.reduce((acc, item) => {
      const tag = item.tag_no?.trim().toUpperCase();
      if (tag) acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});
    return new Set(Object.keys(tagCounts).filter(tag => tagCounts[tag] > 1));
  }, [equipList]);

  const baseFilteredList = equipList.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = (item.tag_no?.toLowerCase().includes(searchLower)) || (item.description?.toLowerCase().includes(searchLower)) || (item.package?.toLowerCase().includes(searchLower)) || (item.deck_level?.toLowerCase().includes(searchLower)) || (item.mrir_no?.toLowerCase().includes(searchLower)) || (item.notes?.toLowerCase().includes(searchLower));
    const matchDeck = filterDeck === 'All' || item.deck_level === filterDeck;
    const matchPkg = filterPkg === 'All' || item.package === filterPkg;
    return matchSearch && matchDeck && matchPkg;
  });

  const stats = { 
    total: baseFilteredList.length, 
    received: baseFilteredList.filter(isReceived).length,
    installed: baseFilteredList.filter(isInstalled).length,
    completed: baseFilteredList.filter(isCompleted).length,
    notDelivered: baseFilteredList.filter(i => !isReceived(i)).length
  };

  const statusFilteredList = baseFilteredList.filter(item => {
    if (statusFilters.length === 0) return true;
    return statusFilters.some(f => {
      if (f === 'RECEIVED') return isReceived(item);
      if (f === 'INSTALLED') return isInstalled(item);
      if (f === 'COMPLETED') return isCompleted(item);
      if (f === 'NOT DELIVERED') return !isReceived(item);
      return false;
    });
  });

  let sortedList = [...statusFilteredList];
  if (sortConfig.length > 0) {
    sortedList.sort((a, b) => {
      for (let sortItem of sortConfig) {
        const aVal = String(a[sortItem.key] || '');
        const bVal = String(b[sortItem.key] || '');
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) {
          return sortItem.direction === 'asc' ? cmp : -cmp;
        }
      }
      return 0; 
    });
  }

  const handleSort = (key, e) => {
    e.preventDefault();
    setSortConfig(prev => {
      const isShift = e.shiftKey;
      const existingIndex = prev.findIndex(s => s.key === key);
      if (!isShift) {
        if (prev.length === 1 && existingIndex === 0) {
          if (prev[0].direction === 'asc') return [{ key, direction: 'desc' }];
          return []; 
        }
        return [{ key, direction: 'asc' }];
      } else {
        const newSort = [...prev];
        if (existingIndex >= 0) {
          if (newSort[existingIndex].direction === 'asc') newSort[existingIndex].direction = 'desc';
          else newSort.splice(existingIndex, 1); 
        } else {
          newSort.push({ key, direction: 'asc' });
        }
        return newSort;
      }
    });
  };

  const getSortIndicator = (key) => {
    const index = sortConfig.findIndex(s => s.key === key);
    if (index === -1) return '';
    const sort = sortConfig[index];
    const arrow = sort.direction === 'asc' ? '↑' : '↓';
    const num = sortConfig.length > 1 ? index + 1 : '';
    return <span className="text-blue-600 font-black ml-1">{arrow}{num}</span>;
  };

  const handleToggleFilter = (filterKey) => {
    if (filterKey === 'All') setStatusFilters([]);
    else setStatusFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
  };

  const handleResizeStart = (e, colKey) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startWidth = colWidths[colKey];
    const doDrag = (dragEvent) => { requestAnimationFrame(() => { setColWidths(prev => ({ ...prev, [colKey]: Math.max(60, startWidth + (dragEvent.clientX - startX)) })); }); };
    const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
    document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', stopDrag);
  };
  const Resizer = ({ colKey }) => <div onMouseDown={(e) => handleResizeStart(e, colKey)} onClick={(e) => e.stopPropagation()} className="absolute top-0 right-[-3px] w-[6px] h-full cursor-col-resize hover:bg-blue-400 z-50 transition-colors" />;

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
    if (!error) fetchData();
  };

  const handleDeleteAllDatabase = async () => {
    if (deleteConfirmText !== 'DELETE') return alert("Vui lòng gõ chữ DELETE để xác nhận!");
    setIsImporting(true);
    try {
      const { error } = await supabase.from('master_equipment').delete().not('id', 'is', null);
      if (error) throw error;
      setShowDeleteAllModal(false); setDeleteConfirmText(''); fetchData(); alert("Đã xóa sạch cơ sở dữ liệu!");
    } catch (err) { alert("Lỗi khi xóa: " + err.message); } finally { setIsImporting(false); }
  };

  const handleLocalChange = (id, field, value) => setEquipList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  const saveToDatabase = async (id, field, value) => { try { const finalValue = (field.includes('date') && value === '') ? null : value; await supabase.from('master_equipment').update({ [field]: finalValue }).eq('id', id); } catch (err) {} };

  const handleFileSelect = (e) => {
    const file = e.target.files[0]; if (!file) return; 
    setIsImporting(true);
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
        
        setPendingImportData(payloads); setShowImportOptionsModal(true);
      } catch (err) { alert("Lỗi: " + err.message); } finally { setIsImporting(false); e.target.value = null; }
    }; reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    let finalPayloads = [...pendingImportData];
    if (importSortOption === 'TAG') finalPayloads.sort((a,b) => String(a.tag_no).localeCompare(String(b.tag_no), undefined, { numeric: true }));
    else if (importSortOption === 'PKG') finalPayloads.sort((a,b) => String(a.package||'').localeCompare(String(b.package||''), undefined, { numeric: true }));
    else if (importSortOption === 'DECK') finalPayloads.sort((a,b) => String(a.deck_level||'').localeCompare(String(b.deck_level||''), undefined, { numeric: true }));

    try {
      await supabase.from('master_equipment').insert(finalPayloads); 
      alert(`Đã Import thành công ${finalPayloads.length} thiết bị!`); 
      setShowImportOptionsModal(false); setPendingImportData([]); fetchData();
    } catch (err) { alert("Lỗi khi import: " + err.message); } finally { setIsImporting(false); }
  };

  const handleExportExcelSelection = (mode) => {
    let dataToExport = [];
    if (mode === 'INSTALL_ONLY') { dataToExport = sortedList.map(item => ({ 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Installation': item.installation_date ? formatToExcelDate(item.installation_date) : item.installation_status, 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Overall Status': calculateRowStatus(item).label, 'Notes': item.notes })); }
    else if (mode === 'PRES_ONLY') { dataToExport = sortedList.map(item => ({ 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Pres Notes': item.pres_notes })); }
    else { dataToExport = sortedList.map(item => ({ 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Installation': item.installation_date ? formatToExcelDate(item.installation_date) : item.installation_status, 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Pres Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Overall Status': calculateRowStatus(item).label, 'Notes': item.notes, 'Pres Notes': item.pres_notes })); }
    const ws = XLSX.utils.json_to_sheet(dataToExport); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Export"); XLSX.writeFile(wb, `${mode}_Matrix.xlsx`); setShowExportModal(false); 
  };

  const exportToWord = () => { const printContent = document.getElementById('printable-matrix').innerHTML; const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Installation Matrix</title><style>@page { size: A3 landscape; margin: 15mm; } table {width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 10px;} th, td {border: 1px solid black; padding: 4px; text-align: left; vertical-align: middle;} th {background-color: #f8fafc; font-weight: bold; text-align: center;}</style></head><body>`; const sourceHTML = header + printContent + `</body></html>`; const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML); const fileDownload = document.createElement("a"); document.body.appendChild(fileDownload); fileDownload.href = source; fileDownload.download = `Installation_Matrix_${new Date().toISOString().split('T')[0]}.doc`; fileDownload.click(); document.body.removeChild(fileDownload); };
  
  const exportToPDF = () => {
    const printContent = document.getElementById('printable-matrix').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div id="print-container">
        ${printContent}
      </div>`;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); 
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <input type="file" accept=".xlsx, .xls, .csv" ref={importFileRef} className="hidden" onChange={handleFileSelect} />

      {/* MODAL IMPORT OPTIONS */}
      {showImportOptionsModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between bg-slate-50 items-center">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Upload className="text-blue-600" size={24}/> Import Setup</h3>
              <button onClick={() => {setShowImportOptionsModal(false); setPendingImportData([]);}} className="text-slate-400 hover:text-red-500 p-2"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4 font-medium">Bạn chuẩn bị đưa <span className="font-black text-blue-600">{pendingImportData.length}</span> thiết bị vào Database. Bạn muốn sắp xếp chúng như thế nào?</p>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${importSortOption === 'ORIGINAL' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="importSort" checked={importSortOption === 'ORIGINAL'} onChange={() => setImportSortOption('ORIGINAL')} className="w-4 h-4 text-blue-600"/>
                  <span className="font-bold text-slate-700 text-sm">Giữ nguyên thứ tự file gốc Excel</span>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${importSortOption === 'TAG' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="importSort" checked={importSortOption === 'TAG'} onChange={() => setImportSortOption('TAG')} className="w-4 h-4 text-blue-600"/>
                  <span className="font-bold text-slate-700 text-sm">Tự động xếp theo Tag No (A-Z)</span>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${importSortOption === 'PKG' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="importSort" checked={importSortOption === 'PKG'} onChange={() => setImportSortOption('PKG')} className="w-4 h-4 text-blue-600"/>
                  <span className="font-bold text-slate-700 text-sm">Tự động xếp theo Package</span>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${importSortOption === 'DECK' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="importSort" checked={importSortOption === 'DECK'} onChange={() => setImportSortOption('DECK')} className="w-4 h-4 text-blue-600"/>
                  <span className="font-bold text-slate-700 text-sm">Tự động xếp theo Deck</span>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => {setShowImportOptionsModal(false); setPendingImportData([]);}} className="px-5 py-2 font-bold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200">Hủy bỏ</button>
                <button onClick={handleConfirmImport} disabled={isImporting} className="px-5 py-2 font-bold text-white bg-blue-600 rounded-xl flex items-center gap-2 hover:bg-blue-700">
                  {isImporting ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>} Bắt đầu Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPORT EXCEL */}
      {showExportModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-emerald-600" size={24}/> Export Data to Excel</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-full border border-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <button onClick={() => handleExportExcelSelection('INSTALL_ONLY')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><LayoutGrid size={24} /></div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">Installation Matrix Only</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1">Export only construction-related columns (MRIR, Install Date, Welding, Bolting, etc.)</p>
                </div>
              </button>
              <button onClick={() => handleExportExcelSelection('PRES_ONLY')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50 transition-all text-left group">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors"><FileCheck size={24} /></div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">Preservation Tracker Only</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1">Export only preservation-related columns (Method, Frequency, Last Done, Next Due, etc.)</p>
                </div>
              </button>
              <div className="border-t border-slate-200 my-2"></div>
              <button onClick={() => handleExportExcelSelection('MASTER_FULL')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:border-purple-500 hover:bg-purple-100 transition-all text-left group shadow-sm">
                <div className="bg-purple-200 text-purple-700 p-3 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors"><Database size={24} /></div>
                <div>
                  <h4 className="font-black text-purple-900 text-sm">Master Full Database</h4>
                  <p className="text-xs font-medium text-purple-700/80 mt-1">Export all columns across both Installation and Preservation modules into one master sheet.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-red-500">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
              <h3 className="font-black text-xl text-red-700 flex items-center gap-2"><AlertTriangle className="text-red-600" size={24}/> NGUY HIỂM!</h3>
              <button onClick={() => setShowDeleteAllModal(false)} className="text-red-400 hover:text-red-600 p-2"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm font-bold text-slate-700 mb-2">Bạn đang chuẩn bị <span className="text-red-600 uppercase underline">XÓA SẠCH VĨNH VIỄN</span> toàn bộ cơ sở dữ liệu ({equipList.length} thiết bị).</p>
              <p className="text-xs text-slate-500 mb-6 font-medium">Hành động này không thể hoàn tác. Để xác nhận, vui lòng gõ chính xác chữ <strong className="text-black">DELETE</strong> vào ô bên dưới.</p>
              <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Nhập DELETE..." className="w-full border-2 border-red-200 focus:border-red-500 rounded-lg px-4 py-2 font-black text-red-600 outline-none text-center mb-6 placeholder:font-normal placeholder:text-slate-300"/>
              <div className="flex justify-end gap-3">
                <button onClick={() => {setShowDeleteAllModal(false); setDeleteConfirmText('');}} className="px-5 py-2 font-bold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200">Hủy</button>
                <button onClick={handleDeleteAllDatabase} disabled={isImporting || deleteConfirmText !== 'DELETE'} className={`px-5 py-2 font-black text-white rounded-xl flex items-center gap-2 ${deleteConfirmText === 'DELETE' ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30' : 'bg-red-300 cursor-not-allowed'}`}>
                  {isImporting ? <Loader size={16} className="animate-spin"/> : <Trash2 size={16}/>} XÓA TẤT CẢ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BỘ LỌC ĐỒNG BỘ MÀU CHUẨN */}
      <div className="flex-none border-b border-slate-200 p-3 px-6 flex justify-between items-center bg-white z-20 overflow-x-auto gap-4 min-h-[70px]">
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
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('NOT DELIVERED') ? 'text-slate-600' : 'text-slate-500'}`}>Not Deliv</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('NOT DELIVERED') ? 'text-slate-700' : 'text-slate-400'}`}>{stats.notDelivered}</span>
           </button>
           <button onClick={() => handleToggleFilter('COMPLETED')} className={`flex flex-col items-center justify-center min-w-[75px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('COMPLETED') ? 'bg-emerald-50 border-emerald-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('COMPLETED') ? 'text-emerald-600' : 'text-slate-500'}`}>Completed</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('COMPLETED') ? 'text-emerald-700' : 'text-emerald-600'}`}>{stats.completed}</span>
           </button>
         </div>
         
         <div className="flex items-center gap-2 shrink-0">
           <button onClick={() => setShowDeleteAllModal(true)} className="px-3 h-[36px] bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-xs rounded-md flex items-center gap-1 transition-colors mr-2">
             <Trash2 size={12}/> Clear Data
           </button>

           <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 h-[36px]">
              <Filter size={14} className="text-slate-400 mr-2" />
              <select value={filterPkg} onChange={(e) => setFilterPkg(e.target.value)} className="bg-transparent py-1 text-xs font-bold text-slate-600 outline-none cursor-pointer uppercase max-w-[120px] mr-1 border-r border-slate-200">
                {uniquePkgs.map(d => <option key={d} value={d}>{d === 'All' ? 'ALL PKG' : d}</option>)}
              </select>
              <select value={filterDeck} onChange={(e) => setFilterDeck(e.target.value)} className="bg-transparent py-1 text-xs font-bold text-slate-600 outline-none pr-1 pl-2 cursor-pointer uppercase max-w-[120px]">
                {uniqueDecks.map(d => <option key={d} value={d}>{d === 'All' ? 'ALL DECKS' : d}</option>)}
              </select>
           </div>

           <div className="relative w-40">
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

      {/* LƯỚI DATA UI - ĐƯỜNG KẺ CHẮC CHẮN KHÔNG MẤT */}
      <div className="flex-1 p-4 overflow-hidden min-w-0">
          <div className="w-full h-full overflow-auto bg-slate-200 shadow-inner rounded-lg border border-slate-300">
            <table className="w-full text-left border-separate border-spacing-[1px] min-w-max relative table-fixed bg-slate-300">
              <thead>
                <tr className="uppercase text-[10px] font-black h-[40px]">
                  <th style={{ width: colWidths.tag }} className="p-0 sticky left-0 top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1,3px_0_5px_-2px_rgba(0,0,0,0.15)] z-[40]">
                    <div onClick={(e) => handleSort('tag_no', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      Tag No {getSortIndicator('tag_no')}
                    </div>
                    <Resizer colKey="tag" />
                  </th>
                  <th style={{ width: colWidths.pkg }} className="p-0 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20">
                    <div onClick={(e) => handleSort('package', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      Package {getSortIndicator('package')}
                    </div>
                    <Resizer colKey="pkg" />
                  </th>
                  <th style={{ width: colWidths.desc }} className="p-0 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20">
                    <div onClick={(e) => handleSort('description', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      Description {getSortIndicator('description')}
                    </div>
                    <Resizer colKey="desc" />
                  </th>
                  <th style={{ width: colWidths.deck }} className="p-0 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20">
                    <div onClick={(e) => handleSort('deck_level', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      Deck {getSortIndicator('deck_level')}
                    </div>
                    <Resizer colKey="deck" />
                  </th>
                  <th style={{ width: colWidths.mrir }} className="p-0 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20">
                    <div onClick={(e) => handleSort('mrir_no', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      MRIR & Rec {getSortIndicator('mrir_no')}
                    </div>
                    <Resizer colKey="mrir" />
                  </th>
                  <th style={{ width: colWidths.install }} className="p-2 sticky top-0 bg-[#fffbeb] shadow-[inset_0_-2px_0_0_#fde68a] z-20 text-center text-slate-700">INSTALLATION <Resizer colKey="install" /></th>
                  <th style={{ width: colWidths.welding }} className="p-2 sticky top-0 bg-[#fffbeb] shadow-[inset_0_-2px_0_0_#fde68a] z-20 text-center text-slate-700">Welding <Resizer colKey="welding" /></th>
                  <th style={{ width: colWidths.bolting }} className="p-2 sticky top-0 bg-[#fffbeb] shadow-[inset_0_-2px_0_0_#fde68a] z-20 text-center text-slate-700">Bolting <Resizer colKey="bolting" /></th>
                  <th style={{ width: colWidths.dim }} className="p-2 sticky top-0 bg-[#fffbeb] shadow-[inset_0_-2px_0_0_#fde68a] z-20 text-center text-slate-700">Dim Check <Resizer colKey="dim" /></th>
                  <th style={{ width: colWidths.leveling }} className="p-2 sticky top-0 bg-[#eff6ff] shadow-[inset_0_-2px_0_0_#bfdbfe] z-20 text-center text-slate-700">Leveling <Resizer colKey="leveling" /></th>
                  <th style={{ width: colWidths.align }} className="p-2 sticky top-0 bg-[#eff6ff] shadow-[inset_0_-2px_0_0_#bfdbfe] z-20 text-center text-slate-700">Alignment <Resizer colKey="align" /></th>
                  <th style={{ width: colWidths.overall }} className="p-2 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20 text-center text-slate-700">Overall <Resizer colKey="overall" /></th>
                  <th style={{ width: colWidths.notes }} className="p-2 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20 text-center text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sortedList.map((item) => {
                  const rowStatus = calculateRowStatus(item);
                  const isDuplicate = duplicateTags.has(item.tag_no?.trim().toUpperCase());
                  return (
                    <tr key={item.id} className="group">
                      <td className={`p-3 align-middle sticky left-0 z-[15] overflow-hidden text-left shadow-[3px_0_5px_-2px_rgba(0,0,0,0.15)] transition-colors ${isDuplicate ? 'bg-red-50' : 'bg-white group-hover:bg-slate-50'}`}>
                        <div className="inline-flex flex-col items-start justify-center h-full gap-1.5 w-full">
                          <span className={`font-black text-sm w-full whitespace-normal break-words ${isDuplicate ? 'text-red-600' : 'text-slate-800'}`} title={item.tag_no}>{isDuplicate && <AlertCircle size={14} className="inline mr-1 animate-pulse"/>}{item.tag_no}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0"><button onClick={() => setEditingItem(item)} className="p-1 border bg-white text-slate-400 hover:text-blue-600 rounded shadow-sm"><Edit size={12} /></button><button onClick={() => handleDeleteEquipment(item.id, item.tag_no)} className="p-1 border bg-white text-slate-400 hover:text-red-600 rounded shadow-sm"><Trash2 size={12} /></button></div>
                        </div>
                      </td>
                      <td className="p-2 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.package || ''} onChange={(e) => handleLocalChange(item.id, 'package', e.target.value.toUpperCase())} onBlur={(e) => saveToDatabase(item.id, 'package', e.target.value.toUpperCase())} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border-transparent hover:border-slate-300 text-slate-700 font-bold text-[11px] uppercase rounded px-1 outline-none resize-none" />
                      </td>
                      <td className="p-2 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.description || ''} onChange={(e) => handleLocalChange(item.id, 'description', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'description', e.target.value)} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border-transparent hover:border-slate-300 text-slate-700 font-bold text-xs rounded px-1 outline-none resize-none" />
                      </td>
                      <td className="p-3 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.deck_level || ''} onChange={(e) => handleLocalChange(item.id, 'deck_level', e.target.value.toUpperCase())} onBlur={(e) => saveToDatabase(item.id, 'deck_level', e.target.value.toUpperCase())} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border-transparent hover:border-slate-300 text-slate-700 font-medium text-[11px] uppercase rounded px-1 outline-none resize-none" />
                      </td>
                      <td className="p-2 align-middle bg-white group-hover:bg-slate-50 transition-colors">
                        <MrirCell item={item} handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} />
                      </td>
                      <td className="p-2 align-middle bg-white group-hover:bg-slate-50 transition-colors"><MilestoneCell item={item} fieldPrefix="installation" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-2 align-middle bg-white group-hover:bg-slate-50 transition-colors"><MilestoneCell item={item} fieldPrefix="welding" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-2 align-middle bg-white group-hover:bg-slate-50 transition-colors"><MilestoneCell item={item} fieldPrefix="bolting" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-2 align-middle bg-white group-hover:bg-slate-50 transition-colors"><MilestoneCell item={item} fieldPrefix="dim" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-2 align-middle bg-white group-hover:bg-slate-50 transition-colors"><MilestoneCell item={item} fieldPrefix="leveling" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-2 align-middle bg-white group-hover:bg-slate-50 transition-colors"><MilestoneCell item={item} fieldPrefix="align" handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} /></td>
                      <td className="p-3 align-middle bg-white group-hover:bg-slate-50 transition-colors"><span className={`px-2 py-1.5 rounded text-[9px] uppercase block w-full text-center border ${rowStatus.style}`}>{rowStatus.label}</span></td>
                      <td className="p-1 align-middle bg-white group-hover:bg-slate-50 transition-colors">
                        <ColorNotesCell item={item} handleLocalChange={handleLocalChange} saveToDatabase={saveToDatabase} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>

      {/* ========================================================= */}
      {/* BẢNG IN CHUẨN A3 LANDSCAPE - ĐƯỢC FIX COLGROUP & SỐ TRANG  */}
      {/* ========================================================= */}
      <div id="printable-matrix" className="hidden">
        <style>{`
          @media print {
            @page { 
              size: A3 landscape; 
              margin: 15mm; 
              @bottom-right {
                content: "Page " counter(page);
                font-family: sans-serif;
                font-size: 10pt;
                font-weight: bold;
                color: #1e293b;
              }
            }
            body { 
              padding: 0 !important; 
              margin: 0 !important; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              background: white; 
            }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { page-break-inside: avoid; }
          }
        `}</style>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', tableLayout: 'fixed' }}>
          {/* COLGROUP KHÓA ĐỘ RỘNG CỘT CHO MỌI TRANG IN */}
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          
          <thead>
            <tr>
              <th colSpan="14" style={{ border: 'none', padding: 0, backgroundColor: 'white' }}>
                <table style={{ width: '100%', borderBottom: '2px solid black', marginBottom: '12px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '20%', fontWeight: 'bold', fontSize: '12pt', textAlign: 'left', border: 'none', padding: '0 0 8px 0' }}>
                        MCDERMOTT<br/>PTSC
                      </td>
                      <td style={{ width: '60%', textAlign: 'center', fontWeight: '900', fontSize: '18pt', textTransform: 'uppercase', border: 'none', padding: '0 0 8px 0' }}>
                        VIETNAM BLOCK B GAS PROJECT<br/>INSTALLATION PROGRESS MATRIX
                      </td>
                      <td style={{ width: '20%', fontWeight: 'bold', fontSize: '12pt', textAlign: 'right', border: 'none', padding: '0 0 8px 0' }}>
                        PETROVIETNAM<br/>PQPOC
                        <div style={{ fontWeight: 'normal', fontSize: '9pt', marginTop: '4px' }}>
                          Printed: {formatToExcelDate(new Date().toISOString())}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ width: '100%', backgroundColor: '#f1f5f9', border: '1px solid black', marginBottom: '12px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '10pt', border: 'none', textAlign: 'left' }}>
                        <span style={{ color: '#7e22ce', marginRight: '20px' }}>TOTAL: {stats.total}</span>
                        <span style={{ color: '#0284c7', marginRight: '20px' }}>RECEIVED: {stats.received}</span>
                        <span style={{ color: '#2563eb', marginRight: '20px' }}>INSTALLED: {stats.installed}</span>
                        <span style={{ color: '#64748b', marginRight: '20px' }}>NOT DELIVERED: {stats.notDelivered}</span>
                        <span style={{ color: '#059669' }}>COMPLETED: {stats.completed}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </th>
            </tr>
            
            <tr>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Tag No</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Package</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Description</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Deck</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>MRIR No</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Rec Date</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#fef3c7', textAlign: 'center' }}>INSTALLATION</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#fef3c7', textAlign: 'center' }}>Welding</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#fef3c7', textAlign: 'center' }}>Bolting</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#fef3c7', textAlign: 'center' }}>Dim Check</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#e0f2fe', textAlign: 'center' }}>Leveling</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#e0f2fe', textAlign: 'center' }}>Alignment</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Overall Status</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {sortedList.map(item => {
              const rowStatus = calculateRowStatus(item);
              const instStatus = item.installation_status || 'NOT YET'; const instDate = item.installation_date ? `\n(${formatToExcelDate(item.installation_date)})` : '';
              const weldStatus = item.welding_status === 'Completed' ? 'DONE' : (item.welding_status || 'NOT YET'); const weldDate = item.welding_date ? `\n(${formatToExcelDate(item.welding_date)})` : '';
              const boltStatus = item.bolting_status === 'Completed' ? 'DONE' : (item.bolting_status || 'NOT YET'); const boltDate = item.bolting_date ? `\n(${formatToExcelDate(item.bolting_date)})` : '';
              const dimStatus = item.dim_status === 'Completed' ? 'DONE' : (item.dim_status || 'NOT YET'); const dimDate = item.dim_date ? `\n(${formatToExcelDate(item.dim_date)})` : '';
              const levStatus = item.leveling_status === 'Completed' ? 'DONE' : (item.leveling_status || 'NOT YET'); const levDate = item.leveling_date ? `\n(${formatToExcelDate(item.leveling_date)})` : '';
              const alignStatus = item.align_status === 'Completed' ? 'DONE' : (item.align_status || 'NOT YET'); const alignDate = item.align_date ? `\n(${formatToExcelDate(item.align_date)})` : '';

              let statusBg = '#f1f5f9'; let statusColor = '#334155';
              if (rowStatus.label === 'COMPLETED') { statusBg = '#d1fae5'; statusColor = '#047857'; }
              else if (rowStatus.label === 'INSTALLED') { statusBg = '#dbeafe'; statusColor = '#1d4ed8'; }
              else if (rowStatus.label === 'RECEIVED') { statusBg = '#e0f2fe'; statusColor = '#0369a1'; }

              return (
                <tr key={`print-${item.id}`}>
                  <td style={{ border: '1px solid black', padding: '5px 4px', fontWeight: 'bold', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.tag_no}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.package}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.description}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.deck_level}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', fontWeight: 'bold', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.mrir_no || '-'}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle' }}>{formatToExcelDate(item.receiving_date)}</td>
                  <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'middle' }}>{instStatus === 'Completed' ? 'DONE' : instStatus}{instDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'middle' }}>{weldStatus}{weldDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'middle' }}>{boltStatus}{boltDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'middle' }}>{dimStatus}{dimDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'middle' }}>{levStatus}{levDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'middle' }}>{alignStatus}{alignDate}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', backgroundColor: statusBg, color: statusColor }}>
                    {rowStatus.label}
                  </td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', fontSize: '8pt', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.notes || ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}