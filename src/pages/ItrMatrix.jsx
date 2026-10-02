import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, RotateCcw, X, Edit, Trash2, FileSpreadsheet, Printer, 
  RefreshCw, Hammer, Zap, CheckCircle2, CircleDashed, FileText, 
  Download, AlertTriangle, Clock, ShieldAlert, Copy, Filter,
  Paperclip, Loader, FileCheck 
} from 'lucide-react';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';

const getCompareKey = (str) => {
  if (!str) return '';
  return String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

const formatToExcelDate = (dateString) => {
  if (!dateString) return '';
  if (typeof dateString !== 'string' && typeof dateString !== 'number') return ''; 
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString); 
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`; 
};

const getMonthYear = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${m}/${y}`;
};

const CustomDateInput = ({ value, onChange, disabled, className, placeholder }) => {
  const [isFocused, setIsFocused] = useState(false);
  let displayValue = '';
  if (value) {
    if (typeof value === 'string' && value.includes('-') && value.length === 10) displayValue = formatToExcelDate(value);
    else displayValue = String(value); 
  }
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

const ColumnFilter = ({ filterKey, options, activeFilters, setColumnFilters }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleFilter = (val) => {
    setColumnFilters(prev => {
      const current = prev[filterKey] || [];
      const isSelected = current.includes(val);
      const next = isSelected ? current.filter(item => item !== val) : [...current, val];
      return { ...prev, [filterKey]: next };
    });
  };

  const selectAll = () => setColumnFilters(prev => ({ ...prev, [filterKey]: options }));
  const clearAll = () => setColumnFilters(prev => ({ ...prev, [filterKey]: [] }));

  const currentFilters = activeFilters[filterKey] || [];
  const isActive = currentFilters.length > 0;

  return (
    <div className="relative inline-block ml-1">
      <button onClick={() => setIsOpen(!isOpen)} className={`p-0.5 rounded transition-colors ${isActive ? 'text-blue-600 bg-blue-100' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>
        <Filter size={11} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 3 : 2} />
      </button>

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

export default function ItrMatrix() {
  const [equipList, setEquipList] = useState([]);
  const [templates, setTemplates] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [activePhaseTab, setActivePhaseTab] = useState('CC'); 
  const [statusFilters, setStatusFilters] = useState([]);

  const [columnFilters, setColumnFilters] = useState({
    tagNo: [], desc: [], subSystem: [], subSystemDesc: [], 
    type: [], location: [], subContractor: [], planFinish: [], compDate: [], status: []
  });

  const [filterPlanMonth, setFilterPlanMonth] = useState('');
  const [filterCompMonth, setFilterCompMonth] = useState('');

  const [activeItr, setActiveItr] = useState(null);
  const [itrData, setItrData] = useState({});
  const [uploadingPdf, setUploadingPdf] = useState(false); 
  
  const [uploadingDirectId, setUploadingDirectId] = useState(null); 
  const directUploadInputRef = useRef(null);
  const [directUploadTarget, setDirectUploadTarget] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [dataDate, setDataDate] = useState(localStorage.getItem('projectDataDate') || 'N/A');

  const [colWidths, setColWidths] = useState({ 
      tagNo: 160, desc: 250, subSys: 120, subSysDesc: 200, chk: 120, 
      loc: 100, subCon: 100, planFin: 100, compDate: 100, 
      status: 140, action: 110 
  });
  
  const pdfInputRef = useRef(null);

  async function fetchData() {
    let allData = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    try {
      const templateRes = await supabase.from('checksheet_templates').select('*').order('code', { ascending: true });
      if (templateRes.data) {
        const tempMap = {}; 
        templateRes.data.forEach(t => { tempMap[t.code] = { questions: t.questions, description: t.description }; });
        setTemplates(tempMap);
      }

      while (hasMore) {
        const { data, error } = await supabase.from('itr_matrix').select('*').order('tag_no', { ascending: true }).range(from, from + step - 1);
        if (error) throw error;
        if (!data || data.length === 0) hasMore = false;
        else { allData = [...allData, ...data]; if (data.length < step) hasMore = false; else from += step; }
      }
      setEquipList(allData);
    } catch (err) { console.error("Fetch Data Error:", err); }
  }

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { const storedDate = localStorage.getItem('projectDataDate'); if (storedDate) setDataDate(storedDate); }, [equipList]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const next7Days = new Date(today); next7Days.setDate(today.getDate() + 7);

  const phaseList = equipList.filter(item => item.phase === activePhaseTab);

  const duplicateMap = {};
  phaseList.forEach(item => {
    const key = `${getCompareKey(item.tag_no)}___${String(item.checksheet_type || '').trim().toLowerCase()}`;
    duplicateMap[key] = (duplicateMap[key] || 0) + 1;
  });
  const isDuplicate = (item) => duplicateMap[`${getCompareKey(item.tag_no)}___${String(item.checksheet_type || '').trim().toLowerCase()}`] > 1;

  const uniquePlanMonths = [...new Set(phaseList.map(i => getMonthYear(i.plan_finish)).filter(Boolean))].sort();
  const uniqueCompMonths = [...new Set(phaseList.map(i => getMonthYear(i.complete_date)).filter(Boolean))].sort();

  const uniqueValues = {
    tagNo: [...new Set(phaseList.map(i => String(i.tag_no || '')))].sort(),
    desc: [...new Set(phaseList.map(i => String(i.description || '')))].sort(),
    subSystem: [...new Set(phaseList.map(i => String(i.sub_system_no || '')))].sort(),
    subSystemDesc: [...new Set(phaseList.map(i => String(i.sub_system_description || '')))].sort(),
    type: [...new Set(phaseList.map(i => String(i.checksheet_type || '')))].sort(),
    location: [...new Set(phaseList.map(i => String(i.location || '')))].sort(),
    subContractor: [...new Set(phaseList.map(i => String(i.subcontractor || '')))].sort(),
    planFinish: [...new Set(phaseList.map(i => i.plan_finish ? formatToExcelDate(i.plan_finish) : ''))].sort(),
    compDate: [...new Set(phaseList.map(i => i.complete_date ? formatToExcelDate(i.complete_date) : ''))].sort(),
    status: [...new Set(phaseList.map(i => String(i.itr_status || 'Not Started')))].sort(),
  };

  // LOGIC TÍNH TOÁN KPI MỚI (Attached / Not Attached CHỈ ĐẾM TRONG SỐ DONE)
  let overdueCount = 0; let upcomingCount = 0; let unverifiedCount = 0; let duplicateCount = 0; 
  let attachedCount = 0; let notAttachedCount = 0; let completedCount = 0;

  phaseList.forEach(item => {
      if (item.checksheet_type === 'UNVERIFIED') unverifiedCount++;
      if (isDuplicate(item)) duplicateCount++; 
      
      if (item.itr_status === 'Completed') {
          completedCount++;
          if (item.itr_records && item.itr_records.scanned_pdf) attachedCount++;
          else notAttachedCount++;
      }

      if (item.itr_status !== 'Completed' && item.plan_finish) {
          const pDate = new Date(item.plan_finish);
          if (!isNaN(pDate.getTime())) {
              pDate.setHours(0,0,0,0);
              if (pDate < today) overdueCount++;
              else if (pDate >= today && pDate <= next7Days) upcomingCount++;
          }
      }
  });

  const stats = {
    total: phaseList.length,
    notStarted: phaseList.filter(i => !i.itr_status || i.itr_status === 'Not Started').length,
    completed: completedCount,
    attached: attachedCount, 
    notAttached: notAttachedCount, 
    overdue: overdueCount, upcoming: upcomingCount, unverified: unverifiedCount, duplicates: duplicateCount
  };

  const handleToggleFilter = (filterKey) => {
    if (filterKey === 'All') setStatusFilters([]);
    else setStatusFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
  };

  const filteredList = phaseList.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = (String(item.tag_no || '').toLowerCase().includes(searchLower)) || (String(item.description || '').toLowerCase().includes(searchLower)) || (String(item.sub_system_no || '').toLowerCase().includes(searchLower)) || (String(item.checksheet_type || '').toLowerCase().includes(searchLower));
    
    let matchStatus = true;
    if (statusFilters.length > 0) {
        matchStatus = false;
        if (statusFilters.includes('UNVERIFIED') && item.checksheet_type === 'UNVERIFIED') matchStatus = true;
        if (statusFilters.includes('DUPLICATES') && isDuplicate(item)) matchStatus = true;
        
        statusFilters.forEach(filter => {
            // LỌC THEO LOGIC MỚI: Chỉ tìm trong các ITR đã Completed
            if (filter === 'Attached' && item.itr_status === 'Completed' && item.itr_records && item.itr_records.scanned_pdf) matchStatus = true;
            if (filter === 'Not Attached' && item.itr_status === 'Completed' && (!item.itr_records || !item.itr_records.scanned_pdf)) matchStatus = true;
            if (filter === 'Completed' && item.itr_status === 'Completed') matchStatus = true;
            
            if (filter === 'Not Started' && (!item.itr_status || item.itr_status === 'Not Started')) matchStatus = true;
            if (filter === 'Overdue') { const pDate = item.plan_finish ? new Date(item.plan_finish) : null; if(pDate) pDate.setHours(0,0,0,0); if (item.itr_status !== 'Completed' && pDate && pDate < today) matchStatus = true; }
            if (filter === 'Upcoming') { const pDate = item.plan_finish ? new Date(item.plan_finish) : null; if(pDate) pDate.setHours(0,0,0,0); if (item.itr_status !== 'Completed' && pDate && pDate >= today && pDate <= next7Days) matchStatus = true; }
        });
    }

    const matchPlanMonth = filterPlanMonth === '' || getMonthYear(item.plan_finish) === filterPlanMonth;
    const matchCompMonth = filterCompMonth === '' || getMonthYear(item.complete_date) === filterCompMonth;

    const matchColTag = columnFilters.tagNo?.length ? columnFilters.tagNo.includes(String(item.tag_no || '')) : true;
    const matchColDesc = columnFilters.desc?.length ? columnFilters.desc.includes(String(item.description || '')) : true;
    const matchColSubSys = columnFilters.subSystem?.length ? columnFilters.subSystem.includes(String(item.sub_system_no || '')) : true;
    const matchColSubSysDesc = columnFilters.subSystemDesc?.length ? columnFilters.subSystemDesc.includes(String(item.sub_system_description || '')) : true;
    const matchColType = columnFilters.type?.length ? columnFilters.type.includes(String(item.checksheet_type || '')) : true;
    const matchColLoc = columnFilters.location?.length ? columnFilters.location.includes(String(item.location || '')) : true;
    const matchColSubCon = columnFilters.subContractor?.length ? columnFilters.subContractor.includes(String(item.subcontractor || '')) : true;
    const matchColPlanFin = columnFilters.planFinish?.length ? columnFilters.planFinish.includes(item.plan_finish ? formatToExcelDate(item.plan_finish) : '') : true;
    const matchColCompDate = columnFilters.compDate?.length ? columnFilters.compDate.includes(item.complete_date ? formatToExcelDate(item.complete_date) : '') : true;
    const matchColStatus = columnFilters.status?.length ? columnFilters.status.includes(String(item.itr_status || 'Not Started')) : true;

    return matchSearch && matchStatus && matchPlanMonth && matchCompMonth && matchColTag && matchColDesc && matchColSubSys && matchColSubSysDesc && matchColType && matchColLoc && matchColSubCon && matchColPlanFin && matchColCompDate && matchColStatus;
  });

  const handleResizeStart = (e, colKey) => {
    e.preventDefault(); e.stopPropagation(); const startX = e.clientX; const startWidth = colWidths[colKey] || 100;
    const doDrag = (dragEvent) => requestAnimationFrame(() => setColWidths(prev => ({ ...prev, [colKey]: Math.max(60, startWidth + (dragEvent.clientX - startX)) })));
    const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
    document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', stopDrag);
  };
  const Resizer = ({ colKey }) => <div onMouseDown={(e) => handleResizeStart(e, colKey)} className="absolute top-0 right-0 w-[6px] h-full cursor-col-resize hover:bg-blue-400 z-30 transition-colors" style={{ transform: 'translateX(50%)' }} />;

  const handleClearData = async () => {
    if (window.confirm(`⚠️ CẢNH BÁO NGUY HIỂM TỘT ĐỘ ⚠️\nXÓA SẠCH TOÀN BỘ ${stats.total} thiết bị ITR của Phase ${activePhaseTab}?`)) {
        try {
            const { error } = await supabase.from('itr_matrix').delete().eq('phase', activePhaseTab);
            if (error) throw error;
            localStorage.removeItem('projectDataDate'); setDataDate('N/A');
            await fetchData();
            alert(`✅ Đã xóa thành công toàn bộ dữ liệu của Phase ${activePhaseTab}.`);
        } catch (error) { alert("Lỗi khi xóa: " + error.message); }
    }
  };

  const handleEditEquipment = async (e) => {
    e.preventDefault(); if (!editingItem) return;
    const payload = { 
        tag_no: String(editingItem.tag_no || '').toUpperCase(), description: editingItem.description, 
        sub_system_no: String(editingItem.sub_system_no || '').toUpperCase(), sub_system_description: editingItem.sub_system_description, checksheet_type: editingItem.checksheet_type,
        location: editingItem.location, subcontractor: editingItem.subcontractor, plan_finish: editingItem.plan_finish || null, complete_date: editingItem.complete_date || null,
        itr_status: editingItem.complete_date ? 'Completed' : (editingItem.itr_status || 'Not Started')
    };
    try { await supabase.from('itr_matrix').update(payload).eq('id', editingItem.id); await fetchData(); setIsEditModalOpen(false); setEditingItem(null); } catch(err) { alert("Lỗi cập nhật: " + err.message); }
  };

  const handleDeleteEquipment = async (id, tagNo) => {
    if (!window.confirm(`Xóa vĩnh viễn Tag [${tagNo}]?`)) return;
    await supabase.from('itr_matrix').delete().eq('id', id); await fetchData();
  };

  const openItrModal = (item) => {
    if (item.checksheet_type === 'UNVERIFIED' || !templates[item.checksheet_type]) return alert(`Vui lòng Edit thiết bị và gán Checksheet Template chuẩn.`);
    setActiveItr({ ...item }); setItrData(item.itr_records || {});
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploadingPdf(true);
    try {
      const fileName = `ITR_SCAN_${String(activeItr.tag_no).replace(/[^a-zA-Z0-9]/g, '_')}_${activeItr.checksheet_type}_${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('equipment_files').upload(fileName, file);
      const url = supabase.storage.from('equipment_files').getPublicUrl(fileName).data.publicUrl;
      setItrData(prev => ({ ...prev, scanned_pdf: url }));
    } catch (error) { alert("Lỗi: " + error.message); } finally { setUploadingPdf(false); e.target.value = null; }
  };

  const triggerDirectUpload = (item) => {
    setDirectUploadTarget(item);
    if (directUploadInputRef.current) {
        directUploadInputRef.current.click();
    }
  };

  const handleDirectPdfUploadChange = async (e) => {
    const file = e.target.files[0]; 
    if (!file || !directUploadTarget) return; 
    
    setUploadingDirectId(directUploadTarget.id);
    
    try {
      const extension = file.name.split('.').pop();
      const fileName = `ITR_SCAN_${String(directUploadTarget.tag_no).replace(/[^a-zA-Z0-9]/g, '_')}_${directUploadTarget.checksheet_type}_${Date.now()}.${extension}`;
      
      const { error: uploadError } = await supabase.storage.from('equipment_files').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const url = supabase.storage.from('equipment_files').getPublicUrl(fileName).data.publicUrl;
      
      const currentRecords = (typeof directUploadTarget.itr_records === 'object' && directUploadTarget.itr_records !== null) ? directUploadTarget.itr_records : {};
      const updatedRecords = { ...currentRecords, scanned_pdf: url };
      
      const { error: updateError } = await supabase.from('itr_matrix').update({ itr_records: updatedRecords }).eq('id', directUploadTarget.id);
      if (updateError) throw updateError;
      
      alert("Đã tải và lưu file đính kèm thành công!");
      await fetchData(); 
      
    } catch (error) { 
      alert("Lỗi tải file: " + error.message); 
    } finally { 
      setUploadingDirectId(null); 
      setDirectUploadTarget(null);
      e.target.value = null; 
    }
  };

  const handleActionClick = (questionId, actionType) => {
    setItrData(prev => {
      const current = prev[questionId] || {};
      if (current.status === actionType) { const newData = { ...prev }; delete newData[questionId]; return newData; }
      return { ...prev, [questionId]: { ...current, status: actionType } };
    });
  };

  const handleExtraInfoChange = (field, value) => setActiveItr(prev => ({ ...prev, [field]: value }));

  const saveItrExecution = async () => {
    let newStatus = 'Not Started'; let cDate = activeItr.complete_date;
    const totalQuestions = (templates[activeItr.checksheet_type]?.questions || []).length;
    let totalAnswered = 0; let hasOpenPunch = false;

    (templates[activeItr.checksheet_type]?.questions || []).forEach(q => {
        const rec = itrData[q.id];
        if (rec && rec.status) totalAnswered++;
        if (rec && rec.status === 'P/L') hasOpenPunch = true; 
    });
    
    if (Object.keys(itrData).length > 0) {
        if (totalAnswered >= totalQuestions && !hasOpenPunch && totalQuestions > 0) {
            newStatus = 'Completed'; if(!cDate) cDate = new Date().toISOString().split('T')[0];
        } else { newStatus = 'In Progress'; cDate = null; }
    }
    
    await supabase.from('itr_matrix').update({ itr_records: itrData, itr_status: newStatus, complete_date: cDate, pid_no: activeItr.pid_no || '', serial_no: activeItr.serial_no || '', location: activeItr.location || '', manufacturer: activeItr.manufacturer || '' }).eq('id', activeItr.id);
    await fetchData(); setActiveItr(null);
  };

  const handlePrintExecution = () => {
    const printContent = document.getElementById('printable-itr').innerHTML;
    const printWindow = window.open('', '', 'width=1200,height=800');
    printWindow.document.write(`<html><head><title>Print ITR</title><style>@page{size:A4 portrait;margin:0;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;background:white;margin:0;padding:12mm 15mm;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}#print-container{width:100%;display:flex;flex-direction:column;}table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10px;}th,td{border:1px solid black;padding:6px;}.no-print{display:none !important;}</style></head><body><div id="print-container">${printContent}</div><script>setTimeout(()=>{window.print();window.close();},500);</script></body></html>`);
    printWindow.document.close();
  };

  const handlePrintListPDF = () => {
    const printContent = document.getElementById('printable-master-list').innerHTML;
    const printWindow = window.open('', '', 'width=1200,height=800');
    printWindow.document.write(`<html><head><title>ITR Master List</title><style>@page{size:A4 landscape;margin:0;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;background:white;margin:0;padding:10mm;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}#print-container{width:100%;display:flex;flex-direction:column;}table{width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;}th,td{border:1px solid black;padding:6px;word-wrap:break-word;white-space:normal;vertical-align:top;}th{background-color:#f1f5f9 !important;font-weight:bold;text-align:center;}</style></head><body><div id="print-container">${printContent}</div><script>setTimeout(()=>{window.print();window.close();},500);</script></body></html>`);
    printWindow.document.close();
  };

  const exportToExcel = () => { alert("Tính năng xuất Excel sẽ được tích hợp sau."); };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative min-w-0">

      {/* INPUT FILE ẨN DÙNG CHUNG CHO TÍNH NĂNG UPLOAD TRỰC TIẾP */}
      <input 
        type="file" 
        ref={directUploadInputRef} 
        accept="image/*, application/pdf" 
        className="hidden" 
        onChange={handleDirectPdfUploadChange} 
      />

      {/* ================= MODAL SỬA TAG ================= */}
      {isEditModalOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form onSubmit={handleEditEquipment} className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-800">Edit Tag Info</h3>
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Tag No *</label><input required type="text" value={editingItem?.tag_no || ''} onChange={(e) => setEditingItem({...editingItem, tag_no: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 border rounded text-sm uppercase outline-none focus:border-blue-400 bg-slate-100" disabled/></div>
                  <div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Description</label><input type="text" value={editingItem?.description || ''} onChange={(e) => setEditingItem({...editingItem, description: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none focus:border-blue-400" /></div>
                  <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Sub-System</label><input type="text" value={editingItem?.sub_system_no || ''} onChange={(e) => setEditingItem({...editingItem, sub_system_no: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 border rounded text-sm uppercase outline-none focus:border-blue-400" /></div>
                  <div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Sub-System Desc</label><input type="text" value={editingItem?.sub_system_description || ''} onChange={(e) => setEditingItem({...editingItem, sub_system_description: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none focus:border-blue-400" /></div>
                  <div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Location</label><input type="text" value={editingItem?.location || ''} onChange={(e) => setEditingItem({...editingItem, location: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none focus:border-blue-400" /></div>
                  <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">SubContractor</label><input type="text" value={editingItem?.subcontractor || ''} onChange={(e) => setEditingItem({...editingItem, subcontractor: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none focus:border-blue-400" /></div>
                  <div className="col-span-3 grid grid-cols-2 gap-4 mt-1">
                      <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Plan Finish</label><CustomDateInput value={editingItem?.plan_finish || ''} onChange={(val) => setEditingItem({...editingItem, plan_finish: val})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none focus:border-blue-400 bg-white" /></div>
                      <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Complete Date</label><CustomDateInput value={editingItem?.complete_date || ''} onChange={(val) => setEditingItem({...editingItem, complete_date: val})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none focus:border-emerald-400 bg-emerald-50 text-emerald-700" /></div>
                  </div>
                  <div className="col-span-3 border-t pt-4 mt-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                       Checksheet Template {editingItem?.checksheet_type === 'UNVERIFIED' && <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded text-[9px]"><ShieldAlert size={10} className="inline mr-1"/>Vui lòng chọn</span>}
                    </label>
                    <select value={editingItem?.checksheet_type || ''} onChange={(e) => setEditingItem({...editingItem, checksheet_type: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none font-bold text-blue-600 focus:border-blue-400">
                      {editingItem?.checksheet_type === 'UNVERIFIED' && <option value="UNVERIFIED">-- Chọn Mã Checksheet --</option>}
                      {Object.keys(templates).map(k => <option key={k} value={k}>{k} - {templates[k].description}</option>)}
                    </select>
                  </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }} className="px-4 py-2 font-bold text-slate-500 text-sm hover:bg-slate-200 rounded">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-sm shadow-sm">Save</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL ITR EXECUTION ================= */}
      {activeItr && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-slate-100 text-blue-600 rounded text-sm font-black border border-slate-200">{activeItr.checksheet_type}</span>
                <h3 className="font-black text-lg text-slate-800">{activeItr.tag_no}</h3>
              </div>
              <button onClick={() => setActiveItr(null)} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="grid grid-cols-4 gap-4 pb-6 border-b border-slate-100">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">P&ID No.</label><input type="text" value={activeItr.pid_no || ''} onChange={(e) => handleExtraInfoChange('pid_no', e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded text-sm outline-none" /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Serial No.</label><input type="text" value={activeItr.serial_no || ''} onChange={(e) => handleExtraInfoChange('serial_no', e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded text-sm outline-none" /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Location</label><input type="text" value={activeItr.location || ''} onChange={(e) => handleExtraInfoChange('location', e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded text-sm outline-none" /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Manufacturer</label><input type="text" value={activeItr.manufacturer || ''} onChange={(e) => handleExtraInfoChange('manufacturer', e.target.value)} className="w-full mt-1 px-3 py-1.5 border rounded text-sm outline-none" /></div>
              </div>
              {(templates[activeItr.checksheet_type]?.questions || []).map((templateQ) => {
                const record = itrData[templateQ.id] || {};
                const isPL = record.status === 'P/L';
                return (
                  <div key={templateQ.id} className={`p-4 rounded-lg border ${isPL ? 'bg-red-50/20 border-red-300' : 'border-slate-200'}`}>
                    <div className="flex gap-4 items-start">
                      <div className="text-slate-400 font-bold text-xs pt-1">{templateQ.id}.</div>
                      <div className="flex-1 text-sm text-slate-700 pt-0.5">{templateQ.text}</div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleActionClick(templateQ.id, 'OK')} className={`w-10 h-8 rounded text-xs font-bold transition-colors ${record.status === 'OK' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>OK</button>
                        <button onClick={() => handleActionClick(templateQ.id, 'N/A')} className={`w-10 h-8 rounded text-xs font-bold transition-colors ${record.status === 'N/A' ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>N/A</button>
                        <button onClick={() => handleActionClick(templateQ.id, 'P/L')} className={`w-10 h-8 rounded text-xs font-bold transition-colors ${record.status === 'P/L' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-red-200'}`} title="Lỗi Punchlist">P/L</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="text-[10px] font-bold text-slate-500">
                  Completed: {Object.keys(itrData).filter(k => k !== 'scanned_pdf' && itrData[k].status).length} / {(templates[activeItr.checksheet_type]?.questions || []).length}
                </div>
                <div className="flex items-center gap-2 border-l border-slate-300 pl-4">
                  <input type="file" ref={pdfInputRef} accept="image/*, application/pdf" className="hidden" onChange={handlePdfUpload} />
                  <button onClick={() => pdfInputRef.current.click()} disabled={uploadingPdf} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">{uploadingPdf ? '...' : 'Attach PDF'}</button>
                  {itrData.scanned_pdf && <a href={itrData.scanned_pdf} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold flex items-center gap-1"><FileCheck size={14}/> View PDF</a>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrintExecution} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded font-bold text-sm flex items-center gap-1"><Printer size={14}/> Print Record</button>
                <button onClick={saveItrExecution} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded font-bold text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= KHU VỰC ẨN BẢN IN EXECUTION ================= */}
      {activeItr && (
        <div id="printable-itr" className="hidden">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'left' }}>MCDERMOTT<br/>PTSC</div>
            <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '16px', textTransform: 'uppercase' }}>VIETNAM BLOCK B GAS PROJECT<br/><span style={{ fontSize: '10px' }}>INSTALLATION INSPECTION & TEST RECORD</span></div>
            <div style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'right' }}>PETROVIETNAM<br/>PQPOC</div>
          </div>
          <div style={{ display: 'flex', border: '1px solid black', marginBottom: '12px', fontWeight: 'bold', fontSize: '10px', textAlign: 'center' }}>
            <div style={{ width: '50%', padding: '6px', borderRight: '1px solid black', textTransform: 'uppercase', backgroundColor: '#f1f5f9' }}>{templates[activeItr.checksheet_type]?.description || 'MECHANICAL EQUIPMENT'}</div>
            <div style={{ width: '16.66%', padding: '6px', borderRight: '1px solid black' }}>{activeItr.checksheet_type}</div>
            <div style={{ width: '16.66%', padding: '6px', borderRight: '1px solid black' }}>Sheet 1 of 1</div>
            <div style={{ width: '16.66%', padding: '6px' }}>Rev 00</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '12px', fontSize: '10px' }}>
            <tbody>
              <tr><td style={{ border: '1px solid black', padding: '6px', backgroundColor: '#f1f5f9', fontWeight: 'bold', textTransform: 'uppercase' }} colSpan="4">Information</td></tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold', width: '25%' }}>Tag number</td><td style={{ border: '1px solid black', padding: '6px', width: '25%', fontWeight: '900' }}>{activeItr.tag_no}</td>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold', width: '25%' }}>Description</td><td style={{ border: '1px solid black', padding: '6px', width: '25%' }}>{activeItr.description}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>Sub System</td><td style={{ border: '1px solid black', padding: '6px', fontWeight: '900' }}>{activeItr.sub_system_no}</td>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>P&ID No.</td><td style={{ border: '1px solid black', padding: '6px' }}>{activeItr.pid_no}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>Deck/location</td><td style={{ border: '1px solid black', padding: '6px' }}>{activeItr.location}</td>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>Serial No.</td><td style={{ border: '1px solid black', padding: '6px' }}>{activeItr.serial_no}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>Sub-Contractor</td><td style={{ border: '1px solid black', padding: '6px' }}>{activeItr.subcontractor}</td>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>Manufacturer</td><td style={{ border: '1px solid black', padding: '6px' }}>{activeItr.manufacturer}</td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '12px', fontSize: '10px' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                <th style={{ border: '1px solid black', padding: '6px', width: '8%', textAlign: 'center' }}>No.</th>
                <th style={{ border: '1px solid black', padding: '6px', width: '62%', textAlign: 'center' }}>Description</th>
                <th style={{ border: '1px solid black', padding: '6px', width: '10%', textAlign: 'center' }}>OK</th>
                <th style={{ border: '1px solid black', padding: '6px', width: '10%', textAlign: 'center' }}>N/A</th>
                <th style={{ border: '1px solid black', padding: '6px', width: '10%', textAlign: 'center' }}>P/L</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold', backgroundColor: '#f8fafc' }} colSpan="5">1. Inspection Checklist</td></tr>
              {(templates[activeItr.checksheet_type]?.questions || []).map(q => (
                <tr key={q.id}>
                  <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{q.id}</td>
                  <td style={{ border: '1px solid black', padding: '6px', textAlign: 'justify' }}>{q.text}</td>
                  <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center', fontWeight: '900', color: '#059669' }}>{itrData[q.id]?.status === 'OK' ? '✓' : ''}</td>
                  <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center', fontWeight: '900', color: '#64748b' }}>{itrData[q.id]?.status === 'N/A' ? 'N/A' : ''}</td>
                  <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center', fontWeight: '900', color: '#dc2626' }}>{itrData[q.id]?.status === 'P/L' ? 'P/L' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', textAlign: 'center', marginTop: 'auto', fontSize: '10px' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                <th style={{ border: '1px solid black', padding: '6px' }}></th>
                <th style={{ border: '1px solid black', padding: '6px', width: '25%' }}>Completed by</th>
                <th style={{ border: '1px solid black', padding: '6px', width: '25%' }}>Verified / Approved by</th>
                <th style={{ border: '1px solid black', padding: '6px', width: '25%' }}>Witnessed / Reviewed by</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold', textAlign: 'left' }}>Company</td><td style={{ border: '1px solid black', padding: '6px' }}></td><td style={{ border: '1px solid black', padding: '6px' }}></td><td style={{ border: '1px solid black', padding: '6px' }}></td></tr>
              <tr><td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold', textAlign: 'left' }}>Name</td><td style={{ border: '1px solid black', padding: '6px' }}></td><td style={{ border: '1px solid black', padding: '6px' }}></td><td style={{ border: '1px solid black', padding: '6px' }}></td></tr>
              <tr><td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold', textAlign: 'left', height: '4rem', verticalAlign: 'top' }}>Signature</td><td style={{ border: '1px solid black', padding: '6px' }}></td><td style={{ border: '1px solid black', padding: '6px' }}></td><td style={{ border: '1px solid black', padding: '6px' }}></td></tr>
              <tr><td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold', textAlign: 'left' }}>Date</td><td style={{ border: '1px solid black', padding: '6px' }}></td><td style={{ border: '1px solid black', padding: '6px' }}></td><td style={{ border: '1px solid black', padding: '6px' }}></td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ================= KHU VỰC ẨN BẢN IN MASTER LIST A4 ================= */}
      <div id="printable-master-list" className="hidden">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ fontWeight: '900', fontSize: '12px', textAlign: 'left', width: '33%', color: '#334155' }}>MCDERMOTT | PTSC</div>
          <div style={{ textAlign: 'center', width: '33%' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>VIETNAM BLOCK B GAS PROJECT</h2>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginTop: '4px', textTransform: 'uppercase' }}>ITR INSPECTION RECORDS (PHASE {activePhaseTab})</div>
          </div>
          <div style={{ textAlign: 'right', width: '33%' }}>
            <div style={{ fontWeight: '900', fontSize: '12px', color: '#334155' }}>PETROVIETNAM | PQPOC</div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>Data Date: {dataDate}</div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginTop: '2px' }}>Printed: {formatToExcelDate(new Date().toISOString())}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#f1f5f9', padding: '10px', border: '1px solid #cbd5e1' }}>
          <span style={{ color: '#7e22ce' }}>TOTAL: {stats.total}</span>
          <span style={{ color: '#64748b' }}>NOT STARTED: {stats.notStarted}</span>
          <span style={{ color: '#059669' }}>DONE: {stats.completed}</span>
          <span style={{ color: '#2563eb' }}>(ATTACHED: {stats.attached}</span>
          <span style={{ color: '#dc2626' }}>/ NOT ATTACHED: {stats.notAttached})</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '15%' }}>Tag No</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '25%' }}>Description</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '10%' }}>Sub-System</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '20%' }}>Sub-Sys Desc</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '10%' }}>Checksheet</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '10%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map(item => (
              <tr key={`print-list-${item.id}`}>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontWeight: 'bold', textAlign: 'left' }}>{item.tag_no}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>{item.description || '-'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{item.sub_system_no || '-'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>{item.sub_system_description || '-'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', color: '#2563eb', fontWeight: 'bold' }}>{item.checksheet_type || '-'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontWeight: 'bold', color: item.itr_status === 'Completed' ? '#059669' : item.itr_status === 'In Progress' ? '#2563eb' : '#64748b' }}>
                    {item.itr_status === 'Completed' ? 'DONE' : item.itr_status === 'In Progress' ? 'IN PROG' : 'NOT YET'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= GIAO DIỆN CHÍNH (UI) ================= */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
        
        {/* THANH HEADER TRÊN CÙNG */}
        <div className="flex-none bg-white z-20 shadow-sm border-b border-slate-200">
          <div className="px-6 pt-4 pb-0">
            <div className="flex justify-between items-stretch border-b-2 border-slate-300 pb-2 mb-3 shrink-0">
                <div className="w-1/4 flex flex-col justify-end text-left pb-0.5"><span className="font-black text-[12px] text-slate-700 tracking-wider uppercase">MCDERMOTT | PTSC</span></div>
                <div className="w-1/2 flex flex-col justify-between items-center text-center">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest m-0 leading-none">VIETNAM BLOCK B GAS PROJECT</h2>
                  <span className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">ITR INSPECTION MANAGEMENT ({activePhaseTab === 'CC' ? 'PHASE CC - ITR-A' : 'PHASE PC - ITR-B'})</span>
                </div>
                <div className="w-1/4 flex flex-col justify-between text-right pb-0.5">
                  <span className="font-black text-[12px] text-slate-700 tracking-wider uppercase block">PETROVIETNAM | PQPOC</span>
                  <div className="mt-auto"><span className="text-[10px] font-bold text-blue-600 block">Data Date: {dataDate}</span></div>
                </div>
            </div>

            <div className="flex items-center justify-between bg-white pb-3">
              <div className="flex gap-2">
                  <button onClick={() => { setActivePhaseTab('CC'); setStatusFilters([]); }} className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${activePhaseTab === 'CC' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                      <Hammer size={16} className={activePhaseTab === 'CC' ? 'text-blue-600' : 'opacity-50'} /> Phase CC (ITR-A)
                  </button>
                  <button onClick={() => { setActivePhaseTab('PC'); setStatusFilters([]); }} className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${activePhaseTab === 'PC' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                      <Zap size={16} className={activePhaseTab === 'PC' ? 'text-amber-500' : 'opacity-50'} /> Phase PC (ITR-B)
                  </button>
              </div>

              <div className="flex items-center gap-2">
                  <button onClick={handleClearData} className="px-3 h-[32px] bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 font-bold text-xs rounded-md flex items-center gap-1.5 transition-colors shadow-sm" title={`Xóa toàn bộ Tag của Phase ${activePhaseTab}`}>
                      <Trash2 size={14}/> Clear All Tag
                  </button>
                  <div className="w-px bg-slate-200 mx-1"></div>
                  <button onClick={fetchData} className="p-1.5 border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"><RotateCcw size={16} strokeWidth={2.5} /></button>
                  <button onClick={handlePrintListPDF} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50"><Printer size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" /><span className="font-bold text-[13px]">PDF</span></button>
                  <button onClick={exportToExcel} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50"><Download size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" /><span className="font-bold text-[13px]">Excel</span></button>
              </div>
            </div>
          </div>

          {/* DẢI Ô KPI ĐẶT NGAY PHÍA DƯỚI TAB */}
          <div className="p-3 px-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center min-h-[85px] overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
               <button onClick={() => handleToggleFilter('All')} className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] px-3 rounded-xl border transition-all bg-purple-50 border-purple-200 hover:bg-purple-100 ${statusFilters.length === 0 ? 'ring-2 ring-offset-1 ring-purple-400 shadow-sm' : 'opacity-70 hover:opacity-100'}`}>
                  <span className="text-[11px] font-black uppercase mb-0.5 text-purple-600">Total</span>
                  <span className="text-2xl font-black leading-none text-purple-700">{stats.total}</span>
               </button>

               <button onClick={() => handleToggleFilter('Not Started')} className={`flex flex-col items-center justify-center min-w-[85px] h-[60px] px-3 rounded-xl border transition-all ${statusFilters.includes('Not Started') ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 opacity-70 hover:opacity-100'}`}>
                  <span className="text-[11px] font-black uppercase mb-0.5 text-slate-600">Not Started</span>
                  <span className="text-2xl font-black leading-none text-slate-700">{stats.notStarted}</span>
               </button>

               <div className="w-px bg-slate-300 mx-1 border-r border-dashed border-slate-300 h-8"></div>

               {/* CỤM NÚT DONE VÀ ATTACHED (ĐƯỢC GOM GẦN NHAU) */}
               <button onClick={() => handleToggleFilter('Completed')} className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] px-3 rounded-xl border transition-all ${statusFilters.includes('Completed') ? 'bg-emerald-100 border-emerald-300 ring-2 ring-emerald-400 shadow-sm' : 'bg-white border-emerald-200 hover:bg-emerald-50 opacity-90 hover:opacity-100'}`} title="Tất cả các ITR đã làm xong">
                  <span className="text-[11px] font-black uppercase mb-0.5 text-emerald-600">Done</span>
                  <span className="text-2xl font-black leading-none text-emerald-700">{stats.completed}</span>
               </button>

               <button onClick={() => handleToggleFilter('Attached')} className={`flex flex-col items-center justify-center min-w-[85px] h-[60px] px-3 rounded-xl border transition-all ${statusFilters.includes('Attached') ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-400 shadow-sm' : 'bg-white border-slate-200 hover:bg-blue-50 opacity-70 hover:opacity-100'}`} title="Các ITR đã Done VÀ CÓ File PDF">
                  <span className="text-[11px] font-black uppercase mb-0.5 text-blue-600 flex items-center gap-1"><FileCheck size={10}/>Attached</span>
                  <span className="text-2xl font-black leading-none text-blue-700">{stats.attached}</span>
               </button>

               <button onClick={() => handleToggleFilter('Not Attached')} className={`flex flex-col items-center justify-center min-w-[85px] h-[60px] px-3 rounded-xl border transition-all ${statusFilters.includes('Not Attached') ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-400 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-100 opacity-70 hover:opacity-100'}`} title="Các ITR đã Done nhưng CHƯA CÓ File">
                  <span className="text-[11px] font-black uppercase mb-0.5 text-slate-600 flex items-center gap-1"><Paperclip size={10}/>Not Attach</span>
                  <span className="text-2xl font-black leading-none text-slate-700">{stats.notAttached}</span>
               </button>

               <div className="w-px bg-slate-300 mx-1 border-r border-dashed border-slate-300 h-8"></div>

               <button onClick={() => handleToggleFilter('Overdue')} className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] px-3 rounded-xl border transition-all ${statusFilters.includes('Overdue') ? 'bg-red-100 border-red-300 ring-2 ring-red-400 shadow-sm' : 'bg-white border-slate-200 hover:bg-red-50 opacity-70 hover:opacity-100'}`}>
                  <span className="text-[11px] font-black uppercase mb-0.5 text-red-600 flex items-center gap-1"><AlertTriangle size={10}/>Overdue</span>
                  <span className="text-2xl font-black leading-none text-red-700">{stats.overdue}</span>
               </button>
               <button onClick={() => handleToggleFilter('Upcoming')} className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] px-3 rounded-xl border transition-all ${statusFilters.includes('Upcoming') ? 'bg-orange-100 border-orange-300 ring-2 ring-orange-400 shadow-sm' : 'bg-white border-slate-200 hover:bg-orange-50 opacity-70 hover:opacity-100'}`}>
                  <span className="text-[11px] font-black uppercase mb-0.5 text-orange-600 flex items-center gap-1"><Clock size={10}/>Upcoming</span>
                  <span className="text-2xl font-black leading-none text-orange-700">{stats.upcoming}</span>
               </button>

               <div className="w-px bg-slate-200 mx-1"></div>

               <button onClick={() => handleToggleFilter('DUPLICATES')} className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] px-3 rounded-xl border transition-all ${statusFilters.includes('DUPLICATES') ? 'bg-pink-100 border-pink-300 ring-2 ring-pink-400 shadow-sm' : 'bg-white border-slate-200 hover:bg-pink-50 opacity-70 hover:opacity-100'}`} title="Show duplicated equipments (Same Tag & Checksheet)">
                  <span className="text-[11px] font-black uppercase mb-0.5 text-pink-600 flex items-center gap-1"><Copy size={10}/>Duplicates</span>
                  <span className="text-2xl font-black leading-none text-pink-700">{stats.duplicates}</span>
               </button>

               {stats.unverified > 0 && (
                 <button onClick={() => handleToggleFilter('UNVERIFIED')} className={`flex flex-col items-center justify-center min-w-[75px] h-[60px] px-3 rounded-xl border transition-all ${statusFilters.includes('UNVERIFIED') ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-400 shadow-sm' : 'bg-white border-yellow-300 hover:bg-yellow-50 opacity-90 hover:opacity-100'} animate-pulse`} title="Tags mới sinh ra từ Excel cần xác minh">
                    <span className="text-[11px] font-black uppercase mb-0.5 text-yellow-700 flex items-center gap-1"><ShieldAlert size={10}/>Verify</span>
                    <span className="text-2xl font-black leading-none text-yellow-800">{stats.unverified}</span>
                 </button>
               )}
            </div>

            <div className="flex items-center gap-2 pl-4 shrink-0 flex-wrap justify-end">
              <select value={filterPlanMonth} onChange={(e) => setFilterPlanMonth(e.target.value)} className="px-2 h-[34px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-600 outline-none w-28 hover:bg-slate-50 cursor-pointer">
                  <option value="">Plan: All</option>
                  {uniquePlanMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filterCompMonth} onChange={(e) => setFilterCompMonth(e.target.value)} className="px-2 h-[34px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-600 outline-none w-28 hover:bg-slate-50 cursor-pointer">
                  <option value="">Comp: All</option>
                  {uniqueCompMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search Tag, Checksheet..." className="w-full pl-8 pr-3 h-[34px] bg-white border border-slate-200 rounded-md text-xs font-bold focus:outline-none focus:border-blue-400"/>
              </div>
            </div>
          </div>
        </div>

        {/* ================= DATA GRID (BẢNG DỮ LIỆU CHÍNH) ================= */}
        <div className="flex-1 p-4 bg-slate-100 flex flex-col min-h-0">
          <div className="flex-1 bg-white border border-slate-300 shadow-sm rounded-lg overflow-auto relative">
            <table className="text-left border-collapse table-fixed w-max min-w-full">
              <thead className="bg-slate-50 text-[10px] text-slate-600 uppercase font-black sticky top-0 z-30 shadow-[0_1px_0_0_#cbd5e1]">
                <tr>
                  <th style={{ width: colWidths.tagNo }} className="p-3 border-r border-slate-300 sticky left-0 top-0 bg-slate-50 z-40 text-center shadow-[1px_0_0_0_#cbd5e1]">Tag No <ColumnFilter filterKey="tagNo" options={uniqueValues.tagNo} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="tagNo" /></th>
                  <th style={{ width: colWidths.desc }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">Description <ColumnFilter filterKey="desc" options={uniqueValues.desc} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="desc" /></th>
                  <th style={{ width: colWidths.subSys }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">Sub-System <ColumnFilter filterKey="subSystem" options={uniqueValues.subSystem} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="subSys" /></th>
                  <th style={{ width: colWidths.subSysDesc }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">Sub-Sys Desc <ColumnFilter filterKey="subSystemDesc" options={uniqueValues.subSystemDesc} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="subSysDesc" /></th>
                  <th style={{ width: colWidths.chk }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative text-blue-600">Type <ColumnFilter filterKey="type" options={uniqueValues.type} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="chk" /></th>
                  <th style={{ width: colWidths.loc }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">Location <ColumnFilter filterKey="location" options={uniqueValues.location} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="loc" /></th>
                  <th style={{ width: colWidths.subCon }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">Sub-Con <ColumnFilter filterKey="subContractor" options={uniqueValues.subContractor} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="subCon" /></th>
                  <th style={{ width: colWidths.planFin }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">Plan Fin <ColumnFilter filterKey="planFinish" options={uniqueValues.planFinish} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="planFin" /></th>
                  <th style={{ width: colWidths.compDate }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative text-emerald-600">Comp Date <ColumnFilter filterKey="compDate" options={uniqueValues.compDate} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="compDate" /></th>
                  <th style={{ width: colWidths.status }} className="p-2 border-r border-slate-300 sticky top-0 bg-slate-50 z-30 text-center relative">Status <ColumnFilter filterKey="status" options={uniqueValues.status} activeFilters={columnFilters} setColumnFilters={setColumnFilters}/> <Resizer colKey="status" /></th>
                  <th style={{ width: colWidths.action }} className="p-3 sticky top-0 bg-slate-50 z-30 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredList.map((item) => {
                  const isUnverified = item.checksheet_type === 'UNVERIFIED';
                  const isDup = isDuplicate(item);
                  let rowBg = "hover:bg-slate-50";
                  if (isUnverified) rowBg = "bg-yellow-50 hover:bg-yellow-100";
                  else if (isDup) rowBg = "bg-pink-50 hover:bg-pink-100";

                  // XÁC ĐỊNH TRẠNG THÁI BADGE VÀ ICON FILE
                  const hasPdf = item.itr_records && !!item.itr_records.scanned_pdf;
                  let style = "bg-slate-100 text-slate-600 border-slate-300"; let Icon = CircleDashed; let label = "NOT YET";
                  if (item.itr_status === 'Completed') { style = "bg-emerald-50 text-emerald-700 border-emerald-300"; Icon = CheckCircle2; label = "DONE"; } 
                  else if (item.itr_status === 'In Progress') { style = "bg-blue-50 text-blue-700 border-blue-300"; Icon = RefreshCw; label = "IN PROG"; }

                  return (
                    <tr key={item.id} className={`transition-colors ${rowBg}`}>
                      <td className={`p-3 border-r border-slate-300 text-[11px] font-black break-words whitespace-normal align-top sticky left-0 z-20 shadow-[1px_0_0_0_#cbd5e1] ${isUnverified ? 'text-yellow-700 bg-yellow-50' : (isDup ? 'text-pink-700 bg-pink-50' : 'text-slate-800 bg-white')}`}>
                        {isDup && !isUnverified && <Copy size={12} className="inline mr-1 text-pink-500" title="Duplicate Equipment"/>}
                        {String(item.tag_no || '')}
                      </td>
                      <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 break-words whitespace-normal align-top">{String(item.description || '-')}</td>
                      <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 break-words whitespace-normal align-top text-center">{String(item.sub_system_no || '-')}</td>
                      <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 break-words whitespace-normal align-top">{String(item.sub_system_description || '-')}</td>
                      <td className={`p-3 border-r border-slate-300 text-[10px] font-bold text-center align-top ${isUnverified ? 'text-yellow-600' : 'text-blue-600'}`}>
                        {isUnverified ? <span className="flex items-center justify-center gap-1"><ShieldAlert size={12}/>UNVERIFIED</span> : String(item.checksheet_type || '-')}
                      </td>
                      <td className="p-3 border-r border-slate-300 text-[10px] font-bold text-slate-500 text-center align-top">{String(item.location || '-')}</td>
                      <td className="p-3 border-r border-slate-300 text-[10px] font-bold text-slate-500 text-center align-top">{String(item.subcontractor || '-')}</td>
                      <td className="p-3 border-r border-slate-300 text-[10px] font-bold text-slate-600 text-center align-top">{formatToExcelDate(item.plan_finish)}</td>
                      <td className="p-3 border-r border-slate-300 text-[10px] font-black text-emerald-600 text-center align-top bg-emerald-50/30">{formatToExcelDate(item.complete_date)}</td>
                      
                      {/* CỘT STATUS: CHỨA BADGE VÀ NÚT ATTACH/VIEW FILE */}
                      <td className="p-3 border-r border-slate-300 align-top text-center">
                        <div className="flex items-center justify-center gap-2 w-full">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 border ${style}`}>
                            <Icon size={12} strokeWidth={3} /> {label}
                          </span>
                          
                          {uploadingDirectId === item.id ? (
                            <Loader size={16} className="animate-spin text-emerald-500 shrink-0" />
                          ) : hasPdf ? (
                            <a href={item.itr_records.scanned_pdf} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-md border border-emerald-200 transition-colors shrink-0 flex items-center justify-center" title="View Attached PDF">
                              <FileCheck size={14} strokeWidth={2.5} />
                            </a>
                          ) : (
                            <button 
                              onClick={() => triggerDirectUpload(item)} 
                              disabled={isUnverified}
                              className={`p-1.5 rounded-md border transition-colors shrink-0 flex items-center justify-center ${isUnverified ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-500 hover:text-blue-600 border-slate-300 hover:border-blue-300 hover:bg-blue-50'}`}
                              title="Attach PDF/Image"
                            >
                              <Paperclip size={14} />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-3 align-top text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openItrModal(item)} disabled={isUnverified} className={`px-2 py-1 rounded border transition-colors text-[10px] font-black uppercase shadow-sm ${isUnverified ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-200'}`}>Exec</button>
                          <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} className={`p-1 bg-white rounded border shadow-sm ${isDup ? 'text-pink-500 border-pink-200 hover:bg-pink-100' : 'text-slate-400 hover:text-slate-700 border-slate-200'}`}><Edit size={12}/></button>
                          <button onClick={() => handleDeleteEquipment(item.id, item.tag_no)} className="p-1 bg-white rounded border shadow-sm text-slate-400 hover:text-red-600 border-slate-200 hover:bg-red-50" title="Delete"><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredList.length === 0 && (<tr><td colSpan="11" className="p-16 text-center text-slate-400 font-bold text-[11px]">No Equipment found.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}