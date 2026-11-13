import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Trash2,
  Check,
  X,
  RefreshCw,
  Cloud,
  Database,
  Clock,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { AppTheme } from '../utils/theme';

interface AppSettingsScreenProps {
  onBack: () => void;
  onDeleteAccount: () => void;
  cloudSyncEnabled: boolean;
  onToggleCloudSync: (enabled: boolean) => void;
  lastSyncTime: string | null;
  isSyncing: boolean;
  onTriggerSync: () => void;
  syncIntervalSeconds?: number;
  simulatedExpired?: boolean;
  onToggleSimulatedExpired?: (expired: boolean) => void;
  simulatedStorageWarning?: boolean;
  onToggleSimulatedStorageWarning?: (val: boolean) => void;
  theme?: AppTheme;
  onToggleTheme?: (newTheme: AppTheme) => void;
}

export const AppSettingsScreen: React.FC<AppSettingsScreenProps> = ({
  onBack,
  onDeleteAccount,
  cloudSyncEnabled,
  onToggleCloudSync,
  lastSyncTime,
  isSyncing,
  onTriggerSync,
  syncIntervalSeconds = 20,
  simulatedExpired = false,
  onToggleSimulatedExpired,
  simulatedStorageWarning = false,
  onToggleSimulatedStorageWarning,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [modalType, setModalType] = useState<'password' | 'delete' | null>(null);

  // Change password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  return (
    <div className="flex-1 flex flex-col px-5 pt-3 pb-8 text-white">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white ml-auto mr-auto pr-10">
          App Settings
        </h1>
      </div>

      {/* 1. Theme Toggle Card (Light / Dark mode) */}
      <div className="mb-4 bg-[#111e33] border border-[#1f3250] rounded-2xl p-4 shadow-lg shadow-blue-950/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              theme === 'light' ? 'bg-amber-500/20 text-amber-500 shadow-md' : 'bg-indigo-500/20 text-indigo-400'
            }`}>
              {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                <span>Theme & Appearance (থিম)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                {theme === 'light' ? 'আধুনিক লাইট মোড সক্রিয় (Light Theme)' : 'ডার্ক মোড সক্রিয় (Dark Theme)'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() => onToggleTheme && onToggleTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none cursor-pointer ${
              theme === 'light' ? 'bg-amber-500' : 'bg-indigo-600'
            }`}
            title="Toggle Light and Dark Theme"
            aria-label="Toggle Light and Dark Theme"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform flex items-center justify-center ${
                theme === 'light' ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {theme === 'light' ? (
                <Sun className="w-3 h-3 text-amber-500" />
              ) : (
                <Moon className="w-3 h-3 text-indigo-700" />
              )}
            </div>
          </button>
        </div>

        {/* Segmented Picker */}
        <div className="grid grid-cols-2 gap-2 bg-[#0b1322] p-1 rounded-xl border border-[#18263e]">
          <button
            type="button"
            onClick={() => onToggleTheme && onToggleTheme('dark')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#182844] text-indigo-300 shadow-sm border border-indigo-500/30 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark Theme</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleTheme && onToggleTheme('light')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light Theme</span>
          </button>
        </div>
      </div>

      {/* Cloud Sync Quick Banner / Direct Card */}
      <div className="mb-4 bg-[#111e33] border border-blue-500/40 rounded-2xl p-4 shadow-lg shadow-blue-950/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              cloudSyncEnabled ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-slate-800 text-slate-400'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                <span>Cloud Synchronization</span>
                {cloudSyncEnabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </h4>
              <p className="text-[11px] text-slate-400">
                {cloudSyncEnabled ? `Auto-syncs every ${syncIntervalSeconds}s` : 'Periodic sync is paused'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() => onToggleCloudSync(!cloudSyncEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none ${
              cloudSyncEnabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}
            title="Toggle Cloud Synchronization"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                cloudSyncEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Sync Status and Manual Sync Trigger */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1d2d47] text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${cloudSyncEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className="text-slate-400">
              {isSyncing ? 'Syncing metadata...' : lastSyncTime ? `Last synced: ${lastSyncTime}` : 'Ready to sync'}
            </span>
          </div>

          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 rounded hover:bg-blue-500/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* 1 Month Free Trial Expiration Simulation (Tester Mode) */}
      {onToggleSimulatedExpired && (
        <div className="mb-4 bg-[#181926] border border-amber-500/40 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-white flex items-center gap-1.5">
                  <span>১ মাস ট্রায়াল শেষ টেস্ট (Simulate 1-Month Expired)</span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  {simulatedExpired ? 'লকড স্টেট সক্রিয় (১০০ টাকা পেমেন্ট প্রয়োজন)' : 'স্বাভাবিক ট্রায়াল সক্রিয়'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleSimulatedExpired(!simulatedExpired)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none ${
                simulatedExpired ? 'bg-rose-600' : 'bg-slate-700'
              }`}
              title="Toggle Expired Trial State for Testing"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  simulatedExpired ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* 90% Storage Limit Warning Simulation (Tester Mode) */}
      {onToggleSimulatedStorageWarning && (
        <div className="mb-4 bg-[#1e1714] border border-amber-500/50 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-white flex items-center gap-1.5">
                  <span>৯০% স্টোরেজ ওয়ার্নিং টেস্ট (Simulate 90% Storage Limit)</span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  {simulatedStorageWarning ? 'সতর্কবার্তা সক্রিয় (920 GB / 92% Used)' : 'স্বাভাবিক স্টোরেজ'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleSimulatedStorageWarning(!simulatedStorageWarning)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none ${
                simulatedStorageWarning ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              title="Toggle 90% Storage Limit Warning for Testing"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  simulatedStorageWarning ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Settings List */}
      <div className="space-y-3.5">
        {/* 1. Change Password */}
        <div
          onClick={() => setModalType('password')}
          className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#14223d] border border-[#213a69] flex items-center justify-center text-[#3b82f6] shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-white">Change Password</h4>
              <p className="text-xs text-slate-400 mt-0.5">Update your account password</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </div>

        {/* 2. Delete Account */}
        <div
          onClick={() => setModalType('delete')}
          className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#2a141a] border border-[#4d1f2b] flex items-center justify-center text-[#f87171] shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-white">Delete Account</h4>
              <p className="text-xs text-slate-400 mt-0.5">Permanently remove your account and files</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </div>
      </div>

      {/* MODALS */}
      {modalType === 'password' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-[#20324e] rounded-3xl p-5 max-w-sm w-full space-y-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Change Password</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-slate-400">Current Password</label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-[#162338] border border-[#273d61] rounded-xl px-3 py-2 text-white text-sm mt-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">New Password</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#162338] border border-[#273d61] rounded-xl px-3 py-2 text-white text-sm mt-1 focus:outline-none"
                />
              </div>
            </div>

            {pwdMsg && <p className="text-xs text-emerald-400">{pwdMsg}</p>}

            <button
              onClick={() => {
                if (newPwd.length >= 6) {
                  setPwdMsg('Password updated successfully!');
                  setTimeout(() => setModalType(null), 1200);
                } else {
                  setPwdMsg('Password must be at least 6 characters.');
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md"
            >
              Update Password
            </button>
          </div>
        </div>
      )}

      {modalType === 'delete' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-rose-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center text-white">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Delete Account?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This action cannot be undone. All your uploaded files, favorites, and storage will be permanently wiped.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setModalType(null)}
                className="flex-1 bg-[#162338] hover:bg-[#20324e] text-slate-300 py-2.5 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setModalType(null);
                  onDeleteAccount();
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-rose-950"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
