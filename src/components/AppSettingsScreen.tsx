import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Zap, Lock, Shield, Trash2, Check, X, RefreshCw, Cloud, Database } from 'lucide-react';

interface AppSettingsScreenProps {
  onBack: () => void;
  onDeleteAccount: () => void;
  cloudSyncEnabled: boolean;
  onToggleCloudSync: (enabled: boolean) => void;
  lastSyncTime: string | null;
  isSyncing: boolean;
  onTriggerSync: () => void;
  syncIntervalSeconds?: number;
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
}) => {
  const [modalType, setModalType] = useState<'backup' | 'password' | '2fa' | 'delete' | null>(null);

  // Backup & sync settings state
  const [autoUploadPhotos, setAutoUploadPhotos] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [backgroundSync, setBackgroundSync] = useState(true);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

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
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
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

      {/* Settings List matching Screenshot 8 */}
      <div className="space-y-3.5">
        {/* 1. Backup & Sync */}
        <div
          onClick={() => setModalType('backup')}
          className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#14223d] border border-[#213a69] flex items-center justify-center text-[#3b82f6] shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-white">Backup & Sync</h4>
              <p className="text-xs text-slate-400 mt-0.5">Manage auto upload and network settings</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </div>

        {/* 2. Change Password */}
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

        {/* 3. Two-Step Verification */}
        <div
          onClick={() => setModalType('2fa')}
          className="bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0f2a24] border border-[#194b3e] flex items-center justify-center text-[#10b981] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-white">Two-Step Verification</h4>
              <p className="text-xs text-slate-400 mt-0.5">Add extra security</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </div>

        {/* 4. Delete Account */}
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
              <p className="text-xs text-slate-400 mt-0.5">Permanently remove your GP Cloud account</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </div>
      </div>

      {/* Modals for settings */}
      {modalType === 'backup' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-[#20324e] rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Backup & Sync Settings</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cloud Sync Provider Mock Status Box */}
            <div className="bg-[#162338] border border-[#253959] rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-white">Storage Provider Sync</span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleCloudSync(!cloudSyncEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                    cloudSyncEnabled ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      cloudSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                Periodically synchronizes local files, folders, and profile state with simulated cloud storage persistence.
              </p>

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-slate-400">
                  {lastSyncTime ? `Synced: ${lastSyncTime}` : 'Not synced yet'}
                </span>
                <button
                  type="button"
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                  className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Auto Upload Photos</p>
                  <p className="text-xs text-slate-400">Sync camera gallery automatically</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoUploadPhotos}
                  onChange={(e) => setAutoUploadPhotos(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Upload on Wi-Fi Only</p>
                  <p className="text-xs text-slate-400">Save mobile cellular data</p>
                </div>
                <input
                  type="checkbox"
                  checked={wifiOnly}
                  onChange={(e) => setWifiOnly(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Background Sync</p>
                  <p className="text-xs text-slate-400">Keep files synchronized continuously</p>
                </div>
                <input
                  type="checkbox"
                  checked={backgroundSync}
                  onChange={(e) => setBackgroundSync(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded"
                />
              </div>
            </div>

            <button
              onClick={() => setModalType(null)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {modalType === 'password' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-[#20324e] rounded-3xl p-5 max-w-sm w-full space-y-4">
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
                  placeholder="At least 8 characters"
                  className="w-full bg-[#162338] border border-[#273d61] rounded-xl px-3 py-2 text-white text-sm mt-1 focus:outline-none"
                />
              </div>

              {pwdMsg && <p className="text-xs text-emerald-400">{pwdMsg}</p>}

              <button
                type="button"
                onClick={() => {
                  if (newPwd.length < 8) {
                    alert('New password must be at least 8 characters');
                    return;
                  }
                  setPwdMsg('Password updated successfully!');
                  setTimeout(() => setModalType(null), 800);
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm mt-2"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === '2fa' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-[#20324e] rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Two-Step Verification</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When enabled, signing in from an untrusted device requires an SMS verification code sent to your Grameenphone mobile number.
            </p>

            <div className="flex items-center justify-between bg-[#162338] p-3 rounded-xl">
              <span className="text-sm font-medium text-white">SMS 2-Step Verification</span>
              <button
                type="button"
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  twoFactorEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <button
              onClick={() => setModalType(null)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {modalType === 'delete' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-rose-500/40 rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white text-center">Delete Account?</h3>
            <p className="text-xs text-slate-300 text-center leading-relaxed">
              This action will permanently delete your GP Cloud account, cloud storage data, photos, and files. This cannot be undone.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType(null);
                  onDeleteAccount();
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 rounded-xl text-xs"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
