import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Download, Filter, FileSpreadsheet, LayoutGrid, FileCheck, Database, X, Printer, RefreshCw, Paperclip, Loader, Trash2, AlertCircle, Upload, Save, AlertTriangle } from 'lucide-react';
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
    <textarea ref={textareaRef} value={value || ''} onChange={(e) => { onChange(e); resize(); }} onBlur={onBlur} placeholder={placeholder} rows={1} className={`${className} overflow-hidden resize-none block w-full leading-relaxed`} />
  );
};

export default function Preservation() {
  const [equipList, setEquipList] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeck, setFilterDeck] = useState('All');
  const [filterPkg, setFilterPkg] = useState('All');
  const [statusFilters, setStatusFilters] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showExportModal, setShowExportModal] = useState(false);

  const importFileRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImportData, setPendingImportData] = useState([]);
  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
  const [importSortOption, setImportSortOption] = useState('ORIGINAL');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [colWidths, setColWidths] = useState({ tag: 160, pkg: 105, desc: 220, deck: 120, init: 130, alt: 130, check: 100, freq: 80, start: 110, last: 110, action: 140, next: 110, countdown: 150, notes: 180 });

  async function fetchData() {
    // SỬA LỖI: Dùng created_at thay vì id
    const { data: listData } = await supabase.from('master_equipment').select('*').order('created_at', { ascending: true });
    if (listData) setEquipList(listData);
  }
  useEffect(() => { fetchData(); }, []);

  const handleLocalChange = (id, field, value) => { setEquipList(prevList => prevList.map(item => item.id === id ? { ...item, [field]: value } : item)); };
  const saveToDatabase = async (id, field, value) => { try { const finalValue = (field.includes('date') && value === '') ? null : value; await supabase.from('master_equipment').update({ [field]: finalValue }).eq('id', id); } catch (err) { console.error("Lỗi kết nối:", err); } };

  const calculatePreservation = (item) => {
    if (!item.pres_start_date || !item.pres_freq) { return { nextDate: null, status: { label: 'NO DATA', style: 'bg-slate-100 text-slate-500 border-slate-200' } }; }
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

  // TỐI ƯU SORTING: Có numeric:true
  let sortedList = statusFilteredList;
  if (sortConfig.key) {
    sortedList = [...statusFilteredList].sort((a, b) => {
      const aVal = String(a[sortConfig.key] || '');
      const bVal = String(b[sortConfig.key] || '');
      const compareResult = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? compareResult : -compareResult;
    });
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
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
  const Resizer = ({ colKey }) => <div onMouseDown={(e) => handleResizeStart(e, colKey)} onClick={(e) => e.stopPropagation()} className="absolute top-0 right-0 w-[6px] h-full cursor-col-resize hover:bg-blue-400 z-30 transition-colors" style={{ transform: 'translateX(50%)' }} />;

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
    // TỐI ƯU SORTING IMPORT: Có numeric:true
    if (importSortOption === 'TAG') finalPayloads.sort((a,b) => String(a.tag_no).localeCompare(String(b.tag_no), undefined, { numeric: true }));
    else if (importSortOption === 'PKG') finalPayloads.sort((a,b) => String(a.package||'').localeCompare(String(b.package||''), undefined, { numeric: true }));
    else if (importSortOption === 'DECK') finalPayloads.sort((a,b) => String(a.deck_level||'').localeCompare(String(b.deck_level||''), undefined, { numeric: true }));

    try {
      await supabase.from('master_equipment').insert(finalPayloads); 
      alert(`Đã Import thành công ${finalPayloads.length} thiết bị!`); 
      setShowImportOptionsModal(false); setPendingImportData([]); fetchData();
    } catch (err) { alert("Lỗi khi import: " + err.message); } finally { setIsImporting(false); }
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

  const handleExportExcelSelection = (mode) => {
    let dataToExport = [];
    if (mode === 'INSTALL_ONLY') { dataToExport = sortedList.map(item => ({ 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Install Date': formatToExcelDate(item.installation_date), 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Overall Status': item.installation_date ? 'COMPLETED' : 'IN PROGRESS', 'Notes': item.notes })); }
    else if (mode === 'PRES_ONLY') { dataToExport = sortedList.map(item => { const presData = calculatePreservation(item); return { 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Next Due Date': presData.nextDate, 'Countdown Status': presData.status.label, 'Pres Notes': item.pres_notes }; }); }
    else { dataToExport = sortedList.map(item => { const presData = calculatePreservation(item); return { 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Install Date': formatToExcelDate(item.installation_date), 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Pres Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Next Due Date': presData.nextDate, 'Countdown Status': presData.status.label, 'Notes': item.notes, 'Pres Notes': item.pres_notes }; }); }
    const ws = XLSX.utils.json_to_sheet(dataToExport); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Export_Log"); XLSX.writeFile(wb, `${mode}_Preservation_${new Date().toISOString().split('T')[0]}.xlsx`); setShowExportModal(false); 
  };
  const exportToWord = () => { const printContent = document.getElementById('printable-matrix').innerHTML; const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Preservation Tracker</title><style>@page { size: landscape; margin: 1cm; } table {width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 10px;} th, td {border: 1px solid black; padding: 4px; text-align: left; vertical-align: middle;} th {background-color: #f8fafc; font-weight: bold; text-align: center;}</style></head><body>`; const sourceHTML = header + printContent + `</body></html>`; const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML); const fileDownload = document.createElement("a"); document.body.appendChild(fileDownload); fileDownload.href = source; fileDownload.download = `Preservation_Tracker_${new Date().toISOString().split('T')[0]}.doc`; fileDownload.click(); document.body.removeChild(fileDownload); };
  const exportToPDF = () => { const printContent = document.getElementById('printable-matrix').innerHTML; const originalContent = document.body.innerHTML; document.body.innerHTML = `<div id="print-container"><style>@media print { body { background: white !important; margin: 0; padding: 0; } #print-container { width: 100%; font-family: Arial, sans-serif; padding: 8mm; } @page { size: A4 landscape; margin: 5mm; } table { width: 100%; border-collapse: collapse; font-size: 8.5px; } th, td { border: 1px solid #000; padding: 5px; text-align: left; vertical-align: middle; } th { background-color: #f8fafc !important; font-weight: bold; text-transform: uppercase; text-align: center; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }</style>${printContent}</div>`; window.print(); document.body.innerHTML = originalContent; window.location.reload(); };

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
      <input type="file" accept=".xlsx, .xls, .csv" ref={importFileRef} className="hidden" onChange={handleFileSelect} />
      
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

      {showExportModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between bg-slate-50 items-center">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-emerald-600" size={24}/> Export</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-red-500 p-2"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <button onClick={() => handleExportExcelSelection('PRES_ONLY')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50 text-left group">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-lg group-hover:bg-amber-600 group-hover:text-white"><FileCheck size={24} /></div>
                <div><h4 className="font-black text-sm">Preservation Tracker Only</h4><p className="text-xs text-slate-500">Only preservation columns.</p></div>
              </button>
              <button onClick={() => handleExportExcelSelection('INSTALL_ONLY')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 text-left group">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white"><LayoutGrid size={24} /></div>
                <div><h4 className="font-black text-sm">Installation Matrix Only</h4><p className="text-xs text-slate-500">Only construction columns.</p></div>
              </button>
              <button onClick={() => handleExportExcelSelection('MASTER_FULL')} className="flex items-start gap-4 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:border-purple-500 hover:bg-purple-100 text-left group">
                <div className="bg-purple-200 text-purple-700 p-3 rounded-lg group-hover:bg-purple-600 group-hover:text-white"><Database size={24} /></div>
                <div><h4 className="font-black text-purple-900 text-sm">Master Full Database</h4><p className="text-xs text-purple-700/80">Export all columns.</p></div>
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
      <div className="flex-none border-b border-slate-200 p-3 px-6 flex justify-between items-center bg-white z-20 min-h-[70px]">
         <div className="flex gap-2 shrink-0">
           <button onClick={() => handleToggleFilter('All')} className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.length === 0 ? 'bg-purple-50 ring-1 ring-purple-300 shadow-inner' : 'bg-white border-slate-200 opacity-60 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.length === 0 ? 'text-purple-600' : 'text-slate-500'}`}>Total</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.length === 0 ? 'text-purple-700' : 'text-purple-600'}`}>{stats.total}</span>
           </button>
           <button onClick={() => handleToggleFilter('SAFE')} className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('SAFE') ? 'bg-emerald-50 ring-1 ring-emerald-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('SAFE') ? 'text-emerald-600' : 'text-slate-500'}`}>Safe</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('SAFE') ? 'text-emerald-700' : 'text-emerald-600'}`}>{stats.safe}</span>
           </button>
           <button onClick={() => handleToggleFilter('DUE_SOON')} className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('DUE_SOON') ? 'bg-orange-50 ring-1 ring-orange-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('DUE_SOON') ? 'text-orange-600' : 'text-slate-500'}`}>Due Soon</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('DUE_SOON') ? 'text-orange-700' : 'text-orange-500'}`}>{stats.due_soon}</span>
           </button>
           <button onClick={() => handleToggleFilter('OVERDUE')} className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('OVERDUE') ? 'bg-red-50 ring-1 ring-red-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
             <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.includes('OVERDUE') ? 'text-red-600' : 'text-slate-500'}`}>Overdue</span>
             <span className={`text-2xl font-black leading-none ${statusFilters.includes('OVERDUE') ? 'text-red-700' : 'text-red-600'}`}>{stats.overdue}</span>
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
            <button onClick={exportToPDF} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 px-3 h-[36px] rounded-md border border-slate-300 transition-colors shadow-sm text-xs font-bold"><Printer size={12} /> PDF</button>
            <button onClick={exportToWord} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 px-3 h-[36px] rounded-md border border-slate-300 transition-colors shadow-sm text-xs font-bold"><Download size={12} /> Word</button>
            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 px-3 h-[36px] rounded-md border border-slate-300 transition-colors shadow-sm text-xs font-bold"><Download size={12} /> Excel</button>
            <button onClick={fetchData} className="p-2 h-[36px] border border-slate-300 rounded-md bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><RefreshCw size={14}/></button>
         </div>
      </div>

      {/* LƯỚI DATA CÓ KÉO GIÃN VÀ CĂN GIỮA DỌC (ALIGN-MIDDLE) */}
      <div className="flex-1 p-4 overflow-hidden min-w-0">
          <div className="w-full h-full overflow-auto bg-white shadow-sm border border-slate-300 rounded-lg relative">
            <table className="w-full text-left border-collapse min-w-max relative table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-300 text-slate-600 uppercase text-[10px] font-black tracking-wider text-center">
                  <th style={{ width: colWidths.tag }} className="p-0 border-r border-slate-300 sticky left-0 top-0 bg-slate-50 z-20">
                    <div onClick={() => handleSort('tag_no')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors">
                      Tag No {sortConfig.key === 'tag_no' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="tag" />
                  </th>
                  <th style={{ width: colWidths.pkg }} className="p-0 border-r border-slate-300 sticky top-0 bg-slate-50 z-10">
                    <div onClick={() => handleSort('package')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors">
                      Package {sortConfig.key === 'package' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="pkg" />
                  </th>
                  <th style={{ width: colWidths.desc }} className="p-0 border-r border-slate-300 sticky top-0 bg-slate-50 z-10">
                    <div onClick={() => handleSort('description')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors">
                      Description {sortConfig.key === 'description' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="desc" />
                  </th>
                  <th style={{ width: colWidths.deck }} className="p-0 border-r border-slate-300 sticky top-0 bg-slate-50 z-10">
                    <div onClick={() => handleSort('deck_level')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors">
                      Deck {sortConfig.key === 'deck_level' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="deck" />
                  </th>
                  <th style={{ width: colWidths.init }} className="p-0 border-r border-slate-300 sticky top-0 bg-slate-50 z-10">
                    <div onClick={() => handleSort('pres_initial_method')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors">
                      Init Method {sortConfig.key === 'pres_initial_method' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="init" />
                  </th>
                  <th style={{ width: colWidths.alt }} className="p-0 border-r border-slate-300 sticky top-0 bg-slate-50 z-10">
                    <div onClick={() => handleSort('pres_alternate_method')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors">
                      Alt Method {sortConfig.key === 'pres_alternate_method' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="alt" />
                  </th>
                  <th style={{ width: colWidths.check }} className="p-0 border-r border-slate-300 sticky top-0 bg-slate-50 z-10">
                    <div onClick={() => handleSort('pres_checksheet')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors">
                      Checksheet {sortConfig.key === 'pres_checksheet' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="check" />
                  </th>
                  <th style={{ width: colWidths.freq }} className="p-0 border-r border-slate-300 sticky top-0 bg-slate-50 z-10">
                    <div onClick={() => handleSort('pres_freq')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors">
                      Freq {sortConfig.key === 'pres_freq' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="freq" />
                  </th>
                  <th style={{ width: colWidths.start }} className="p-0 border-r border-slate-300 sticky top-0 bg-slate-50 z-10">
                    <div onClick={() => handleSort('pres_start_date')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors">
                      Start Date {sortConfig.key === 'pres_start_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="start" />
                  </th>
                  <th style={{ width: colWidths.last }} className="p-0 border-r border-slate-300 sticky top-0 z-10 bg-blue-50/50">
                    <div onClick={() => handleSort('pres_last_date')} className="w-full h-full p-3 flex items-center justify-center gap-1 cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors">
                      Last Done {sortConfig.key === 'pres_last_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <Resizer colKey="last" />
                  </th>
                  <th style={{ width: colWidths.action }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Action <Resizer colKey="action" /></th>
                  <th style={{ width: colWidths.next }} className="p-3 border-r border-slate-300 sticky top-0 z-10 text-center bg-amber-50/50">Next Due <Resizer colKey="next" /></th>
                  <th style={{ width: colWidths.countdown }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Countdown <Resizer colKey="countdown" /></th>
                  <th style={{ width: colWidths.notes }} className="p-3 sticky top-0 bg-slate-50 z-10 border-b-2 border-slate-300 text-center">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedList.map((item) => {
                  const presData = calculatePreservation(item);
                  const isDuplicate = duplicateTags.has(item.tag_no?.trim().toUpperCase());
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className={`p-3 pl-4 border-r border-b border-slate-300 align-middle text-left sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors overflow-hidden whitespace-normal break-words ${isDuplicate ? 'bg-red-50 border-y border-y-red-300' : ''}`}>
                         <div className="flex flex-col justify-center h-full gap-1.5">
                           <span className={`font-black text-sm w-full whitespace-normal break-words ${isDuplicate ? 'text-red-600' : 'text-slate-800'}`} title={item.tag_no}>{isDuplicate && <AlertCircle size={14} className="inline mr-1 text-red-500 animate-pulse"/>}{item.tag_no}</span>
                         </div>
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-left">
                        <AutoResizeTextarea value={item.package || ''} onChange={(e) => handleLocalChange(item.id, 'package', e.target.value.toUpperCase())} onBlur={(e) => saveToDatabase(item.id, 'package', e.target.value.toUpperCase())} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border-transparent hover:border-slate-300 text-slate-700 font-bold text-[11px] uppercase rounded px-1 outline-none resize-none" />
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-left">
                        <AutoResizeTextarea value={item.description || ''} onChange={(e) => handleLocalChange(item.id, 'description', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'description', e.target.value)} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border-transparent hover:border-slate-300 text-slate-700 font-bold text-xs rounded px-1 outline-none resize-none" />
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-left">
                        <AutoResizeTextarea value={item.deck_level || ''} onChange={(e) => handleLocalChange(item.id, 'deck_level', e.target.value.toUpperCase())} onBlur={(e) => saveToDatabase(item.id, 'deck_level', e.target.value.toUpperCase())} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border-transparent hover:border-slate-300 text-slate-700 font-medium text-[11px] uppercase rounded px-1 outline-none resize-none" />
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-left">
                        <AutoResizeTextarea value={item.pres_initial_method || ''} placeholder="Init method..." onChange={(e) => handleLocalChange(item.id, 'pres_initial_method', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_initial_method', e.target.value)} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-medium text-slate-700 outline-none resize-none px-1" />
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-left">
                        <AutoResizeTextarea value={item.pres_alternate_method || ''} placeholder="Alt method..." onChange={(e) => handleLocalChange(item.id, 'pres_alternate_method', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_alternate_method', e.target.value)} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-medium text-slate-700 outline-none resize-none px-1" />
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-left">
                        <AutoResizeTextarea value={item.pres_checksheet || ''} placeholder="Checksheet..." onChange={(e) => handleLocalChange(item.id, 'pres_checksheet', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_checksheet', e.target.value)} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-black text-slate-800 outline-none resize-none px-1" />
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-left">
                        <AutoResizeTextarea value={item.pres_freq || ''} placeholder="Freq..." onChange={(e) => handleLocalChange(item.id, 'pres_freq', e.target.value.toUpperCase())} onBlur={(e) => saveToDatabase(item.id, 'pres_freq', e.target.value.toUpperCase())} className="text-left bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-bold text-slate-700 uppercase outline-none resize-none px-1" />
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-center">
                         <div className="flex justify-center w-full">
                           <CustomDateInput value={item.pres_start_date} placeholder="Start Date" onChange={(val) => { handleLocalChange(item.id, 'pres_start_date', val); saveToDatabase(item.id, 'pres_start_date', val); }} className={`w-full px-1 py-1.5 hover:bg-white focus:bg-white rounded text-[11px] font-bold outline-none cursor-pointer text-center bg-transparent border border-transparent hover:border-slate-300 ${item.pres_start_date ? 'text-slate-800' : 'text-slate-400'}`} />
                         </div>
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-center">
                         <div className="flex justify-center w-full">
                           <CustomDateInput value={item.pres_last_date} placeholder="Last Done" onChange={(val) => { handleLocalChange(item.id, 'pres_last_date', val); saveToDatabase(item.id, 'pres_last_date', val); }} className={`w-full px-1 py-1.5 hover:bg-white focus:bg-white rounded text-[11px] font-bold outline-none cursor-pointer text-center bg-transparent border border-transparent hover:border-slate-300 ${item.pres_last_date ? 'text-blue-700' : 'text-slate-400'}`} />
                         </div>
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-middle overflow-hidden text-center">
                        <ActionCell item={item} />
                      </td>
                      <td className="p-3 border-r border-b border-slate-300 text-center font-black text-xs text-slate-700 align-middle overflow-hidden">
                        {presData.nextDate || '-'}
                      </td>
                      <td className="p-3 border-r border-b border-slate-300 text-center align-middle overflow-hidden">
                        <span className={`px-2 py-1.5 rounded text-[9px] font-black border uppercase block w-full text-center truncate ${presData.status.style}`}>
                          {presData.status.label}
                        </span>
                      </td>
                      <td className="p-2 border-b border-slate-300 align-middle overflow-hidden text-left">
                         <AutoResizeTextarea value={item.pres_notes || ''} placeholder="Notes..." onChange={(e) => handleLocalChange(item.id, 'pres_notes', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_notes', e.target.value)} className="w-full px-1 py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-300 rounded text-[10px] font-medium text-slate-500 outline-none resize-none text-left" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>

      {/* BẢNG IN CHUẨN */}
      <div id="printable-matrix" className="hidden">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px' }}>MCDERMOTT<br/>PTSC</div>
          <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '18px', textTransform: 'uppercase' }}>VIETNAM BLOCK B GAS PROJECT<br/>PRESERVATION TRACKER</div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'right' }}>PETROVIETNAM<br/>PQPOC<div style={{ fontWeight: 'normal', fontSize: '10px', marginTop: '4px' }}>Printed: {formatToExcelDate(new Date().toISOString())}</div></div>
        </div>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#f1f5f9', padding: '10px', border: '1px solid black' }}>
          <span>TOTAL: {stats.total}</span><span style={{ color: '#059669' }}>SAFE: {stats.safe}</span><span style={{ color: '#d97706' }}>DUE SOON: {stats.due_soon}</span><span style={{ color: '#dc2626' }}>OVERDUE: {stats.overdue}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e2e8f0', textAlign: 'center' }}>Tag No</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e2e8f0', textAlign: 'center' }}>Package</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e2e8f0', textAlign: 'center' }}>Description</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e2e8f0', textAlign: 'center' }}>Deck</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e2e8f0', textAlign: 'center' }}>Init Method</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e2e8f0', textAlign: 'center' }}>Alt Method</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e2e8f0', textAlign: 'center' }}>Checksheet</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e2e8f0', textAlign: 'center' }}>Freq</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#fef3c7', textAlign: 'center' }}>Start Date</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e0f2fe', textAlign: 'center' }}>Last Done Date</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#fef3c7', textAlign: 'center' }}>Next Due Date</th>
              <th style={{ border: '1px solid black', padding: '5px', backgroundColor: '#e2e8f0', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedList.map(item => {
              const presData = calculatePreservation(item);
              return (
                <tr key={`print-${item.id}`}>
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', textAlign: 'left', verticalAlign: 'middle' }}>{item.tag_no}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left', verticalAlign: 'middle' }}>{item.package}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left', verticalAlign: 'middle' }}>{item.description}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left', verticalAlign: 'middle' }}>{item.deck_level}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left', verticalAlign: 'middle' }}>{item.pres_initial_method}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left', verticalAlign: 'middle' }}>{item.pres_alternate_method}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left', verticalAlign: 'middle' }}>{item.pres_checksheet}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left', verticalAlign: 'middle' }}>{item.pres_freq}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', verticalAlign: 'middle' }}>{formatToExcelDate(item.pres_start_date)}</td>
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', color: '#1d4ed8', textAlign: 'center', verticalAlign: 'middle' }}>{formatToExcelDate(item.pres_last_date)}</td>
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }}>{presData.nextDate || '-'}</td>
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }}>{presData.status.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}