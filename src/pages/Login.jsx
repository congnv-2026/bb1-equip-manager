import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Lock, Mail, AlertCircle, ShieldCheck, Eye, EyeOff, UserCheck, Loader2 } from 'lucide-react';

export default function Login({ onGuestLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Bắt lỗi thông minh hơn
      if (error.message.includes("Invalid login credentials")) {
        setError("Email hoặc mật khẩu không chính xác!");
      } else {
        setError("Có lỗi xảy ra. Vui lòng thử lại!");
      }
    }
    setLoading(false);
  };

  const handleGuestAccess = () => {
    setGuestLoading(true);
    // Hiệu ứng delay giả nhỏ để tạo cảm giác hệ thống đang xử lý thiết lập phiên Khách
    setTimeout(() => {
      localStorage.setItem('bb1_guest_mode', 'true');
      if (onGuestLogin) {
        onGuestLogin();
      } else {
        window.location.reload();
      }
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] bg-opacity-95" 
         style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)' }}>
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#4c1d95] to-[#6d28d9] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 translate-x-4 -translate-y-4 transition-transform duration-700 hover:rotate-12">
            <ShieldCheck size={120} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-widest relative z-10 drop-shadow-md">BB1 EQUIP</h1>
          <p className="text-purple-200 font-bold text-sm tracking-widest mt-1 uppercase relative z-10 opacity-90">Manager Pro</p>
        </div>

        {/* Body Section */}
        <div className="p-8">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            Hệ thống Đăng nhập
          </h2>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3 text-red-700 text-sm font-semibold animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Admin Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Email Quản trị viên</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-purple-600">
                  <Mail size={18} className="text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                </div>
                <input 
                  type="email" 
                  required
                  disabled={loading || guestLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all disabled:opacity-60"
                  placeholder="admin@bb1.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Mật khẩu</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  disabled={loading || guestLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all disabled:opacity-60"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  tabIndex="-1"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || guestLoading}
              className={`w-full py-3.5 rounded-xl text-white font-black uppercase tracking-wider text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'bg-purple-400 cursor-not-allowed' : 'bg-[#4c1d95] hover:bg-[#5b21b6] hover:shadow-purple-900/40 hover:-translate-y-0.5'}`}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang xác thực...
                </>
              ) : 'Đăng nhập (Admin)'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-semibold uppercase tracking-widest">Hoặc</span>
            </div>
          </div>

          {/* Guest Login Button */}
          <button 
            type="button"
            onClick={handleGuestAccess}
            disabled={loading || guestLoading}
            className={`w-full py-3 rounded-xl border-2 font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${guestLoading ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 active:scale-[0.98]'}`}
          >
            {guestLoading ? (
               <>
                 <Loader2 size={18} className="animate-spin text-slate-400" />
                 Đang thiết lập...
               </>
            ) : (
               <>
                 <UserCheck size={18} className="text-emerald-600" />
                 Vào xem với tư cách Khách
               </>
            )}
          </button>

          <p className="mt-8 text-center text-xs font-medium text-slate-400 leading-relaxed">
            Hệ thống được giám sát & ghi nhật ký truy cập.<br/>
            © 2024 BB1 Equipment Management.
          </p>
        </div>
      </div>
    </div>
  );
}