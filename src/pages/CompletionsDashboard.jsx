import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { 
  Search, RotateCcw, X, LayoutDashboard, Download, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, CircleDashed, Hammer, Zap, 
  Printer, FileSignature, Upload, Loader, ShieldAlert, CheckSquare, ListChecks, Trash2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
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

const FilterPill = ({ active, onClick, label, count, colorKey, icon: Icon }) => {
  const themes = {
    purple: 'border-slate-200 bg-white hover:bg-purple-50 text-slate-500',
    sky: 'border-slate-200 bg-white hover:bg-sky-50 text-slate-500',
    emerald: 'border-slate-200 bg-white hover:bg-emerald-50 text-slate-500',
    red: 'border-slate-200 bg-white hover:bg-red-50 text-slate-500',
    blue: 'border-slate-200 bg-white hover:bg-blue-50 text-slate-500',
    orange: 'border-slate-200 bg-white hover:bg-orange-50 text-slate-500',
  };
  const activeThemes = {
    purple: 'border-purple-300 bg-purple-50 ring-1 ring-purple-300 shadow-sm scale-[1.02]',
    sky: 'border-sky-300 bg-sky-50 ring-1 ring-sky-300 shadow-sm scale-[1.02]',
    emerald: 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-300 shadow-sm scale-[1.02]',
    red: 'border-red-300 bg-red-50 ring-1 ring-red-300 shadow-sm scale-[1.02]',
    blue: 'border-blue-300 bg-blue-50 ring-1 ring-blue-300 shadow-sm scale-[1.02]',
    orange: 'border-orange-300 bg-orange-50 ring-1 ring-orange-300 shadow-sm scale-[1.02]',
  };
  const textColors = { purple: 'text-purple-600', sky: 'text-sky-600', emerald: 'text-emerald-600', red: 'text-red-600', blue: 'text-blue-600', orange: 'text-orange-600' };

  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 px-4 rounded-xl transition-all duration-200 min-w-[120px] border ${active ? activeThemes[colorKey] : themes[colorKey]}`}>
      <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 ${active ? textColors[colorKey] : 'text-slate-500'}`}>
        {Icon && <Icon size={12} strokeWidth={3}/>} {label}
      </span>
      <span className={`text-2xl font-black leading-none ${active ? textColors[colorKey] : textColors[colorKey]}`}>{count}</span>
    </button>
  );
};

