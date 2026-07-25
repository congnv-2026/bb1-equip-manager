import React from 'react';
import { Database, BarChart2, ShieldAlert, FileSignature, AlertOctagon, PieChart, LogOut } from 'lucide-react';
import { supabase } from '../supabase';

export default function Sidebar({ activeModule, setActiveModule }) {
  // Hàm xử lý đăng xuất
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shadow-2xl z-20 shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-black text-white tracking-wider">BB1 EQUIP</h1>
        <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-widest">Manager Pro</p>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-2">Construction</div>
        <button onClick={() => setActiveModule('installDashboard')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${activeModule === 'installDashboard' ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
          <BarChart2 size={24} className="min-w-[24px]" /> 
          <div className="flex flex-col text-left leading-tight text-base"><span>Installation</span><span className="text-xs font-normal opacity-70">Dashboard</span></div>
        </button>
        <button onClick={() => setActiveModule('equipMaster')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${activeModule === 'equipMaster' ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
          <Database size={24} className="min-w-[24px]" /> 
          <div className="flex flex-col text-left leading-tight text-base"><span>Installation</span><span className="text-xs font-normal opacity-70">Matrix</span></div>
        </button>

        <div className="pt-4 pb-2">
           <div className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Maintenance</div>
           <button onClick={() => setActiveModule('preservation')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${activeModule === 'preservation' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
             <ShieldAlert size={24} className="min-w-[24px]" /> 
             <div className="flex flex-col text-left leading-tight text-base"><span>Preservation</span><span className="text-xs font-normal opacity-70">Tracker</span></div>
           </button>
        </div>

        <div className="pt-4 pb-2">
           <div className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Completions</div>
           <button onClick={() => setActiveModule('completionsDashboard')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${activeModule === 'completionsDashboard' ? 'bg-[#8b5cf6] text-white shadow-lg shadow-purple-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
             <PieChart size={24} className="min-w-[24px]" /> 
             <div className="flex flex-col text-left leading-tight text-base"><span>Completions</span><span className="text-xs font-normal opacity-70">Dashboard</span></div>
           </button>
           <button onClick={() => setActiveModule('itrMatrix')} className={`w-full flex items-center gap-4 px-4 py-3 mt-2 rounded-xl font-bold transition-all ${activeModule === 'itrMatrix' ? 'bg-[#8b5cf6] text-white shadow-lg shadow-purple-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
             <FileSignature size={24} className="min-w-[24px]" /> 
             <div className="flex flex-col text-left leading-tight text-base"><span>ITR Management</span><span className="text-xs font-normal opacity-70">Inspection Records</span></div>
           </button>
           <button onClick={() => setActiveModule('punchlist')} className={`w-full flex items-center gap-4 px-4 py-3 mt-2 rounded-xl font-bold transition-all ${activeModule === 'punchlist' ? 'bg-[#ef4444] text-white shadow-lg shadow-red-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
             <AlertOctagon size={24} className="min-w-[24px]" /> 
             <div className="flex flex-col text-left leading-tight text-base"><span>Punchlist</span><span className="text-xs font-normal opacity-70">Master Log</span></div>
           </button>
        </div>
      </nav>

      {/* NÚT LOGOUT NẰM DƯỚI CÙNG */}
      <div className="mt-auto p-4 border-t border-slate-800 bg-[#0b1120]">
        <button 
          onClick={handleLogout} 
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-red-500 transition-all group"
        >
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
          Secure Log Out
        </button>
      </div>
    </aside>
  );
}