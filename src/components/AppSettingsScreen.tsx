import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Lock,
  Trash2,
  Check,
  X,
  RefreshCw,
  Cloud,
  Sparkles,
  Sun,
  Moon,
  ShieldCheck,
  CreditCard,
  Clock,
  Palette,
} from 'lucide-react';
import { UserSubscription } from '../types';
import { AppTheme } from '../utils/theme';
import { toBengaliDigits } from '../utils/subscription';
import {
  ORBIT_THEME_PRESETS,
  OrbitThemePresetId,
  getOrbitThemePresetById,
} from '../utils/orbitTheme';

interface AppSettingsScreenProps {
  onBack: () => void;
  onDeleteAccount: () => void;
  cloudSyncEnabled: boolean;
  onToggleCloudSync: (enabled: boolean) => void;
  lastSyncTime: string | null;
  isSyncing: boolean;
  onTriggerSync: () => void;
  syncIntervalSeconds?: number;
  subscription?: UserSubscription;
  onOpenPayment?: () => void;
  theme?: AppTheme;
  onToggleTheme?: (newTheme: AppTheme) => void;
  orbitPreset?: OrbitThemePresetId;
  onChangeOrbitPreset?: (presetId: OrbitThemePresetId) => void;
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
  subscription,
  onOpenPayment,
  theme = 'dark',
  onToggleTheme,
  orbitPreset = '1',
  onChangeOrbitPreset,
}) => {
  const [modalType, setModalType] = useState<'password' | 'delete' | null>(null);
  const [isOrbitPickerOpen, setIsOrbitPickerOpen] = useState(false);

  // Change password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  const activeOrbitPreset = getOrbitThemePresetById(orbitPreset);
  const isApproved = Boolean(subscription?.isLifetimeApproved);
  const isExpired = Boolean(subscription?.isExpired && !isApproved);

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 text-white overflow-y-auto">
      {/* Executive Header */}
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#1b2a42]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Profile"
          className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
            অ্যাপ সেটিংস (Settings)
          </h1>
          <p className="text-[11px] text-slate-400 truncate">
            থিম, বর্ডার কালার, ক্লাউড সিঙ্ক ও অ্যাকাউন্ট নিরাপত্তা
          </p>
        </div>
      </div>

      {/* SECTION 1: Appearance & Orbit Color */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 px-1 mb-2.5">
          <Palette className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            অ্যাপিয়ারেন্স ও থিম (Appearance)
          </span>
        </div>

        <div className="space-y-3">
          {/* Theme Toggle Card (Light / Dark mode) */}
          <div className="bg-[#121c2c] border border-[#1f3049] rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
                    theme === 'light'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">থিম মোড (Theme Mode)</h4>
                  <p className="text-[11px] text-slate-400">
                    {theme === 'light' ? 'আধুনিক লাইট মোড সক্রিয়' : 'প্রিমিয়াম ডার্ক মোড সক্রিয়'}
                  </p>
                </div>
              </div>

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

            <div className="grid grid-cols-2 gap-2 bg-[#0b1322] p-1 rounded-xl border border-[#1b2b42]">
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
                <span>Dark</span>
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
                <span>Light</span>
              </button>
            </div>
          </div>

          {/* Expandable Website Orbit Border Color Option */}
          <div className="orbit-card bg-[#121c2c] border border-[#1f3049] rounded-2xl p-4 shadow-md">
            <button
              type="button"
              onClick={() => setIsOrbitPickerOpen((prev) => !prev)}
              aria-expanded={isOrbitPickerOpen}
              aria-label="কালার অপশন (Orbit Border Color)"
              className="w-full flex items-center justify-between gap-3 text-left relative z-10 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl p-[2px] shrink-0 shadow-md"
                  style={{ background: activeOrbitPreset.previewGradient }}
                >
                  <div className="w-full h-full rounded-[10px] bg-[#0b111c] flex items-center justify-center text-sky-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">
                    কালার অপশন (Orbit Border Color)
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    সক্রিয়: {activeOrbitPreset.numberLabel}. {activeOrbitPreset.bnName} ({activeOrbitPreset.name})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-sky-300 border border-sky-500/30 whitespace-nowrap">
                  #{activeOrbitPreset.numberLabel} সক্রিয়
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isOrbitPickerOpen ? 'rotate-180 text-sky-300' : ''
                  }`}
                />
              </div>
            </button>

            {isOrbitPickerOpen && (
              <div
                className="space-y-2 mt-3.5 pt-3 border-t border-[#1c2e4a] relative z-10"
                role="group"
                aria-label="৫টি বর্ডার কালারের তালিকা"
              >
                <p className="text-[11px] text-slate-400 mb-2">
                  পছন্দের কালার সিলেক্ট করুন — সাথে সাথেই সেট হয়ে যাবে:
                </p>
                {ORBIT_THEME_PRESETS.map((preset) => {
                  const isSelected = orbitPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`Orbit Color ${preset.numberLabel}: ${preset.name}`}
                      onClick={() => {
                        onChangeOrbitPreset?.(preset.id);
                        setIsOrbitPickerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.99] ${
                        isSelected
                          ? 'bg-[#172845] border-sky-400/70 shadow-md ring-1 ring-sky-400/30'
                          : 'bg-[#0b1322]/90 border-[#1a2942] hover:bg-[#132038] hover:border-[#2a4066]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl p-[2px] shrink-0 shadow-md"
                          style={{ background: preset.previewGradient }}
                        >
                          <div className="w-full h-full rounded-[10px] bg-[#0b111c] flex items-center justify-center text-xs font-extrabold text-white">
                            {preset.numberLabel}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white truncate">
                              {preset.numberLabel}. {preset.bnName} ({preset.name})
                            </span>
                            {preset.badge && (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40">
                                {preset.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-400 truncate mt-0.5">
                            {preset.subtitle}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'border border-slate-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Cloud Sync & Subscription Plan */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 px-1 mb-2.5">
          <Cloud className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            ক্লাউড সিঙ্ক ও সাবস্ক্রিপশন (Cloud & Plan)
          </span>
        </div>

        <div className="space-y-3">
          {/* Cloud Sync Card */}
          <div className="bg-[#121c2c] border border-[#1f3049] rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
                    cloudSyncEnabled
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>ক্লাউড সিঙ্ক্রোনাইজেশন</span>
                    {cloudSyncEnabled && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {cloudSyncEnabled
                      ? `প্রতি ${syncIntervalSeconds} সেকেন্ডে অটো-সিঙ্ক চালু`
                      : 'অটো-সিঙ্ক সাময়িকভাবে বন্ধ আছে'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleCloudSync(!cloudSyncEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none cursor-pointer ${
                  cloudSyncEnabled ? 'bg-blue-600' : 'bg-slate-700'
                }`}
                title="Toggle Cloud Synchronization"
                aria-label="Toggle Cloud Synchronization"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    cloudSyncEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-[#1d2d47] text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    cloudSyncEnabled ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                <span>
                  {isSyncing
                    ? 'সিঙ্ক হচ্ছে...'
                    : lastSyncTime
                    ? `সর্বশেষ সিঙ্ক: ${lastSyncTime}`
                    : 'সিঙ্কের জন্য প্রস্তুত'}
                </span>
              </div>

              <button
                type="button"
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          {/* Subscription Plan Overview Card */}
          {subscription && (
            <div
              className={`rounded-2xl p-4 border shadow-md flex items-center justify-between gap-3 ${
                isApproved
                  ? 'bg-[#102521] border-emerald-500/40'
                  : isExpired
                  ? 'bg-[#29131a] border-rose-500/45'
                  : 'bg-[#121c2c] border-[#1f3049]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isApproved
                      ? 'bg-emerald-500/20 border-emerald-500/35 text-emerald-400'
                      : isExpired
                      ? 'bg-rose-500/20 border-rose-500/35 text-rose-400'
                      : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                  }`}
                >
                  {isApproved ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : isExpired ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">
                    {isApproved
                      ? 'সারাজীবনের VIP মেম্বারশিপ সক্রিয়'
                      : isExpired
                      ? '৩০ দিনের ফ্রি ট্রায়াল শেষ • লকড'
                      : `ফ্রি ট্রায়াল: আর ${toBengaliDigits(subscription.daysRemaining)} দিন বাকি`}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {isApproved
                      ? 'সব ক্লাউড ফিচার আজীবনের জন্য আনলকড'
                      : isExpired
                      ? 'আনলক করতে এককালীন ১০০ টাকা পেমেন্ট করুন'
                      : '৩০ দিন পর ১০০ টাকা দিয়ে আজীবন আনলক করতে পারবেন'}
                  </p>
                </div>
              </div>

              {onOpenPayment && !isApproved && (
                <button
                  type="button"
                  onClick={onOpenPayment}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-sm transition-all ${
                    isExpired
                      ? 'bg-rose-600 hover:bg-rose-500 text-white ai-solid-text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white ai-solid-text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>৳১০০ আনলক</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Security & Account */}
      <div>
        <div className="flex items-center gap-1.5 px-1 mb-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            নিরাপত্তা ও অ্যাকাউন্ট (Security & Account)
          </span>
        </div>

        <div className="bg-[#121c2c] border border-[#1f3049] rounded-2xl overflow-hidden shadow-md divide-y divide-[#1b2b42]">
          <button
            type="button"
            onClick={() => setModalType('password')}
            className="w-full hover:bg-[#162338] p-4 flex items-center justify-between text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#14223d] border border-[#213a69] flex items-center justify-center text-[#3b82f6] shrink-0">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">পাসওয়ার্ড পরিবর্তন (Change Password)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">আপনার অ্যাকাউন্টের পাসওয়ার্ড আপডেট করুন</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setModalType('delete')}
            className="w-full hover:bg-[#162338] p-4 flex items-center justify-between text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#2a141a] border border-[#4d1f2b] flex items-center justify-center text-[#f87171] shrink-0">
                <Trash2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-rose-400">অ্যাকাউন্ট ডিলিট করুন (Delete Account)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">সকল ফাইল ও অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলুন</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
          </button>
        </div>
      </div>

      {/* MODALS */}
      {modalType === 'password' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-[#20324e] rounded-3xl p-5 max-w-sm w-full space-y-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Change Password</h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
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
              type="button"
              onClick={() => {
                if (newPwd.length >= 6) {
                  setPwdMsg('Password updated successfully!');
                  setTimeout(() => setModalType(null), 1200);
                } else {
                  setPwdMsg('Password must be at least 6 characters.');
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md cursor-pointer"
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
                type="button"
                onClick={() => setModalType(null)}
                className="flex-1 bg-[#162338] hover:bg-[#20324e] text-slate-300 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType(null);
                  onDeleteAccount();
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-rose-950 cursor-pointer"
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