export default function CompletionsDashboard() {
  const [equipList, setEquipList] = useState([]);
  const [handovers, setHandovers] = useState({});
  const [punchlists, setPunchlists] = useState([]);
  
  const [activePhaseTab, setActivePhaseTab] = useState('CC'); 
  const [activeFilter, setActiveFilter] = useState('ALL');
  
  const [filterSystem, setFilterSystem] = useState('');
  const [filterSubSystem, setFilterSubSystem] = useState('');

  const [handoverModal, setHandoverModal] = useState({ isOpen: false, subSystem: '', certNo: '', signDate: new Date().toISOString().split('T')[0] });

  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [dataDate, setDataDate] = useState(localStorage.getItem('projectDataDate') || 'N/A');
  const fileInputRef = useRef(null);

  async function fetchData() { 
    try {
        const { data: hoData } = await supabase.from('subsystem_handovers').select('*');
        if (hoData) { const hoMap = {}; hoData.forEach(h => hoMap[h.sub_system_no] = h); setHandovers(hoMap); }

        let allItr = []; let hasMoreItr = true; let fromItr = 0;
        while (hasMoreItr) {
            const { data } = await supabase.from('itr_matrix').select('*').range(fromItr, fromItr + 999);
            if (!data || data.length === 0) hasMoreItr = false;
            else { allItr = [...allItr, ...data]; if (data.length < 1000) hasMoreItr = false; else fromItr += 1000; }
        }
        setEquipList(allItr);

        let allPunch = []; let hasMorePunch = true; let fromPunch = 0;
        while (hasMorePunch) {
            const { data } = await supabase.from('punchlist_matrix').select('*').range(fromPunch, fromPunch + 999);
            if (!data || data.length === 0) hasMorePunch = false;
            else { allPunch = [...allPunch, ...data]; if (data.length < 1000) hasMorePunch = false; else fromPunch += 1000; }
        }
        setPunchlists(allPunch);

    } catch (err) { console.error("Lỗi khi tải dữ liệu:", err); }
  }
  
  useEffect(() => { fetchData(); }, []);

  const handleFactoryReset = async () => {
    if (window.confirm(`⚠️ CẢNH BÁO TỐI THƯỢNG ⚠️\nXÓA SẠCH toàn bộ dữ liệu dự án (ITR, Punchlist, Handover)? Hành động này KHÔNG THỂ KHÔI PHỤC!`)) {
        if (window.prompt('Gõ chữ "DELETE" để xác nhận:') !== 'DELETE') return;
        setIsImporting(true); setImportStatus('Đang Factory Reset...');
        try {
            await supabase.from('itr_matrix').delete().neq('id', 0);
            await supabase.from('punchlist_matrix').delete().neq('id', 0);
            await supabase.from('subsystem_handovers').delete().neq('id', 0);
            localStorage.removeItem('projectDataDate');
            setDataDate('N/A');
            await fetchData();
            alert('✅ ĐÃ DỌN SẠCH TOÀN BỘ DỮ LIỆU.');
        } catch (error) { alert("Lỗi: " + error.message); } 
        finally { setIsImporting(false); }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; 
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Đang Live Fetch Database...');

    let liveItr = []; let hasMoreItr = true; let fromItr = 0;
    while (hasMoreItr) {
        const { data } = await supabase.from('itr_matrix').select('id, tag_no, checksheet_type').range(fromItr, fromItr + 999);
        if (!data || data.length===0) hasMoreItr=false; else { liveItr=[...liveItr, ...data]; fromItr+=1000; }
    }

    let livePunch = []; let hasMorePunch = true; let fromPunch = 0;
    while (hasMorePunch) {
        const { data } = await supabase.from('punchlist_matrix').select('id, punch_id').range(fromPunch, fromPunch + 999);
        if (!data || data.length===0) hasMorePunch=false; else { livePunch=[...livePunch, ...data]; fromPunch+=1000; }
    }

    setImportStatus('Đang phân tích cấu trúc Excel...');

    let fName = file.name;
    let formattedDate = 'N/A';
    try {
        let datePart = fName.split('-').pop().split('.')[0].trim();
        const match = datePart.match(/(\d{1,2})([a-zA-Z]{3})(\d{2,4})/);
        if (match) {
            let d = match[1].padStart(2, '0');
            let m = match[2];
            let y = match[3].length === 2 ? '20' + match[3] : match[3];
            formattedDate = `${d}-${m}-${y}`;
        } else formattedDate = datePart;
    } catch(err){}
    localStorage.setItem('projectDataDate', formattedDate);
    setDataDate(formattedDate);

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const workbook = XLSX.read(evt.target.result, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
            
            const itrMap = {}; liveItr.forEach(eq => itrMap[`${getCompareKey(eq.tag_no)}_${getCompareKey(eq.checksheet_type)}`] = eq);
            const punchMap = {}; livePunch.forEach(p => punchMap[getCompareKey(p.punch_id)] = p);
            
            const updatesItr = {}; const insertsItr = {}; 
            const updatesPunch = {}; const insertsPunch = {}; 
            let stats = { itrInsert: 0, itrUpdate: 0, punchInsert: 0, punchUpdate: 0 };

            const processItrSheet = () => {
                const sheetMatches = workbook.SheetNames.filter(name => name.toUpperCase().includes('ITR'));
                sheetMatches.forEach(sheetName => {
                    const rawArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
                    let headerRowIndex = -1;
                    for (let i=0; i<Math.min(30, rawArray.length); i++) {
                        const rowStr = (rawArray[i] || []).map(c => String(c).replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
                        if (rowStr.some(c => c.includes('tagno') || c.includes('equipmentno'))) { headerRowIndex = i; break; }
                    }
                    if (headerRowIndex === -1) return;

                    const dataObjects = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { range: headerRowIndex, raw: false, defval: "" });
                    dataObjects.forEach(row => {
                        const normRow = {}; Object.keys(row).forEach(k => normRow[String(k).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()] = row[k]);
                        const disc = String(normRow['discipline'] || normRow['disciplinecode'] || '').trim().toUpperCase();
                        if (!disc.includes('MECH') && disc !== 'M') return; 

                        const originalTagNo = String(normRow['tagno'] || normRow['equipmentno'] || '').trim().toUpperCase();
                        const tCode = String(normRow['checksheettype'] || normRow['checksheet'] || '').trim().toUpperCase();
                        
                        const compareTag = getCompareKey(originalTagNo);
                        const compareType = getCompareKey(tCode || 'UNVERIFIED');
                        if (!compareTag || originalTagNo.includes('TOTAL')) return;

                        const eqKey = `${compareTag}_${compareType}`;
                        
                        let planFinishStr = normRow['planfinish'];
                        let completeDateStr = normRow['completedate'];
                        let excelPhase = String(normRow['phase'] || 'CC').toUpperCase().trim();

                        let sysNo = String(normRow['systemno'] || normRow['system'] || '').trim().toUpperCase();
                        let subSysNo = String(normRow['subsystemno'] || normRow['subsystem'] || '').trim().toUpperCase();
                        if (!sysNo && subSysNo) {
                            const parts = subSysNo.split('-');
                            if (parts.length >= 2) sysNo = `${parts[0]}-${parts[1]}`; else sysNo = subSysNo;
                        }

                        const targetEq = insertsItr[eqKey] || updatesItr[eqKey] || itrMap[eqKey];
                        const buildPayload = (existingId) => ({
                            ...(existingId ? { id: existingId } : {}),
                            tag_no: originalTagNo,
                            description: String(normRow['tagdescription'] || normRow['description'] || ''),
                            system_no: sysNo, sub_system_no: subSysNo,
                            sub_system_description: String(normRow['subsystemdescription'] || normRow['subsysdesc'] || ''),
                            checksheet_type: tCode || 'UNVERIFIED',
                            phase: excelPhase, discipline: 'Mechanical',
                            location: String(normRow['location'] || ''),
                            subcontractor: String(normRow['subcontractor'] || normRow['subcon'] || ''),
                            plan_finish: planFinishStr ? new Date(planFinishStr).toISOString() : null,
                            complete_date: completeDateStr ? new Date(completeDateStr).toISOString() : null,
                            itr_status: completeDateStr ? 'Completed' : 'Not Started'
                        });

                        if (targetEq) {
                            updatesItr[eqKey] = { ...targetEq, ...buildPayload(targetEq.id) };
                            stats.itrUpdate++;
                        } else {
                            insertsItr[eqKey] = buildPayload();
                            stats.itrInsert++;
                        }
                    });
                });
            };

            const processPunchlistSheet = () => {
                const sheets = workbook.SheetNames.filter(name => name.toUpperCase().includes('PUNCH'));
                sheets.forEach(sheetName => {
                    const rawArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
                    let headerRowIndex = -1;
                    for (let i=0; i<Math.min(30, rawArray.length); i++) {
                        const rowStr = (rawArray[i] || []).map(c => String(c).replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
                        if (rowStr.some(c => c.includes('tagno') || c.includes('equipmentno')) && rowStr.some(c => c.includes('punch'))) { headerRowIndex = i; break; }
                    }
                    if (headerRowIndex === -1) return;

                    const dataObjects = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { range: headerRowIndex, raw: false, defval: "" });
                    dataObjects.forEach(row => {
                        const normRow = {}; Object.keys(row).forEach(k => normRow[String(k).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()] = row[k]);
                        
                        const disc = String(normRow['disciplinecode'] || normRow['discipline'] || '').trim().toUpperCase();
                        if (!disc.includes('MECH') && disc !== 'M') return; 

                        const originalTagNo = String(normRow['tagno'] || normRow['equipmentno'] || '').trim().toUpperCase();
                        const compareTag = getCompareKey(originalTagNo);
                        const plNo = String(normRow['punchlistno'] || normRow['punchid'] || '').trim();
                        const plKey = getCompareKey(plNo);

                        if (!compareTag || !plNo || originalTagNo.includes('TOTAL')) return;

                        const statusVal = String(normRow['status'] || 'OPEN').toUpperCase();
                        const status = statusVal.includes('CLOSE') || statusVal.includes('DONE') || statusVal === 'C' ? 'CLOSED' : 'OPEN';
                        
                        let sysNo = String(normRow['systemno'] || normRow['system'] || '').trim().toUpperCase();
                        let subSysNo = String(normRow['subsystemno'] || normRow['subsystem'] || '').trim().toUpperCase();
                        if (!sysNo && subSysNo) {
                            const parts = subSysNo.split('-');
                            if (parts.length >= 2) sysNo = `${parts[0]}-${parts[1]}`; else sysNo = subSysNo;
                        }

                        const targetPunch = insertsPunch[plKey] || updatesPunch[plKey] || punchMap[plKey];
                        
                        const buildPayload = (existingId) => ({
                            ...(existingId ? { id: existingId } : {}),
                            punch_id: plNo, tag_no: originalTagNo, system_no: sysNo, sub_system_no: subSysNo,
                            category: String(normRow['category'] || 'B').trim(),
                            defect_description: String(normRow['defectdescription'] || normRow['description'] || '').trim(),
                            corrective_action: String(normRow['correctiveaction'] || '').trim(),
                            assignee: String(normRow['actiongroup'] || normRow['assignee'] || normRow['actionby'] || '').trim(),
                            raise_by: String(normRow['raiseby'] || normRow['raisedby'] || '').trim(),
                            date_raised: normRow['raisedate'] || normRow['opendate'] ? new Date(normRow['raisedate'] || normRow['opendate']).toISOString() : new Date().toISOString(),
                            exp_clear_date: normRow['expectedclearancedate'] ? new Date(normRow['expectedclearancedate']).toISOString() : null,
                            closed_date: status === 'CLOSED' && normRow['closeddate'] ? new Date(normRow['closeddate']).toISOString() : null,
                            phase_origin: String(normRow['phase'] || 'N/A').toUpperCase().trim(),
                            status: status
                        });

                        if (targetPunch) {
                            updatesPunch[plKey] = { ...targetPunch, ...buildPayload(targetPunch.id) };
                            stats.punchUpdate++;
                        } else {
                            insertsPunch[plKey] = buildPayload();
                            stats.punchInsert++;
                        }
                    });
                });
            };

            setImportStatus('Đang đổ dữ liệu ITR...'); processItrSheet();
            setImportStatus('Đang bóc tách Punchlist Master...'); processPunchlistSheet();
            setImportStatus('Đang đẩy dữ liệu lên Database...');
            
            const toUpdateItr = Object.values(updatesItr); const toInsertItr = Object.values(insertsItr);
            if (toUpdateItr.length > 0) {
                for (let i=0; i<toUpdateItr.length; i+=50) {
                    await Promise.all(toUpdateItr.slice(i, i+50).map(eq => supabase.from('itr_matrix').update(eq).eq('id', eq.id)));
                }
            }
            if (toInsertItr.length > 0) {
                for (let i=0; i<toInsertItr.length; i+=50) {
                    await supabase.from('itr_matrix').insert(toInsertItr.slice(i, i+50));
                }
            }

            const toUpdatePunch = Object.values(updatesPunch); const toInsertPunch = Object.values(insertsPunch);
            if (toUpdatePunch.length > 0) {
                for (let i=0; i<toUpdatePunch.length; i+=50) {
                    await Promise.all(toUpdatePunch.slice(i, i+50).map(p => supabase.from('punchlist_matrix').update(p).eq('id', p.id)));
                }
            }
            if (toInsertPunch.length > 0) {
                for (let i=0; i<toInsertPunch.length; i+=50) {
                    await supabase.from('punchlist_matrix').insert(toInsertPunch.slice(i, i+50));
                }
            }

            await fetchData();
            alert(`✅ NHẬP DỮ LIỆU ĐA SHEET THÀNH CÔNG!\n- Ngày dữ liệu: ${formattedDate}\n- ITR (Tạo mới: ${stats.itrInsert}, Cập nhật: ${stats.itrUpdate})\n- Punchlist (Tạo mới: ${stats.punchInsert}, Cập nhật: ${stats.punchUpdate})`);

        } catch (err) { alert("Lỗi khi import file Excel: " + err.message); } 
        finally { setIsImporting(false); e.target.value = null; }
    };
    reader.readAsBinaryString(file); 
  };

  const phaseEquipList = equipList.filter(item => item.phase === activePhaseTab);
  const validEquipList = phaseEquipList.filter(item => item.checksheet_type !== 'UNVERIFIED'); 
  const unverifiedCount = phaseEquipList.length - validEquipList.length;

  const uniqueSystems = [...new Set(validEquipList.map(i => String(i.system_no || 'N/A')).filter(s => s !== 'N/A' && s !== ''))].sort();
  const uniqueSubSystems = [...new Set(validEquipList.map(i => String(i.sub_system_no || 'N/A')).filter(s => s !== 'N/A' && s !== ''))].sort();

  const filteredValidList = validEquipList.filter(item => {
    if (filterSystem && String(item.system_no || 'N/A') !== filterSystem) return false;
    if (filterSubSystem && String(item.sub_system_no || 'N/A') !== filterSubSystem) return false;
    return true;
  });

  const subSystemsMap = {};
  filteredValidList.forEach(item => {
    const sub = item.sub_system_no; if (!sub) return;
    if (!subSystemsMap[sub]) {
      subSystemsMap[sub] = { name: sub, total: 0, done: 0, punchA_open: 0, punchA_closed: 0, punchB_open: 0, punchB_closed: 0, punchC_open: 0, punchC_closed: 0 };
    }
    subSystemsMap[sub].total++; 
    if (item.itr_status === 'Completed') subSystemsMap[sub].done++; 
  });

  punchlists.forEach(pl => {
      const sub = pl.sub_system_no; if(!sub || !subSystemsMap[sub]) return;
      
      // LOGIC XỬ LÝ PHASE_ORIGIN NỘI SUY
      let plPhase = pl.phase_origin;
      if (plPhase === 'N/A' || !plPhase) {
          // Lấy Tag của Punchlist đem so với danh sách Thiết bị ITR để đoán Phase
          const tagInfo = equipList.find(e => getCompareKey(e.tag_no) === getCompareKey(pl.tag_no));
          if (tagInfo) plPhase = tagInfo.phase;
      }
      
      if (plPhase !== activePhaseTab) return; // Chỉ tính Punchlist của Phase đang bật

      const isClosed = pl.status === 'CLOSED';
      if (pl.category === 'A') isClosed ? subSystemsMap[sub].punchA_closed++ : subSystemsMap[sub].punchA_open++;
      else if (pl.category === 'B') isClosed ? subSystemsMap[sub].punchB_closed++ : subSystemsMap[sub].punchB_open++;
      else if (pl.category === 'C') isClosed ? subSystemsMap[sub].punchC_closed++ : subSystemsMap[sub].punchC_open++;
  });

  const processedMatrix = Object.values(subSystemsMap).map(s => {
    const hoData = handovers[s.name] || {}; 
    let status = 'NO DATA';
    if (activePhaseTab === 'CC') {
      if (hoData.mc_status === 'ACCEPTED') status = 'ACCEPTED'; 
      else if (s.done < s.total) status = 'IN PROGRESS'; 
      else if (s.punchA_open > 0) status = 'BLOCKED'; 
      else status = 'READY';
    } else {
      if (hoData.rfsu_status === 'ACCEPTED') status = 'ACCEPTED'; 
      else if (hoData.mc_status !== 'ACCEPTED') status = 'WAITING MC'; 
      else if (s.done < s.total) status = 'IN PROGRESS'; 
      else if (s.punchA_open > 0) status = 'BLOCKED'; 
      else status = 'READY';
    }
    return { ...s, status, hoData };
  });

  const finalFilteredMatrix = processedMatrix.filter(s => activeFilter === 'ALL' || s.status === activeFilter);
  const stats = { 
      total: processedMatrix.length, 
      inProgress: processedMatrix.filter(s => s.status === 'IN PROGRESS').length, 
      blocked: processedMatrix.filter(s => s.status === 'BLOCKED').length, 
      ready: processedMatrix.filter(s => s.status === 'READY').length, 
      waiting: processedMatrix.filter(s => s.status === 'WAITING MC').length, 
      accepted: processedMatrix.filter(s => s.status === 'ACCEPTED').length 
  };
  
  const getOverallProgress = () => { 
    if (filteredValidList.length === 0) return 0;
    const doneCount = filteredValidList.filter(i => i.itr_status === 'Completed').length;
    return Math.round((doneCount / filteredValidList.length) * 100); 
  };

  const burndownChartData = useMemo(() => {
    try {
      const filteredPls = punchlists.filter(p => {
          if (filterSystem && String(p.system_no) !== filterSystem) return false;
          if (filterSubSystem && String(p.sub_system_no) !== filterSubSystem) return false;
          return true;
      });

      let dates = new Set();
      filteredPls.forEach(p => { 
          if (p.date_raised) dates.add(String(p.date_raised).split('T')[0]); 
          if (p.status === 'CLOSED' && p.closed_date) dates.add(String(p.closed_date).split('T')[0]); 
      });
      
      let sortedDates = Array.from(dates).sort(); 
      if(sortedDates.length === 0) return [];
      
      let cumulativeGenerated = 0; let cumulativeClosed = 0;
      return sortedDates.map(dateStr => {
          cumulativeGenerated += filteredPls.filter(p => String(p.date_raised).startsWith(dateStr)).length;
          cumulativeClosed += filteredPls.filter(p => p.status === 'CLOSED' && String(p.closed_date).startsWith(dateStr)).length;
          return { name: dateStr, Generated: cumulativeGenerated, Closed: cumulativeClosed, Remaining: cumulativeGenerated - cumulativeClosed };
      });
    } catch (e) { return []; }
  }, [punchlists, filterSystem, filterSubSystem]); 

  const submitHandover = async (e) => {
      e.preventDefault();
      const existing = handovers[handoverModal.subSystem] || {};
      const payload = { sub_system_no: handoverModal.subSystem, ...existing };

      if (activePhaseTab === 'CC') {
          payload.mc_status = 'ACCEPTED'; payload.mc_cert_no = handoverModal.certNo; payload.mc_date = handoverModal.signDate;
      } else {
          payload.rfsu_status = 'ACCEPTED'; payload.rfsu_cert_no = handoverModal.certNo; payload.rfsu_date = handoverModal.signDate;
      }

      try {
          if (existing.id) await supabase.from('subsystem_handovers').update(payload).eq('id', existing.id);
          else await supabase.from('subsystem_handovers').insert([payload]);
          await fetchData();
          setHandoverModal({ isOpen: false, subSystem: '', certNo: '', signDate: '' });
      } catch (err) { alert("Lỗi khi ký bàn giao: " + err.message); }
  };

  const renderMiniBox = (count, type, colorType) => {
    if (count === 0) return ( <div className="flex flex-col items-center justify-center w-12 py-1 rounded border bg-white border-slate-200 text-slate-400"><span className="text-sm font-black leading-none">{count}</span><span className="text-[7px] font-bold uppercase mt-1">{(type)}</span></div> );
    let colors = type === 'CLOSED' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' : (colorType === 'A' ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : (colorType === 'B' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm'));
    return ( <div className={`flex flex-col items-center justify-center w-12 py-1 rounded border ${colors}`}><span className="text-sm font-black leading-none">{count}</span><span className="text-[7px] font-bold uppercase mt-1">{(type)}</span></div> );
  };

  const exportToPDF = () => { alert("Tính năng in PDF đang được tối ưu."); };
  const exportToExcel = () => { alert("Tính năng xuất Excel sẽ được tích hợp sau."); };
  const exportToWord = () => { alert("Tính năng xuất Word sẽ được tích hợp sau."); };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative min-w-0">
      
      {isImporting && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader size={48} className="animate-spin text-blue-500 mb-4" />
          <h2 className="text-white font-black text-xl tracking-widest animate-pulse">PROCESSING...</h2>
          <p className="text-slate-300 mt-2 font-medium">{importStatus}</p>
        </div>
      )}

      {handoverModal.isOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form onSubmit={submitHandover} className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
              <h3 className="font-black text-lg text-blue-700 flex items-center gap-2"><FileSignature size={20}/> Issue Certificate</h3>
              <button type="button" onClick={() => setHandoverModal({...handoverModal, isOpen: false})} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4 bg-slate-50/50">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm text-center">
                 <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Target Sub-System</span>
                 <div className="font-black text-blue-800 text-xl">{handoverModal.subSystem}</div>
                 <div className="text-[10px] font-bold text-emerald-600 mt-2 flex justify-center items-center gap-1"><CheckCircle2 size={12}/> Ready for {activePhaseTab === 'CC' ? 'MC' : 'RFSU'} Sign-off</div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Certificate Number *</label>
                <input required type="text" value={handoverModal.certNo} onChange={(e) => setHandoverModal({...handoverModal, certNo: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-500 font-bold" placeholder={`e.g. ${activePhaseTab === 'CC' ? 'MC' : 'RFSU'}-${handoverModal.subSystem}-001`} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Date of Signature *</label>
                <input required type="date" value={handoverModal.signDate} onChange={(e) => setHandoverModal({...handoverModal, signDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setHandoverModal({...handoverModal, isOpen: false})} className="px-4 py-2 font-bold text-slate-500 text-sm hover:bg-slate-200 rounded transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm text-sm flex items-center gap-1.5 transition-colors"><CheckCircle2 size={16}/> Confirm Handover</button>
            </div>
          </form>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />

      <div className="flex justify-between items-center px-6 pt-4 pb-2 shrink-0 bg-white border-b border-slate-200 z-30 relative">
         <div className="flex gap-2">
             <button onClick={handleFactoryReset} className="px-4 h-[34px] bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md shadow-sm flex items-center gap-1.5 transition-colors">
                <Trash2 size={14}/> FACTORY RESET
             </button>
         </div>

         <div className="flex gap-2">
            <button onClick={() => fileInputRef.current.click()} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-md shadow-sm flex items-center gap-2 transition-colors mr-4">
               <Upload size={16}/> IMPORT EXCEL DATA
            </button>
            <div className="w-px bg-slate-200 mx-1"></div>
            <button onClick={fetchData} className="p-1.5 border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"><RotateCcw size={16} strokeWidth={2.5} /></button>
            <button onClick={exportToPDF} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50"><Printer size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" /><span className="font-bold text-[13px]">PDF</span></button>
            <button onClick={exportToWord} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50"><Download size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" /><span className="font-bold text-[13px]">Word</span></button>
            <button onClick={exportToExcel} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50"><Download size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" /><span className="font-bold text-[13px]">Excel</span></button>
         </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        <div className="flex-none bg-white z-20 shrink-0">
          <div className="px-6 pt-4 pb-0">
            <div className="flex justify-between items-stretch border-b-2 border-slate-300 pb-2 mb-3 shrink-0">
                <div className="w-1/4 flex flex-col justify-end text-left pb-0.5"><span className="font-black text-[12px] text-slate-700 tracking-wider uppercase">MCDERMOTT | PTSC</span></div>
                <div className="w-1/2 flex flex-col justify-between items-center text-center">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest m-0 leading-none">VIETNAM BLOCK B GAS PROJECT</h2>
                  <span className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">{activePhaseTab === 'CC' ? 'MC' : 'RFSU'} COMPLETIONS DASHBOARD</span>
                </div>
                <div className="w-1/4 flex flex-col justify-between text-right pb-0.5">
                  <span className="font-black text-[12px] text-slate-700 tracking-wider uppercase block">PETROVIETNAM | PQPOC</span>
                  <div className="mt-auto"><span className="text-[10px] font-bold text-blue-600 block">Data Date: {dataDate}</span></div>
                </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white pb-3">
              <div className="flex gap-2">
                  <button onClick={() => {setActivePhaseTab('CC'); setActiveFilter('ALL'); setFilterSystem(''); setFilterSubSystem('');}} className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${activePhaseTab === 'CC' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}><Hammer size={16} className={activePhaseTab === 'CC' ? 'text-blue-600' : 'opacity-50'} /> Phase CC (MC)</button>
                  <button onClick={() => {setActivePhaseTab('PC'); setActiveFilter('ALL'); setFilterSystem(''); setFilterSubSystem('');}} className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${activePhaseTab === 'PC' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}><Zap size={16} className={activePhaseTab === 'PC' ? 'text-amber-500' : 'opacity-50'} /> Phase PC (RFSU)</button>
              </div>
              <div className="w-px h-6 bg-slate-200 mx-2"></div>
              <div className="flex gap-2 mb-1">
                  <select value={filterSystem} onChange={(e) => setFilterSystem(e.target.value)} className="px-3 h-[32px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-600 outline-none w-36 hover:bg-slate-50 transition-colors cursor-pointer"><option value="">System: All</option>{uniqueSystems.map(sys => <option key={sys} value={sys}>{sys}</option>)}</select>
                  <select value={filterSubSystem} onChange={(e) => setFilterSubSystem(e.target.value)} className="px-3 h-[32px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-600 outline-none w-40 hover:bg-slate-50 transition-colors cursor-pointer"><option value="">Sub-Sys: All</option>{uniqueSubSystems.map(sub => <option key={sub} value={sub}>{sub}</option>)}</select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4 bg-slate-100">
          {(unverifiedCount > 0) && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-sm shrink-0">
               <div className="flex items-center gap-2 text-amber-800 text-[11px] font-bold"><AlertTriangle size={18} className="text-amber-600" /><span>CẢNH BÁO: Có {unverifiedCount} ITR rác từ Excel (Không có checksheet hợp lệ). Hệ thống đã tự động lọc ẩn.</span></div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-4 shrink-0">
            <div className="col-span-8 bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-col h-[300px]">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Punchlist Burndown Trend</h3>
              <div className="flex-1 w-full min-h-0">
                {burndownChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={burndownChartData} margin={{ top: 10, right: 30, left: -20, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b', fontWeight: 'bold', dy: 10}} axisLine={{stroke:'#e2e8f0'}} tickLine={false} />
                      <YAxis tick={{fontSize: 9, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '15px'}} />
                      <Line type="monotone" dataKey="Generated" stroke="#8b5cf6" strokeWidth={3} dot={{r: 2}} name="Total Generated" isAnimationActive={false} />
                      <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={3} dot={{r: 2}} name="Total Closed" isAnimationActive={false} />
                      <Line type="monotone" dataKey="Remaining" stroke="#f97316" strokeWidth={3} dot={{r: 2}} name="Remaining Open" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (<div className="flex h-full items-center justify-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded border border-dashed border-slate-200">No punchlist data available for trend.</div>)}
              </div>
            </div>
            
            <div className="col-span-4 bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-center items-center h-[300px] relative">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute top-5 left-5">ITR Progress</h3>
              <div className="relative w-40 h-40 flex items-center justify-center mt-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-slate-100" />
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-emerald-500 transition-all duration-1000 ease-in-out" strokeDasharray={`${2 * Math.PI * 70}`} strokeDashoffset={`${2 * Math.PI * 70 * (1 - getOverallProgress() / 100)}`} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black text-emerald-600">{getOverallProgress()}%</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">Completed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden flex flex-col min-h-0">
            <div className="p-4 bg-white border-b border-slate-200 flex gap-4 overflow-x-auto shrink-0">
              <FilterPill label="Total Sub-Sys" icon={ListChecks} count={stats.total} colorKey="purple" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
              {activePhaseTab === 'PC' && <FilterPill label="Waiting MC" icon={Clock} count={stats.waiting} colorKey="orange" active={activeFilter === 'WAITING MC'} onClick={() => setActiveFilter('WAITING MC')} />}
              <FilterPill label="In Progress" icon={RefreshCw} count={stats.inProgress} colorKey="blue" active={activeFilter === 'IN PROGRESS'} onClick={() => setActiveFilter('IN PROGRESS')} />
              <FilterPill label="Blocked (Cat A)" icon={AlertTriangle} count={stats.blocked} colorKey="red" active={activeFilter === 'BLOCKED'} onClick={() => setActiveFilter('BLOCKED')} />
              <FilterPill label="Ready" icon={CheckSquare} count={stats.ready} colorKey="sky" active={activeFilter === 'READY'} onClick={() => setActiveFilter('READY')} />
              <FilterPill label="Accepted" icon={CheckCircle2} count={stats.accepted} colorKey="emerald" active={activeFilter === 'ACCEPTED'} onClick={() => setActiveFilter('ACCEPTED')} />
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1 bg-white">
              <table className="w-full text-left whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase border-b-2 border-slate-300 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5 border-r border-slate-300 w-[15%] align-middle">Sub-System</th>
                    <th className="p-3 text-center border-r border-slate-300 w-[10%] align-middle">ITR Progress</th>
                    <th className="p-3 text-center border-r border-slate-300 w-[15%] bg-red-50/10"><div className="text-red-600 font-black text-xs">PUNCH A (CRIT)</div></th>
                    <th className="p-3 text-center border-r border-slate-300 w-[15%] bg-blue-50/10"><div className="text-blue-500 font-black text-xs">PUNCH B (MINOR)</div></th>
                    <th className="p-3 text-center border-r border-slate-300 w-[15%] bg-slate-50/50"><div className="text-slate-800 font-black text-xs">PUNCH C (DOC)</div></th>
                    <th className="p-3 text-center w-[20%] align-middle">{activePhaseTab === 'CC' ? 'MC' : 'RFSU'} Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {finalFilteredMatrix.map((s, i) => {
                      let statusBg = ''; let statusText = ''; let StatusIcon = CircleDashed;
                      if (s.status === 'ACCEPTED') { statusBg = 'bg-emerald-50 border-emerald-200'; statusText = 'text-emerald-700'; StatusIcon = CheckCircle2; }
                      else if (s.status === 'READY') { statusBg = 'bg-sky-50 border-sky-200'; statusText = 'text-sky-700'; StatusIcon = CheckSquare; }
                      else if (s.status === 'BLOCKED') { statusBg = 'bg-red-50 border-red-200'; statusText = 'text-red-700'; StatusIcon = AlertTriangle; }
                      else if (s.status === 'WAITING MC') { statusBg = 'bg-orange-50 border-orange-200'; statusText = 'text-orange-700'; StatusIcon = Clock; }
                      else if (s.status === 'IN PROGRESS') { statusBg = 'bg-blue-50 border-blue-200'; statusText = 'text-blue-700'; StatusIcon = RefreshCw; }

                      return (
                        <tr key={i} className="text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                          <td className="p-3 pl-5 font-black text-slate-800 border-r border-slate-300">{s.name}</td>
                          <td className="p-3 text-center border-r border-slate-300"><span className="font-bold text-emerald-600 text-sm">{s.done}</span> <span className="text-slate-300 mx-1">/</span> <span className="text-slate-400 font-bold">{s.total}</span></td>
                          <td className="p-3 text-center border-r border-slate-300 align-middle"><div className="flex gap-2 justify-center">{renderMiniBox(s.punchA_open, 'OPEN', 'A')}{renderMiniBox(s.punchA_closed, 'CLOSED', 'A')}</div></td>
                          <td className="p-3 text-center border-r border-slate-300 align-middle"><div className="flex gap-2 justify-center">{renderMiniBox(s.punchB_open, 'OPEN', 'B')}{renderMiniBox(s.punchB_closed, 'CLOSED', 'B')}</div></td>
                          <td className="p-3 text-center border-r border-slate-300 align-middle"><div className="flex gap-2 justify-center">{renderMiniBox(s.punchC_open, 'OPEN', 'C')}{renderMiniBox(s.punchC_closed, 'CLOSED', 'C')}</div></td>
                          <td className="p-3 align-middle text-center">
                            {s.status === 'ACCEPTED' ? (
                              <div className="flex items-center justify-center gap-3 mx-auto w-fit" title={`Cert No: ${s.hoData[`${activePhaseTab === 'CC' ? 'mc' : 'rfsu'}_cert_no`]}`}>
                                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${statusBg} ${statusText}`}><StatusIcon size={14} strokeWidth={3}/> ACCEPTED</span>
                              </div>
                            ) : s.status === 'READY' ? (
                              <button onClick={() => setHandoverModal({ isOpen: true, subSystem: s.name, certNo: '', signDate: new Date().toISOString().split('T')[0] })} className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-full shadow-md flex items-center gap-1.5 mx-auto transition-colors">
                                <CheckCircle2 size={14}/> EXECUTE
                              </button>
                            ) : s.status !== 'NO DATA' ? (
                              <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 w-fit mx-auto border ${statusBg} ${statusText}`}><StatusIcon size={14} strokeWidth={3}/> {s.status}</span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 w-fit mx-auto opacity-50"><CircleDashed size={14}/> NO DATA</span>
                            )}
                          </td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}