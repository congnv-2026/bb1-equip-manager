import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search, AlertCircle, ShieldAlert, CheckCircle2, CheckSquare, Filter, RotateCcw, Paperclip, FileCheck, X, Loader, Download, Clock, Zap, Hammer, RefreshCw, Printer } from 'lucide-react';

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

// ==================== COMPONENT MINI KPI BOX ====================
const PunchKpiGroup = ({ title, openCount, closedCount, colorKey, activeFilters, onToggle }) => {
  const openKey = `${colorKey.toUpperCase()}_OPEN`;
  const closedKey = `${colorKey.toUpperCase()}_CLOSED`;

  const isOpenActive = activeFilters.includes(openKey);
  const isClosedActive = activeFilters.includes(closedKey);

  const hasOpen = openCount > 0;
  const hasClosed = closedCount > 0;

  // 1. Màu Tiêu Đề
  let titleColor = 'text-slate-500';
  if (colorKey === 'red') titleColor = 'text-red-600';
  if (colorKey === 'orange') titleColor = 'text-orange-600';
  if (colorKey === 'black') titleColor = 'text-slate-900';

  // 2. Màu Ô OPEN 
  let openBg = 'bg-white border-slate-200 hover:bg-slate-50';
  let openTextNum = 'text-slate-400';
  let openTextLbl = 'text-slate-400';

  if (hasOpen) {
    if (colorKey === 'red') { openBg = 'bg-red-50 border-red-200 hover:bg-red-100'; openTextNum = 'text-red-600'; openTextLbl = 'text-red-600'; }
    if (colorKey === 'orange') { openBg = 'bg-orange-50 border-orange-200 hover:bg-orange-100'; openTextNum = 'text-orange-600'; openTextLbl = 'text-orange-600'; }
    if (colorKey === 'black') { openBg = 'bg-slate-100 border-slate-300 hover:bg-slate-200'; openTextNum = 'text-slate-800'; openTextLbl = 'text-slate-700'; }
  }

  if (isOpenActive) {
    if (colorKey === 'red') openBg += ' ring-2 ring-offset-1 ring-red-400 shadow-sm';
    if (colorKey === 'orange') openBg += ' ring-2 ring-offset-1 ring-orange-400 shadow-sm';
    if (colorKey === 'black') openBg += ' ring-2 ring-offset-1 ring-slate-400 shadow-sm';
  }

  // 3. Màu Ô CLOSED
  let closedBg = 'bg-white border-slate-200 hover:bg-slate-50';
  let closedTextNum = 'text-slate-400';
  let closedTextLbl = 'text-slate-400';

  if (hasClosed) {
    closedBg = 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
    closedTextNum = 'text-emerald-600';
    closedTextLbl = 'text-emerald-600';
  }

  if (isClosedActive) {
    closedBg += ' ring-2 ring-offset-1 ring-emerald-400 shadow-sm';
  }

  return (
    <div className="flex flex-col items-center gap-2 px-5 border-r border-slate-200 last:border-r-0">
      <span className={`text-[11px] font-black uppercase tracking-wider ${titleColor}`}>{title}</span>
      <div className="flex gap-2">
        <button onClick={() => onToggle(openKey)} className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg border transition-all duration-200 ${openBg}`}>
          <span className={`text-lg font-black leading-none ${openTextNum}`}>{openCount}</span>
          <span className={`text-[7px] font-bold uppercase mt-1 ${openTextLbl}`}>Open</span>
        </button>
        <button onClick={() => onToggle(closedKey)} className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg border transition-all duration-200 ${closedBg}`}>
          <span className={`text-lg font-black leading-none ${closedTextNum}`}>{closedCount}</span>
          <span className={`text-[7px] font-bold uppercase mt-1 ${closedTextLbl}`}>Closed</span>
        </button>
      </div>
    </div>
  );
};

