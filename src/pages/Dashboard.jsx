import React, { useState, useEffect, useMemo } from 'react';
import { Download, Loader } from 'lucide-react';
import { supabase } from '../supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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

const REQUIRED_DECKS = [
  'SUB-CELLAR DECK',
  'CELLAR DECK',
  'MEZZANINE DECK',
  'MAIN DECK',
  'WEATHER DECK'
];

const normalizeDeckName = (str) => {
  if (!str) return '';
  const clean = str.toUpperCase().replace(/[\s\-_]/g, ''); 
  if (clean.includes('SUBCELLAR')) return 'SUB-CELLAR DECK';
  if (clean.includes('CELLAR')) return 'CELLAR DECK';
  if (clean.includes('MEZZANINE')) return 'MEZZANINE DECK';
  if (clean.includes('MAIN')) return 'MAIN DECK';
  if (clean.includes('WEATHER')) return 'WEATHER DECK';
  return str.toUpperCase().trim();
};

export default function Dashboard() {
  const [equipList, setEquipList] = useState([]);
  
  // STATE ĐẶC BIỆT KÍCH HOẠT CHẾ ĐỘ IN
  const [isPrinting, setIsPrinting] = useState(false);

  async function fetchData() {
    const { data: listData } = await supabase.from('master_equipment').select('*').order('tag_no', { ascending: true });
    if (listData) setEquipList(listData);
  }

  useEffect(() => { fetchData(); }, []);

  // --- 🛠️ LOGIC ĐẾM MỚI (ĐỒNG BỘ 100% VỚI MATRIX) 🛠️ ---
  // Hàm này kiểm tra: Chỉ cần có trạng thái DONE HOẶC có ngày hợp lệ là tính ĐÃ LÀM
  const isStepDone = (status, date) => {
    const s = status ? String(status).toUpperCase().trim() : '';
    const hasStatus = s === 'DONE' || s === 'COMPLETED' || s === 'N/A';
    
    // Loại bỏ chuỗi trống và loại luôn cả cái chữ dd-mmm-yy mặc định
    const hasValidDate = date && String(date).trim() !== '' && date !== 'dd-mmm-yy';
    
    return hasStatus || hasValidDate;
  };

  const isReceived = (item) => {
    const hasMrir = item.mrir_no && String(item.mrir_no).trim() !== '';
    const hasStatus = item.receiving_status && String(item.receiving_status).toUpperCase().trim() === 'DONE';
    const hasValidDate = item.receiving_date && String(item.receiving_date).trim() !== '' && item.receiving_date !== 'dd-mmm-yy';
    
    return hasMrir || hasStatus || hasValidDate;
  };

  const isInstalled = (item) => {
    // Check cả 2 trường hợp tên cột có thể được đặt trong Database
    const status = item.installation_status || item.install_status; 
    return isStepDone(status, item.installation_date);
  };

  const isCompleted = (item) => {
    if (!isInstalled(item)) return false; // Chưa Install thì chắc chắn chưa Complete
    return isStepDone(item.welding_status, item.welding_date) &&
           isStepDone(item.bolting_status, item.bolting_date) &&
           isStepDone(item.dim_status, item.dim_date) &&
           isStepDone(item.leveling_status, item.leveling_date) &&
           isStepDone(item.align_status, item.align_date);
  };
  // ----------------------------------------------------

  const stats = useMemo(() => {
    let total = equipList.length;
    let received = 0; let installed = 0; let completed = 0; let notDelivered = 0;
    let deckGroups = {};
    REQUIRED_DECKS.forEach(deck => { deckGroups[deck] = { name: deck, total: 0, received: 0, installed: 0, completed: 0, notDelivered: 0 }; });

    equipList.forEach(item => {
      const rec = isReceived(item);
      const inst = isInstalled(item);
      const comp = isCompleted(item);

      if (rec) received++;
      if (inst) installed++;
      if (comp) completed++;
      if (!rec) notDelivered++;

      const deck = normalizeDeckName(item.deck_level);
      if (deck && deckGroups[deck]) {
        deckGroups[deck].total++;
        if (rec) deckGroups[deck].received++;
        if (inst) deckGroups[deck].installed++;
        if (comp) deckGroups[deck].completed++;
        if (!rec) deckGroups[deck].notDelivered++;
      }
    });

    let deckStats = REQUIRED_DECKS.map(deckName => {
      const d = deckGroups[deckName];
      d.backlog = d.received - d.installed;
      d.receivedPct = d.total ? Math.round((d.received / d.total) * 100) : 0;
      d.installedPct = d.total ? Math.round((d.installed / d.total) * 100) : 0;
      return d;
    });

    const bestDeck = [...deckStats].sort((a,b) => b.installedPct - a.installedPct)[0]?.name || '-';
    const highestBacklog = [...deckStats].sort((a,b) => b.backlog - a.backlog)[0]?.name || '-';
    const highestNdy = [...deckStats].sort((a,b) => b.notDelivered - a.notDelivered)[0]?.name || '-';
    const backlog = received - installed;
    const bottleneck = backlog > notDelivered ? 'INSTALLATION TEAM (HIGH BACKLOG)' : (notDelivered > backlog ? 'PROCUREMENT (HIGH NDY)' : 'BALANCED');

    return { total, received, installed, completed, backlog, notDelivered, deckStats, bestDeck, highestBacklog, highestNdy, bottleneck };
  }, [equipList]);

  const pieData = [
    { name: 'Installed (Inc. Completed)', value: stats.installed, color: '#3b82f6' },
    { name: 'Installation Backlog', value: stats.backlog, color: '#f97316' },
    { name: 'Not Delivered', value: stats.notDelivered, color: '#64748b' },
  ].filter(d => d.value > 0);

  const getProgressBarStyle = (pct, type) => {
    if (pct === 0) return { width: '0%', backgroundColor: 'transparent' };
    const startColor = type === 'installed' ? '#3b82f6' : '#0ea5e9';
    return {
      width: `${pct}%`,
      background: `linear-gradient(to right, ${startColor} 0%, rgba(255,255,255,0) 130%)`,
      borderRadius: '2px',
    };
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent === 0) return null; 
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={isPrinting ? "11px" : "13px"} fontWeight="900">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const exportToExcel = () => {
    const summaryData = [
      { 'Metric': 'TOTAL SCOPE', 'Value': stats.total },
      { 'Metric': 'RECEIVED', 'Value': stats.received },
      { 'Metric': 'INSTALLED (INC. COMPLETED)', 'Value': stats.installed },
      { 'Metric': 'INSTALL BACKLOG', 'Value': stats.backlog },
      { 'Metric': 'NOT DELIVERED', 'Value': stats.notDelivered },
      { 'Metric': 'COMPLETED', 'Value': stats.completed }
    ];
    const deckData = stats.deckStats.map(d => ({
      'Deck Name': d.name, 'Total Scope': d.total, 'Received': d.received, 'Installed': d.installed, 'Backlog': d.backlog, 'Not Delivered': d.notDelivered, 'Completed': d.completed, 'Received %': `${d.receivedPct}%`, 'Installed %': `${d.installedPct}%`
    }));
    const wb = XLSX.utils.book_new();
    XLS.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Summary KPI");
    XLS.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deckData), "Status By Deck");
    XLS.writeFile(wb, `Installation_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToWord = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Dashboard Report</title><style>@page { size: landscape; margin: 1cm; } body { font-family: Arial, sans-serif; color: black; } table {width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;} th, td {border: 1px solid #cbd5e1; padding: 6px; text-align: center;} th {background-color: #f1f5f9; color: black; font-weight: bold;} .title-table td { border: none !important; }</style></head><body>`;
    const titleHtml = `<table class="title-table" style="width:100%; margin-bottom:15px;"><tr><td style="text-align:left; font-weight:bold; font-size:12px; color:#475569; width:25%;">MCDERMOTT | PTSC</td><td style="text-align:center; width:50%;"><h2 style="margin:0; font-size:20px; color:#0f172a;">VIETNAM BLOCK B GAS PROJECT</h2><span style="font-size:11px; color:#64748b; font-style:italic;">Installation Progress Executive Dashboard</span><br><span style="font-size:10px; color:#475569;">Printed: ${formatToExcelDate(new Date().toISOString())}</span></td><td style="text-align:right; font-weight:bold; font-size:12px; color:#475569; width:25%;">PETROVIETNAM | PQPOC</td></tr></table>`;
    const kpiHtml = `<table style="margin-bottom:15px;"><thead><tr><th style="background-color:#f3e8ff; color:#7e22ce;">TOTAL SCOPE</th><th style="background-color:#e0f2fe; color:#0369a1;">RECEIVED</th><th style="background-color:#dbeafe; color:#1d4ed8;">INSTALLED</th><th style="background-color:#ffedd5; color:#c2410c;">INSTALL BACKLOG</th><th style="background-color:#f1f5f9; color:#475569;">NOT DELIVERED</th><th style="background-color:#d1fae5; color:#047857;">COMPLETED</th></tr></thead><tbody><tr><td style="font-size:22px; font-weight:bold; color:black;">${stats.total}</td><td style="font-size:22px; font-weight:bold; color:black;">${stats.received}<br><span style="font-size:11px; color:#475569;">${stats.total ? Math.round((stats.received/stats.total)*100) : 0}%</span></td><td style="font-size:22px; font-weight:bold; color:black;">${stats.installed}<br><span style="font-size:11px; color:#475569;">${stats.total ? Math.round((stats.installed/stats.total)*100) : 0}%</span></td><td style="font-size:22px; font-weight:bold; color:black;">${stats.backlog}<br><span style="font-size:11px; color:#475569;">${stats.total ? Math.round((stats.backlog/stats.total)*100) : 0}%</span></td><td style="font-size:22px; font-weight:bold; color:black;">${stats.notDelivered}<br><span style="font-size:11px; color:#475569;">${stats.total ? Math.round((stats.notDelivered/stats.total)*100) : 0}%</span></td><td style="font-size:22px; font-weight:bold; color:black;">${stats.completed}<br><span style="font-size:11px; color:#475569;">${stats.total ? Math.round((stats.completed/stats.total)*100) : 0}%</span></td></tr></tbody></table>`;

    let rowsHtml = '';
    stats.deckStats.forEach(d => {
      rowsHtml += `<tr><td style="text-align:left; font-weight:bold; background-color:#f8fafc; color:black;">${d.name}</td><td style="color:black;">${d.total}</td><td style="color:black;">${d.received}</td><td style="color:black;">${d.installed}</td><td style="color:black;">${d.backlog}</td><td style="color:black;">${d.notDelivered}</td><td style="color:black;">${d.completed}</td><td style="color:black; font-weight:bold;">${d.receivedPct}%</td><td style="color:black; font-weight:bold;">${d.installedPct}%</td></tr>`;
    });

    const tableHtml = `<table><thead><tr><th>DECK LEVEL LOCATION</th><th>TOTAL SCOPE</th><th>RECEIVED</th><th>INSTALLED</th><th>BACKLOG</th><th>NOT DELIVERED</th><th>COMPLETED</th><th>RECEIVED %</th><th>INSTALLED %</th></tr></thead><tbody>${rowsHtml}<tr style="background-color:#e2e8f0; font-weight:bold;"><td style="text-align:left; color:black;">PROJECT MASTER TOTAL</td><td style="color:black;">${stats.total}</td><td style="color:black;">${stats.received}</td><td style="color:black;">${stats.installed}</td><td style="color:black;">${stats.backlog}</td><td style="color:black;">${stats.notDelivered}</td><td style="color:black;">${stats.completed}</td><td style="color:black;">${stats.total ? Math.round((stats.received/stats.total)*100) : 0}%</td><td style="color:black;">${stats.total ? Math.round((stats.installed/stats.total)*100) : 0}%</td></tr></tbody></table>`;

    const sourceHTML = header + titleHtml + kpiHtml + tableHtml + `</body></html>`;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `Installation_Dashboard_Report.doc`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  // --- THUẬT TOÁN IN MỚI (OVERLAY MORPHING CỰC KỲ AN TOÀN) ---
  const exportToPDF = () => {
    setIsPrinting(true); 
    setTimeout(() => {
      window.print();
      setIsPrinting(false); 
    }, 800);
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-slate-50 relative pt-2 print:pt-0 min-w-0">
      
      {/* 🛠️ BỘ CSS PRINT: ÉP CHUẨN A4 VÀ XÓA KHOẢNG TRẮNG SIDEBAR 🛠️ */}
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
          
          /* Chỉ hiện vùng in, ép tuyệt đối lên góc trái bằng position fixed */
          #dashboard-printable-area, #dashboard-printable-area * { visibility: visible; }
          #dashboard-printable-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            padding: 10mm 12mm !important;
            margin: 0 !important;
            background: white !important;
            z-index: 999999 !important;
            box-sizing: border-box !important;
          }

          /* Chống tràn cho biểu đồ */
          .chart-container-print { flex: 1 !important; min-height: 70mm !important; max-height: 75mm !important; }
          .recharts-responsive-container { width: 100% !important; height: 100% !important; }
          
          /* Ẩn các nút bấm */
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* --- MÀN HÌNH CHỜ (Khi ấn in) --- */}
      {isPrinting && (
         <div className="fixed inset-0 z-[100000] bg-slate-900/80 flex flex-col items-center justify-center no-print">
            <Loader size={50} className="animate-spin text-blue-500 mb-4" />
            <h2 className="text-white font-black text-2xl tracking-widest animate-pulse">PREPARING PDF...</h2>
            <p className="text-slate-300 mt-2 font-medium">Auto-adjusting layout to fit A4 Landscape format.</p>
         </div>
      )}

      {/* --- CÁC NÚT XUẤT FILE --- */}
      <div className="flex justify-end items-center no-print px-4 pb-3 pt-1 shrink-0">
         <div className="flex gap-2.5">
            <button onClick={exportToPDF} className="group text-slate-600 hover:text-slate-950 bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer">
               <Download size={14} strokeWidth={2.5} className="text-red-500 group-hover:text-red-600" />
               <span className="font-bold text-[11px] uppercase">PDF / PRINT</span>
            </button>
            <button onClick={exportToExcel} className="group text-slate-600 hover:text-slate-950 bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer">
               <Download size={14} strokeWidth={2.5} className="text-emerald-500 group-hover:text-emerald-600" />
               <span className="font-bold text-[11px] uppercase">EXCEL</span>
            </button>
            <button onClick={exportToWord} className="group text-slate-600 hover:text-slate-950 bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer">
               <Download size={14} strokeWidth={2.5} className="text-blue-500 group-hover:text-blue-600" />
               <span className="font-bold text-[11px] uppercase">WORD</span>
            </button>
         </div>
      </div>

      {/* --- CONTAINER CHÍNH --- */}
      <div 
        id="dashboard-printable-area" 
        className={isPrinting 
          ? "fixed top-0 left-0 w-[297mm] h-[210mm] bg-white z-[99999] p-[10mm] flex flex-col gap-4 items-stretch" 
          : "flex flex-col gap-4 flex-1 h-full w-full min-w-[900px] px-4 pb-4 bg-slate-50"
        }
      >
        
        {/* HEADER */}
        <div className="flex justify-between items-end border-b-2 border-slate-300 pb-2 shrink-0">
            <div className="w-1/4 text-left">
              <span className="font-black text-[13px] text-slate-600 tracking-wider uppercase">MCDERMOTT | PTSC</span>
            </div>
            
            <div className="w-1/2 flex flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest m-0 leading-none">VIETNAM BLOCK B GAS PROJECT</h2>
              <span className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">Installation Progress Executive Dashboard</span>
            </div>
            
            <div className="w-1/4 text-right">
              <span className="font-black text-[13px] text-slate-600 tracking-wider uppercase block">PETROVIETNAM | PQPOC</span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">Printed: {formatToExcelDate(new Date().toISOString())}</span>
            </div>
        </div>

        {/* 6 KHỐI KPI */}
        <div className="grid grid-cols-6 border border-slate-300 bg-white shadow-sm shrink-0 rounded overflow-hidden">
           {[
             { label: 'TOTAL SCOPE', val: stats.total, sub: '', bg: '#a855f7' },        
             { label: 'RECEIVED', val: stats.received, sub: stats.total ? Math.round((stats.received/stats.total)*100)+'%' : '0%', bg: '#0ea5e9' }, 
             { label: 'INSTALLED', val: stats.installed, sub: stats.total ? Math.round((stats.installed/stats.total)*100)+'%' : '0%', bg: '#3b82f6' }, 
             { label: 'INSTALL BACKLOG', val: stats.backlog, sub: stats.total ? Math.round((stats.backlog/stats.total)*100)+'%' : '0%', bg: '#f97316' }, 
             { label: 'NOT DELIVERED', val: stats.notDelivered, sub: stats.total ? Math.round((stats.notDelivered/stats.total)*100)+'%' : '0%', bg: '#64748b' }, 
             { label: 'COMPLETED', val: stats.completed, sub: stats.total ? Math.round((stats.completed/stats.total)*100)+'%' : '0%', bg: '#10b981' }  
           ].map((kpi, idx) => (
             <div key={idx} className="flex flex-col border-r border-slate-200 last:border-0 bg-white min-w-0">
               <div style={{ backgroundColor: kpi.bg }} className="text-white text-[10px] font-black uppercase w-full text-center py-1.5">{kpi.label}</div>
               <div style={{ backgroundColor: kpi.bg + '33' }} className="p-2 flex-1 flex flex-col items-center justify-center">
                 <span className="text-[28px] font-black text-black leading-none mb-1">{kpi.val}</span>
                 <span className="text-[10px] font-black text-slate-700">{kpi.sub}</span>
               </div>
             </div>
           ))}
        </div>

        {/* BẢNG LOG VÀ INSIGHTS */}
        <div className="grid grid-cols-3 gap-4 shrink-0 items-stretch">
          
          <div className="col-span-2 bg-white border border-slate-300 shadow-sm overflow-hidden rounded flex flex-col">
            <div className="bg-[#1e293b] text-white px-3 py-1 font-black text-xs uppercase tracking-wider text-center shrink-0">PROGRESS LOG BY DECK LEVEL LOCATION</div>
            <div className="flex-1">
              <table className="w-full text-[11px] text-right border-collapse table-fixed h-full">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 font-black text-black text-[9px] text-center">
                    <th className="p-1.5 text-center border-r border-slate-200 whitespace-nowrap w-[20%]">DECK LEVEL LOCATION</th>
                    <th className="p-1.5 border-r border-slate-200 text-center whitespace-nowrap w-[9%]">TOTAL<br/>SCOPE</th>
                    <th className="p-1.5 border-r border-slate-200 text-center whitespace-nowrap w-[9%]">RECEIVED</th>
                    <th className="p-1.5 border-r border-slate-200 text-center whitespace-nowrap w-[9%]">INSTALLED</th>
                    <th className="p-1.5 border-r border-slate-200 text-center whitespace-nowrap w-[9%]">BACKLOG</th>
                    <th className="p-1.5 border-r border-slate-200 text-center whitespace-nowrap w-[11%]">NOT<br/>DELIVERED</th>
                    <th className="p-1.5 border-r border-slate-200 text-center whitespace-nowrap w-[10%]">COMPLETED</th>
                    <th className="p-1.5 border-r border-slate-200 text-center whitespace-nowrap w-[11%]">RECEIVED %</th>
                    <th className="p-1.5 text-center whitespace-nowrap w-[12%]">INSTALLED %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-bold">
                  {stats.deckStats.map(deck => (
                    <tr key={deck.name}>
                      <td className="p-1 text-left border-r border-slate-200 font-black uppercase bg-slate-50 text-[9px] text-black whitespace-nowrap">{deck.name}</td>
                      <td className="p-1 border-r border-slate-200 text-center bg-white text-black">{deck.total}</td>
                      <td className="p-1 border-r border-slate-200 text-center bg-white text-black">{deck.received}</td>
                      <td className="p-1 border-r border-slate-200 text-center bg-white text-black">{deck.installed}</td>
                      <td className="p-1 border-r border-slate-200 text-center bg-white text-black">{deck.backlog}</td>
                      <td className="p-1 border-r border-slate-200 text-center bg-white text-black">{deck.notDelivered}</td>
                      <td className="p-1 border-r border-slate-200 text-center bg-white text-black">{deck.completed}</td>
                      
                      <td className="p-0 border-r border-slate-200 relative bg-white text-center">
                        <div className="absolute top-0 left-0 h-full shadow-sm" style={getProgressBarStyle(deck.receivedPct, 'received')} />
                        <div className="absolute inset-0 flex items-center justify-center font-black text-black text-[10px] z-10">{deck.receivedPct}%</div>
                      </td>
                      <td className="p-0 relative bg-white text-center">
                        <div className="absolute top-0 left-0 h-full shadow-sm" style={getProgressBarStyle(deck.installedPct, 'installed')} />
                        <div className="absolute inset-0 flex items-center justify-center font-black text-black text-[10px] z-10">{deck.installedPct}%</div>
                      </td>
                    </tr>
                  ))}
                  
                  <tr className="font-black bg-[#f1f5f9]/70 border-t-2 border-slate-300">
                    <td className="p-1 text-left border-r border-slate-200 text-[9px] text-black uppercase">PROJECT MASTER TOTAL</td>
                    <td className="p-1 border-r border-slate-200 text-center text-black text-[11px]">{stats.total}</td>
                    <td className="p-1 border-r border-slate-200 text-center text-black text-[11px]">{stats.received}</td>
                    <td className="p-1 border-r border-slate-200 text-center text-black text-[11px]">{stats.installed}</td>
                    <td className="p-1 border-r border-slate-200 text-center text-black text-[11px]">{stats.backlog}</td>
                    <td className="p-1 border-r border-slate-200 text-center text-black text-[11px]">{stats.notDelivered}</td>
                    <td className="p-1 border-r border-slate-200 text-center text-black text-[11px]">{stats.completed}</td>
                    <td className="p-1 border-r border-slate-200 text-center text-black text-[11px]">{stats.total ? Math.round((stats.received/stats.total)*100) : 0}%</td>
                    <td className="p-1 text-center text-black text-[11px]">{stats.total ? Math.round((stats.installed/stats.total)*100) : 0}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="col-span-1 bg-white border border-slate-300 flex flex-col shadow-sm rounded h-full">
             <div className="bg-[#1e293b] text-white px-3 py-1 font-black text-xs uppercase tracking-wider text-center shrink-0">PROJECT INSIGHTS</div>
             <div className="p-4 flex-1 text-[11px] font-bold text-black flex flex-col justify-evenly bg-white text-left">
                <div className="flex justify-between border-b border-slate-100 pb-2"><span>Best installed deck</span> <span className="font-black text-black uppercase">{stats.bestDeck}</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span>Highest install backlog</span> <span className="font-black text-black uppercase">{stats.highestBacklog}</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span>Highest NDY</span> <span className="font-black text-black uppercase">{stats.highestNdy}</span></div>
                <div className="flex justify-between"><span>Primary bottleneck</span> <span className="font-black text-red-600 uppercase tracking-tighter">{stats.bottleneck}</span></div>
             </div>
          </div>
        </div>

        {/* --- KHU VỰC BIỂU ĐỒ --- */}
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 chart-container-print items-stretch">
           
           <div className="col-span-2 bg-white border border-slate-300 p-3 pb-0 flex flex-col items-center shadow-sm rounded h-full relative">
              <h3 className="font-black text-[13px] mb-2 text-slate-800 uppercase tracking-widest text-center shrink-0">INSTALLATION VS ARRIVAL PROGRESS BAR CHART</h3>
              
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.deckStats} margin={{ top: 10, right: 15, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                  <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold', fill: 'black', dy: 12}} axisLine={{stroke:'#cbd5e1'}} tickLine={false}/>
                  <YAxis tickFormatter={(tick) => `${tick}%`} tick={{fontSize: 10, fontWeight: 'bold', fill: 'black'}} axisLine={false} tickLine={false} domain={[0, 100]}/>
                  <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', color: 'black', paddingTop: '20px'}}/>
                  
                  <Bar dataKey="receivedPct" name="Received %" fill="#0ea5e9" barSize={isPrinting ? 22 : 28} isAnimationActive={false} />
                  <Bar dataKey="installedPct" name="Installed %" fill="#3b82f6" barSize={isPrinting ? 22 : 28} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
           </div>

           <div className="col-span-1 bg-white border border-slate-300 p-3 flex flex-col items-center shadow-sm rounded h-full relative">
              <h3 className="font-black text-[13px] text-slate-800 uppercase tracking-widest mb-2 text-center shrink-0">OVERALL DISTRIBUTION PIE</h3>
              
              <div className="w-full flex-1 flex flex-col items-center justify-between min-h-0">
                <div className="w-full flex-1 flex items-center justify-center min-h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie 
                        data={pieData} cx="50%" cy="50%" 
                        innerRadius="40%" 
                        outerRadius={isPrinting ? "80%" : "85%"} 
                        paddingAngle={pieData.length > 1 ? 2 : 0} 
                        dataKey="value" stroke="#fff" strokeWidth={3}
                        label={renderCustomizedLabel} labelLine={false}
                        isAnimationActive={false}
                      >
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full flex flex-col gap-1.5 text-[10px] font-black text-black px-2 mt-2 shrink-0 text-left">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#3b82f6] rounded-[2px] shrink-0"></div><span>Installed (Inc. Completed): {stats.installed} EA</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#f97316] rounded-[2px] shrink-0"></div><span>Installation Backlog: {stats.backlog} EA</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#64748b] rounded-[2px] shrink-0"></div><span>Not Delivered: {stats.notDelivered} EA</span></div>
                </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}