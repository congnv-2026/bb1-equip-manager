import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, RotateCcw, X, Save, Paperclip, FileCheck, Download, Filter, 
  Edit, Loader, Trash2, Upload, AlertCircle, FileSpreadsheet, LayoutGrid, 
  Database, Printer, RefreshCw, Plus, Hammer, Zap, LayoutTemplate, 
  CheckCircle2, Clock, CircleDashed, FileText 
} from 'lucide-react';
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

// ==========================================
// COMPONENT 1: MRIR CELL (Tô màu thông minh)
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
          className={`flex-1 px-0.5 py-1 border rounded text-[10px] font-black uppercase outline-none text-center transition-colors min-w-0 ${inputStyle}`} 
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
        className={`w-full px-1 py-1 border rounded text-[11px] font-bold text-center outline-none transition-colors ${isDateEnabled ? (recDate ? 'bg-white text-slate-800 border-slate-300 cursor-pointer hover:border-blue-400' : 'bg-white text-slate-500 border-slate-300 cursor-pointer hover:border-blue-400') : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'}`} 
      />
    </div>
  );
};

// ==========================================
// COMPONENT 2: MILESTONE CELL (Smart Lock Date)
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
        <select value={currentStatus} onChange={(e) => handleStatusChange(e.target.value)} className={`flex-1 px-0.5 py-1 border rounded text-[10px] font-black uppercase outline-none cursor-pointer text-center ${styles[currentStatus] || styles['Not yet']}`}>
          <option value="Not yet">NOT YET</option><option value="In progress">IN PROG</option><option value="Completed">DONE</option><option value="N/A">N/A</option>
        </select>
        {isUploading ? <div className="p-1.5 bg-slate-50 border border-slate-200 w-[26px] h-[26px] flex items-center justify-center rounded"><Loader size={12} className="animate-spin text-blue-600"/></div> : hasFile ? <div className="flex h-[26px] border border-emerald-300 rounded overflow-hidden"><button onClick={()=>window.open(fileUrl)} className="px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"><FileCheck size={12}/></button><button onClick={handleRemoveFile} className="px-1 bg-white hover:bg-red-50 text-red-400 hover:text-red-500 border-l border-emerald-300 transition-colors"><X size={10} strokeWidth={3}/></button></div> : <button onClick={()=>fileInputRef.current.click()} className="p-1.5 border border-slate-300 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 w-[26px] h-[26px] flex items-center justify-center rounded text-slate-400 transition-colors"><Paperclip size={12}/></button>}
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
      </div>
      <CustomDateInput 
          value={currentDate} 
          onChange={handleDateChange} 
          disabled={!isDateEnabled} 
          className={`w-full px-1 py-1 border rounded text-[11px] font-bold text-center outline-none transition-colors ${isDateEnabled ? (currentDate ? 'bg-white text-slate-800 border-slate-300 cursor-pointer hover:border-blue-400' : 'bg-white text-slate-500 border-slate-300 cursor-pointer hover:border-blue-400') : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'}`} 
      />
    </div>
  );
};

