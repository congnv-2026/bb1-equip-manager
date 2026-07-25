import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { Search, RotateCcw, X, Loader, LayoutDashboard, Download, CheckCircle2, AlertTriangle, Clock, RefreshCw, CircleDashed, Hammer, Zap, Printer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

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

const FilterPill = ({ active, onClick, label, count, colorKey }) => {
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
  const textColors = { purple: 'text-purple-600', sky: 'text-sky-500', emerald: 'text-emerald-600', red: 'text-red-500', blue: 'text-blue-600', orange: 'text-orange-500' };

  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 px-4 rounded-xl transition-all duration-200 min-w-[120px] border ${active ? activeThemes[colorKey] : themes[colorKey]}`}>
      <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${active ? textColors[colorKey] : 'text-slate-500'}`}>{label}</span>
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
  
  // CỜ KÍCH HOẠT MORPHING IN ẤN
  const [isPrinting, setIsPrinting] = useState(false);

  async function fetchData() { 
    const [equipRes, hoRes] = await Promise.all([supabase.from('itr_matrix').select('*'), supabase.from('subsystem_handovers').select('*')]);
    if (equipRes.data) {
      setEquipList(equipRes.data);
      let plData = [];
      equipRes.data.forEach(equip => {
        if (equip.itr_records) {
          Object.entries(equip.itr_records).forEach(([checkId, r]) => {
            if (r.status === 'P/L' || r.plStatus) plData.push({ phaseOrigin: r.plPhaseOrigin || equip.phase || 'N/A', status: r.plStatus || 'OPEN', dateRaised: r.dateRaised || new Date().toISOString(), rawRecord: r, category: r.plCategory || 'B', system: equip.system_no, subSystem: equip.sub_system_no });
          });
        }
      });
      setPunchlists(plData);
    }
    if (hoRes.data) { const hoMap = {}; hoRes.data.forEach(h => hoMap[h.sub_system_no] = h); setHandovers(hoMap); }
  }
  
  useEffect(() => { fetchData(); }, []);

  const phaseEquipList = equipList.filter(item => item.phase === activePhaseTab);
  const uniqueSystems = [...new Set(phaseEquipList.map(i => String(i.system_no || 'N/A')).filter(s => s !== 'N/A' && s !== ''))].sort();
  const uniqueSubSystems = [...new Set(phaseEquipList.map(i => String(i.sub_system_no || 'N/A')).filter(s => s !== 'N/A' && s !== ''))].sort();

  const filteredEquipList = equipList.filter(item => {
    if (item.phase !== activePhaseTab) return false;
    if (filterSystem && String(item.system_no || 'N/A') !== filterSystem) return false;
    if (filterSubSystem && String(item.sub_system_no || 'N/A') !== filterSubSystem) return false;
    return true;
  });

  const subSystemsMap = {};
  filteredEquipList.forEach(item => {
    const sub = item.sub_system_no; if (!sub) return;
    if (!subSystemsMap[sub]) {
      subSystemsMap[sub] = { 
        name: sub, total: 0, done: 0, 
        punchA_open: 0, punchA_closed: 0,
        punchB_open: 0, punchB_closed: 0,
        punchC_open: 0, punchC_closed: 0
      };
    }
    subSystemsMap[sub].total++; 
    if (item.itr_status === 'Completed') subSystemsMap[sub].done++; 
    
    if (item.itr_records) {
        Object.values(item.itr_records).forEach(r => { 
            if (r.status === 'P/L' || r.plStatus) {
                const isClosed = r.plStatus === 'CLOSED';
                if (r.plCategory === 'A') isClosed ? subSystemsMap[sub].punchA_closed++ : subSystemsMap[sub].punchA_open++;
                else if (r.plCategory === 'B') isClosed ? subSystemsMap[sub].punchB_closed++ : subSystemsMap[sub].punchB_open++;
                else if (r.plCategory === 'C') isClosed ? subSystemsMap[sub].punchC_closed++ : subSystemsMap[sub].punchC_open++;
            }
        });
    }
  });

  const processedMatrix = Object.values(subSystemsMap).map(s => {
    const hoData = handovers[s.name] || {}; let status = 'NO DATA';
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
  const stats = { total: processedMatrix.length, inProgress: processedMatrix.filter(s => s.status === 'IN PROGRESS').length, blocked: processedMatrix.filter(s => s.status === 'BLOCKED').length, ready: processedMatrix.filter(s => s.status === 'READY').length, waiting: processedMatrix.filter(s => s.status === 'WAITING MC').length, accepted: processedMatrix.filter(s => s.status === 'ACCEPTED').length };
  const getOverallProgress = () => { 
    if (filteredEquipList.length === 0) return 0;
    const doneCount = filteredEquipList.filter(i => i.itr_status === 'Completed').length;
    return Math.round((doneCount / filteredEquipList.length) * 100); 
  };

  const burndownChartData = useMemo(() => {
    try {
      const filteredPls = punchlists.filter(p => {
          if (p.phaseOrigin !== activePhaseTab) return false;
          if (filterSystem && String(p.system) !== filterSystem) return false;
          if (filterSubSystem && String(p.subSystem) !== filterSubSystem) return false;
          return true;
      });

      let dates = new Set();
      filteredPls.forEach(p => { 
          if (p.dateRaised) dates.add(String(p.dateRaised).split('T')[0]); 
          if (p.status === 'CLOSED' && p.rawRecord?.closedDate) dates.add(String(p.rawRecord.closedDate).split('T')[0]); 
      });
      let sortedDates = Array.from(dates).sort(); if(sortedDates.length === 0) return [];
      
      let cumulativeGenerated = 0; let cumulativeClosed = 0;
      return sortedDates.map(dateStr => {
          cumulativeGenerated += filteredPls.filter(p => String(p.dateRaised).startsWith(dateStr)).length;
          cumulativeClosed += filteredPls.filter(p => p.status === 'CLOSED' && String(p.rawRecord?.closedDate).startsWith(dateStr)).length;
          return { name: dateStr, Generated: cumulativeGenerated, Closed: cumulativeClosed, Remaining: cumulativeGenerated - cumulativeClosed };
      });
    } catch (e) { return []; }
  }, [punchlists, activePhaseTab, filterSystem, filterSubSystem]);

  const renderMiniBox = (count, type, colorType) => {
    if (count === 0) {
        return (
            <div className="flex flex-col items-center justify-center w-12 py-1 rounded border bg-white border-slate-200 text-slate-400">
                <span className="text-sm font-black leading-none">{count}</span>
                <span className="text-[7px] font-bold uppercase mt-1">{(type)}</span>
            </div>
        );
    }
    let colors = '';
    if (type === 'CLOSED') {
        colors = 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm';
    } else {
        if (colorType === 'A') colors = 'bg-red-50 border-red-200 text-red-600 shadow-sm';
        if (colorType === 'B') colors = 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm';
        if (colorType === 'C') colors = 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm';
    }
    return (
        <div className={`flex flex-col items-center justify-center w-12 py-1 rounded border ${colors}`}>
            <span className="text-sm font-black leading-none">{count}</span>
            <span className="text-[7px] font-bold uppercase mt-1">{(type)}</span>
        </div>
    );
  };

  // --- THUẬT TOÁN IN (A4 ngang Morphing) ---
  const exportToPDF = () => {
    setIsPrinting(true); 
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 800);
  };

  const exportToExcel = () => { alert("Tính năng xuất Excel sẽ được tích hợp sau."); };
  const exportToWord = () => { alert("Tính năng xuất Word sẽ được tích hợp sau."); };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative min-w-0">
      
      {/* 🛠️ BỘ CSS CHUYÊN IN PDF 🛠️ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0 !important; }
          html, body { 
            width: 297mm !important; 
            height: 210mm !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important; 
          }
          
          /* Giấu đi toàn bộ hệ thống menu/sidebar bên ngoài */
          body * { visibility: hidden; }
          
          /* Kích hoạt lại vùng in, ép lên gốc toạ độ (0,0) */
          #dashboard-printable-area, #dashboard-printable-area * { visibility: visible; }
          #dashboard-printable-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            padding: 6mm 10mm !important;
            margin: 0 !important;
            background: #f8fafc !important; /* bg-slate-50 */
            z-index: 999999 !important;
            box-sizing: border-box !important;
          }

          /* Tự động co chart để nhường chỗ cho bảng, tăng chiều cao lên 65mm để chống đè chữ */
          .chart-container-print { height: 65mm !important; min-height: 65mm !important; }
          .recharts-responsive-container { width: 100% !important; height: 100% !important; }
          
          /* Ẩn các nút bấm */
          .no-print, .recharts-tooltip-wrapper { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* --- MÀN HÌNH CHỜ IN --- */}
      {isPrinting && (
         <div className="fixed inset-0 z-[100000] bg-slate-900/80 flex flex-col items-center justify-center no-print">
            <Loader size={50} className="animate-spin text-blue-500 mb-4" />
            <h2 className="text-white font-black text-2xl tracking-widest animate-pulse">PREPARING PDF...</h2>
            <p className="text-slate-300 mt-2 font-medium">Auto-adjusting layout to fit A4 Landscape format.</p>
         </div>
      )}

      {/* --- THANH CÔNG CỤ ĐÃ ĐƯỢC CHỈNH VỀ MÀU TRUNG TÍNH (GRAY/SLATE) CHUẨN XÁC --- */}
      <div className="flex justify-end items-center no-print px-6 pt-4 pb-2 shrink-0 bg-white border-b border-slate-200 z-30 relative">
         <div className="flex gap-2">
            <button onClick={fetchData} className="p-1.5 border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center">
               <RotateCcw size={16} strokeWidth={2.5} />
            </button>
            <button onClick={exportToPDF} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50">
               <Printer size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" />
               <span className="font-bold text-[13px]">PDF</span>
            </button>
            <button onClick={exportToWord} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50">
               <Download size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" />
               <span className="font-bold text-[13px]">Word</span>
            </button>
            <button onClick={exportToExcel} className="group bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-md px-3.5 py-1.5 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 hover:bg-slate-50">
               <Download size={15} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700" />
               <span className="font-bold text-[13px]">Excel</span>
            </button>
         </div>
      </div>

      {/* --- VÙNG NỘI DUNG CHÍNH (SẼ BIẾN HÌNH THÀNH A4 KHI IN) --- */}
      <div 
        id="dashboard-printable-area"
        className={isPrinting 
          ? "fixed top-0 left-0 w-[297mm] h-[210mm] bg-slate-50 z-[99999] p-[6mm] flex flex-col gap-3 items-stretch overflow-hidden" 
          : "flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative"
        }
      >
        <div className="flex-none bg-white z-20 shrink-0 print:bg-transparent">
          <div className="px-6 pt-4 pb-0 print:p-0">
            
            {/* --- HEADER TÀI LIỆU (Giống hệt ảnh cung cấp) --- */}
            <div className="flex justify-between items-stretch border-b-2 border-slate-300 pb-2 mb-3 shrink-0">
                <div className="w-1/4 flex flex-col justify-end text-left pb-0.5">
                  <span className="font-black text-[12px] text-slate-700 tracking-wider uppercase">MCDERMOTT | PTSC</span>
                </div>
                
                <div className="w-1/2 flex flex-col justify-between items-center text-center">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest m-0 leading-none">VIETNAM BLOCK B GAS PROJECT</h2>
                  <span className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">{activePhaseTab === 'CC' ? 'MC' : 'RFSU'} COMPLETIONS DASHBOARD</span>
                </div>
                
                <div className="w-1/4 flex flex-col justify-between text-right pb-0.5">
                  <span className="font-black text-[12px] text-slate-700 tracking-wider uppercase block">PETROVIETNAM | PQPOC</span>
                  <span className="text-[10px] font-bold text-slate-500 block mt-auto">Printed: {formatToExcelDate(new Date().toISOString())}</span>
                </div>
            </div>
            
            {/* BỘ LỌC (CHỈ HIỆN TRÊN MÀN HÌNH, ẨN KHI IN) */}
            <div className="flex items-center gap-4 bg-white pb-3 no-print">
              <div className="flex gap-2">
                  <button 
                      onClick={() => {setActivePhaseTab('CC'); setActiveFilter('ALL'); setFilterSystem(''); setFilterSubSystem('');}} 
                      className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${
                      activePhaseTab === 'CC' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                      <Hammer size={16} className={activePhaseTab === 'CC' ? 'text-blue-600' : 'opacity-50'} /> Phase CC (MC)
                  </button>
                  <button 
                      onClick={() => {setActivePhaseTab('PC'); setActiveFilter('ALL'); setFilterSystem(''); setFilterSubSystem('');}} 
                      className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${
                      activePhaseTab === 'PC' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                      <Zap size={16} className={activePhaseTab === 'PC' ? 'text-amber-500' : 'opacity-50'} /> Phase PC (RFSU)
                  </button>
              </div>
              
              <div className="w-px h-6 bg-slate-200 mx-2"></div>
              
              <div className="flex gap-2 mb-1">
                  <select value={filterSystem} onChange={(e) => setFilterSystem(e.target.value)} className="px-3 h-[32px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-600 outline-none w-36 hover:bg-slate-50 transition-colors cursor-pointer">
                      <option value="">System: All</option>
                      {uniqueSystems.map(sys => <option key={sys} value={sys}>{sys}</option>)}
                  </select>
                  <select value={filterSubSystem} onChange={(e) => setFilterSubSystem(e.target.value)} className="px-3 h-[32px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-600 outline-none w-40 hover:bg-slate-50 transition-colors cursor-pointer">
                      <option value="">Sub-Sys: All</option>
                      {uniqueSubSystems.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4 bg-slate-100 print:p-0 print:overflow-hidden print:space-y-3">
          {/* CHARTS */}
          <div className="grid grid-cols-12 gap-4 print:gap-3 shrink-0">
            <div className="col-span-8 bg-white p-5 print:p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col h-[300px] chart-container-print">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 print:mb-2">Punchlist Burndown Trend</h3>
              <div className="flex-1 w-full min-h-0">
                {burndownChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {/* ĐÃ SỬA LỖI ĐÈ CHỮ: Tăng margin-bottom lên 45px khi in để tạo không gian */}
                    <LineChart data={burndownChartData} margin={{ top: 10, right: 30, left: -20, bottom: isPrinting ? 45 : 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      {/* ĐẨY TRỤC X XUỐNG DƯỚI THÊM BẰNG CÁCH DÙNG DY */}
                      <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b', fontWeight: 'bold', dy: isPrinting ? 15 : 10}} axisLine={{stroke:'#e2e8f0'}} tickLine={false} />
                      <YAxis tick={{fontSize: 9, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      {/* ĐẨY LEGEND XUỐNG SÁT ĐÁY */}
                      <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: isPrinting ? '25px' : '15px'}} />
                      <Line type="monotone" dataKey="Generated" stroke="#8b5cf6" strokeWidth={isPrinting ? 2 : 3} dot={{r: 2}} name="Total Generated" isAnimationActive={false} />
                      <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={isPrinting ? 2 : 3} dot={{r: 2}} name="Total Closed" isAnimationActive={false} />
                      <Line type="monotone" dataKey="Remaining" stroke="#ef4444" strokeWidth={isPrinting ? 2 : 3} dot={{r: 2}} name="Remaining Open" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (<div className="flex h-full items-center justify-center text-slate-400 text-xs font-bold">No data available.</div>)}
              </div>
            </div>
            
            <div className="col-span-4 bg-white p-5 print:p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-center items-center h-[300px] chart-container-print relative">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute top-5 left-5 print:top-3 print:left-3">ITR Progress</h3>
              <div className="relative w-40 h-40 print:w-32 print:h-32 flex items-center justify-center mt-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx={isPrinting ? "64" : "80"} cy={isPrinting ? "64" : "80"} r={isPrinting ? "56" : "70"} stroke="currentColor" strokeWidth={isPrinting ? "10" : "14"} fill="transparent" className="text-slate-100" />
                  <circle cx={isPrinting ? "64" : "80"} cy={isPrinting ? "64" : "80"} r={isPrinting ? "56" : "70"} stroke="currentColor" strokeWidth={isPrinting ? "10" : "14"} fill="transparent" className="text-emerald-500 transition-all duration-1000 ease-in-out" strokeDasharray={`${2 * Math.PI * (isPrinting ? 56 : 70)}`} strokeDashoffset={`${2 * Math.PI * (isPrinting ? 56 : 70) * (1 - getOverallProgress() / 100)}`} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl print:text-3xl font-black text-emerald-600">{getOverallProgress()}%</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">Completed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden flex flex-col print:flex-1 min-h-0">
            <div className="p-4 print:p-2 bg-white border-b border-slate-200 flex gap-4 print:gap-2 overflow-x-auto shrink-0">
              <FilterPill label="Total Sub-Sys" count={stats.total} colorKey="purple" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
              {activePhaseTab === 'PC' && <FilterPill label="Waiting MC" count={stats.waiting} colorKey="orange" active={activeFilter === 'WAITING MC'} onClick={() => setActiveFilter('WAITING MC')} />}
              <FilterPill label="In Progress" count={stats.inProgress} colorKey="blue" active={activeFilter === 'IN PROGRESS'} onClick={() => setActiveFilter('IN PROGRESS')} />
              <FilterPill label="Blocked (Cat A)" count={stats.blocked} colorKey="red" active={activeFilter === 'BLOCKED'} onClick={() => setActiveFilter('BLOCKED')} />
              <FilterPill label="Ready" count={stats.ready} colorKey="sky" active={activeFilter === 'READY'} onClick={() => setActiveFilter('READY')} />
              <FilterPill label="Accepted" count={stats.accepted} colorKey="emerald" active={activeFilter === 'ACCEPTED'} onClick={() => setActiveFilter('ACCEPTED')} />
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1 bg-white">
              <table className="w-full text-left whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase border-b-2 border-slate-300 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5 border-r border-slate-300 w-[15%] align-middle">Sub-System</th>
                    <th className="p-3 text-center border-r border-slate-300 w-[10%] align-middle">ITR Progress</th>
                    <th className="p-3 text-center border-r border-slate-300 w-[15%] bg-red-50/10">
                      <div className="text-red-600 font-black text-xs">PUNCH A (CRIT)</div>
                    </th>
                    <th className="p-3 text-center border-r border-slate-300 w-[15%] bg-orange-50/10">
                      <div className="text-orange-500 font-black text-xs">PUNCH B (MINOR)</div>
                    </th>
                    <th className="p-3 text-center border-r border-slate-300 w-[15%] bg-slate-50/50">
                      <div className="text-slate-800 font-black text-xs">PUNCH C (DOC)</div>
                    </th>
                    <th className="p-3 text-center w-[20%] align-middle">{activePhaseTab === 'CC' ? 'MC' : 'RFSU'} Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {finalFilteredMatrix.map((s, i) => (
                    <tr key={i} className="text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                      <td className="p-3 pl-5 font-black text-slate-800 border-r border-slate-300">{s.name}</td>
                      <td className="p-3 text-center border-r border-slate-300">
                          <span className="font-bold text-emerald-600 text-sm">{s.done}</span> <span className="text-slate-300 mx-1">/</span> <span className="text-slate-400 font-bold">{s.total}</span>
                      </td>
                      
                      <td className="p-3 text-center border-r border-slate-300 align-middle">
                        <div className="flex gap-2 justify-center">
                          {renderMiniBox(s.punchA_open, 'OPEN', 'A')}
                          {renderMiniBox(s.punchA_closed, 'CLOSED', 'A')}
                        </div>
                      </td>

                      <td className="p-3 text-center border-r border-slate-300 align-middle">
                        <div className="flex gap-2 justify-center">
                          {renderMiniBox(s.punchB_open, 'OPEN', 'B')}
                          {renderMiniBox(s.punchB_closed, 'CLOSED', 'B')}
                        </div>
                      </td>

                      <td className="p-3 text-center border-r border-slate-300 align-middle">
                        <div className="flex gap-2 justify-center">
                          {renderMiniBox(s.punchC_open, 'OPEN', 'C')}
                          {renderMiniBox(s.punchC_closed, 'CLOSED', 'C')}
                        </div>
                      </td>
                      
                      <td className="p-3 align-middle text-center">
                        {s.status === 'ACCEPTED' ? (
                          <div className="flex items-center justify-center gap-3 mx-auto w-fit">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-200">
                              <CheckCircle2 size={14} strokeWidth={3}/> ACCEPTED
                            </span>
                          </div>
                        ) : s.status === 'READY' ? (
                          <button className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-full shadow-md flex items-center gap-1.5 mx-auto transition-colors no-print">
                            <CheckCircle2 size={14}/> EXECUTE
                          </button>
                        ) : s.status === 'BLOCKED' ? (
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 w-fit mx-auto border border-red-200">
                            <AlertTriangle size={14} strokeWidth={3}/> BLOCKED
                          </span>
                        ) : s.status === 'WAITING MC' ? (
                          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 w-fit mx-auto border border-orange-200">
                            <Clock size={14} strokeWidth={3}/> WAITING
                          </span>
                        ) : s.status === 'IN PROGRESS' ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 w-fit mx-auto border border-blue-200">
                            <RefreshCw size={14} strokeWidth={3}/> IN PROG
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 w-fit mx-auto opacity-50">
                            <CircleDashed size={14}/> NO DATA
                          </span>
                        )}
                        {/* FALLBACK CHỮ KHI IN ẤN VÌ NÚT EXECUTE BỊ ẨN */}
                        <span className="hidden print:inline-block text-[10px] font-bold text-blue-700 uppercase">
                           {s.status === 'READY' ? 'READY TO EXECUTE' : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}