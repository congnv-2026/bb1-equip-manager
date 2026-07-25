import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError("Sai email hoặc mật khẩu. Vui lòng thử lại!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] bg-opacity-95" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)' }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-[#4c1d95] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 translate-x-4 -translate-y-4">
            <ShieldCheck size={120} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-widest relative z-10">BB1 EQUIP</h1>
          <p className="text-purple-200 font-bold text-sm tracking-widest mt-1 uppercase relative z-10">Manager Pro</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            System Login
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-600 text-sm font-bold">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-slate-400" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  placeholder="admin@bb1.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-black uppercase tracking-wider text-sm shadow-lg transition-all ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#4c1d95] hover:bg-[#5b21b6] hover:shadow-purple-900/30'}`}
            >
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs font-medium text-slate-400">
            Authorized Personnel Only. <br/> Access is logged and monitored.
          </p>
        </div>
      </div>
    </div>
  );
}