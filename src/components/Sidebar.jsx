import React, { useState } from 'react';
import { Database, BarChart2, ShieldAlert, FileSignature, AlertOctagon, PieChart, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';

export default function Sidebar({ activeModule, setActiveModule }) {
  // Trạng thái thu gọn/mở rộng Sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside 
      className={`bg-[#0f172a] text-slate-300 flex flex-col shadow-2xl z-20 shrink-0 transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-[80px]' : 'w-64'
      }`}
    >
      {/* Nút Đóng/Mở Sidebar (Nằm vắt ngang viền) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-slate-800 border border-slate-600 text-slate-300 rounded-full p-1 hover:bg-[#2563eb] hover:text-white hover:border-transparent transition-colors z-50 shadow-md"
        title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
      >
        {isCollapsed ? <ChevronRight size={16} strokeWidth={3} /> : <ChevronLeft size={16} strokeWidth={3} />}
      </button>

      {/* HEADER LOGO */}
      <div className={`p-6 border-b border-slate-800 flex flex-col justify-center min-h-[96px] ${isCollapsed ? 'items-center px-2' : ''}`}>
        {isCollapsed ? (
          <h1 className="text-xl font-black text-white tracking-wider cursor-default" title="BB1 EQUIP">B1</h1>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white tracking-wider whitespace-nowrap overflow-hidden">BB1 EQUIP</h1>
            <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-widest whitespace-nowrap overflow-hidden">Manager Pro</p>
          </>
        )}
      </div>
      
      {/* NAVIGATION MENU */}
      <nav className={`flex-1 py-6 space-y-3 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-4'}`}>
        
        {/* Nhóm 1: Construction */}
        <div className="mb-4 group/nav">
          {!isCollapsed && <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-2">Construction</div>}
          
          <button 
            onClick={() => setActiveModule('installDashboard')} 
            title={isCollapsed ? "Installation Dashboard" : ""}
            className={`w-full flex items-center gap-4 py-3 rounded-xl font-bold transition-all ${
              isCollapsed ? 'justify-center px-0' : 'px-4'
            } ${activeModule === 'installDashboard' ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <BarChart2 size={24} className="shrink-0" /> 
            {!isCollapsed && (
              <div className="flex flex-col text-left leading-tight text-base whitespace-nowrap overflow-hidden">
                <span>Installation</span><span className="text-xs font-normal opacity-70">Dashboard</span>
              </div>
            )}
          </button>
          
          <button 
            onClick={() => setActiveModule('equipMaster')} 
            title={isCollapsed ? "Installation Matrix" : ""}
            className={`w-full flex items-center gap-4 mt-2 py-3 rounded-xl font-bold transition-all ${
              isCollapsed ? 'justify-center px-0' : 'px-4'
            } ${activeModule === 'equipMaster' ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Database size={24} className="shrink-0" /> 
            {!isCollapsed && (
              <div className="flex flex-col text-left leading-tight text-base whitespace-nowrap overflow-hidden">
                <span>Installation</span><span className="text-xs font-normal opacity-70">Matrix</span>
              </div>
            )}
          </button>
        </div>

        {/* Nhóm 2: Maintenance */}
        <div className="pt-4 pb-2 border-t border-slate-800/50">
           {!isCollapsed && <div className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Maintenance</div>}
           <button 
             onClick={() => setActiveModule('preservation')} 
             title={isCollapsed ? "Preservation Tracker" : ""}
             className={`w-full flex items-center gap-4 py-3 rounded-xl font-bold transition-all ${
               isCollapsed ? 'justify-center px-0' : 'px-4'
             } ${activeModule === 'preservation' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
           >
             <ShieldAlert size={24} className="shrink-0" /> 
             {!isCollapsed && (
               <div className="flex flex-col text-left leading-tight text-base whitespace-nowrap overflow-hidden">
                 <span>Preservation</span><span className="text-xs font-normal opacity-70">Tracker</span>
               </div>
             )}
           </button>
        </div>

        {/* Nhóm 3: Completions */}
        <div className="pt-4 pb-2 border-t border-slate-800/50">
           {!isCollapsed && <div className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Completions</div>}
           <button 
             onClick={() => setActiveModule('completionsDashboard')} 
             title={isCollapsed ? "Completions Dashboard" : ""}
             className={`w-full flex items-center gap-4 py-3 rounded-xl font-bold transition-all ${
               isCollapsed ? 'justify-center px-0' : 'px-4'
             } ${activeModule === 'completionsDashboard' ? 'bg-[#8b5cf6] text-white shadow-lg shadow-purple-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
           >
             <PieChart size={24} className="shrink-0" /> 
             {!isCollapsed && (
               <div className="flex flex-col text-left leading-tight text-base whitespace-nowrap overflow-hidden">
                 <span>Completions</span><span className="text-xs font-normal opacity-70">Dashboard</span>
               </div>
             )}
           </button>
           
           <button 
             onClick={() => setActiveModule('itrMatrix')} 
             title={isCollapsed ? "ITR Management" : ""}
             className={`w-full flex items-center gap-4 mt-2 py-3 rounded-xl font-bold transition-all ${
               isCollapsed ? 'justify-center px-0' : 'px-4'
             } ${activeModule === 'itrMatrix' ? 'bg-[#8b5cf6] text-white shadow-lg shadow-purple-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
           >
             <FileSignature size={24} className="shrink-0" /> 
             {!isCollapsed && (
               <div className="flex flex-col text-left leading-tight text-base whitespace-nowrap overflow-hidden">
                 <span>ITR Management</span><span className="text-xs font-normal opacity-70">Inspection</span>
               </div>
             )}
           </button>
           
           <button 
             onClick={() => setActiveModule('punchlist')} 
             title={isCollapsed ? "Punchlist Log" : ""}
             className={`w-full flex items-center gap-4 mt-2 py-3 rounded-xl font-bold transition-all ${
               isCollapsed ? 'justify-center px-0' : 'px-4'
             } ${activeModule === 'punchlist' ? 'bg-[#ef4444] text-white shadow-lg shadow-red-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
           >
             <AlertOctagon size={24} className="shrink-0" /> 
             {!isCollapsed && (
               <div className="flex flex-col text-left leading-tight text-base whitespace-nowrap overflow-hidden">
                 <span>Punchlist</span><span className="text-xs font-normal opacity-70">Master Log</span>
               </div>
             )}
           </button>
        </div>
      </nav>

      {/* FOOTER - NÚT LOGOUT */}
      <div className="mt-auto p-4 border-t border-slate-800 bg-[#0b1120]">
        <button 
          onClick={handleLogout} 
          title={isCollapsed ? "Secure Log Out" : ""}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-red-500 transition-all group ${
            isCollapsed ? 'px-0' : 'px-4'
          }`}
        >
          <LogOut size={18} className={`${!isCollapsed && 'group-hover:-translate-x-1'} transition-transform shrink-0`} />
          {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Secure Log Out</span>}
        </button>
      </div>
    </aside>
  );
}