import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Matrix from './pages/Matrix';
import Preservation from './pages/Preservation';
import ItrMatrix from './pages/ItrMatrix';
import Punchlist from './pages/Punchlist';
import CompletionsDashboard from './pages/CompletionsDashboard';
import Login from './pages/Login';

function App() {
  const [session, setSession] = useState(null);
  // Khởi tạo trạng thái Khách ngay từ lúc mở web bằng cách đọc localStorage
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('bb1_guest_mode') === 'true');
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
      // Nếu Admin đăng xuất, tự động xóa luôn phiên Khách (nếu có)
      if (!session) {
        localStorage.removeItem('bb1_guest_mode');
        setIsGuest(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Nếu đang tải dữ liệu kiểm tra bảo mật, hiện màn hình trắng nhẹ nhàng
  if (isInitializing) {
    return <div className="h-screen w-screen bg-[#0f172a]"></div>;
  }

  // NẾU CHƯA ĐĂNG NHẬP VÀ CŨNG KHÔNG PHẢI KHÁCH -> BẮT BUỘC Ở MÀN HÌNH LOGIN
  if (!session && !isGuest) {
    return (
      <Login 
        onGuestLogin={() => setIsGuest(true)} 
      />
    );
  }

  // NẾU ĐÃ ĐĂNG NHẬP (ADMIN) HOẶC LÀ KHÁCH -> VÀO APP BÌNH THƯỜNG
  return (
    // THAY ĐỔI QUAN TRỌNG: Đổi w-screen thành min-w-[1366px] để kích hoạt trải nghiệm "Zoom Sa bàn" trên Mobile
    <div className="flex h-screen min-w-[1366px] bg-slate-50 font-sans overflow-hidden">
      
      {/* Truyền thêm cờ isGuest vào Sidebar để sau này bạn có thể ẩn/hiện menu tùy quyền */}
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} isGuest={isGuest} />
      
      <main className="flex-1 flex flex-col h-full bg-slate-50 relative min-w-0 overflow-hidden">
        {/* Truyền cờ isGuest vào các trang để vô hiệu hóa nút Thêm/Sửa/Xóa nếu cần */}
        {activeModule === 'installDashboard' && <Dashboard isGuest={isGuest} />}
        {activeModule === 'equipMaster' && <Matrix isGuest={isGuest} />}
        {activeModule === 'preservation' && <Preservation isGuest={isGuest} />}
        {activeModule === 'itrMatrix' && <ItrMatrix isGuest={isGuest} />}
        {activeModule === 'punchlist' && <Punchlist isGuest={isGuest} />}
        {activeModule === 'completionsDashboard' && <CompletionsDashboard isGuest={isGuest} />}
      </main>
    </div>
  );
}

export default App;