// ==========================================
// TRANG CHÍNH: ITR MATRIX
// ==========================================
export default function ItrMatrix() {
  const [equipList, setEquipList] = useState([]);
  const [templates, setTemplates] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [activePhaseTab, setActivePhaseTab] = useState('CC'); 
  const [statusFilters, setStatusFilters] = useState([]);

  const [activeItr, setActiveItr] = useState(null);
  const [itrData, setItrData] = useState({});
  const [uploadingImage, setUploadingImage] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false); 

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTag, setNewTag] = useState({ tag_no: '', description: '', system_no: '', system_description: '', sub_system_no: '', sub_system_description: '', checksheet_type: '', phase: 'CC', discipline: 'Mechanical' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [colWidths, setColWidths] = useState({ tagNo: 160, desc: 250, sys: 120, sysDesc: 200, subSys: 120, subSysDesc: 200, chk: 120, status: 120, action: 160 });
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ isNew: false, originalCode: '', code: '', description: '', questions: [] });

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  async function fetchData() {
    const [equipRes, templateRes] = await Promise.all([
      supabase.from('itr_matrix').select('*').or('discipline.eq.Mechanical,discipline.is.null,discipline.eq.').order('tag_no', { ascending: true }),
      supabase.from('checksheet_templates').select('*').order('code', { ascending: true })
    ]);
    if (equipRes.data) setEquipList(equipRes.data);
    if (templateRes.data) {
      const tempMap = {}; templateRes.data.forEach(t => { tempMap[t.code] = { questions: t.questions, description: t.description }; });
      setTemplates(tempMap);
      if (templateRes.data.length > 0 && !newTag.checksheet_type) setNewTag(prev => ({ ...prev, checksheet_type: templateRes.data[0].code }));
    }
  }

  useEffect(() => { fetchData(); }, []);

  const phaseList = equipList.filter(item => item.phase === activePhaseTab);
  const stats = {
    total: phaseList.length,
    notStarted: phaseList.filter(i => !i.itr_status || i.itr_status === 'Not Started').length,
    inProgress: phaseList.filter(i => i.itr_status === 'In Progress').length,
    completed: phaseList.filter(i => i.itr_status === 'Completed').length,
  };

  const handleToggleFilter = (filterKey) => {
    if (filterKey === 'All') setStatusFilters([]);
    else setStatusFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
  };

  const filteredList = equipList.filter(item => {
    const matchPhase = item.phase === activePhaseTab;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = (item.tag_no?.toLowerCase().includes(searchLower)) || (item.description?.toLowerCase().includes(searchLower)) || (item.system_no?.toLowerCase().includes(searchLower)) || (item.sub_system_no?.toLowerCase().includes(searchLower));
    let matchStatus = true;
    if (statusFilters.length > 0) matchStatus = statusFilters.includes(item.itr_status || 'Not Started');
    return matchPhase && matchSearch && matchStatus;
  });

  const handleResizeStart = (e, colKey) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startWidth = colWidths[colKey];
    const doDrag = (dragEvent) => requestAnimationFrame(() => setColWidths(prev => ({ ...prev, [colKey]: Math.max(60, startWidth + (dragEvent.clientX - startX)) })));
    const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
    document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', stopDrag);
  };
  const Resizer = ({ colKey }) => <div onMouseDown={(e) => handleResizeStart(e, colKey)} className="absolute top-0 right-0 w-[6px] h-full cursor-col-resize hover:bg-blue-400 z-30 transition-colors" style={{ transform: 'translateX(50%)' }} />;

  const openTemplateManager = () => { const firstCode = Object.keys(templates)[0]; if (firstCode) selectTemplate(firstCode); else createNewTemplate(); setIsTemplateManagerOpen(true); };
  const selectTemplate = (code) => { const t = templates[code]; setTemplateForm({ isNew: false, originalCode: code, code: code, description: t.description || '', questions: t.questions ? [...t.questions] : [] }); };
  const createNewTemplate = () => setTemplateForm({ isNew: true, originalCode: '', code: '', description: '', questions: [{ id: '1', text: '' }] });
  const handleTemplateQuestionChange = (index, value) => { const newQs = [...templateForm.questions]; newQs[index].text = value; setTemplateForm({ ...templateForm, questions: newQs }); };
  const addTemplateQuestion = () => { const newQs = [...templateForm.questions]; newQs.push({ id: String(newQs.length + 1), text: '' }); setTemplateForm({ ...templateForm, questions: newQs }); };
  const removeTemplateQuestion = (index) => { const newQs = [...templateForm.questions]; newQs.splice(index, 1); const reindexedQs = newQs.map((q, idx) => ({ ...q, id: String(idx + 1) })); setTemplateForm({ ...templateForm, questions: reindexedQs }); };
  
  const saveTemplate = async () => {
    if (!templateForm.code.trim()) return alert("Code không được trống!");
    const finalQuestions = templateForm.questions.filter(q => q.text.trim() !== '').map((q, idx) => ({ id: String(idx + 1), text: q.text }));
    if (finalQuestions.length === 0) return alert("Cần ít nhất 1 câu hỏi!");
    const payload = { code: templateForm.code.toUpperCase().trim(), description: templateForm.description.trim(), questions: finalQuestions };
    try {
      if (templateForm.isNew) { if (templates[payload.code]) return alert("Đã tồn tại!"); await supabase.from('checksheet_templates').insert([payload]); } 
      else { await supabase.from('checksheet_templates').update(payload).eq('code', templateForm.originalCode); }
      await fetchData(); setTemplateForm(prev => ({ ...prev, isNew: false, originalCode: payload.code })); alert("Đã lưu!");
    } catch (err) { alert("Lỗi: " + err.message); }
  };
  
  const deleteTemplate = async (code) => {
    if(!window.confirm(`Xóa vĩnh viễn mẫu [${code}]?`)) return;
    try { await supabase.from('checksheet_templates').delete().eq('code', code); await fetchData(); const remainingKeys = Object.keys(templates).filter(k => k !== code); if (remainingKeys.length > 0) selectTemplate(remainingKeys[0]); else createNewTemplate(); } catch(err) { alert("Lỗi: " + err.message); }
  };

  const exportToCSV = () => {
    const headers = ['Tag No', 'Description', 'System', 'System Description', 'Sub-System', 'Sub-System Description', 'Discipline', 'Phase', 'Checksheet', 'Status'];
    const csvContent = [headers.join(','), ...filteredList.map(item => [`"${item.tag_no}"`, `"${item.description || ''}"`, `"${item.system_no || ''}"`, `"${item.system_description || ''}"`, `"${item.sub_system_no || ''}"`, `"${item.sub_system_description || ''}"`, `"${item.discipline || 'Mechanical'}"`, `"${item.phase}"`, `"${item.checksheet_type || ''}"`, `"${item.itr_status || 'Not Started'}"`].join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `ITR_Phase_${activePhaseTab}.csv`; link.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: 'binary' }).Sheets[XLSX.read(evt.target.result, { type: 'binary' }).SheetNames[0]]);
        const toInsert = data.map(row => {
          const tCode = row['Checksheet Type'] || row['Checksheet'] || '';
          const initialRecords = {}; (templates[tCode]?.questions || []).forEach(q => { initialRecords[q.id] = {}; });
          return { tag_no: String(row['Tag No'] || '').toUpperCase(), description: row['Description'] || '', system_no: String(row['System'] || '').toUpperCase(), system_description: row['System Description'] || '', sub_system_no: String(row['Sub-System'] || '').toUpperCase(), sub_system_description: row['Sub-System Description'] || '', checksheet_type: tCode, phase: activePhaseTab, discipline: 'Mechanical', itr_records: initialRecords, itr_status: 'Not Started' };
        }).filter(item => item.tag_no);
        if (toInsert.length > 0) {
          const { error } = await supabase.from('itr_matrix').insert(toInsert);
          if (error) throw error;
          await fetchData(); alert(`Đã import ${toInsert.length} tags.`);
        }
      } catch (err) { alert("Lỗi khi import: " + err.message); }
    };
    reader.readAsBinaryString(file); e.target.value = null; 
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault(); if (!newTag.tag_no) return;
    const initialRecords = {}; (templates[newTag.checksheet_type]?.questions || []).forEach(q => { initialRecords[q.id] = {}; });
    const equipToInsert = { ...newTag, tag_no: newTag.tag_no.toUpperCase(), system_no: newTag.system_no.toUpperCase(), sub_system_no: newTag.sub_system_no.toUpperCase(), phase: activePhaseTab, itr_records: initialRecords, itr_status: 'Not Started' };
    try { await supabase.from('itr_matrix').insert([equipToInsert]); await fetchData(); setIsAddModalOpen(false); setNewTag({ tag_no: '', description: '', system_no: '', system_description: '', sub_system_no: '', sub_system_description: '', checksheet_type: Object.keys(templates)[0] || '', phase: activePhaseTab, discipline: 'Mechanical' }); } catch (error) { alert("Lỗi: " + error.message); }
  };

  const handleEditEquipment = async (e) => {
    e.preventDefault();
    const payload = { tag_no: editingItem.tag_no.toUpperCase(), description: editingItem.description, system_no: editingItem.system_no.toUpperCase(), system_description: editingItem.system_description, sub_system_no: editingItem.sub_system_no.toUpperCase(), sub_system_description: editingItem.sub_system_description, checksheet_type: editingItem.checksheet_type };
    try { await supabase.from('itr_matrix').update(payload).eq('id', editingItem.id); await fetchData(); setIsEditModalOpen(false); setEditingItem(null); } catch(err) { alert("Lỗi cập nhật: " + err.message); }
  };

  const handleDeleteEquipment = async (id, tagNo) => {
    if (!window.confirm(`Xóa vĩnh viễn Tag [${tagNo}]?`)) return;
    await supabase.from('itr_matrix').delete().eq('id', id); await fetchData();
  };

  const handleLocalChange = (id, field, value) => setEquipList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  const saveToDatabase = async (id, field, value) => { try { const finalValue = (field.includes('date') && value === '') ? null : value; await supabase.from('master_equipment').update({ [field]: finalValue }).eq('id', id); } catch (err) {} };

  // ==================== ITR EXECUTION ====================
  const openItrModal = (item) => {
    if (!templates[item.checksheet_type]) return alert(`Mã chưa có.`);
    setActiveItr({ ...item }); setItrData(item.itr_records || {});
  };

  const handleImageUpload = async (questionId, file) => {
    if (!file) return; setUploadingImage(questionId);
    try {
      const fileName = `PUNCH_${activeItr.tag_no.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('equipment_files').upload(fileName, file);
      const url = supabase.storage.from('equipment_files').getPublicUrl(fileName).data.publicUrl;
      handlePunchlistChange(questionId, 'evidenceUrl', url);
    } catch (error) { alert("Lỗi upload ảnh: " + error.message); } finally { setUploadingImage(null); }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploadingPdf(true);
    try {
      const fileName = `ITR_SCAN_${activeItr.tag_no.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      await supabase.storage.from('equipment_files').upload(fileName, file);
      const url = supabase.storage.from('equipment_files').getPublicUrl(fileName).data.publicUrl;
      setItrData(prev => ({ ...prev, scanned_pdf: url }));
    } catch (error) { alert("Lỗi: " + error.message); } finally { setUploadingPdf(false); e.target.value = null; }
  };

  const handleActionClick = (questionId, actionType) => {
    setItrData(prev => {
      const current = prev[questionId] || {};
      if (current.status === actionType) { const newData = { ...prev }; delete newData[questionId]; return newData; }
      const newRecord = { ...current, status: actionType, isAdHoc: questionId.startsWith('ADHOC-') };
      if (actionType === 'P/L' && !newRecord.punch_id) {
        const maxSeq = Object.values(prev).map(r => r.punch_id).filter(Boolean).map(id => parseInt(id.split('_').pop(), 10) || 0).reduce((a,b)=>Math.max(a,b), 0);
        newRecord.punch_id = `${activeItr.tag_no}_${activeItr.checksheet_type.replace(/-/g, '')}_${String(maxSeq + 1).padStart(4, '0')}`;
        newRecord.plCategory = current.plCategory || 'B'; newRecord.plDesc = current.plDesc || ''; newRecord.plAssignee = current.plAssignee || 'MDR'; newRecord.plPhaseOrigin = activeItr.phase;
      }
      return { ...prev, [questionId]: newRecord };
    });
  };

  const handlePunchlistChange = (qId, field, val) => setItrData(prev => ({ ...prev, [qId]: { ...prev[qId], [field]: val } }));
  const handleExtraInfoChange = (field, value) => setActiveItr(prev => ({ ...prev, [field]: value }));
  const addAdHocPunch = () => handleActionClick(`ADHOC-${Date.now()}`, 'P/L');
  const deletePunch = (qId) => { const newData = {...itrData}; delete newData[qId]; setItrData(newData); };

  const saveItrExecution = async () => {
    const totalCore = (templates[activeItr.checksheet_type]?.questions || []).length;
    const answeredCore = Object.keys(itrData).filter(k => k !== 'scanned_pdf' && !k.startsWith('ADHOC-') && itrData[k].status).length;
    const hasOpenPunch = Object.values(itrData).some(r => r?.status === 'P/L' && r?.plStatus !== 'CLOSED');
    let newStatus = 'Not Started';
    if (Object.keys(itrData).length > 0) newStatus = (answeredCore >= totalCore && !hasOpenPunch) ? 'Completed' : 'In Progress';
    
    await supabase.from('itr_matrix').update({ 
      itr_records: itrData, 
      itr_status: newStatus, 
      pid_no: activeItr.pid_no || '', 
      serial_no: activeItr.serial_no || '', 
      location: activeItr.location || '', 
      manufacturer: activeItr.manufacturer || '' 
    }).eq('id', activeItr.id);
    
    await fetchData(); 
    setActiveItr(null);
  };

  const getStatusBadge = (status, hasPdf) => {
    let style = "bg-slate-100 text-slate-600 border-slate-300"; let Icon = CircleDashed; let label = "NOT YET";
    if (status === 'Completed') { style = "bg-emerald-50 text-emerald-700 border-emerald-300"; Icon = CheckCircle2; label = "DONE"; } 
    else if (status === 'In Progress') { style = "bg-blue-50 text-blue-700 border-blue-300"; Icon = RefreshCw; label = "IN PROG"; }
    return (
      <div className="flex items-center justify-center gap-1.5 w-full">
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 mx-auto w-fit border ${style}`}><Icon size={12} strokeWidth={3} /> {label}</span>
        {hasPdf && <a href={hasPdf} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600"><FileText size={14} /></a>}
      </div>
    );
  };

  // ==================== THUẬT TOÁN IN ĐỘC LẬP ====================

  // 1. IN PHIẾU EXECUTION
  // Đã set @page { margin: 0; } để giấu Header/Footer của trình duyệt
  const handlePrintExecution = () => {
    const printContent = document.getElementById('printable-itr').innerHTML;
    const printWindow = window.open('', '', 'width=1200,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print ITR</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: white; margin: 0; padding: 12mm 15mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            #print-container { width: 100%; display: flex; flex-direction: column; }
            .flex { display: flex; } .justify-between { justify-content: space-between; } .items-center { align-items: center; } .flex-col { flex-direction: column; } .gap-4 { gap: 1rem; } .w-full { width: 100%; } .text-center { text-align: center; } .text-right { text-align: right; }
            .font-bold { font-weight: bold; } .font-black { font-weight: 900; } .uppercase { text-transform: uppercase; } .text-xs { font-size: 10px; } .text-sm { font-size: 12px; } .text-base { font-size: 14px; } .text-lg { font-size: 16px; }
            .bg-slate-100 { background-color: #f1f5f9 !important; } .bg-slate-50 { background-color: #f8fafc !important; } .text-emerald-600 { color: #059669 !important; } .text-red-600 { color: #dc2626 !important; } .text-slate-500 { color: #64748b !important; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
            th, td { border: 1px solid black; padding: 6px; }
            .border { border: 1px solid black; } .border-b-2 { border-bottom: 2px solid black; } .border-r { border-right: 1px solid black; }
            .pb-2 { padding-bottom: 8px; } .mb-3 { margin-bottom: 12px; } .p-2 { padding: 8px; } .w-1\\/2 { width: 50%; } .w-1\\/6 { width: 16.66%; } .w-1\\/4 { width: 25%; }
            .min-h-\\[80px\\] { min-height: 80px; } .h-\\[4rem\\] { height: 4rem; } .align-top { vertical-align: top; } .underline { text-decoration: underline; } .mt-1 { margin-top: 4px; } .pl-4 { padding-left: 16px; } .list-disc { list-style-type: disc; } .mt-auto { margin-top: auto; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body><div id="print-container">${printContent}</div><script>setTimeout(() => { window.print(); window.close(); }, 500);</script></body>
      </html>
    `);
    printWindow.document.close();
  };

  // 2. IN MASTER LIST A4 (TRỊ TẬN GỐC LỖI TRẮNG MÀN HÌNH BẰNG WINDOW ĐỘC LẬP)
  // Đã set @page { margin: 0; } để giấu Header/Footer của trình duyệt
  const handlePrintListPDF = () => {
    const printContent = document.getElementById('printable-master-list').innerHTML;
    const printWindow = window.open('', '', 'width=1200,height=800');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>ITR Master List</title>
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

  const exportToExcelPlaceholder = () => { alert("Tính năng xuất Excel sẽ được tích hợp sau."); };
  const exportToWordPlaceholder = () => { alert("Tính năng xuất Word sẽ được tích hợp sau."); };

  const currentTemplateQuestions = activeItr ? (templates[activeItr.checksheet_type]?.questions || []) : [];
  const adhocKeys = activeItr ? Object.keys(itrData).filter(k => k.startsWith('ADHOC-')) : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative min-w-0">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />

      {/* ================= MODAL TEMPLATE MANAGER ================= */}
      {isTemplateManagerOpen && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><LayoutTemplate size={20} className="text-slate-500"/> ITR TEMPLATE MANAGER</h3>
              <button onClick={() => setIsTemplateManagerOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="font-bold text-slate-600 text-xs uppercase">Templates</h4>
                  <button onClick={createNewTemplate} className="text-blue-600 hover:text-blue-800"><Plus size={16}/></button>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {Object.keys(templates).map(code => (
                    <div key={code} onClick={() => selectTemplate(code)} className={`p-3 mb-1 rounded cursor-pointer border-l-2 transition-all ${templateForm.originalCode === code ? 'border-blue-600 bg-white shadow-sm' : 'border-transparent hover:bg-slate-100'}`}>
                      <div className="font-bold text-slate-800 text-sm">{code}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{templates[code].description || 'No description'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-2/3 bg-white flex flex-col">
                <div className="flex-1 overflow-auto p-6 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">General Info</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase">Code *</label><input type="text" disabled={!templateForm.isNew} value={templateForm.code} onChange={(e) => setTemplateForm({...templateForm, code: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded text-sm disabled:bg-slate-50 outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase">Description</label><input type="text" value={templateForm.description} onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none" /></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase">Checklist</h4>
                      <button onClick={addTemplateQuestion} className="text-xs font-bold text-blue-600 hover:underline">Add Question</button>
                    </div>
                    <div className="space-y-2">
                      {templateForm.questions.map((q, idx) => (
                        <div key={idx} className="flex items-start gap-2 group">
                          <div className="text-slate-400 font-bold text-xs pt-2 w-5 text-right">{q.id}.</div>
                          <textarea rows="2" value={q.text} onChange={(e) => handleTemplateQuestionChange(idx, e.target.value)} className="flex-1 border border-slate-300 rounded p-2 text-sm outline-none resize-none" />
                          <button onClick={() => removeTemplateQuestion(idx)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
                  {!templateForm.isNew ? <button onClick={() => deleteTemplate(templateForm.originalCode)} className="text-xs font-bold text-red-500 hover:text-red-700">Delete</button> : <div/>}
                  <button onClick={saveTemplate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold text-sm">Save Template</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALS THÊM / SỬA TAG ================= */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form onSubmit={isAddModalOpen ? handleAddEquipment : handleEditEquipment} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-800">{isAddModalOpen ? 'Add Tag' : 'Edit Tag'}</h3>
              <button type="button" onClick={() => isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Tag No *</label><input required type="text" value={isAddModalOpen ? newTag.tag_no : editingItem.tag_no} onChange={(e) => isAddModalOpen ? setNewTag({...newTag, tag_no: e.target.value.toUpperCase()}) : setEditingItem({...editingItem, tag_no: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 border rounded text-sm uppercase outline-none" disabled={!isAddModalOpen}/></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Description</label><input type="text" value={isAddModalOpen ? newTag.description : editingItem.description} onChange={(e) => isAddModalOpen ? setNewTag({...newTag, description: e.target.value}) : setEditingItem({...editingItem, description: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none" /></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">System</label><input type="text" value={isAddModalOpen ? newTag.system_no : editingItem.system_no} onChange={(e) => isAddModalOpen ? setNewTag({...newTag, system_no: e.target.value.toUpperCase()}) : setEditingItem({...editingItem, system_no: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 border rounded text-sm uppercase outline-none" /></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">System Desc</label><input type="text" value={isAddModalOpen ? newTag.system_description : editingItem.system_description} onChange={(e) => isAddModalOpen ? setNewTag({...newTag, system_description: e.target.value}) : setEditingItem({...editingItem, system_description: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none" /></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Sub-System</label><input type="text" value={isAddModalOpen ? newTag.sub_system_no : editingItem.sub_system_no} onChange={(e) => isAddModalOpen ? setNewTag({...newTag, sub_system_no: e.target.value.toUpperCase()}) : setEditingItem({...editingItem, sub_system_no: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 border rounded text-sm uppercase outline-none" /></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Sub-System Desc</label><input type="text" value={isAddModalOpen ? newTag.sub_system_description : editingItem.sub_system_description} onChange={(e) => isAddModalOpen ? setNewTag({...newTag, sub_system_description: e.target.value}) : setEditingItem({...editingItem, sub_system_description: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none" /></div>
              <div className="col-span-2 border-t pt-4"><label className="text-[10px] font-bold text-slate-500 uppercase">Checksheet Template</label><select value={isAddModalOpen ? newTag.checksheet_type : editingItem.checksheet_type} onChange={(e) => isAddModalOpen ? setNewTag({...newTag, checksheet_type: e.target.value}) : setEditingItem({...editingItem, checksheet_type: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded text-sm outline-none">{Object.keys(templates).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false)} className="px-4 py-2 font-bold text-slate-500 text-sm">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded text-sm">Save</button>
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
                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{activeItr.checksheet_type}</span>
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
                  <div key={templateQ.id} className={`p-4 rounded-lg border ${isPL ? 'border-red-300 bg-red-50/20' : 'border-slate-200'}`}>
                    <div className="flex gap-4 items-start">
                      <div className="text-slate-400 font-bold text-xs pt-1">{templateQ.id}.</div>
                      <div className="flex-1 text-sm text-slate-700 pt-0.5">{templateQ.text}</div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleActionClick(templateQ.id, 'OK')} className={`w-10 h-8 rounded text-xs font-bold transition-colors ${record.status === 'OK' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>OK</button>
                        <button onClick={() => handleActionClick(templateQ.id, 'N/A')} className={`w-10 h-8 rounded text-xs font-bold transition-colors ${record.status === 'N/A' ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>N/A</button>
                        <button onClick={() => handleActionClick(templateQ.id, 'P/L')} className={`w-10 h-8 rounded text-xs font-bold transition-colors ${record.status === 'P/L' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-red-200'}`}>P/L</button>
                      </div>
                    </div>
                    {isPL && (
                      <div className="mt-4 pt-4 border-t border-red-200 grid grid-cols-12 gap-4">
                        <div className="col-span-3"><label className="text-[10px] font-bold text-slate-500 uppercase">Cat</label><select value={record.plCategory || 'B'} onChange={(e) => handlePunchlistChange(templateQ.id, 'plCategory', e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded text-xs outline-none"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></div>
                        <div className="col-span-9"><label className="text-[10px] font-bold text-slate-500 uppercase">Defect <span className="text-red-500 font-normal">({record.punch_id})</span></label><input type="text" value={record.plDesc || ''} onChange={(e) => handlePunchlistChange(templateQ.id, 'plDesc', e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded text-xs outline-none" /></div>
                        <div className="col-span-12 flex items-center gap-3">
                          <input type="file" accept="image/*,.pdf" onChange={(e) => handleImageUpload(templateQ.id, e.target.files[0])} className="text-[10px] file:bg-slate-100 file:border-0 file:rounded file:px-2 file:py-1 file:mr-2" />
                          {record.evidenceUrl && <a href={record.evidenceUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline">View Evidence</a>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {Object.keys(itrData).filter(k => k.startsWith('ADHOC-')).map((questionId) => {
                const record = itrData[questionId] || {};
                return (
                  <div key={questionId} className="p-4 rounded-lg border border-red-300 bg-red-50/20 mt-4">
                    <div className="flex gap-4 items-start">
                      <div className="text-red-500 font-bold text-xs pt-1 uppercase">AD-HOC</div>
                      <div className="flex-1 text-sm text-slate-700 pt-0.5">Additional Punchlist</div>
                      <button onClick={() => deletePunch(questionId)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-red-200 grid grid-cols-12 gap-4">
                        <div className="col-span-3"><label className="text-[10px] font-bold text-slate-500 uppercase">Cat</label><select value={record.plCategory || 'B'} onChange={(e) => handlePunchlistChange(questionId, 'plCategory', e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded text-xs outline-none"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></div>
                        <div className="col-span-9"><label className="text-[10px] font-bold text-slate-500 uppercase">Defect <span className="text-red-500 font-normal">({record.punch_id})</span></label><input type="text" value={record.plDesc || ''} onChange={(e) => handlePunchlistChange(questionId, 'plDesc', e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded text-xs outline-none" /></div>
                        <div className="col-span-12 flex items-center gap-3">
                          <input type="file" accept="image/*,.pdf" onChange={(e) => handleImageUpload(questionId, e.target.files[0])} className="text-[10px] file:bg-slate-100 file:border-0 file:rounded file:px-2 file:py-1 file:mr-2" />
                          {record.evidenceUrl && <a href={record.evidenceUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline">View Evidence</a>}
                        </div>
                    </div>
                  </div>
                );
              })}

              <button onClick={addAdHocPunch} className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 font-bold text-xs rounded hover:bg-slate-50">+ Add Ad-Hoc Punchlist</button>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="text-[10px] font-bold text-slate-500">
                  Completed: {Object.keys(itrData).filter(k => k !== 'scanned_pdf' && !k.startsWith('ADHOC-') && itrData[k].status).length} / {(templates[activeItr.checksheet_type]?.questions || []).length}
                </div>
                <div className="flex items-center gap-2 border-l border-slate-300 pl-4">
                  <input type="file" ref={pdfInputRef} accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                  <button onClick={() => pdfInputRef.current.click()} disabled={uploadingPdf} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">{uploadingPdf ? '...' : 'Attach PDF'}</button>
                  {itrData.scanned_pdf && <a href={itrData.scanned_pdf} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold">View PDF</a>}
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

      {/* ================= KHU VỰC ẨN CHỨA BẢN IN EXECUTION RECORD ================= */}
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
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>System</td><td style={{ border: '1px solid black', padding: '6px', fontWeight: '900' }}>{activeItr.system_no}</td>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>P&ID No.</td><td style={{ border: '1px solid black', padding: '6px' }}>{activeItr.pid_no}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>Sub System</td><td style={{ border: '1px solid black', padding: '6px', fontWeight: '900' }}>{activeItr.sub_system_no}</td>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>Serial No.</td><td style={{ border: '1px solid black', padding: '6px' }}>{activeItr.serial_no}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>Deck/location</td><td style={{ border: '1px solid black', padding: '6px' }}>{activeItr.location}</td>
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

          <div style={{ border: '1px solid black', marginBottom: '12px', minHeight: '80px', padding: '8px', fontSize: '10px' }}>
            <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Comments / Additional Punchlists:</span>
            <ul style={{ marginTop: '4px', paddingLeft: '16px', listStyleType: 'disc' }}>
              {Object.keys(itrData).filter(k => k.startsWith('ADHOC-')).map(k => (
                <li key={k}>{itrData[k]?.plDesc || 'No description provided'} <span style={{ fontWeight: 'bold', color: '#64748b' }}>(Ad-Hoc: {itrData[k]?.punch_id})</span></li>
              ))}
              {(templates[activeItr.checksheet_type]?.questions || []).map(q => {
                const rec = itrData[q.id];
                if (rec && rec.status === 'P/L') return <li key={`cmt-${q.id}`}>Item {q.id}: {rec.plDesc} <span style={{ fontWeight: 'bold', color: '#64748b' }}>({rec.punch_id})</span></li>
                return null;
              })}
            </ul>
          </div>

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

      {/* ================= KHU VỰC ẨN CHỨA BẢN IN MASTER LIST A4 ================= */}
      <div id="printable-master-list" className="hidden">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ fontWeight: '900', fontSize: '12px', textAlign: 'left', width: '33%', color: '#334155' }}>MCDERMOTT | PTSC</div>
          <div style={{ textAlign: 'center', width: '33%' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>VIETNAM BLOCK B GAS PROJECT</h2>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginTop: '4px', textTransform: 'uppercase' }}>ITR INSPECTION RECORDS</div>
          </div>
          <div style={{ textAlign: 'right', width: '33%' }}>
            <div style={{ fontWeight: '900', fontSize: '12px', color: '#334155' }}>PETROVIETNAM | PQPOC</div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginTop: '4px' }}>Printed: {formatToExcelDate(new Date().toISOString())}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#f1f5f9', padding: '10px', border: '1px solid #cbd5e1' }}>
          <span style={{ color: '#7e22ce' }}>TOTAL: {stats.total}</span>
          <span style={{ color: '#64748b' }}>NOT STARTED: {stats.notStarted}</span>
          <span style={{ color: '#2563eb' }}>IN PROGRESS: {stats.inProgress}</span>
          <span style={{ color: '#059669' }}>COMPLETED: {stats.completed}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '15%' }}>Tag No</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '20%' }}>Description</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '10%' }}>System</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '15%' }}>System Desc</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '10%' }}>Sub-System</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '15%' }}>Sub-Sys Desc</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '8%' }}>Checksheet</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#f8fafc', textAlign: 'center', width: '7%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map(item => (
              <tr key={`print-list-${item.id}`}>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontWeight: 'bold', textAlign: 'left' }}>{item.tag_no}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>{item.description || '-'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{item.system_no || '-'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>{item.system_description || '-'}</td>
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

      {/* ================= HEADER CHÍNH CỦA GIAO DIỆN (UI) ================= */}
      
      <div className="flex justify-end items-center px-6 pt-4 pb-2 shrink-0 bg-white border-b border-slate-200 z-30 relative">
         <div className="flex gap-2">
            <button onClick={fetchData} className="p-1.5 border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center">
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

      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="flex-none bg-white z-20">
          <div className="p-3 px-6 flex justify-between items-center min-h-[70px] border-b border-slate-200">
            <div className="flex gap-2 shrink-0">
              <button onClick={() => handleToggleFilter('All')} className={`flex flex-col items-center justify-center min-w-[75px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.length === 0 ? 'bg-purple-50 border-purple-300 shadow-inner' : 'bg-white border-slate-200 opacity-60 hover:opacity-100 hover:shadow-sm'}`}>
                <span className={`text-[10px] font-bold uppercase mb-0.5 ${statusFilters.length === 0 ? 'text-purple-600' : 'text-slate-500'}`}>Total</span>
                <span className={`text-2xl font-black leading-none ${statusFilters.length === 0 ? 'text-purple-700' : 'text-purple-600'}`}>{stats.total}</span>
              </button>
              <button onClick={() => handleToggleFilter('Not Started')} className={`flex flex-col items-center justify-center min-w-[85px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('Not Started') ? 'bg-slate-100 border-slate-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
                <span className={`text-[10px] font-bold uppercase mb-0.5 flex items-center gap-1 ${statusFilters.includes('Not Started') ? 'text-slate-600' : 'text-slate-400'}`}>Not Started</span>
                <span className={`text-2xl font-black leading-none ${statusFilters.includes('Not Started') ? 'text-slate-700' : 'text-slate-400'}`}>{stats.notStarted}</span>
              </button>
              <button onClick={() => handleToggleFilter('In Progress')} className={`flex flex-col items-center justify-center min-w-[75px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('In Progress') ? 'bg-blue-50 border-blue-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
                <span className={`text-[10px] font-bold uppercase mb-0.5 flex items-center gap-1 ${statusFilters.includes('In Progress') ? 'text-blue-600' : 'text-slate-500'}`}>In Progress</span>
                <span className={`text-2xl font-black leading-none ${statusFilters.includes('In Progress') ? 'text-blue-600' : 'text-blue-500'}`}>{stats.inProgress}</span>
              </button>
              <button onClick={() => handleToggleFilter('Completed')} className={`flex flex-col items-center justify-center min-w-[75px] px-3 py-1.5 rounded-xl border transition-all ${statusFilters.includes('Completed') ? 'bg-emerald-50 border-emerald-300 shadow-inner' : 'bg-white border-slate-200 opacity-50 hover:opacity-100 hover:shadow-sm'}`}>
                <span className={`text-[10px] font-bold uppercase mb-0.5 flex items-center gap-1 ${statusFilters.includes('Completed') ? 'text-emerald-600' : 'text-slate-500'}`}>Completed</span>
                <span className={`text-2xl font-black leading-none ${statusFilters.includes('Completed') ? 'text-emerald-600' : 'text-emerald-500'}`}>{stats.completed}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold focus:outline-none"/></div>
              <button onClick={openTemplateManager} className="px-3 h-[36px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-md">Templates</button>
              <button onClick={() => fileInputRef.current.click()} className="px-3 h-[36px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-md flex items-center gap-1"><Upload size={12}/> Import</button>
              <button onClick={() => setIsAddModalOpen(true)} className="px-5 h-[36px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-sm flex items-center gap-1"><Plus size={14}/> Add Tag</button>
            </div>
          </div>

          <div className="px-6 flex gap-2 border-t border-slate-100 bg-white pt-2">
            <button 
              onClick={() => { setActivePhaseTab('CC'); setStatusFilters([]); }} 
              className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${
                activePhaseTab === 'CC' 
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Hammer size={16} className={activePhaseTab === 'CC' ? 'text-blue-600' : 'opacity-50'} /> Phase CC
            </button>
            <button 
              onClick={() => { setActivePhaseTab('PC'); setStatusFilters([]); }} 
              className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${
                activePhaseTab === 'PC' 
                  ? 'border-amber-500 text-amber-700 bg-amber-50/50' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Zap size={16} className={activePhaseTab === 'PC' ? 'text-amber-500' : 'opacity-50'} /> Phase PC
            </button>
          </div>
        </div>

        {/* ================= DATA GRID ================= */}
        <div className="flex-1 p-4 overflow-auto bg-slate-100">
          <div className="bg-white shadow-sm border border-slate-300 rounded-lg w-max min-w-full overflow-hidden">
            <table className="text-left border-collapse table-fixed w-max min-w-full">
              <thead className="bg-slate-50 text-[10px] text-slate-600 uppercase font-black sticky top-0 z-10 border-b-2 border-slate-300">
                <tr>
                  <th style={{ width: colWidths.tagNo }} className="p-3 border-r border-slate-300 sticky left-0 top-0 bg-slate-50 z-20 text-center relative">Tag No <Resizer colKey="tagNo" /></th>
                  <th style={{ width: colWidths.desc }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">Description <Resizer colKey="desc" /></th>
                  <th style={{ width: colWidths.sys }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">System <Resizer colKey="sys" /></th>
                  <th style={{ width: colWidths.sysDesc }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">System Desc <Resizer colKey="sysDesc" /></th>
                  <th style={{ width: colWidths.subSys }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">Sub-System <Resizer colKey="subSys" /></th>
                  <th style={{ width: colWidths.subSysDesc }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">Sub-Sys Desc <Resizer colKey="subSysDesc" /></th>
                  <th style={{ width: colWidths.chk }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">Checksheet <Resizer colKey="chk" /></th>
                  <th style={{ width: colWidths.status }} className="p-3 border-r border-slate-300 sticky top-0 bg-slate-50 z-10 text-center relative">Status <Resizer colKey="status" /></th>
                  <th style={{ width: colWidths.action }} className="p-3 sticky top-0 bg-slate-50 z-10 text-center font-bold border-l border-slate-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border-r border-slate-300 text-[11px] font-black text-slate-800 break-words whitespace-normal align-top sticky left-0 z-10 bg-white">{item.tag_no}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 break-words whitespace-normal align-top">{item.description || '-'}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 break-words whitespace-normal align-top text-center">{item.system_no || '-'}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 break-words whitespace-normal align-top">{item.system_description || '-'}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 break-words whitespace-normal align-top text-center">{item.sub_system_no || '-'}</td>
                    <td className="p-3 border-r border-slate-300 text-[11px] font-bold text-slate-600 break-words whitespace-normal align-top">{item.sub_system_description || '-'}</td>
                    <td className="p-3 border-r border-slate-300 text-[10px] text-blue-600 font-bold text-center align-top">{item.checksheet_type || '-'}</td>
                    <td className="p-3 border-r border-slate-300 align-top text-center">{getStatusBadge(item.itr_status, item.itr_records?.scanned_pdf)}</td>
                    <td className="p-3 align-top text-center border-l border-slate-300">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => openItrModal(item)} className="text-blue-600 hover:underline text-[11px] font-black">Exec</button>
                        <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-slate-700"><Edit size={14}/></button>
                        <button onClick={() => handleDeleteEquipment(item.id, item.tag_no)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredList.length === 0 && (<tr><td colSpan="9" className="p-16 text-center text-slate-400 font-bold text-[11px]">No Equipment found.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}