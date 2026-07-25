import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Matrix from './pages/Matrix';
import Preservation from './pages/Preservation';
import ItrMatrix from './pages/ItrMatrix';
import Punchlist from './pages/Punchlist';
import CompletionsDashboard from './pages/CompletionsDashboard';
import Login from './pages/Login'; // Kéo màn hình Login vào

function App() {
  const [session, setSession] = useState(null);
  const [activeModule, setActiveModule] = useState('completionsDashboard');
  const [isInitializing, setIsInitializing] = useState(true);

  // Kiểm tra phiên đăng nhập liên tục
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Nếu đang tải dữ liệu kiểm tra bảo mật, hiện màn hình trắng nhẹ nhàng
  if (isInitializing) {
    return <div className="h-screen w-screen bg-[#0f172a]"></div>;
  }

  // NẾU CHƯA ĐĂNG NHẬP -> CHỈ ĐƯỢC THẤY MÀN HÌNH LOGIN
  if (!session) {
    return <Login />;
  }

  // NẾU ĐÃ ĐĂNG NHẬP -> VÀO APP BÌNH THƯỜNG
  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      
      <main className="flex-1 flex flex-col h-full bg-slate-50 relative min-w-0 overflow-hidden">
        {activeModule === 'installDashboard' && <Dashboard />}
        {activeModule === 'equipMaster' && <Matrix />}
        {activeModule === 'preservation' && <Preservation />}
        {activeModule === 'itrMatrix' && <ItrMatrix />}
        {activeModule === 'punchlist' && <Punchlist />}
        {activeModule === 'completionsDashboard' && <CompletionsDashboard />}
      </main>
    </div>
  );
}

export default App;