import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Download, Filter, FileSpreadsheet, LayoutGrid, FileCheck, Database, X, Printer, RefreshCw, Paperclip, Loader, Trash2, AlertCircle, Save, AlertTriangle, Palette } from 'lucide-react';
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

const CustomDateInput = ({ value, onChange, disabled, className, placeholder }) => {
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = value ? formatToExcelDate(value) : '';
  return (
    <input type={isFocused && !disabled ? "date" : "text"} value={isFocused ? (value || '') : displayValue} disabled={disabled} placeholder={placeholder || "dd-mmm-yy"} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={(e) => onChange(e.target.value)} className={className} />
  );
};

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

const ColorNotesCell = ({ item, handleLocalChange, saveToDatabase }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const currentColor = item.pres_notes_color || 'text-slate-600';

  const handleColorChange = (colorClass) => {
    handleLocalChange(item.id, 'pres_notes_color', colorClass);
    saveToDatabase(item.id, 'pres_notes_color', colorClass);
    setShowColorPicker(false);
  };

  return (
    <div className="relative flex flex-col justify-center w-full h-full group">
      <AutoResizeTextarea 
        value={item.pres_notes || ''} 
        placeholder="Pres notes..." 
        textColor={currentColor}
        onChange={(e) => handleLocalChange(item.id, 'pres_notes', e.target.value)} 
        onBlur={(e) => saveToDatabase(item.id, 'pres_notes', e.target.value)} 
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

export default function Preservation() {
  const [equipList, setEquipList] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeck, setFilterDeck] = useState('All');
  const [filterPkg, setFilterPkg] = useState('All');
  const [statusFilters, setStatusFilters] = useState([]);
  const [sortConfig, setSortConfig] = useState([]); 
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const defaultColWidths = { tag: 160, pkg: 105, desc: 220, deck: 120, init: 130, alt: 130, check: 100, freq: 80, start: 110, last: 110, action: 140, next: 110, countdown: 150, notes: 180 };
  const [colWidths, setColWidths] = useState(() => {
    const saved = localStorage.getItem('pres_colWidths');
    return saved ? JSON.parse(saved) : defaultColWidths;
  });

  async function fetchData() {
    const { data: listData } = await supabase.from('master_equipment').select('*').order('created_at', { ascending: true });
    if (listData) setEquipList(listData);
  }
  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    localStorage.setItem('pres_colWidths', JSON.stringify(colWidths));
  }, [colWidths]);

  const handleLocalChange = (id, field, value) => { setEquipList(prevList => prevList.map(item => item.id === id ? { ...item, [field]: value } : item)); };
  const saveToDatabase = async (id, field, value) => { try { const finalValue = (field.includes('date') && value === '') ? null : value; await supabase.from('master_equipment').update({ [field]: finalValue }).eq('id', id); } catch (err) { console.error("Lỗi kết nối:", err); } };

  const calculatePreservation = (item) => {
    if (!item.pres_start_date || !item.pres_freq) { return { nextDate: null, status: { label: 'NO DATA', style: 'bg-slate-100 text-slate-500 border-slate-200', type: 'NO_DATA' } }; }
    let baseDate = new Date(item.pres_start_date);
    if (item.pres_last_date) { baseDate = new Date(item.pres_last_date); }
    const nextDate = new Date(baseDate);
    const freqString = String(item.pres_freq); 
    const freqNumber = parseInt(freqString.replace(/\D/g, '')) || 0;
    if (freqString.toUpperCase().includes('W')) { nextDate.setDate(nextDate.getDate() + freqNumber * 7); } 
    else if (freqString.toUpperCase().includes('M')) { nextDate.setMonth(nextDate.getMonth() + freqNumber); }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let status = {};
    if (diffDays < 0) status = { label: `${Math.abs(diffDays)} DAYS OVERDUE`, style: 'bg-red-50 text-red-600 border-red-200', type: 'OVERDUE' };
    else if (diffDays <= 7) status = { label: `DUE IN ${diffDays} DAYS`, style: 'bg-orange-50 text-orange-600 border-orange-200', type: 'DUE_SOON' };
    else status = { label: `SAFE (${diffDays} DAYS)`, style: 'bg-emerald-50 text-emerald-700 border-emerald-200', type: 'SAFE' };
    return { nextDate: formatToExcelDate(nextDate.toISOString().split('T')[0]), status };
  };

  const uniqueDecks = ['All', ...new Set(equipList.map(item => item.deck_level).filter(Boolean))];
  const uniquePkgs = ['All', ...new Set(equipList.map(item => item.package).filter(Boolean))];

  const duplicateTags = useMemo(() => {
    const tagCounts = equipList.reduce((acc, item) => { const tag = item.tag_no?.trim().toUpperCase(); if (tag) acc[tag] = (acc[tag] || 0) + 1; return acc; }, {});
    return new Set(Object.keys(tagCounts).filter(tag => tagCounts[tag] > 1));
  }, [equipList]);

  const baseFilteredList = equipList.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = (item.tag_no?.toLowerCase().includes(searchLower)) || (item.description?.toLowerCase().includes(searchLower)) || (item.package?.toLowerCase().includes(searchLower)) || (item.deck_level?.toLowerCase().includes(searchLower)) || (item.pres_checksheet?.toLowerCase().includes(searchLower)) || (item.pres_initial_method?.toLowerCase().includes(searchLower)) || (item.pres_notes?.toLowerCase().includes(searchLower));
    const matchDeck = filterDeck === 'All' || item.deck_level === filterDeck;
    const matchPkg = filterPkg === 'All' || item.package === filterPkg;
    return matchSearch && matchDeck && matchPkg;
  });

  const stats = {
    total: baseFilteredList.length,
    requiring: baseFilteredList.filter(i => !!i.pres_freq).length,
    safe: baseFilteredList.filter(i => calculatePreservation(i).status?.type === 'SAFE').length,
    due_soon: baseFilteredList.filter(i => calculatePreservation(i).status?.type === 'DUE_SOON').length,
    overdue: baseFilteredList.filter(i => calculatePreservation(i).status?.type === 'OVERDUE').length,
  };

  const statusFilteredList = baseFilteredList.filter(item => {
    if (statusFilters.length === 0) return true;
    const presData = calculatePreservation(item);
    const isRequiring = !!item.pres_freq;
    const sType = presData.status?.type; 
    return statusFilters.some(f => { if (f === 'REQUIRING') return isRequiring; return sType === f; });
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

  const handleDeleteAllDatabase = async () => {
    if (deleteConfirmText !== 'DELETE') return alert("Vui lòng gõ chữ DELETE để xác nhận!");
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('master_equipment').delete().not('id', 'is', null);
      if (error) throw error;
      setShowDeleteAllModal(false); setDeleteConfirmText(''); fetchData(); alert("Đã xóa sạch cơ sở dữ liệu!");
    } catch (err) { alert("Lỗi khi xóa: " + err.message); } finally { setIsDeleting(false); }
  };

  const handleExportExcelSelection = (mode) => {
    let dataToExport = [];
    if (mode === 'INSTALL_ONLY') { dataToExport = sortedList.map(item => ({ 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Install Date': formatToExcelDate(item.installation_date), 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Overall Status': item.installation_date ? 'COMPLETED' : 'IN PROGRESS', 'Notes': item.notes })); }
    else if (mode === 'PRES_ONLY') { dataToExport = sortedList.map(item => { const presData = calculatePreservation(item); return { 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Next Due Date': presData.nextDate, 'Countdown Status': presData.status.label, 'Pres Notes': item.pres_notes }; }); }
    else { dataToExport = sortedList.map(item => { const presData = calculatePreservation(item); return { 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Install Date': formatToExcelDate(item.installation_date), 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Pres Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Next Due Date': presData.nextDate, 'Countdown Status': presData.status.label, 'Notes': item.notes, 'Pres Notes': item.pres_notes }; }); }
    const ws = XLSX.utils.json_to_sheet(dataToExport); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Export_Log"); XLSX.writeFile(wb, `${mode}_Preservation_${new Date().toISOString().split('T')[0]}.xlsx`); setShowExportModal(false); 
  };
  const exportToWord = () => { const printContent = document.getElementById('printable-matrix').innerHTML; const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Preservation Tracker</title><style>@page { size: A3 landscape; margin: 15mm; } table {width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 10px;} th, td {border: 1px solid black; padding: 4px; text-align: left; vertical-align: middle;} th {background-color: #f8fafc; font-weight: bold; text-align: center;}</style></head><body>`; const sourceHTML = header + printContent + `</body></html>`; const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML); const fileDownload = document.createElement("a"); document.body.appendChild(fileDownload); fileDownload.href = source; fileDownload.download = `Preservation_Tracker_${new Date().toISOString().split('T')[0]}.doc`; fileDownload.click(); document.body.removeChild(fileDownload); };
  
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

  const ActionCell = ({ item }) => {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const getFilesArray = (fileField) => { if (!fileField) return []; try { const parsed = JSON.parse(fileField); if (Array.isArray(parsed)) return parsed; } catch (e) { if (typeof fileField === 'string' && fileField.startsWith('http')) return [{ name: 'Attachment_1.pdf', url: fileField }]; } return []; };
    const files = getFilesArray(item.pres_file);
    const handleFileUpload = async (e) => { const uploadedFiles = Array.from(e.target.files); if (uploadedFiles.length === 0) return; setIsUploading(true); try { const newFilesList = [...files]; for (const file of uploadedFiles) { const fileName = `${item.tag_no.replace(/[^a-zA-Z0-9]/g, '_')}_PRES_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`; await supabase.storage.from('equipment_files').upload(fileName, file); const { data } = supabase.storage.from('equipment_files').getPublicUrl(fileName); newFilesList.push({ name: file.name, url: data.publicUrl }); } const jsonStr = JSON.stringify(newFilesList); handleLocalChange(item.id, 'pres_file', jsonStr); saveToDatabase(item.id, 'pres_file', jsonStr); } catch (err) {} finally { setIsUploading(false); e.target.value = null; } };
    const handleRemoveFile = (index) => { if (window.confirm("Bạn muốn gỡ file này?")) { const updatedFiles = files.filter((_, idx) => idx !== index); const jsonStr = updatedFiles.length > 0 ? JSON.stringify(updatedFiles) : null; handleLocalChange(item.id, 'pres_file', jsonStr); saveToDatabase(item.id, 'pres_file', jsonStr); } };
    return (
        <div className="flex flex-col gap-1 items-center justify-center w-full min-h-[35px]">
            {files.length > 0 && ( <span className="text-[9px] font-black text-slate-400 bg-slate-100 border px-1.5 py-0.5 rounded w-fit uppercase tracking-wider mb-1">Count: {files.length}</span> )}
            <div className="flex flex-col gap-1 w-full items-center">
              {files.map((file, idx) => ( <div key={idx} className="flex items-center h-[20px] border border-emerald-300 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold overflow-hidden w-full max-w-[125px]"><button type="button" onClick={() => window.open(file.url, '_blank')} className="flex-1 px-1.5 text-left truncate hover:bg-emerald-100" title={file.name}>{file.name}</button><button type="button" onClick={() => handleRemoveFile(idx)} className="px-1 bg-white text-red-500 border-l border-emerald-300 h-full flex items-center justify-center hover:bg-red-50 shrink-0"><X size={10} strokeWidth={3}/></button></div> ))}
            </div>
            {isUploading ? ( <div className="text-[9px] font-bold text-blue-600 flex items-center justify-center gap-1 mt-1"><Loader size={10} className="animate-spin"/> Uploading...</div> ) : ( <button onClick={() => fileInputRef.current.click()} disabled={!item.pres_start_date} className={`flex items-center justify-center gap-1 px-2 py-1 rounded border text-[9px] font-black transition-all shadow-sm w-fit mt-1 ${item.pres_start_date ? 'bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border-slate-300' : 'bg-slate-50 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'}`}><Paperclip size={10} /> + Add PDF</button> )}
            <input type="file" ref={fileInputRef} className="hidden" multiple={true} accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
        </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden min-w-0 relative">
      
      {/* MODAL EXPORT EXCEL */}
      {showExportModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-emerald-600" size={24}/> Export Data to Excel</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-full border border-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <button onClick={() => handleExportExcelSelection('PRES_ONLY')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50 transition-all text-left group">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors"><FileCheck size={24} /></div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">Preservation Tracker Only</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1">Export only preservation-related columns (Method, Frequency, Last Done, Next Due, etc.)</p>
                </div>
              </button>
              <button onClick={() => handleExportExcelSelection('INSTALL_ONLY')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><LayoutGrid size={24} /></div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">Installation Matrix Only</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1">Export only construction-related columns (MRIR, Install Date, Welding, Bolting, etc.)</p>
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
                <button onClick={handleDeleteAllDatabase} disabled={isDeleting || deleteConfirmText !== 'DELETE'} className={`px-5 py-2 font-black text-white rounded-xl flex items-center gap-2 ${deleteConfirmText === 'DELETE' ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30' : 'bg-red-300 cursor-not-allowed'}`}>
                  {isDeleting ? <Loader size={16} className="animate-spin"/> : <Trash2 size={16}/>} XÓA TẤT CẢ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BỘ LỌC ĐỒNG BỘ MÀU CHUẨN */}
      <div className="flex-none border-b border-slate-200 p-3 px-6 flex justify-between items-center bg-white z-20 overflow-x-auto gap-4 min-h-[70px]">
         <div className="flex gap-2 shrink-0">
           <button onClick={() => handleToggleFilter('All')} className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${statusFilters.length === 0 ? 'bg-purple-50 ring-1 ring-purple-300 shadow-inner opacity-100 border-purple-200' : 'bg-white border-slate-200 opacity-60 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.length === 0 ? 'text-purple-600' : 'text-slate-500'}`}>Total</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.length === 0 ? 'text-purple-700' : 'text-purple-600'}`}>{stats.total}</span>
           </button>
           <button onClick={() => handleToggleFilter('SAFE')} className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${statusFilters.includes('SAFE') ? 'bg-emerald-50 ring-1 ring-emerald-300 shadow-inner opacity-100 border-emerald-200' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('SAFE') ? 'text-emerald-600' : 'text-slate-500'}`}>Safe</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('SAFE') ? 'text-emerald-700' : 'text-emerald-600'}`}>{stats.safe}</span>
           </button>
           <button onClick={() => handleToggleFilter('DUE_SOON')} className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${statusFilters.includes('DUE_SOON') ? 'bg-orange-50 ring-1 ring-orange-300 shadow-inner opacity-100 border-orange-200' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('DUE_SOON') ? 'text-orange-600' : 'text-slate-500'}`}>Due Soon</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('DUE_SOON') ? 'text-orange-700' : 'text-orange-500'}`}>{stats.due_soon}</span>
           </button>
           <button onClick={() => handleToggleFilter('OVERDUE')} className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${statusFilters.includes('OVERDUE') ? 'bg-red-50 ring-1 ring-red-300 shadow-inner opacity-100 border-red-200' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('OVERDUE') ? 'text-red-600' : 'text-slate-500'}`}>Overdue</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('OVERDUE') ? 'text-red-700' : 'text-red-600'}`}>{stats.overdue}</span>
           </button>
         </div>
         
         <div className="flex gap-2 items-center shrink-0">
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

            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full pl-8 pr-3 py-1.5 h-[36px] bg-slate-50 border border-slate-200 rounded-md text-xs font-bold focus:outline-none"/>
            </div>

            <button onClick={exportToPDF} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 px-3 h-[36px] rounded-md border border-slate-300 transition-colors shadow-sm text-xs font-bold"><Printer size={12} /> PDF</button>
            <button onClick={exportToWord} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 px-3 h-[36px] rounded-md border border-slate-300 transition-colors shadow-sm text-xs font-bold"><Download size={12} /> Word</button>
            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 px-3 h-[36px] rounded-md border border-slate-300 transition-colors shadow-sm text-xs font-bold"><Download size={12} /> Excel</button>
            <button onClick={fetchData} className="p-2 h-[36px] border border-slate-300 rounded-md bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><RefreshCw size={14}/></button>
         </div>
      </div>

      {/* LƯỚI DATA GIAO DIỆN WEB */}
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
                  <th style={{ width: colWidths.init }} className="p-0 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20">
                    <div onClick={(e) => handleSort('pres_initial_method', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      Init Method {getSortIndicator('pres_initial_method')}
                    </div>
                    <Resizer colKey="init" />
                  </th>
                  <th style={{ width: colWidths.alt }} className="p-0 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20">
                    <div onClick={(e) => handleSort('pres_alternate_method', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      Alt Method {getSortIndicator('pres_alternate_method')}
                    </div>
                    <Resizer colKey="alt" />
                  </th>
                  <th style={{ width: colWidths.check }} className="p-0 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20">
                    <div onClick={(e) => handleSort('pres_checksheet', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      Checksheet {getSortIndicator('pres_checksheet')}
                    </div>
                    <Resizer colKey="check" />
                  </th>
                  <th style={{ width: colWidths.freq }} className="p-0 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20">
                    <div onClick={(e) => handleSort('pres_freq', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      Freq {getSortIndicator('pres_freq')}
                    </div>
                    <Resizer colKey="freq" />
                  </th>
                  <th style={{ width: colWidths.start }} className="p-0 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20">
                    <div onClick={(e) => handleSort('pres_start_date', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors text-slate-700">
                      Start Date {getSortIndicator('pres_start_date')}
                    </div>
                    <Resizer colKey="start" />
                  </th>
                  <th style={{ width: colWidths.last }} className="p-0 sticky top-0 z-20 bg-[#eff6ff] shadow-[inset_0_-2px_0_0_#bfdbfe]">
                    <div onClick={(e) => handleSort('pres_last_date', e)} className="w-full h-full p-2 flex items-center justify-center cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors text-slate-700">
                      Last Done {getSortIndicator('pres_last_date')}
                    </div>
                    <Resizer colKey="last" />
                  </th>
                  <th style={{ width: colWidths.action }} className="p-2 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20 text-center text-slate-700">Action <Resizer colKey="action" /></th>
                  <th style={{ width: colWidths.next }} className="p-2 sticky top-0 z-20 text-center bg-[#fffbeb] shadow-[inset_0_-2px_0_0_#fde68a] text-slate-700">Next Due <Resizer colKey="next" /></th>
                  <th style={{ width: colWidths.countdown }} className="p-2 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20 text-center text-slate-700">Countdown <Resizer colKey="countdown" /></th>
                  <th style={{ width: colWidths.notes }} className="p-2 sticky top-0 bg-slate-100 shadow-[inset_0_-2px_0_0_#cbd5e1] z-20 text-center text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {sortedList.map((item) => {
                  const presData = calculatePreservation(item);
                  const isDuplicate = duplicateTags.has(item.tag_no?.trim().toUpperCase());

                  return (
                    <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                      <td className={`p-3 align-middle sticky left-0 z-[15] overflow-hidden text-left shadow-[3px_0_5px_-2px_rgba(0,0,0,0.15)] transition-colors ${isDuplicate ? 'bg-red-50' : 'bg-white group-hover:bg-slate-50'}`}>
                         <div className="inline-flex flex-col items-start justify-center h-full gap-1.5 w-full">
                           <span className={`font-black text-sm w-full whitespace-normal break-words ${isDuplicate ? 'text-red-600' : 'text-slate-800'}`} title={item.tag_no}>
                             {isDuplicate && <AlertCircle size={14} className="inline mr-1 text-red-500 animate-pulse"/>}
                             {item.tag_no}
                           </span>
                         </div>
                      </td>

                      <td className="p-2 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.package || ''} onChange={(e) => handleLocalChange(item.id, 'package', e.target.value.toUpperCase())} onBlur={(e) => saveToDatabase(item.id, 'package', e.target.value.toUpperCase())} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border-transparent hover:border-slate-300 text-slate-700 font-bold text-[11px] uppercase rounded px-1 outline-none resize-none" />
                      </td>
                      <td className="p-2 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.description || ''} onChange={(e) => handleLocalChange(item.id, 'description', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'description', e.target.value)} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border-transparent hover:border-slate-300 text-slate-700 font-bold text-xs rounded px-1 outline-none resize-none" />
                      </td>
                      <td className="p-2 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.deck_level || ''} onChange={(e) => handleLocalChange(item.id, 'deck_level', e.target.value.toUpperCase())} onBlur={(e) => saveToDatabase(item.id, 'deck_level', e.target.value.toUpperCase())} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border-transparent hover:border-slate-300 text-slate-700 font-medium text-[11px] uppercase rounded px-1 outline-none resize-none" />
                      </td>
                      <td className="p-2 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.pres_initial_method || ''} placeholder="Init method..." onChange={(e) => handleLocalChange(item.id, 'pres_initial_method', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_initial_method', e.target.value)} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-medium text-slate-700 outline-none resize-none px-1" />
                      </td>
                      <td className="p-2 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.pres_alternate_method || ''} placeholder="Alt method..." onChange={(e) => handleLocalChange(item.id, 'pres_alternate_method', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_alternate_method', e.target.value)} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-medium text-slate-700 outline-none resize-none px-1" />
                      </td>
                      <td className="p-2 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.pres_checksheet || ''} placeholder="Checksheet..." onChange={(e) => handleLocalChange(item.id, 'pres_checksheet', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_checksheet', e.target.value)} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-black text-slate-800 outline-none resize-none px-1" />
                      </td>
                      <td className="p-2 align-middle text-left bg-white group-hover:bg-slate-50 transition-colors">
                        <AutoResizeTextarea value={item.pres_freq || ''} placeholder="Freq..." onChange={(e) => handleLocalChange(item.id, 'pres_freq', e.target.value.toUpperCase())} onBlur={(e) => saveToDatabase(item.id, 'pres_freq', e.target.value.toUpperCase())} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-bold text-slate-700 uppercase outline-none resize-none px-1" />
                      </td>
                      <td className="p-2 align-middle text-center bg-white group-hover:bg-slate-50 transition-colors">
                         <div className="flex justify-center w-full">
                           <CustomDateInput value={item.pres_start_date} placeholder="Start Date" onChange={(val) => { handleLocalChange(item.id, 'pres_start_date', val); saveToDatabase(item.id, 'pres_start_date', val); }} className={`w-full px-1 py-1.5 hover:bg-white focus:bg-white rounded text-[11px] font-bold outline-none cursor-pointer text-center bg-transparent border border-transparent hover:border-slate-300 ${item.pres_start_date ? 'text-slate-800' : 'text-slate-400'}`} />
                         </div>
                      </td>
                      <td className="p-2 align-middle text-center bg-white group-hover:bg-slate-50 transition-colors">
                         <div className="flex justify-center w-full">
                           <CustomDateInput value={item.pres_last_date} placeholder="Last Done" onChange={(val) => { handleLocalChange(item.id, 'pres_last_date', val); saveToDatabase(item.id, 'pres_last_date', val); }} className={`w-full px-1 py-1.5 hover:bg-white focus:bg-white rounded text-[11px] font-bold outline-none cursor-pointer text-center bg-transparent border border-transparent hover:border-slate-300 ${item.pres_last_date ? 'text-blue-700' : 'text-slate-400'}`} />
                         </div>
                      </td>

                      <td className="p-2 align-middle text-center bg-white group-hover:bg-slate-50 transition-colors">
                        <ActionCell item={item} />
                      </td>

                      <td className="p-3 align-middle text-center font-black text-xs text-slate-700 bg-white group-hover:bg-slate-50 transition-colors">
                        {presData.nextDate || '-'}
                      </td>
                      
                      <td className="p-3 align-middle text-center bg-white group-hover:bg-slate-50 transition-colors">
                        <span className={`px-2 py-1.5 rounded text-[9px] font-black border uppercase block w-full text-center truncate ${presData.status.style}`}>
                          {presData.status.label}
                        </span>
                      </td>

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
            <col style={{ width: '9%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>

          <thead>
            <tr>
              <th colSpan="13" style={{ border: 'none', padding: 0, backgroundColor: 'white' }}>
                <table style={{ width: '100%', borderBottom: '2px solid black', marginBottom: '12px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '20%', fontWeight: 'bold', fontSize: '12pt', textAlign: 'left', border: 'none', padding: '0 0 8px 0' }}>
                        MCDERMOTT<br/>PTSC
                      </td>
                      <td style={{ width: '60%', textAlign: 'center', fontWeight: '900', fontSize: '18pt', textTransform: 'uppercase', border: 'none', padding: '0 0 8px 0' }}>
                        VIETNAM BLOCK B GAS PROJECT<br/>PRESERVATION TRACKER
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
                        <span style={{ color: '#059669', marginRight: '20px' }}>SAFE: {stats.safe}</span>
                        <span style={{ color: '#d97706', marginRight: '20px' }}>DUE SOON: {stats.due_soon}</span>
                        <span style={{ color: '#dc2626' }}>OVERDUE: {stats.overdue}</span>
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
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Init Method</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Alt Method</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Checksheet</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Freq</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#fef3c7', textAlign: 'center' }}>Start Date</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#e0f2fe', textAlign: 'center' }}>Last Done</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#fef3c7', textAlign: 'center' }}>Next Due</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Status</th>
              <th style={{ border: '1px solid black', padding: '6px 4px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {sortedList.map(item => {
              const presData = calculatePreservation(item);
              
              let statusBg = '#f1f5f9'; let statusColor = '#334155';
              if (presData.status.type === 'SAFE') { statusBg = '#d1fae5'; statusColor = '#047857'; }
              else if (presData.status.type === 'DUE_SOON') { statusBg = '#ffedd5'; statusColor = '#b45309'; }
              else if (presData.status.type === 'OVERDUE') { statusBg = '#fee2e2'; statusColor = '#b91c1c'; }

              return (
                <tr key={`print-${item.id}`}>
                  <td style={{ border: '1px solid black', padding: '5px 4px', fontWeight: 'bold', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.tag_no}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.package}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.description}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.deck_level}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.pres_initial_method}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.pres_alternate_method}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.pres_checksheet}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle', wordBreak: 'break-word' }}>{item.pres_freq}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle' }}>{formatToExcelDate(item.pres_start_date)}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', fontWeight: 'bold', color: '#1d4ed8', textAlign: 'center', verticalAlign: 'middle' }}>{formatToExcelDate(item.pres_last_date)}</td>
                  <td style={{ border: '1px solid black', padding: '5px 4px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }}>{presData.nextDate || '-'}</td>
                  
                  <td style={{ border: '1px solid black', padding: '5px 4px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', backgroundColor: statusBg, color: statusColor }}>
                    {presData.status.label}
                  </td>
                  
                  <td style={{ border: '1px solid black', padding: '5px 4px', textAlign: 'left', verticalAlign: 'middle', fontSize: '8pt', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.pres_notes || ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}