export default function PunchlistMaster() {
  const [punchlists, setPunchlists] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSystem, setFilterSystem] = useState('');
  const [filterSubSystem, setFilterSubSystem] = useState('');
  const [activePhaseTab, setActivePhaseTab] = useState('CC'); 
  const [statusFilters, setStatusFilters] = useState([]);
  const [closeModal, setCloseModal] = useState({ isOpen: false, item: null, note: '', file: null, uploading: false });
  const [colWidths, setColWidths] = useState({ punchId: 180, tagNo: 150, sys: 100, subSys: 100, cat: 70, desc: 350, aging: 100, status: 100, action: 160 });

  // CỜ IN ẤN THÔNG MINH
  const [isPrinting, setIsPrinting] = useState(false);

  async function fetchPunchlists() {
    const { data } = await supabase.from('itr_matrix').select('*');
    if (data) {
      let plData = [];
      data.forEach(eq => {
        if (eq.itr_records) {
          Object.entries(eq.itr_records).forEach(([checkId, record]) => {
            if (record.status === 'P/L' || record.plStatus) {
              plData.push({
                equipId: eq.id, tagNo: eq.tag_no, system: eq.system_no || 'N/A', subSystem: eq.sub_system_no || 'N/A',
                phaseOrigin: record.plPhaseOrigin || eq.phase || 'N/A', punchId: record.punch_id || `${eq.tag_no}_${checkId}`,
                checkId: checkId, category: record.plCategory || 'B', defect: record.plDesc || record.remark || '-',
                status: record.plStatus || 'OPEN', dateRaised: record.dateRaised || new Date().toISOString(), rawRecord: record
              });
            }
          });
        }
      });
      setPunchlists(plData.sort((a,b) => new Date(b.dateRaised) - new Date(a.dateRaised)));
    }
  }

  useEffect(() => { fetchPunchlists(); }, []);

  const handleResizeStart = (e, colKey) => {
    e.preventDefault(); const startX = e.clientX; const startWidth = colWidths[colKey];
    const doDrag = (dragEvent) => requestAnimationFrame(() => setColWidths(prev => ({ ...prev, [colKey]: Math.max(60, startWidth + (dragEvent.clientX - startX)) })));
    const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
    document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', stopDrag);
  };
  const Resizer = ({ colKey }) => <div onMouseDown={(e) => handleResizeStart(e, colKey)} className="absolute top-0 right-0 w-[6px] h-full cursor-col-resize hover:bg-blue-400 z-30 transition-colors" style={{ transform: 'translateX(50%)' }} />;

  const handleToggleFilter = (filterKey) => {
    if (filterKey === 'TOTAL') setStatusFilters([]);
    else setStatusFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
  };

  const phaseFilteredList = punchlists.filter(p => p.phaseOrigin === activePhaseTab);
  const uniqueSystems = [...new Set(phaseFilteredList.map(p => String(p.system)).filter(s => s !== 'N/A' && s !== ''))];
  const uniqueSubSystems = [...new Set(phaseFilteredList.map(p => String(p.subSystem)).filter(s => s !== 'N/A' && s !== ''))];

  const stats = {
    total: phaseFilteredList.length,
    a_open: phaseFilteredList.filter(p => p.category === 'A' && p.status === 'OPEN').length,
    a_closed: phaseFilteredList.filter(p => p.category === 'A' && p.status === 'CLOSED').length,
    b_open: phaseFilteredList.filter(p => p.category === 'B' && p.status === 'OPEN').length,
    b_closed: phaseFilteredList.filter(p => p.category === 'B' && p.status === 'CLOSED').length,
    c_open: phaseFilteredList.filter(p => p.category === 'C' && p.status === 'OPEN').length,
    c_closed: phaseFilteredList.filter(p => p.category === 'C' && p.status === 'CLOSED').length,
  };

  const filteredList = phaseFilteredList.filter(p => {
    const matchSearch = String(p.tagNo).toLowerCase().includes(searchTerm.toLowerCase()) || String(p.punchId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchSystem = filterSystem === '' || String(p.system) === filterSystem;
    const matchSubSystem = filterSubSystem === '' || String(p.subSystem) === filterSubSystem;
    
    let matchKPI = true;
    if (statusFilters.length > 0) {
      matchKPI = false;
      if (statusFilters.includes('RED_OPEN') && p.category === 'A' && p.status === 'OPEN') matchKPI = true;
      if (statusFilters.includes('RED_CLOSED') && p.category === 'A' && p.status === 'CLOSED') matchKPI = true;
      if (statusFilters.includes('ORANGE_OPEN') && p.category === 'B' && p.status === 'OPEN') matchKPI = true;
      if (statusFilters.includes('ORANGE_CLOSED') && p.category === 'B' && p.status === 'CLOSED') matchKPI = true;
      if (statusFilters.includes('BLACK_OPEN') && p.category === 'C' && p.status === 'OPEN') matchKPI = true;
      if (statusFilters.includes('BLACK_CLOSED') && p.category === 'C' && p.status === 'CLOSED') matchKPI = true;
    }
    return matchSearch && matchSystem && matchSubSystem && matchKPI;
  });

  const getDays = (d) => Math.floor(Math.abs(new Date() - new Date(d)) / (1000 * 60 * 60 * 24));
  
  const executeClosePunchlist = async (e) => {
    e.preventDefault(); const { item, note, file } = closeModal; setCloseModal(prev => ({ ...prev, uploading: true }));
    try {
      let evidenceUrl = null;
      if (file) {
        const { data: urlData } = await supabase.storage.from('equipment_files').upload(`EVIDENCE_${item.tagNo}_${Date.now()}.png`, file);
        evidenceUrl = supabase.storage.from('equipment_files').getPublicUrl(urlData.path).data.publicUrl;
      }
      const { data: equipData } = await supabase.from('itr_matrix').select('itr_records').eq('id', item.equipId).single();
      if (equipData?.itr_records) {
        let updatedRecords = { ...equipData.itr_records };
        updatedRecords[item.checkId].plStatus = 'CLOSED';
        updatedRecords[item.checkId].closedDate = new Date().toISOString();
        if (evidenceUrl) updatedRecords[item.checkId].evidenceUrl = evidenceUrl;
        await supabase.from('itr_matrix').update({ itr_records: updatedRecords }).eq('id', item.equipId);
        fetchPunchlists();
      }
    } catch (error) { alert(error.message); } finally { setCloseModal({ isOpen: false, item: null, note: '', file: null, uploading: false }); }
  };

  const handleReopen = async (item) => {
    const { data: equipData } = await supabase.from('itr_matrix').select('itr_records').eq('id', item.equipId).single();
    if (equipData?.itr_records) {
      let updatedRecords = { ...equipData.itr_records };
      updatedRecords[item.checkId].plStatus = 'OPEN';
      await supabase.from('itr_matrix').update({ itr_records: updatedRecords }).eq('id', item.equipId);
      fetchPunchlists();
    }
  };

  const exportToCSV = () => {
    const headers = ['Punch ID', 'Tag No', 'System', 'Sub-System', 'Phase', 'Category', 'Punch Description', 'Status', 'Days Open', 'Closed Date'];
    const csvContent = [
      headers.join(','),
      ...filteredList.map(p => [
        `"${p.punchId}"`, `"${p.tagNo}"`, `"${p.system}"`, `"${p.subSystem}"`, `"${p.phaseOrigin}"`, `"${p.category}"`, 
        `"${String(p.defect).replace(/"/g, '""')}"`, `"${p.status}"`, `"${getDays(p.dateRaised)}"`, 
        `"${p.status === 'CLOSED' && p.rawRecord?.closedDate ? new Date(p.rawRecord.closedDate).toLocaleDateString('en-GB') : ''}"`
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Punchlist_Report_Phase_${activePhaseTab}.csv`; link.click();
  };

  const renderCategory = (cat) => {
    let style = "bg-slate-50 text-slate-500 border-slate-200";
    if (cat === 'A') style = "bg-red-50 text-red-600 border-red-200"; 
    if (cat === 'B') style = "bg-orange-50 text-orange-600 border-orange-200";
    if (cat === 'C') style = "bg-slate-100 text-slate-800 border-slate-300"; 
    return <span className={`text-[11px] font-black px-2.5 py-0.5 rounded border w-fit mx-auto block shadow-sm ${style}`}>{cat}</span>;
  }

  const renderStatus = (status, days) => {
    const isOverdue = days > 30 && status === 'OPEN';
    if (status === 'CLOSED') {
      return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1 w-fit mx-auto bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={12} strokeWidth={3}/> CLOSED</span>;
    }
    return (
      <div className="flex flex-col items-center gap-1 w-full">
        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1 w-fit mx-auto ${isOverdue ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          <AlertCircle size={12} strokeWidth={3}/> OPEN
        </span>
        {isOverdue && <span className="text-[8px] uppercase font-black text-red-600 animate-pulse tracking-widest">Overdue</span>}
      </div>
    );
  };

  // ==================== THUẬT TOÁN IN ĐỘC LẬP A4 (CHỐNG LỖI MÀN HÌNH TRẮNG) ====================
  const handlePrintListPDF = () => {
    const printContent = document.getElementById('printable-punchlist').innerHTML;
    const printWindow = window.open('', '', 'width=1200,height=800');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Punchlist Master Report</title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            * { box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              background: white; 
              margin: 0; padding: 10mm; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
            #print-container { width: 100%; display: flex; flex-direction: column; }
            
            table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
            th, td { border: 1px solid black; padding: 6px; word-wrap: break-word; white-space: normal; vertical-align: top; }
            th { background-color: #f1f5f9 !important; font-weight: bold; text-align: center; }
            
            /* Tùy chỉnh màu Category/Status giữ nguyên như UI */
            .bg-red-50 { background-color: #fef2f2 !important; }
            .bg-orange-50 { background-color: #fff7ed !important; }
            .bg-emerald-50 { background-color: #ecfdf5 !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
            
            .text-red-600 { color: #dc2626 !important; }
            .text-orange-600 { color: #ea580c !important; }
            .text-emerald-700 { color: #047857 !important; }
            .text-blue-600 { color: #2563eb !important; }
            
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <div id="print-container">
            ${printContent}
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToExcelPlaceholder = () => { alert("Tính năng xuất Excel sẽ được cập nhật sau."); };
  const exportToWordPlaceholder = () => { alert("Tính năng xuất Word sẽ được cập nhật sau."); };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
      
      {/* ================= MODAL ĐÓNG LỖI (UI KHÔNG ĐỔI) ================= */}
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
                <div className="font-black text-slate-800 text-lg">{closeModal.item.tagNo} <span className="text-sm font-medium text-slate-500">({closeModal.item.checkId})</span></div>
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

      {/* ================= HEADER CHÍNH (CÓ CHỨC NĂNG IN MỚI) ================= */}
      
      {/* THANH XUẤT BÁO CÁO CHUẨN MÀU THANH LỊCH */}
      <div className="flex justify-end items-center px-6 pt-4 pb-2 shrink-0 bg-white border-b border-slate-200 z-30 relative">
         <div className="flex gap-2">
            <button onClick={fetchPunchlists} className="p-1.5 border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center">
               <RotateCcw size={16} strokeWidth={2.5} />
            </button>
            <button onClick={handlePrintListPDF} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50">
               <Printer size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" />
               <span className="font-bold text-[13px] text-slate-600">PDF / PRINT</span>
            </button>
            <button onClick={exportToWordPlaceholder} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50">
               <Download size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" />
               <span className="font-bold text-[13px] text-slate-600">WORD</span>
            </button>
            <button onClick={exportToExcelPlaceholder} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50">
               <Download size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" />
               <span className="font-bold text-[13px] text-slate-600">EXCEL</span>
            </button>
         </div>
      </div>

      <div className="flex-none bg-white border-b border-slate-200 z-20">
        <div className="p-3 px-6 flex justify-between items-center min-h-[90px]">
          
          {/* CỤM KPI LỌC HOẠT ĐỘNG */}
          <div className="flex items-center gap-0">
             <div className="pr-5 border-r border-slate-200">
                 <button onClick={() => handleToggleFilter('TOTAL')} 
                     className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] px-3 rounded-xl border transition-all 
                     bg-purple-50 border-purple-200 hover:bg-purple-100 
                     ${statusFilters.length === 0 ? 'ring-2 ring-offset-1 ring-purple-400 shadow-sm' : 'opacity-70 hover:opacity-100'}`}>
                    <span className="text-[11px] font-black uppercase mb-0.5 text-purple-600">Total</span>
                    <span className="text-2xl font-black leading-none text-purple-700">{stats.total}</span>
                 </button>
             </div>

             <PunchKpiGroup title="PUNCH A (CRIT)" colorKey="red" openCount={stats.a_open} closedCount={stats.a_closed} activeFilters={statusFilters} onToggle={handleToggleFilter} />
             <PunchKpiGroup title="PUNCH B (MINOR)" colorKey="orange" openCount={stats.b_open} closedCount={stats.b_closed} activeFilters={statusFilters} onToggle={handleToggleFilter} />
             <PunchKpiGroup title="PUNCH C (DOC)" colorKey="black" openCount={stats.c_open} closedCount={stats.c_closed} activeFilters={statusFilters} onToggle={handleToggleFilter} />
          </div>

          <div className="flex items-center gap-2">
            <select value={filterSystem} onChange={(e) => setFilterSystem(e.target.value)} className="px-3 h-[36px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-600 outline-none w-28 hover:bg-slate-50 transition-colors cursor-pointer">
                <option value="">System: All</option>
                {uniqueSystems.map(sys => <option key={sys} value={sys}>{sys}</option>)}
            </select>
            <select value={filterSubSystem} onChange={(e) => setFilterSubSystem(e.target.value)} className="px-3 h-[36px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-600 outline-none w-32 hover:bg-slate-50 transition-colors cursor-pointer">
                <option value="">Sub-Sys: All</option>
                {uniqueSubSystems.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full pl-8 pr-3 h-[36px] bg-slate-50 border border-slate-200 rounded-md text-xs font-bold focus:outline-none"/>
            </div>
            <button onClick={exportToCSV} className="px-3 h-[36px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-md flex items-center gap-1"><Download size={14}/> CSV</button>
          </div>
        </div>

        {/* Phase Tabs */}
        <div className="px-6 flex gap-2 border-t border-slate-100 bg-white pt-2">
          <button onClick={() => { setActivePhaseTab('CC'); setStatusFilters([]); }} className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${activePhaseTab === 'CC' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            <Hammer size={16} className={activePhaseTab === 'CC' ? 'text-blue-600' : 'opacity-50'} /> Phase CC
          </button>
          <button onClick={() => { setActivePhaseTab('PC'); setStatusFilters([]); }} className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${activePhaseTab === 'PC' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            <Zap size={16} className={activePhaseTab === 'PC' ? 'text-amber-500' : 'opacity-50'} /> Phase PC
          </button>
        </div>
      </div>

      {/* ================= DATA GRID (GIAO DIỆN) ================= */}
      <div className="flex-1 p-4 overflow-auto bg-slate-100">
        <div className="bg-white border border-slate-300 shadow-sm rounded-lg min-w-full w-max overflow-hidden">
          <table className="text-left border-collapse table-fixed w-max min-w-full">
            <thead className="bg-slate-50 text-[10px] text-slate-600 uppercase font-black sticky top-0 z-10 border-b-2 border-slate-300">
              <tr>
                <th style={{ width: colWidths.punchId }} className="p-3 border-r border-slate-300 sticky left-0 top-0 bg-slate-50 z-20 text-center relative">PUNCH ID <Resizer colKey="punchId" /></th>
                <th style={{ width: colWidths.tagNo }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">TAG NO. <Resizer colKey="tagNo" /></th>
                <th style={{ width: colWidths.sys }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">SYS <Resizer colKey="sys" /></th>
                <th style={{ width: colWidths.subSys }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">SUB-SYS <Resizer colKey="subSys" /></th>
                <th style={{ width: colWidths.cat }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">CAT <Resizer colKey="cat" /></th>
                <th style={{ width: colWidths.desc }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">DESCRIPTION <Resizer colKey="desc" /></th>
                <th style={{ width: colWidths.aging }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">AGING <Resizer colKey="aging" /></th>
                <th style={{ width: colWidths.status }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">STATUS <Resizer colKey="status" /></th>
                <th style={{ width: colWidths.action }} className="p-3 sticky top-0 bg-slate-50 z-10 text-center font-bold border-l border-slate-300">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredList.map((pl, i) => {
                const days = getDays(pl.dateRaised);
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4 border-r border-slate-300 align-top sticky left-0 z-10 bg-white hover:bg-slate-50">
                      <span className="font-black text-slate-800 text-[11px] w-full block bg-slate-100 px-2 py-0.5 rounded text-center border border-slate-200">{pl.punchId}</span>
                    </td>
                    <td className="p-3 border-r border-slate-300 text-[11px] text-left font-black text-blue-600 align-top">{pl.tagNo}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 align-top">{pl.system}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 align-top">{pl.subSystem}</td>
                    <td className="p-3 border-r border-slate-300 align-top text-center">{renderCategory(pl.category)}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] text-left font-bold text-slate-700 whitespace-normal break-words align-top">{pl.defect}</td>
                    <td className="p-3 border-r border-slate-300 align-top text-center text-[11px] font-black">
                      {pl.status === 'CLOSED' ? <span className="text-slate-300">-</span> : <span><Clock size={12} className="inline mr-1 opacity-50"/>{days} d</span>}
                    </td>
                    <td className="p-3 border-r border-slate-300 align-top text-center">
                      {renderStatus(pl.status, days)}
                    </td>
                    <td className="p-3 align-top text-center border-l border-slate-300">
                      <div className="flex justify-center gap-2">
                        {pl.status === 'OPEN' ? (
                          <button onClick={() => setCloseModal({ isOpen: true, item: pl, note: '', file: null, uploading: false })} className="flex items-center gap-1 text-[11px] font-black text-blue-600 hover:text-blue-800 transition-colors bg-white px-3 py-1.5 rounded border border-blue-200 shadow-sm hover:bg-blue-50">
                            <CheckSquare size={14} className="inline mr-1"/> Verify
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {pl.rawRecord.evidenceUrl && (
                              <button onClick={() => window.open(pl.rawRecord.evidenceUrl, '_blank')} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-blue-600 transition-colors bg-white px-2 py-1.5 rounded border border-slate-200 hover:border-blue-300 hover:bg-blue-50">
                                <FileCheck size={12}/> File
                              </button>
                            )}
                            <button onClick={() => handleReopen(pl)} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-red-600 transition-colors bg-white px-2 py-1.5 rounded border border-slate-200 hover:border-red-300 hover:bg-red-50">
                              <RotateCcw size={12}/> Reopen
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (<tr><td colSpan="9" className="p-16 text-center text-slate-400 font-bold text-[11px]">No punchlist data matches the filters.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= KHU VỰC ẨN CHỨA BẢN IN MASTER LIST (ĐƯỢC GỌI BỞI WINDOW.PRINT) ================= */}
      <div id="printable-punchlist" className="hidden">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ fontWeight: '900', fontSize: '12px', textAlign: 'left', width: '33%', color: '#334155' }}>MCDERMOTT | PTSC</div>
          <div style={{ textAlign: 'center', width: '33%' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>VIETNAM BLOCK B GAS PROJECT</h2>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginTop: '4px', textTransform: 'uppercase' }}>PUNCHLIST MASTER RECORD - PHASE {activePhaseTab}</div>
          </div>
          <div style={{ textAlign: 'right', width: '33%' }}>
            <div style={{ fontWeight: '900', fontSize: '12px', color: '#334155' }}>PETROVIETNAM | PQPOC</div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginTop: '4px' }}>Printed: {formatToExcelDate(new Date().toISOString())}</div>
          </div>
        </div>

        {/* Bản in đã ẩn đi toàn bộ các nút Tìm kiếm, Filters, Thêm/Sửa/Xóa. Chỉ tập trung vào dữ liệu thuần */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '18%' }}>PUNCH ID</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '15%' }}>TAG NO</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '8%' }}>SYS</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '8%' }}>SUB</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '6%' }}>CAT</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '25%' }}>DESCRIPTION</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '10%' }}>AGING</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '10%' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map(pl => {
              const days = getDays(pl.dateRaised);
              
              // Set màu Category giống UI
              let catBg = '#f8fafc'; let catColor = '#64748b'; let catBorder = '#cbd5e1';
              if (pl.category === 'A') { catBg = '#fef2f2'; catColor = '#dc2626'; catBorder = '#fecaca'; }
              if (pl.category === 'B') { catBg = '#fff7ed'; catColor = '#ea580c'; catBorder = '#fed7aa'; }
              if (pl.category === 'C') { catBg = '#f1f5f9'; catColor = '#1e293b'; catBorder = '#cbd5e1'; }

              // Set màu Status giống UI
              let statusBg = '#fef2f2'; let statusColor = '#dc2626'; let statusBorder = '#fecaca';
              if (pl.status === 'CLOSED') { statusBg = '#ecfdf5'; statusColor = '#059669'; statusBorder = '#a7f3d0'; }

              return (
                <tr key={`print-pl-${pl.punchId}`}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f1f5f9' }}>{pl.punchId}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left', fontWeight: 'bold', color: '#2563eb' }}>{pl.tagNo}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{pl.system}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{pl.subSystem}</td>
                  
                  {/* Category Box */}
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: catBg, color: catColor, border: `1px solid ${catBorder}`, padding: '2px 4px', borderRadius: '4px', fontWeight: '900', display: 'inline-block' }}>
                      {pl.category}
                    </div>
                  </td>
                  
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>{pl.defect}</td>
                  
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                    {pl.status === 'CLOSED' ? '-' : `${days} d`}
                  </td>

                  {/* Status Box */}
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: statusBg, color: statusColor, border: `1px solid ${statusBorder}`, padding: '4px 6px', borderRadius: '4px', fontWeight: '900', display: 'inline-block' }}>
                      {pl.status}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}