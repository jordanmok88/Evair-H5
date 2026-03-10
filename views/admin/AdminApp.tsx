import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, LogOut, LogIn, Shield, AlertTriangle } from 'lucide-react';
import {
  supabaseConfigured,
  adminLogin,
  adminLogout,
  getAdminSession,
} from '../../services/supabase';
import AdminNotifications from './AdminNotifications';
import AdminChat from './AdminChat';

type AdminView = 'notifications' | 'chat';

const AdminApp: React.FC = () => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeView, setActiveView] = useState<AdminView>('notifications');

  const isDemoMode = !supabaseConfigured;

  useEffect(() => {
    if (isDemoMode) {
      setIsAuthed(true);
      setLoading(false);
      return;
    }
    getAdminSession().then(session => {
      setIsAuthed(!!session);
      setLoading(false);
    });
  }, [isDemoMode]);

  const handleLogin = async () => {
    setLoginError('');
    try {
      await adminLogin(email, password);
      setIsAuthed(true);
    } catch (e: any) {
      setLoginError(e.message || 'Login failed');
    }
  };

  const handleLogout = async () => {
    if (!isDemoMode) await adminLogout();
    setIsAuthed(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
              <Shield size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Evair Admin</h1>
            <p className="text-slate-500 mt-1.5">Sign in to manage notifications & support</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] mb-4 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              placeholder="admin@evairdigital.com"
            />
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] mb-5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              placeholder="••••••••"
            />
            {loginError && <p className="text-red-500 text-sm mb-3 font-medium">{loginError}</p>}
            <button
              onClick={handleLogin}
              className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold text-[15px] shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Sign In
            </button>
          </div>

          <button
            onClick={() => { window.location.hash = ''; window.location.reload(); }}
            className="block mx-auto mt-6 text-sm text-slate-400 hover:text-orange-500 font-medium transition-colors"
          >
            &larr; Back to Customer App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0 h-screen sticky top-0">
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900">Evair Admin</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Management Portal</p>
        </div>

        {isDemoMode && (
          <div className="mx-3 mt-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={13} className="text-amber-600" />
              <span className="text-[11px] font-bold text-amber-700">Demo Mode</span>
            </div>
            <p className="text-[10px] text-amber-600 leading-relaxed">
              Supabase not configured. Changes won't persist. See <code className="font-mono">supabase/SETUP.md</code> to connect.
            </p>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveView('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all ${
              activeView === 'notifications'
                ? 'bg-orange-50 text-orange-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bell size={18} />
            Notifications
          </button>
          <button
            onClick={() => setActiveView('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all ${
              activeView === 'chat'
                ? 'bg-orange-50 text-orange-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare size={18} />
            Live Chat
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          {!isDemoMode && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          )}
          <button
            onClick={() => { window.location.hash = ''; window.location.reload(); }}
            className="w-full text-xs text-slate-400 hover:text-orange-500 mt-2 transition-colors"
          >
            &larr; Back to Customer App
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        {activeView === 'notifications' && <AdminNotifications />}
        {activeView === 'chat' && <AdminChat />}
      </main>
    </div>
  );
};

export default AdminApp;
