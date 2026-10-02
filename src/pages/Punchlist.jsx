import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { 
  Search, AlertCircle, CheckCircle2, CheckSquare, RotateCcw, 
  Paperclip, FileCheck, X, Loader, Download, Clock, Printer, 
  FileSpreadsheet, Filter, Trash2, Copy 
} from 'lucide-react';
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

const getCompareKey = (str) => {
  if (!str) return '';
  return String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

const ColumnFilter = ({ filterKey, options, activeFilters, setColumnFilters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleFilter = (val) => {
    setColumnFilters(prev => {
      const current = prev[filterKey] || [];
      const isSelected = current.includes(val);
      return { ...prev, [filterKey]: isSelected ? current.filter(item => item !== val) : [...current, val] };
    });
  };
  const selectAll = () => setColumnFilters(prev => ({ ...prev, [filterKey]: options }));
  const clearAll = () => setColumnFilters(prev => ({ ...prev, [filterKey]: [] }));
  const currentFilters = activeFilters[filterKey] || [];
  const isActive = currentFilters.length > 0;

  return (
    <div className="relative inline-block ml-1">
      <button onClick={() => setIsOpen(!isOpen)} className={`p-0.5 rounded transition-colors ${isActive ? 'text-blue-600 bg-blue-100' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}><Filter size={11} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 3 : 2} /></button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 shadow-xl rounded-md w-60 z-50 flex flex-col max-h-64 text-slate-700 font-medium normal-case">
            <div className="p-2 border-b border-slate-100 flex justify-between gap-2 bg-slate-50 rounded-t-md">
              <button onClick={selectAll} className="text-[10px] font-bold text-blue-600 hover:underline">Select All</button>
              <button onClick={clearAll} className="text-[10px] font-bold text-red-600 hover:underline">Clear</button>
            </div>
            <div className="overflow-y-auto p-1.5 flex flex-col gap-0.5">
              {options.length === 0 && <span className="text-[10px] text-slate-400 italic p-1">No data</span>}
              {options.map(opt => (
                <label key={opt} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-slate-100 p-1.5 rounded transition-colors">
                  <input type="checkbox" checked={currentFilters.includes(opt)} onChange={() => toggleFilter(opt)} className="rounded border-slate-300 w-3 h-3 text-blue-600 focus:ring-blue-500 shrink-0" />
                  <span className="truncate flex-1" title={opt === '' ? '(Blanks)' : opt}>{opt === '' ? '(Blanks)' : opt}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const PunchKpiGroup = ({ title, openCount, closedCount, colorKey, activeFilters, onToggle }) => {
  const openKey = `${colorKey.toUpperCase()}_OPEN`;
  const closedKey = `${colorKey.toUpperCase()}_CLOSED`;
  const isOpenActive = activeFilters.includes(openKey);
  const isClosedActive = activeFilters.includes(closedKey);
  const hasOpen = openCount > 0;
  const hasClosed = closedCount > 0;

  let titleColor = colorKey === 'red' ? 'text-red-600' : (colorKey === 'blue' ? 'text-blue-600' : 'text-slate-900');
  let openBg = 'bg-white border-slate-200 hover:bg-slate-50'; let openTextNum = 'text-slate-400'; let openTextLbl = 'text-slate-400';
  if (hasOpen) {
    if (colorKey === 'red') { openBg = 'bg-red-50 border-red-200 hover:bg-red-100'; openTextNum = 'text-red-600'; openTextLbl = 'text-red-600'; }
    if (colorKey === 'blue') { openBg = 'bg-blue-50 border-blue-200 hover:bg-blue-100'; openTextNum = 'text-blue-600'; openTextLbl = 'text-blue-600'; }
    if (colorKey === 'black') { openBg = 'bg-slate-100 border-slate-300 hover:bg-slate-200'; openTextNum = 'text-slate-800'; openTextLbl = 'text-slate-700'; }
  }
  if (isOpenActive) {
    if (colorKey === 'red') openBg += ' ring-2 ring-offset-1 ring-red-400 shadow-sm';
    if (colorKey === 'blue') openBg += ' ring-2 ring-offset-1 ring-blue-400 shadow-sm';
    if (colorKey === 'black') openBg += ' ring-2 ring-offset-1 ring-slate-400 shadow-sm';
  }

  let closedBg = 'bg-white border-slate-200 hover:bg-slate-50'; let closedTextNum = 'text-slate-400'; let closedTextLbl = 'text-slate-400';
  if (hasClosed) { closedBg = 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'; closedTextNum = 'text-emerald-600'; closedTextLbl = 'text-emerald-600'; }
  if (isClosedActive) closedBg += ' ring-2 ring-offset-1 ring-emerald-400 shadow-sm';

  return (
    <div className="flex flex-col items-center gap-2 px-5 border-r border-slate-200 last:border-r-0">
      <span className={`text-[11px] font-black uppercase tracking-wider ${titleColor}`}>{title}</span>
      <div className="flex gap-2">
        <button onClick={() => onToggle(openKey)} className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg border transition-all duration-200 ${openBg}`}><span className={`text-lg font-black leading-none ${openTextNum}`}>{openCount}</span><span className={`text-[7px] font-bold uppercase mt-1 ${openTextLbl}`}>Open</span></button>
        <button onClick={() => onToggle(closedKey)} className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg border transition-all duration-200 ${closedBg}`}><span className={`text-lg font-black leading-none ${closedTextNum}`}>{closedCount}</span><span className={`text-[7px] font-bold uppercase mt-1 ${closedTextLbl}`}>Closed</span></button>
      </div>
    </div>
  );
};

export default function PunchlistMaster() {
  const [punchlists, setPunchlists] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState([]);
  
  const [columnFilters, setColumnFilters] = useState({
    punchId: [], tagNo: [], system: [], subSystem: [], defect: [], corrAct: [], category: [], 
    assignee: [], raiseBy: [], raiseDate: [], expClear: [], closedDate: [], phase: [], status: []
  });

  const [closeModal, setCloseModal] = useState({ isOpen: false, item: null, note: '', file: null, uploading: false });
  const [dataDate, setDataDate] = useState(localStorage.getItem('projectDataDate') || 'N/A');
  
  const [colWidths, setColWidths] = useState({ 
    punchId: 130, tagNo: 140, sys: 80, subSys: 90, desc: 250, corrAct: 180, cat: 60, 
    assign: 90, raiseBy: 90, raiseDate: 90, expClear: 90, closedDate: 90, phase: 90, 
    status: 90, aging: 65, action: 130 
  });

  async function fetchPunchlists() {
    let allData = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    try {
        while (hasMore) {
            const { data, error } = await supabase.from('punchlist_matrix').select('*').order('date_raised', { ascending: false }).range(from, from + step - 1);
            if (error) throw error;
            if (!data || data.length === 0) hasMore = false;
            else { allData = [...allData, ...data]; if (data.length < step) hasMore = false; else from += step; }
        }
        
        let plData = allData.map(p => ({
            id: p.id, punchId: p.punch_id, tagNo: p.tag_no, system: p.system_no || 'N/A', subSystem: p.sub_system_no || 'N/A',
            phaseOrigin: p.phase_origin || 'N/A', category: p.category || 'B', defect: p.defect_description || '-',
            corrAction: p.corrective_action || '', assignee: p.assignee || '', raiseBy: p.raise_by || '',
            dateRaised: p.date_raised, expClearDate: p.exp_clear_date, closedDate: p.closed_date,
            status: p.status || 'OPEN', evidenceUrl: p.evidence_url, closeOutNote: p.close_out_note
        }));
        setPunchlists(plData);
    } catch (err) { console.error("Lỗi khi tải danh sách Punchlist:", err); }
  }

  useEffect(() => { fetchPunchlists(); }, []);
  useEffect(() => { const storedDate = localStorage.getItem('projectDataDate'); if (storedDate) setDataDate(storedDate); }, [punchlists]);

  const handleResizeStart = (e, colKey) => {
    e.preventDefault(); const startX = e.clientX; const startWidth = colWidths[colKey] || 100;
    const doDrag = (dragEvent) => requestAnimationFrame(() => setColWidths(prev => ({ ...prev, [colKey]: Math.max(60, startWidth + (dragEvent.clientX - startX)) })));
    const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
    document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', stopDrag);
  };
  const Resizer = ({ colKey }) => <div onMouseDown={(e) => handleResizeStart(e, colKey)} className="absolute top-0 right-0 w-[6px] h-full cursor-col-resize hover:bg-blue-400 z-30 transition-colors" style={{ transform: 'translateX(50%)' }} />;

  const handleToggleFilter = (filterKey) => {
    if (filterKey === 'TOTAL') setStatusFilters([]);
    else setStatusFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
  };

  const duplicateMap = {};
  punchlists.forEach(p => { const key = `${getCompareKey(p.tagNo)}___${String(p.defect).trim().toLowerCase()}`; duplicateMap[key] = (duplicateMap[key] || 0) + 1; });
  const isDuplicate = (p) => duplicateMap[`${getCompareKey(p.tagNo)}___${String(p.defect).trim().toLowerCase()}`] > 1;

  const uniqueValues = {
    punchId: [...new Set(punchlists.map(p => String(p.punchId)))].sort(),
    tagNo: [...new Set(punchlists.map(p => String(p.tagNo)))].sort(),
    system: [...new Set(punchlists.map(p => String(p.system)))].sort(),
    subSystem: [...new Set(punchlists.map(p => String(p.subSystem)))].sort(),
    defect: [...new Set(punchlists.map(p => String(p.defect)))].sort(),
    corrAct: [...new Set(punchlists.map(p => String(p.corrAction)))].sort(),
    category: [...new Set(punchlists.map(p => String(p.category)))].sort(),
    assignee: [...new Set(punchlists.map(p => String(p.assignee)))].sort(),
    raiseBy: [...new Set(punchlists.map(p => String(p.raiseBy)))].sort(),
    raiseDate: [...new Set(punchlists.map(p => p.dateRaised ? formatToExcelDate(p.dateRaised) : ''))].sort(),
    expClear: [...new Set(punchlists.map(p => p.expClearDate ? formatToExcelDate(p.expClearDate) : ''))].sort(),
    closedDate: [...new Set(punchlists.map(p => p.closedDate ? formatToExcelDate(p.closedDate) : ''))].sort(),
    phase: [...new Set(punchlists.map(p => String(p.phaseOrigin)))].sort(),
    status: [...new Set(punchlists.map(p => String(p.status)))].sort(),
  };

  const stats = {
    total: punchlists.length,
    a_open: punchlists.filter(p => p.category === 'A' && p.status === 'OPEN').length,
    a_closed: punchlists.filter(p => p.category === 'A' && p.status === 'CLOSED').length,
    b_open: punchlists.filter(p => p.category === 'B' && p.status === 'OPEN').length,
    b_closed: punchlists.filter(p => p.category === 'B' && p.status === 'CLOSED').length,
    c_open: punchlists.filter(p => p.category === 'C' && p.status === 'OPEN').length,
    c_closed: punchlists.filter(p => p.category === 'C' && p.status === 'CLOSED').length,
    duplicates: punchlists.filter(isDuplicate).length
  };

  // LỌC VÀ SẮP XẾP TỐI THƯỢNG (SORTING ALGORITHM)
  const displayList = useMemo(() => {
    let filtered = punchlists.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = String(p.tagNo).toLowerCase().includes(searchLower) || String(p.punchId).toLowerCase().includes(searchLower) || String(p.defect).toLowerCase().includes(searchLower) || String(p.assignee).toLowerCase().includes(searchLower) || String(p.raiseBy).toLowerCase().includes(searchLower) || String(p.corrAction).toLowerCase().includes(searchLower);
      
      let matchKPI = true;
      if (statusFilters.length > 0) {
        matchKPI = false;
        if (statusFilters.includes('RED_OPEN') && p.category === 'A' && p.status === 'OPEN') matchKPI = true;
        if (statusFilters.includes('RED_CLOSED') && p.category === 'A' && p.status === 'CLOSED') matchKPI = true;
        if (statusFilters.includes('BLUE_OPEN') && p.category === 'B' && p.status === 'OPEN') matchKPI = true;
        if (statusFilters.includes('BLUE_CLOSED') && p.category === 'B' && p.status === 'CLOSED') matchKPI = true;
        if (statusFilters.includes('BLACK_OPEN') && p.category === 'C' && p.status === 'OPEN') matchKPI = true;
        if (statusFilters.includes('BLACK_CLOSED') && p.category === 'C' && p.status === 'CLOSED') matchKPI = true;
        if (statusFilters.includes('DUPLICATES') && isDuplicate(p)) matchKPI = true; 
      }

      const matchPunchId = columnFilters.punchId?.length ? columnFilters.punchId.includes(String(p.punchId)) : true;
      const matchTag = columnFilters.tagNo?.length ? columnFilters.tagNo.includes(String(p.tagNo)) : true;
      const matchSys = columnFilters.system?.length ? columnFilters.system.includes(String(p.system)) : true;
      const matchSubSys = columnFilters.subSystem?.length ? columnFilters.subSystem.includes(String(p.subSystem)) : true;
      const matchDefect = columnFilters.defect?.length ? columnFilters.defect.includes(String(p.defect)) : true;
      const matchCorrAct = columnFilters.corrAct?.length ? columnFilters.corrAct.includes(String(p.corrAction)) : true;
      const matchCat = columnFilters.category?.length ? columnFilters.category.includes(String(p.category)) : true;
      const matchAssign = columnFilters.assignee?.length ? columnFilters.assignee.includes(String(p.assignee)) : true;
      const matchRaise = columnFilters.raiseBy?.length ? columnFilters.raiseBy.includes(String(p.raiseBy)) : true;
      const matchRaiseDate = columnFilters.raiseDate?.length ? columnFilters.raiseDate.includes(p.dateRaised ? formatToExcelDate(p.dateRaised) : '') : true;
      const matchExpClear = columnFilters.expClear?.length ? columnFilters.expClear.includes(p.expClearDate ? formatToExcelDate(p.expClearDate) : '') : true;
      const matchClosedDate = columnFilters.closedDate?.length ? columnFilters.closedDate.includes(p.closedDate ? formatToExcelDate(p.closedDate) : '') : true;
      const matchPhase = columnFilters.phase?.length ? columnFilters.phase.includes(String(p.phaseOrigin)) : true;
      const matchStat = columnFilters.status?.length ? columnFilters.status.includes(String(p.status)) : true;

      return matchSearch && matchKPI && matchPunchId && matchTag && matchSys && matchSubSys && matchDefect && matchCorrAct && matchCat && matchAssign && matchRaise && matchRaiseDate && matchExpClear && matchClosedDate && matchPhase && matchStat;
    });

    if (statusFilters.includes('DUPLICATES')) {
        // Sắp xếp đặc biệt khi soi lỗi trùng lặp: Tag No -> Mô tả lỗi
        filtered.sort((a, b) => {
            const keyA = `${a.tagNo}___${a.defect}`.toLowerCase();
            const keyB = `${b.tagNo}___${b.defect}`.toLowerCase();
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return String(a.punchId).localeCompare(String(b.punchId));
        });
    } else {
        // Sắp xếp mặc định: Tag No -> Phase -> Punch ID
        filtered.sort((a, b) => {
            const tagA = String(a.tagNo || '').toUpperCase();
            const tagB = String(b.tagNo || '').toUpperCase();
            if (tagA < tagB) return -1;
            if (tagA > tagB) return 1;

            const phaseA = String(a.phaseOrigin || '').toUpperCase();
            const phaseB = String(b.phaseOrigin || '').toUpperCase();
            if (phaseA < phaseB) return -1;
            if (phaseA > phaseB) return 1;

            return String(a.punchId).localeCompare(String(b.punchId));
        });
    }
    return filtered;
  }, [punchlists, searchTerm, statusFilters, columnFilters]);

  const getDays = (d) => { if(!d) return 0; return Math.floor(Math.abs(new Date() - new Date(d)) / (1000 * 60 * 60 * 24)); };
  
  const executeClosePunchlist = async (e) => {
    e.preventDefault(); const { item, note, file } = closeModal; setCloseModal(prev => ({ ...prev, uploading: true }));
    try {
      let evidenceUrl = item.evidenceUrl;
      if (file) {
        const { data: urlData } = await supabase.storage.from('equipment_files').upload(`EVIDENCE_${item.tagNo}_${Date.now()}.png`, file);
        evidenceUrl = supabase.storage.from('equipment_files').getPublicUrl(urlData.path).data.publicUrl;
      }
      await supabase.from('punchlist_matrix').update({ status: 'CLOSED', closed_date: new Date().toISOString(), close_out_note: note || item.closeOutNote, evidence_url: evidenceUrl }).eq('id', item.id);
      fetchPunchlists();
    } catch (error) { alert(error.message); } 
    finally { setCloseModal({ isOpen: false, item: null, note: '', file: null, uploading: false }); }
  };

  const handleReopen = async (item) => {
    if(!window.confirm(`Bạn muốn Re-open lỗi [${item.punchId}]?`)) return;
    try { await supabase.from('punchlist_matrix').update({ status: 'OPEN', closed_date: null }).eq('id', item.id); fetchPunchlists(); } catch(err) { alert("Lỗi khi Re-open: " + err.message); }
  };

  const handleDeletePunch = async (item) => {
    if(!window.confirm(`Xóa vĩnh viễn lỗi [${item.punchId}] của Tag [${item.tagNo}]?`)) return;
    try { await supabase.from('punchlist_matrix').delete().eq('id', item.id); fetchPunchlists(); } catch(err) { alert("Lỗi khi xóa: " + err.message); }
  };

  const handleClearAllPunches = async () => {
    if(!window.confirm(`⚠️ CẢNH BÁO NGUY HIỂM TỘT ĐỘ ⚠️\nXÓA SẠCH TOÀN BỘ Punchlist của TOÀN DỰ ÁN?`)) return;
    if (window.prompt('Gõ chữ "DELETE" để xác nhận:') !== 'DELETE') return;
    try {
      await supabase.from('punchlist_matrix').delete().neq('id', 0);
      localStorage.removeItem('projectDataDate'); setDataDate('N/A');
      await fetchPunchlists();
      alert(`✅ Đã dọn sạch toàn bộ Punchlist trên hệ thống!`);
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  const exportToExcel = () => {
    const dataToExport = displayList.map(p => ({
        'Punch ID': p.punchId, 'Tag No': p.tagNo, 'System': p.system, 'Sub-System': p.subSystem,
        'Description': p.defect, 'Corrective Action': p.corrAction, 'Category': p.category, 'Assignee': p.assignee,
        'Raise By': p.raiseBy, 'Raise Date': formatToExcelDate(p.dateRaised), 'Expected Clear Date': p.expClearDate ? formatToExcelDate(p.expClearDate) : '',
        'Closed Date': p.closedDate ? formatToExcelDate(p.closedDate) : '', 'Phase': p.phaseOrigin, 'Status': p.status, 'Aging (Days)': getDays(p.dateRaised)
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport); const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Global_Punchlist_Master");
    const wscols = [{wch:15}, {wch:15}, {wch:10}, {wch:15}, {wch:40}, {wch:30}, {wch:8}, {wch:15}, {wch:15}, {wch:15}, {wch:15}, {wch:15}, {wch:10}, {wch:10}, {wch:10}];
    worksheet['!cols'] = wscols; XLSX.writeFile(workbook, `Global_Punchlist_Master.xlsx`);
  };

  const renderCategory = (cat) => {
    let style = "bg-slate-50 text-slate-500 border-slate-200";
    if (cat === 'A') style = "bg-red-50 text-red-600 border-red-200"; 
    if (cat === 'B') style = "bg-blue-50 text-blue-600 border-blue-200"; 
    if (cat === 'C') style = "bg-slate-100 text-slate-800 border-slate-300"; 
    return <span className={`text-[11px] font-black px-2.5 py-0.5 rounded border w-fit mx-auto block shadow-sm ${style}`}>{cat}</span>;
  }

  const renderStatus = (status, days) => {
    const isOverdue = days > 30 && status === 'OPEN';
    if (status === 'CLOSED') return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1 w-fit mx-auto bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={12} strokeWidth={3}/> CLOSED</span>;
    return (
      <div className="flex flex-col items-center gap-1 w-full">
        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1 w-fit mx-auto ${isOverdue ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-red-50 text-red-600 border border-red-100'}`}><AlertCircle size={12} strokeWidth={3}/> OPEN</span>
        {isOverdue && <span className="text-[8px] uppercase font-black text-red-600 animate-pulse tracking-widest">Overdue</span>}
      </div>
    );
  };

  const handlePrintListPDF = () => {
    const printContent = document.getElementById('printable-punchlist').innerHTML;
    const printWindow = window.open('', '', 'width=1200,height=800');
    printWindow.document.write(`<html><head><title>Global Punchlist Master Report</title><style>@page{size:A4 landscape;margin:0;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;background:white;margin:0;padding:10mm;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}#print-container{width:100%;display:flex;flex-direction:column;}table{width:100%;border-collapse:collapse;font-size:9px;table-layout:fixed;}th,td{border:1px solid black;padding:4px;word-wrap:break-word;white-space:normal;vertical-align:top;}th{background-color:#f1f5f9 !important;font-weight:bold;text-align:center;}.no-print{display:none !important;}</style></head><body><div id="print-container">${printContent}</div><script>setTimeout(()=>{window.print();window.close();},500);</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">

      {closeModal.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 no-print">
          <form onSubmit={executeClosePunchlist} className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><CheckSquare size={20} className="text-blue-600"/> Close Punchlist Item</h3>
              <button type="button" onClick={() => setCloseModal({isOpen: false, item: null, note: '', file: null, uploading: false})} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 bg-slate-50/50">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Equipment</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black border border-slate-200">{closeModal.item.punchId}</span>
                </div>
                <div className="font-black text-slate-800 text-lg">{closeModal.item.tagNo}</div>
                <div className="text-xs text-slate-600 mt-2 bg-red-50 p-2 rounded text-red-800 border border-red-100">{closeModal.item.defect}</div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Close-out Notes (Optional)</label>
                <textarea rows="3" value={closeModal.note} onChange={(e) => setCloseModal({...closeModal, note: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 resize-none" placeholder="Enter closure description..." />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Evidence Attachment (Photo/Doc)</label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 bg-white hover:bg-slate-50 transition-colors text-center cursor-pointer">
                  <input type="file" onChange={(e) => setCloseModal({...closeModal, file: e.target.files[0]})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {closeModal.file ? (
                    <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm"><FileCheck size={20}/> {closeModal.file.name}</div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400"><Paperclip size={24} className="mb-2"/><span className="text-xs font-bold">Click to attach evidence file</span></div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button type="button" onClick={() => setCloseModal({isOpen: false, item: null, note: '', file: null, uploading: false})} className="px-5 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-md transition-colors text-sm">Cancel</button>
              <button type="submit" disabled={closeModal.uploading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-sm disabled:opacity-50 text-sm transition-colors">
                {closeModal.uploading ? <Loader size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>} Verify & Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* THANH CÔNG CỤ TOOLBAR */}
      <div className="flex justify-end items-center px-6 pt-4 pb-2 shrink-0 bg-white border-b border-slate-200 z-30 relative">
         <div className="flex gap-2">
            <button onClick={handleClearAllPunches} className="px-3 h-[32px] bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 font-bold text-xs rounded-md flex items-center gap-1.5 transition-colors shadow-sm" title="Xóa toàn bộ Punchlist trên hệ thống">
               <Trash2 size={14}/> Clear All Punch
            </button>
            <div className="w-px bg-slate-200 mx-1"></div>
            <button onClick={fetchPunchlists} className="p-1.5 border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"><RotateCcw size={16} strokeWidth={2.5} /></button>
            <button onClick={handlePrintListPDF} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50"><Printer size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" /><span className="font-bold text-[13px] text-slate-600">PDF / PRINT</span></button>
            <button onClick={exportToExcel} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet size={15} strokeWidth={2.5} className="text-emerald-600 group-hover:text-emerald-700" /><span className="font-bold text-[13px] text-emerald-700">EXCEL</span></button>
         </div>
      </div>

      <div className="flex-none bg-white border-b border-slate-200 z-20">
        <div className="px-6 pt-4 pb-0">
          <div className="flex justify-between items-stretch border-b-2 border-slate-300 pb-2 mb-3 shrink-0">
              <div className="w-1/4 flex flex-col justify-end text-left pb-0.5"><span className="font-black text-[12px] text-slate-700 tracking-wider uppercase">MCDERMOTT | PTSC</span></div>
              <div className="w-1/2 flex flex-col justify-between items-center text-center">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest m-0 leading-none">VIETNAM BLOCK B GAS PROJECT</h2>
                <span className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">MECHANICAL PUNCHLIST MASTER RECORD</span>
              </div>
              <div className="w-1/4 flex flex-col justify-between text-right pb-0.5">
                <span className="font-black text-[12px] text-slate-700 tracking-wider uppercase block">PETROVIETNAM | PQPOC</span>
                <div className="mt-auto"><span className="text-[10px] font-bold text-blue-600 block">Data Date: {dataDate}</span></div>
              </div>
          </div>
        </div>

        <div className="p-3 px-6 flex justify-between items-center min-h-[90px] overflow-x-auto">
          <div className="flex items-center gap-0 shrink-0">
             <div className="pr-5 border-r border-slate-200 flex gap-2">
                 <button onClick={() => handleToggleFilter('TOTAL')} className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] px-3 rounded-xl border transition-all bg-purple-50 border-purple-200 hover:bg-purple-100 ${statusFilters.length === 0 ? 'ring-2 ring-offset-1 ring-purple-400 shadow-sm' : 'opacity-70 hover:opacity-100'}`}>
                    <span className="text-[11px] font-black uppercase mb-0.5 text-purple-600">Total</span>
                    <span className="text-2xl font-black leading-none text-purple-700">{stats.total}</span>
                 </button>
                 
                 <button onClick={() => handleToggleFilter('DUPLICATES')} className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] px-3 rounded-xl border transition-all ${statusFilters.includes('DUPLICATES') ? 'bg-pink-100 border-pink-300 ring-2 ring-pink-400 shadow-sm' : 'bg-pink-50 border-pink-200 hover:bg-pink-100 opacity-70 hover:opacity-100'}`} title="Show duplicated equipments (Same Tag No and Defect)">
                    <span className="text-[11px] font-black uppercase mb-0.5 text-pink-600 flex items-center gap-1"><Copy size={10}/>Duplicates</span>
                    <span className="text-2xl font-black leading-none text-pink-700">{stats.duplicates}</span>
                 </button>
             </div>
             <PunchKpiGroup title="PUNCH A" colorKey="red" openCount={stats.a_open} closedCount={stats.a_closed} activeFilters={statusFilters} onToggle={handleToggleFilter} />
             <PunchKpiGroup title="PUNCH B" colorKey="blue" openCount={stats.b_open} closedCount={stats.b_closed} activeFilters={statusFilters} onToggle={handleToggleFilter} />
             <PunchKpiGroup title="PUNCH C" colorKey="black" openCount={stats.c_open} closedCount={stats.c_closed} activeFilters={statusFilters} onToggle={handleToggleFilter} />
          </div>

          <div className="flex items-center gap-2 pl-4 shrink-0 flex-wrap justify-end">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search Punch ID, Tag, Keyword..." className="w-full pl-8 pr-3 h-[36px] bg-slate-50 border border-slate-200 rounded-md text-xs font-bold focus:outline-none focus:border-blue-400 focus:bg-white"/>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 bg-slate-100 flex flex-col min-h-0">
        <div className="flex-1 bg-white border border-slate-300 shadow-sm rounded-lg overflow-auto relative">
          <table className="text-left border-collapse table-fixed w-max min-w-full">
            <thead className="bg-slate-50 text-[10px] text-slate-600 uppercase font-black sticky top-0 z-30 shadow-[0_1px_0_0_#cbd5e1]">
              <tr>
                <th style={{ width: colWidths.punchId }} className="p-3 border-r border-slate-300 sticky left-0 top-0 bg-slate-50 z-[40] text-center shadow-[1px_0_0_0_#cbd5e1]">PUNCH ID <ColumnFilter filterKey="punchId" options={uniqueValues.punchId} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="punchId" /></th>
                <th style={{ width: colWidths.tagNo }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">TAG NO <ColumnFilter filterKey="tagNo" options={uniqueValues.tagNo} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="tagNo" /></th>
                <th style={{ width: colWidths.sys }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">SYSTEM <ColumnFilter filterKey="system" options={uniqueValues.system} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="sys" /></th>
                <th style={{ width: colWidths.subSys }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">SUB-SYS <ColumnFilter filterKey="subSystem" options={uniqueValues.subSystem} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="subSys" /></th>
                <th style={{ width: colWidths.desc }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">DESCRIPTION <ColumnFilter filterKey="defect" options={uniqueValues.defect} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="desc" /></th>
                <th style={{ width: colWidths.corrAct }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">CORR. ACTION <ColumnFilter filterKey="corrAct" options={uniqueValues.corrAct} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="corrAct" /></th>
                <th style={{ width: colWidths.cat }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">CAT <ColumnFilter filterKey="category" options={uniqueValues.category} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="cat" /></th>
                <th style={{ width: colWidths.assign }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative text-blue-600">ASSIGNEE <ColumnFilter filterKey="assignee" options={uniqueValues.assignee} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="assign" /></th>
                <th style={{ width: colWidths.raiseBy }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative text-purple-600">RAISE BY <ColumnFilter filterKey="raiseBy" options={uniqueValues.raiseBy} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="raiseBy" /></th>
                <th style={{ width: colWidths.raiseDate }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative text-teal-600">RAISE DATE <ColumnFilter filterKey="raiseDate" options={uniqueValues.raiseDate} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="raiseDate" /></th>
                <th style={{ width: colWidths.expClear }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative text-orange-600">EXP. CLEAR <ColumnFilter filterKey="expClear" options={uniqueValues.expClear} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="expClear" /></th>
                <th style={{ width: colWidths.closedDate }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative text-emerald-600">CLOSED DATE <ColumnFilter filterKey="closedDate" options={uniqueValues.closedDate} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="closedDate" /></th>
                <th style={{ width: colWidths.phase }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">PHASE <ColumnFilter filterKey="phase" options={uniqueValues.phase} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="phase" /></th>
                <th style={{ width: colWidths.status }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">STATUS <ColumnFilter filterKey="status" options={uniqueValues.status} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="status" /></th>
                <th style={{ width: colWidths.aging }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">AGING <Resizer colKey="aging" /></th>
                <th style={{ width: colWidths.action }} className="p-3 sticky top-0 bg-slate-50 z-30 text-center font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayList.map((pl, i) => {
                const days = getDays(pl.dateRaised);
                const isDup = isDuplicate(pl);

                let rowBgClass = "hover:bg-slate-50";
                if (isDup) rowBgClass = "bg-pink-50 hover:bg-pink-100";

                return (
                  <tr key={i} className={`transition-colors ${rowBgClass}`}>
                    <td className={`p-3 pl-4 border-r border-slate-300 align-top sticky left-0 z-20 shadow-[1px_0_0_0_#cbd5e1] ${isDup ? 'bg-pink-50' : 'bg-white'}`}>
                      <span className={`font-black text-[11px] w-full block px-2 py-0.5 rounded text-center border ${isDup ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>{pl.punchId}</span>
                    </td>
                    <td className={`p-3 border-r border-slate-300 text-[11px] text-left font-black align-top ${isDup ? 'text-pink-600' : 'text-blue-600'}`}>{pl.tagNo}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 align-top text-center">{pl.system}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 align-top">{pl.subSystem}</td>
                    <td className={`p-3 border-r border-slate-300 text-[11px] text-left whitespace-normal break-words align-top ${isDup ? 'font-black text-pink-700' : 'font-bold text-slate-700'}`}>
                      {isDup && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-100 border border-pink-300 text-[9px] text-pink-700 font-black mr-2 tracking-widest"><Copy size={10}/>DUPLICATED</span>}
                      {pl.defect}
                    </td>
                    <td className="p-3 border-r border-slate-300 text-[11px] text-left font-bold text-slate-600 whitespace-normal break-words align-top">{pl.corrAction}</td>
                    <td className="p-3 border-r border-slate-300 align-top text-center">{renderCategory(pl.category)}</td>
                    <td className="p-3 border-r border-slate-300 text-[10px] text-center font-black text-slate-500 align-top">{pl.assignee}</td>
                    <td className="p-3 border-r border-slate-300 text-[10px] text-center font-black text-slate-500 align-top">{pl.raiseBy}</td>
                    <td className="p-3 border-r border-slate-300 text-[10px] text-center font-black text-slate-600 align-top">{formatToExcelDate(pl.dateRaised)}</td>
                    <td className="p-3 border-r border-slate-300 text-[10px] text-center font-black text-slate-600 align-top">{formatToExcelDate(pl.expClearDate)}</td>
                    <td className="p-3 border-r border-slate-300 text-[10px] text-center font-black text-emerald-600 align-top">{pl.closedDate ? formatToExcelDate(pl.closedDate) : ''}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 align-top text-center">{pl.phaseOrigin}</td>
                    <td className="p-3 border-r border-slate-300 align-top text-center">{renderStatus(pl.status, days)}</td>
                    <td className="p-3 border-r border-slate-300 align-top text-center text-[11px] font-black">{pl.status === 'CLOSED' ? <span className="text-slate-300">-</span> : <span><Clock size={12} className="inline mr-1 opacity-50"/>{days} d</span>}</td>
                    <td className="p-3 align-top text-center border-l border-slate-300">
                      <div className="flex justify-center items-center gap-1.5 flex-wrap">
                        {pl.status === 'OPEN' ? (
                          <button onClick={() => setCloseModal({ isOpen: true, item: pl, note: '', file: null, uploading: false })} className={`flex items-center gap-1 text-[10px] font-black transition-colors bg-white px-2.5 py-1.5 rounded border shadow-sm ${isDup ? 'text-pink-600 border-pink-300 hover:bg-pink-100 hover:text-pink-800' : 'text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-800'}`}><CheckSquare size={13} className="inline mr-0.5"/> Close</button>
                        ) : (
                          <div className="flex items-center gap-1">
                            {pl.evidenceUrl && (<button onClick={() => window.open(pl.evidenceUrl, '_blank')} className="flex items-center justify-center p-1.5 bg-white text-slate-500 hover:text-blue-600 rounded border border-slate-200 shadow-sm transition-colors" title="View Evidence"><FileCheck size={12}/></button>)}
                            <button onClick={() => handleReopen(pl)} className="flex items-center justify-center p-1.5 bg-white text-slate-500 hover:text-orange-600 rounded border border-slate-200 shadow-sm transition-colors" title="Re-open Punch"><RotateCcw size={12}/></button>
                          </div>
                        )}
                        <button onClick={() => handleDeletePunch(pl)} className={`p-1.5 bg-white rounded border shadow-sm transition-colors ${isDup ? 'text-pink-500 border-pink-300 hover:text-red-700 hover:bg-pink-100' : 'text-slate-400 border-slate-200 hover:text-red-600 hover:bg-red-50'}`} title="Delete Punch"><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayList.length === 0 && (<tr><td colSpan="16" className="p-16 text-center text-slate-400 font-bold text-[11px]">No punchlist data matches the filters.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= BẢN IN MASTER LIST ================= */}
      <div id="printable-punchlist" className="hidden">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ fontWeight: '900', fontSize: '12px', textAlign: 'left', width: '33%', color: '#334155' }}>MCDERMOTT | PTSC</div>
          <div style={{ textAlign: 'center', width: '33%' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>VIETNAM BLOCK B GAS PROJECT</h2>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginTop: '4px', textTransform: 'uppercase' }}>MECHANICAL PUNCHLIST MASTER RECORD</div>
          </div>
          <div style={{ textAlign: 'right', width: '33%' }}>
            <div style={{ fontWeight: '900', fontSize: '12px', color: '#334155' }}>PETROVIETNAM | PQPOC</div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>Data Date: {dataDate}</div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginTop: '2px' }}>Printed: {formatToExcelDate(new Date().toISOString())}</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '9%' }}>PUNCH ID</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '9%' }}>TAG NO</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '6%' }}>PHASE</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '8%' }}>SYS</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '8%' }}>SUB</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '5%' }}>CAT</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '20%' }}>DESCRIPTION</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '7%' }}>ASSIGNEE</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '7%' }}>RAISE BY</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '7%' }}>RAISE DATE</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#f8fafc', textAlign: 'center', width: '10%' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {displayList.map(pl => {
              let catBg = '#f8fafc'; let catColor = '#64748b'; let catBorder = '#cbd5e1';
              if (pl.category === 'A') { catBg = '#fef2f2'; catColor = '#dc2626'; catBorder = '#fecaca'; }
              if (pl.category === 'B') { catBg = '#eff6ff'; catColor = '#2563eb'; catBorder = '#bfdbfe'; } 
              if (pl.category === 'C') { catBg = '#f1f5f9'; catColor = '#1e293b'; catBorder = '#cbd5e1'; }

              let statusBg = '#fef2f2'; let statusColor = '#dc2626'; let statusBorder = '#fecaca';
              if (pl.status === 'CLOSED') { statusBg = '#ecfdf5'; statusColor = '#059669'; statusBorder = '#a7f3d0'; }

              return (
                <tr key={`print-pl-${pl.punchId}`}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f1f5f9' }}>{pl.punchId}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'left', fontWeight: 'bold', color: '#2563eb' }}>{pl.tagNo}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{pl.phaseOrigin}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{pl.system}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{pl.subSystem}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}><div style={{ backgroundColor: catBg, color: catColor, border: `1px solid ${catBorder}`, padding: '2px', borderRadius: '4px', fontWeight: '900', display: 'inline-block' }}>{pl.category}</div></td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>{isDuplicate(pl) ? `[DUPLICATED] ${pl.defect}` : pl.defect}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{pl.assignee}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>{pl.raiseBy}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>{formatToExcelDate(pl.dateRaised)}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}><div style={{ backgroundColor: statusBg, color: statusColor, border: `1px solid ${statusBorder}`, padding: '2px', borderRadius: '4px', fontWeight: '900', display: 'inline-block' }}>{pl.status}</div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}