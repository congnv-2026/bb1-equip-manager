import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Download, Filter, FileSpreadsheet, LayoutGrid, FileCheck, Database, X, Printer, RefreshCw, Paperclip, Loader, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';

// --- UTILITY: FORMAT DATE TO dd-mmm-yy ---
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

// --- COMPONENT: SMART DATE INPUT ---
const CustomDateInput = ({ value, onChange, disabled, className, placeholder }) => {
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = value ? formatToExcelDate(value) : '';
  
  return (
    <input
      type={isFocused && !disabled ? "date" : "text"}
      value={isFocused ? (value || '') : displayValue}
      disabled={disabled}
      placeholder={placeholder || "dd-mmm-yy"}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    />
  );
};

export default function Preservation() {
  const [equipList, setEquipList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeck, setFilterDeck] = useState('All');
  const [statusFilters, setStatusFilters] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);

  // ENGINE ĐỘ RỘNG CỘT
  const [colWidths, setColWidths] = useState({
    tag: 160, pkg: 105, desc: 220, deck: 120, init: 130, alt: 130, 
    check: 100, freq: 80, start: 110, last: 110, action: 140, next: 110, countdown: 150, notes: 180
  });

  async function fetchData() {
    const { data: listData } = await supabase.from('master_equipment').select('*').order('tag_no', { ascending: true });
    if (listData) setEquipList(listData);
  }

  useEffect(() => { fetchData(); }, []);

  const handleLocalChange = (id, field, value) => {
    setEquipList(prevList => prevList.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const saveToDatabase = async (id, field, value) => {
    try {
      const finalValue = (field.includes('date') && value === '') ? null : value;
      await supabase.from('master_equipment').update({ [field]: finalValue }).eq('id', id);
    } catch (err) { console.error("Lỗi kết nối:", err); }
  };

  const calculatePreservation = (item) => {
    if (!item.pres_start_date || !item.pres_freq) {
      return { nextDate: null, status: { label: 'NO DATA', style: 'bg-slate-100 text-slate-500 border-slate-200' } };
    }

    let baseDate = new Date(item.pres_start_date);
    if (item.pres_last_date) {
      baseDate = new Date(item.pres_last_date);
    }

    const nextDate = new Date(baseDate);
    const freqString = String(item.pres_freq); 
    const freqNumber = parseInt(freqString.replace(/\D/g, '')) || 0;

    if (freqString.toUpperCase().includes('W')) {
      nextDate.setDate(nextDate.getDate() + freqNumber * 7);
    } else if (freqString.toUpperCase().includes('M')) {
      nextDate.setMonth(nextDate.getMonth() + freqNumber);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status = {};
    if (diffDays < 0) status = { label: `${Math.abs(diffDays)} DAYS OVERDUE`, style: 'bg-red-50 text-red-600 border-red-200', type: 'OVERDUE' };
    else if (diffDays <= 7) status = { label: `DUE IN ${diffDays} DAYS`, style: 'bg-orange-50 text-orange-600 border-orange-200', type: 'DUE_SOON' };
    else status = { label: `SAFE (${diffDays} DAYS)`, style: 'bg-emerald-50 text-emerald-700 border-emerald-200', type: 'SAFE' };

    return { nextDate: formatToExcelDate(nextDate.toISOString().split('T')[0]), status };
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
    const presData = calculatePreservation(item);
    const searchLower = searchTerm.toLowerCase();
    
    const matchSearch = 
      (item.tag_no?.toLowerCase().includes(searchLower)) || 
      (item.description?.toLowerCase().includes(searchLower)) ||
      (item.package?.toLowerCase().includes(searchLower)) ||
      (item.deck_level?.toLowerCase().includes(searchLower)) ||
      (item.pres_checksheet?.toLowerCase().includes(searchLower)) ||
      (item.pres_initial_method?.toLowerCase().includes(searchLower)) ||
      (item.pres_notes?.toLowerCase().includes(searchLower));

    const matchDeck = filterDeck === 'All' || item.deck_level === filterDeck;
    
    let matchStatus = true;
    if (statusFilters.length > 0) {
      const isRequiring = !!item.pres_freq;
      const sType = presData.status?.type; 
      matchStatus = statusFilters.some(f => {
        if (f === 'REQUIRING') return isRequiring;
        return sType === f;
      });
    }

    return matchSearch && matchDeck && matchStatus;
  });

  const stats = {
    total: equipList.length,
    requiring: equipList.filter(i => !!i.pres_freq).length,
    safe: equipList.filter(i => calculatePreservation(i).status?.type === 'SAFE').length,
    due_soon: equipList.filter(i => calculatePreservation(i).status?.type === 'DUE_SOON').length,
    overdue: equipList.filter(i => calculatePreservation(i).status?.type === 'OVERDUE').length,
  };

  const handleToggleFilter = (filterKey) => {
    if (filterKey === 'All') setStatusFilters([]);
    else {
      setStatusFilters(prev => {
        if (prev.includes(filterKey)) return prev.filter(k => k !== filterKey);
        else return [...prev, filterKey];
      });
    }
  };

  const handleResizeStart = (e, colKey) => {
    e.preventDefault(); const startX = e.clientX; const startWidth = colWidths[colKey];
    const doDrag = (dragEvent) => { requestAnimationFrame(() => { setColWidths(prev => ({ ...prev, [colKey]: Math.max(60, startWidth + (dragEvent.clientX - startX)) })); }); };
    const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
    document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', stopDrag);
  };

  const Resizer = ({ colKey }) => (
    <div onMouseDown={(e) => handleResizeStart(e, colKey)} className="absolute top-0 right-0 w-[6px] h-full cursor-col-resize hover:bg-blue-400 z-30 transition-colors" style={{ transform: 'translateX(50%)' }} />
  );

  const handleExportExcelSelection = (mode) => {
    let dataToExport = [];
    if (mode === 'INSTALL_ONLY') {
      dataToExport = filteredList.map(item => ({
        'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Install Date': formatToExcelDate(item.installation_date), 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Overall Status': item.installation_date ? 'COMPLETED' : 'IN PROGRESS', 'Notes': item.notes
      }));
    } else if (mode === 'PRES_ONLY') {
      dataToExport = filteredList.map(item => {
        const presData = calculatePreservation(item);
        return { 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Next Due Date': presData.nextDate, 'Countdown Status': presData.status.label, 'Pres Notes': item.pres_notes };
      });
    } else { 
      dataToExport = filteredList.map(item => {
        const presData = calculatePreservation(item);
        return { 'Tag No': item.tag_no, 'Package': item.package, 'Description': item.description, 'Deck': item.deck_level, 'MRIR No': item.mrir_no, 'Receiving Date': formatToExcelDate(item.receiving_date), 'Install Date': formatToExcelDate(item.installation_date), 'Welding': item.welding_date ? formatToExcelDate(item.welding_date) : item.welding_status, 'Bolting': item.bolting_date ? formatToExcelDate(item.bolting_date) : item.bolting_status, 'Dim Check': item.dim_date ? formatToExcelDate(item.dim_date) : item.dim_status, 'Leveling': item.leveling_date ? formatToExcelDate(item.leveling_date) : item.leveling_status, 'Alignment': item.align_date ? formatToExcelDate(item.align_date) : item.align_status, 'Initial Method': item.pres_initial_method, 'Alternate Method': item.pres_alternate_method, 'Checksheet': item.pres_checksheet, 'Freq': item.pres_freq, 'Pres Start Date': formatToExcelDate(item.pres_start_date), 'Last Done Date': formatToExcelDate(item.pres_last_date), 'Next Due Date': presData.nextDate, 'Countdown Status': presData.status.label, 'Notes': item.notes, 'Pres Notes': item.pres_notes };
      });
    }
    const ws = XLSX.utils.json_to_sheet(dataToExport); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Export_Log"); XLSX.writeFile(wb, `${mode}_Preservation_${new Date().toISOString().split('T')[0]}.xlsx`); setShowExportModal(false); 
  };

  const exportToWord = () => {
    const printContent = document.getElementById('printable-matrix').innerHTML;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Preservation Tracker</title><style>@page { size: landscape; margin: 1cm; } table {width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 10px;} th, td {border: 1px solid black; padding: 4px; text-align: left;} th {background-color: #f8fafc; font-weight: bold; text-align: center;}</style></head><body>`;
    const sourceHTML = header + printContent + `</body></html>`;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a"); document.body.appendChild(fileDownload); fileDownload.href = source; fileDownload.download = `Preservation_Tracker_${new Date().toISOString().split('T')[0]}.doc`; fileDownload.click(); document.body.removeChild(fileDownload);
  };

  const exportToPDF = () => {
    const printContent = document.getElementById('printable-matrix').innerHTML; const originalContent = document.body.innerHTML;
    document.body.innerHTML = `<div id="print-container"><style>@media print { body { background: white !important; margin: 0; padding: 0; } #print-container { width: 100%; font-family: Arial, sans-serif; padding: 8mm; } @page { size: A4 landscape; margin: 5mm; } table { width: 100%; border-collapse: collapse; font-size: 8.5px; } th, td { border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top; } th { background-color: #f8fafc !important; font-weight: bold; text-transform: uppercase; text-align: center; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }</style>${printContent}</div>`;
    window.print(); document.body.innerHTML = originalContent; window.location.reload(); 
  };

  // --- COMPONENT ACTIONCELL: ĐÍNH KÈM NHIỀU FILE & ĐẾM SỐ LƯỢNG ---
  const ActionCell = ({ item }) => {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const getFilesArray = (fileField) => {
      if (!fileField) return [];
      try {
        const parsed = JSON.parse(fileField);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        if (typeof fileField === 'string' && fileField.startsWith('http')) {
          return [{ name: 'Attachment_1.pdf', url: fileField }];
        }
      }
      return [];
    };

    const files = getFilesArray(item.pres_file);

    const handleFileUpload = async (e) => {
        const uploadedFiles = Array.from(e.target.files);
        if (uploadedFiles.length === 0) return;
        setIsUploading(true);
        try {
            const newFilesList = [...files];
            for (const file of uploadedFiles) {
                const fileName = `${item.tag_no.replace(/[^a-zA-Z0-9]/g, '_')}_PRES_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                await supabase.storage.from('equipment_files').upload(fileName, file);
                const { data } = supabase.storage.from('equipment_files').getPublicUrl(fileName);
                newFilesList.push({ name: file.name, url: data.publicUrl });
            }
            const jsonStr = JSON.stringify(newFilesList);
            handleLocalChange(item.id, 'pres_file', jsonStr);
            saveToDatabase(item.id, 'pres_file', jsonStr);
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const handleRemoveFile = (index) => {
        if (window.confirm("Bạn muốn gỡ file này?")) {
            const updatedFiles = files.filter((_, idx) => idx !== index);
            const jsonStr = updatedFiles.length > 0 ? JSON.stringify(updatedFiles) : null;
            handleLocalChange(item.id, 'pres_file', jsonStr);
            saveToDatabase(item.id, 'pres_file', jsonStr);
        }
    };

    return (
        <div className="flex flex-col gap-1 items-left justify-center w-full min-h-[35px] text-left">
            {files.length > 0 && (
              <span className="text-[9px] font-black text-slate-400 bg-slate-100 border px-1.5 py-0.5 rounded w-fit uppercase tracking-wider mb-1">
                Count: {files.length}
              </span>
            )}
            
            <div className="flex flex-col gap-1 w-full">
              {files.map((file, idx) => (
                 <div key={idx} className="flex items-center h-[20px] border border-emerald-300 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold overflow-hidden w-full max-w-[125px]">
                    <button type="button" onClick={() => window.open(file.url, '_blank')} className="flex-1 px-1.5 text-left truncate hover:bg-emerald-100" title={file.name}>
                       {file.name}
                    </button>
                    <button type="button" onClick={() => handleRemoveFile(idx)} className="px-1 bg-white text-red-500 border-l border-emerald-300 h-full flex items-center justify-center hover:bg-red-50 shrink-0">
                       <X size={10} strokeWidth={3}/>
                    </button>
                 </div>
              ))}
            </div>

            {isUploading ? (
                <div className="text-[9px] font-bold text-blue-600 flex items-center gap-1 mt-1"><Loader size={10} className="animate-spin"/> Uploading...</div>
            ) : (
                <button onClick={() => fileInputRef.current.click()} disabled={!item.pres_start_date} className={`flex items-center gap-1 px-2 py-1 rounded border text-[9px] font-black transition-all shadow-sm w-fit mt-1 ${item.pres_start_date ? 'bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border-slate-300' : 'bg-slate-50 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'}`}>
                    <Paperclip size={10} /> + Add PDF
                </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" multiple={true} accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
        </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden min-w-0 relative">
      
      {/* --- MODAL XUẤT EXCEL --- */}
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

      {/* HEADER BAR & CLICKABLE STATS THÔNG MINH */}
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
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full pl-8 pr-3 py-1.5 h-[36px] bg-slate-50 border border-slate-200 rounded-md text-xs font-bold focus:outline-none"/>
            </div>
            
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 h-[36px]">
              <Filter size={14} className="text-slate-400 mr-2" />
              <select value={filterDeck} onChange={(e) => setFilterDeck(e.target.value)} className="bg-transparent py-1 text-xs font-bold text-slate-600 outline-none pr-2 cursor-pointer uppercase">
                {uniqueDecks.map(d => <option key={d} value={d}>{d === 'All' ? 'ALL DECKS' : d}</option>)}
              </select>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <div className="flex gap-2">
              <button onClick={exportToPDF} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 px-3 h-[36px] rounded-md border border-slate-300 transition-colors shadow-sm text-xs font-bold"><Printer size={12} /> PDF</button>
              <button onClick={exportToWord} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 px-3 h-[36px] rounded-md border border-slate-300 transition-colors shadow-sm text-xs font-bold"><Download size={12} /> Word</button>
              <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 px-3 h-[36px] rounded-md border border-slate-300 transition-colors shadow-sm text-xs font-bold"><Download size={12} /> Excel</button>
              <button onClick={fetchData} className="p-2 h-[36px] border border-slate-300 rounded-md bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><RefreshCw size={14}/></button>
            </div>
         </div>
      </div>

      {/* BẢNG DỮ LIỆU ĐÃ ĐỒNG BỘ CĂN CHỈNH */}
      <div className="flex-1 p-4 overflow-hidden min-w-0">
          <div className="w-full h-full overflow-auto bg-white shadow-sm border border-slate-300 rounded-lg relative">
            <table className="w-full text-left border-collapse min-w-max relative table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-300 text-slate-600 uppercase text-[10px] font-black tracking-wider text-center">
                  <th style={{ width: colWidths.tag }} className="p-3 border-r border-slate-300 sticky left-0 top-0 bg-slate-50 z-20 text-center">Tag No <Resizer colKey="tag" /></th>
                  <th style={{ width: colWidths.pkg }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Package <Resizer colKey="pkg" /></th>
                  <th style={{ width: colWidths.desc }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Description <Resizer colKey="desc" /></th>
                  <th style={{ width: colWidths.deck }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Deck <Resizer colKey="deck" /></th>
                  <th style={{ width: colWidths.init }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Initial Method <Resizer colKey="init" /></th>
                  <th style={{ width: colWidths.alt }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Alt Method <Resizer colKey="alt" /></th>
                  <th style={{ width: colWidths.check }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Checksheet <Resizer colKey="check" /></th>
                  <th style={{ width: colWidths.freq }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Freq <Resizer colKey="freq" /></th>
                  <th style={{ width: colWidths.start }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Start Date <Resizer colKey="start" /></th>
                  <th style={{ width: colWidths.last }} className="p-3 border-r border-slate-300 sticky top-0 z-10 text-center bg-blue-50/50">Last Done <Resizer colKey="last" /></th>
                  <th style={{ width: colWidths.action }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Action <Resizer colKey="action" /></th>
                  <th style={{ width: colWidths.next }} className="p-3 border-r border-slate-300 sticky top-0 z-10 text-center bg-amber-50/50">Next Due <Resizer colKey="next" /></th>
                  <th style={{ width: colWidths.countdown }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center">Countdown <Resizer colKey="countdown" /></th>
                  <th style={{ width: colWidths.notes }} className="p-3 sticky top-0 bg-slate-50 z-10 border-b-2 border-slate-300 text-center">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredList.map((item) => {
                  const presData = calculatePreservation(item);
                  const isDuplicate = duplicateTags.has(item.tag_no?.trim().toUpperCase());

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      
                      <td className={`p-3 pl-4 border-r border-b border-slate-300 align-top text-left sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors overflow-hidden whitespace-normal break-words ${isDuplicate ? 'bg-red-50 border-y border-y-red-300' : ''}`}>
                         <span className={`font-black text-sm w-full whitespace-normal break-words ${isDuplicate ? 'text-red-600' : 'text-slate-800'}`} title={item.tag_no}>
                           {isDuplicate && <AlertCircle size={14} className="inline mr-1 text-red-500 animate-pulse"/>}
                           {item.tag_no}
                         </span>
                      </td>

                      <td className="p-2 border-r border-b border-slate-300 align-top overflow-hidden text-left">
                         <textarea rows="1" readOnly value={item.package || '-'} className="w-full text-left bg-transparent text-slate-600 font-bold text-[11px] uppercase rounded px-2 py-0.5 outline-none resize-none whitespace-normal break-words" />
                      </td>
                      
                      <td className="p-2 border-r border-b border-slate-300 align-top overflow-hidden text-left">
                         <textarea rows="2" readOnly value={item.description || '-'} className="w-full text-left bg-transparent text-slate-700 font-bold text-xs leading-snug rounded px-2 py-0.5 outline-none resize-none whitespace-normal break-words" />
                      </td>

                      <td className="p-3 border-r border-b border-slate-300 align-top overflow-hidden text-left">
                         <div className="px-2 py-0.5 text-[11px] font-medium text-slate-700 uppercase whitespace-normal break-words text-left">{item.deck_level || '-'}</div>
                      </td>

                      <td className="p-2 border-r border-b border-slate-300 align-top overflow-hidden text-left">
                        <textarea rows="2" value={item.pres_initial_method || ''} placeholder="Initial method..." onChange={(e) => handleLocalChange(item.id, 'pres_initial_method', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_initial_method', e.target.value)} className="w-full px-2 py-1 border border-transparent hover:bg-white focus:bg-white hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-medium outline-none bg-transparent text-slate-700 text-left resize-none whitespace-normal break-words leading-tight" />
                      </td>
                      
                      <td className="p-2 border-r border-b border-slate-300 align-top overflow-hidden text-left">
                        <textarea rows="2" value={item.pres_alternate_method || ''} placeholder="Alt method..." onChange={(e) => handleLocalChange(item.id, 'pres_alternate_method', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_alternate_method', e.target.value)} className="w-full px-2 py-1 border border-transparent hover:bg-white focus:bg-white hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-medium outline-none bg-transparent text-slate-700 text-left resize-none whitespace-normal break-words leading-tight" />
                      </td>
                      
                      <td className="p-2 border-r border-b border-slate-300 align-top overflow-hidden text-left">
                        <textarea rows="1" value={item.pres_checksheet || ''} placeholder="Checksheet..." onChange={(e) => handleLocalChange(item.id, 'pres_checksheet', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_checksheet', e.target.value)} className="w-full px-2 py-1 border border-transparent hover:bg-white focus:bg-white hover:border-slate-300 focus:border-blue-500 rounded text-[11px] font-black text-slate-800 outline-none bg-transparent text-left resize-none whitespace-normal break-words" />
                      </td>
                      
                      <td className="p-2 border-r border-b border-slate-300 align-top overflow-hidden text-left">
                        <select value={item.pres_freq || ''} onChange={(e) => { handleLocalChange(item.id, 'pres_freq', e.target.value); saveToDatabase(item.id, 'pres_freq', e.target.value); }} className="w-full px-1 py-1.5 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 rounded text-[11px] font-bold outline-none cursor-pointer bg-transparent text-slate-700 focus:border-blue-500 text-left">
                          <option value="" disabled hidden>Freq...</option><option value="1 W">1 W</option><option value="2 W">2 W</option><option value="1 M">1 M</option><option value="2 M">2 M</option><option value="3 M">3 M</option><option value="6 M">6 M</option>
                        </select>
                      </td>
                      
                      <td className="p-2 border-r border-b border-slate-300 align-top overflow-hidden text-center">
                         <div className="flex justify-center w-full">
                           <CustomDateInput value={item.pres_start_date} placeholder="Start Date" onChange={(val) => { handleLocalChange(item.id, 'pres_start_date', val); saveToDatabase(item.id, 'pres_start_date', val); }} className={`w-full px-1 py-1.5 hover:bg-white focus:bg-white rounded text-[11px] font-bold outline-none cursor-pointer text-center bg-transparent border border-transparent hover:border-slate-300 ${item.pres_start_date ? 'text-slate-800' : 'text-slate-400'}`} />
                         </div>
                      </td>
                      <td className="p-2 border-r border-b border-slate-300 align-top overflow-hidden text-center">
                         <div className="flex justify-center w-full">
                           <CustomDateInput value={item.pres_last_date} placeholder="Last Done" onChange={(val) => { handleLocalChange(item.id, 'pres_last_date', val); saveToDatabase(item.id, 'pres_last_date', val); }} className={`w-full px-1 py-1.5 hover:bg-white focus:bg-white rounded text-[11px] font-bold outline-none cursor-pointer text-center bg-transparent border border-transparent hover:border-slate-300 ${item.pres_last_date ? 'text-blue-700' : 'text-slate-400'}`} />
                         </div>
                      </td>

                      <td className="p-2 border-r border-b border-slate-300 align-top overflow-hidden text-center">
                        <ActionCell item={item} />
                      </td>

                      <td className="p-3 border-r border-b border-slate-300 text-center font-black text-xs text-slate-700 align-top overflow-hidden">
                        {presData.nextDate || '-'}
                      </td>
                      
                      <td className="p-3 border-r border-b border-slate-300 text-center align-top overflow-hidden">
                        <span className={`px-2 py-1.5 rounded text-[9px] font-black border uppercase block w-full text-center truncate ${presData.status.style}`}>
                          {presData.status.label}
                        </span>
                      </td>

                      <td className="p-2 border-b border-slate-300 align-top overflow-hidden text-left">
                         <textarea rows="2" value={item.pres_notes || ''} placeholder="Notes..." onChange={(e) => handleLocalChange(item.id, 'pres_notes', e.target.value)} onBlur={(e) => saveToDatabase(item.id, 'pres_notes', e.target.value)} className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 rounded text-[10px] font-medium text-slate-500 outline-none resize-none min-h-[44px] text-left whitespace-normal break-words" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>

      {/* BẢNG IN CHUẨN (PDF / Word) */}
      <div id="printable-matrix" className="hidden">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px' }}>MCDERMOTT<br/>PTSC</div>
          <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '18px', textTransform: 'uppercase' }}>
            VIETNAM BLOCK B GAS PROJECT<br/>PRESERVATION TRACKER
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'right' }}>
            PETROVIETNAM<br/>PQPOC
            <div style={{ fontWeight: 'normal', fontSize: '10px', marginTop: '4px' }}>Printed: {formatToExcelDate(new Date().toISOString())}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#f1f5f9', padding: '10px', border: '1px solid black' }}>
          <span>TOTAL: {stats.total}</span>
          <span style={{ color: '#059669' }}>SAFE: {stats.safe}</span>
          <span style={{ color: '#d97706' }}>DUE SOON: {stats.due_soon}</span>
          <span style={{ color: '#dc2626' }}>OVERDUE: {stats.overdue}</span>
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
            {filteredList.map(item => {
              const presData = calculatePreservation(item);
              return (
                <tr key={`print-${item.id}`}>
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', textAlign: 'left' }}>{item.tag_no}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.package}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.description}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.deck_level}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.pres_initial_method}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.pres_alternate_method}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.pres_checksheet}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>{item.pres_freq}</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>{formatToExcelDate(item.pres_start_date)}</td>
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', color: '#1d4ed8', textAlign: 'center' }}>{formatToExcelDate(item.pres_last_date)}</td>
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', textAlign: 'center' }}>{presData.nextDate || '-'}</td>
                  <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', textAlign: 'center' }}>{presData.status.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}