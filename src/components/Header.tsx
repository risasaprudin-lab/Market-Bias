import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Activity,
  Zap,
  Globe,
  Clock,
  Settings,
  LogIn,
  LogOut,
  User as UserIcon,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  workerUrl: string;
  isOnline: boolean;
  lastUpdated: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeTab: 'flow' | 'currency' | 'journal' | 'setup';
  setActiveTab: (tab: 'flow' | 'currency' | 'journal' | 'setup') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onOpenSettings,
  workerUrl,
  isOnline,
  lastUpdated,
  onRefresh,
  isRefreshing,
  activeTab,
  setActiveTab,
}) => {
  const [wibTime, setWibTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setWibTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
      setUtcTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' UTC'
      );
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0b101d] rounded-[10px] flex items-center justify-center">
                <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                  GOGOCURRENCY
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  FLOW 20
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Macro, Commodity & Crypto Momentum</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'flow'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              🌊 Flow Monitor (20 Prime)
            </button>
            <button
              onClick={() => setActiveTab('currency')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'currency'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              📊 Currency Strength
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'journal'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              📓 Journal & Alerts
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'setup'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              ⚡ Pine & Webhook
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3">
            {/* Clocks */}
            <div className="hidden lg:flex items-center space-x-3 text-[11px] font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{wibTime}</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1 text-slate-400">
                <Globe className="w-3 h-3 text-slate-400" />
                <span>{utcTime}</span>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              title="Perbarui Data"
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700/60"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Settings Trigger */}
            <button
              onClick={onOpenSettings}
              title="Pengaturan Feed & Worker"
              className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700/60"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center space-x-2 bg-slate-800/80 pl-2 pr-3 py-1 rounded-xl border border-slate-700/60">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-emerald-500/50"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-[11px] font-medium text-slate-200 truncate max-w-[100px]">
                    {user.displayName?.split(' ')[0] || 'Trader'}
                  </div>
                  <div className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Cloud Sync</span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="text-slate-400 hover:text-rose-400 ml-1 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-medium hover:brightness-110 transition shadow-md shadow-indigo-600/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-800/60 no-scrollbar">
          <button
            onClick={() => setActiveTab('flow')}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
              activeTab === 'flow' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            🌊 Flow 20
          </button>
          <button
            onClick={() => setActiveTab('currency')}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
              activeTab === 'currency' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            📊 Strength
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
              activeTab === 'journal' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            📓 Journal
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${
              activeTab === 'setup' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            ⚡ Webhook
          </button>
        </div>
      </div>
    </header>
  );
};
