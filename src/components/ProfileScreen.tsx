import React from 'react';
import {
  Edit3,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';
import { UserProfile, StorageUsage } from '../types';

interface ProfileScreenProps {
  user: UserProfile;
  storage: StorageUsage;
  websiteName?: string;
  onOpenEditProfile: () => void;
  onOpenAppSettings: () => void;
  onOpenAdminPanel?: () => void;
  onSignOut: () => void;
  onOpenAnalysis?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  storage,
  websiteName = 'Bashar Cloud',
  onOpenEditProfile,
  onOpenAppSettings,
  onOpenAdminPanel,
  onSignOut,
  onOpenAnalysis,
}) => {
  const percentUsed = Math.round((storage.usedGB / storage.totalGB) * 100);
  const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User');
  const initial = (displayName.charAt(0) || 'U').toUpperCase();

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 text-white space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
          Profile
        </h1>
        <p className="text-[12px] text-slate-400">
          Manage your account on {websiteName}
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-[#121c2c] border border-[#1f3049] rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/80 shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 ring-2 ring-blue-500/60 shadow-lg flex items-center justify-center text-white font-bold text-xl">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white tracking-tight">{displayName}</h3>
            {user.phone && <p className="text-xs text-slate-300 mt-0.5">{user.phone}</p>}
            {user.email && <p className="text-xs text-slate-400 truncate">{user.email}</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditProfile}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#182740] transition-colors"
          title="Edit Profile"
        >
          <Edit3 className="w-5 h-5" />
        </button>
      </div>

      {/* Storage usage breakdown card */}
      <div
        onClick={onOpenAnalysis}
        className={`bg-[#121c2c] border border-[#1f3049] rounded-2xl p-4 space-y-3 ${
          onOpenAnalysis ? 'cursor-pointer hover:border-blue-500/40 hover:bg-[#152338] transition-all' : ''
        }`}
        title={onOpenAnalysis ? 'Tap to view Storage Analysis' : undefined}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <span>Storage usage</span>
            {onOpenAnalysis && <span className="text-[10px] text-blue-400 font-normal">→ Detailed</span>}
          </div>
          <span className="text-slate-400">{percentUsed}% used</span>
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight">
          {storage.usedGB} GB of {storage.totalGB} GB
        </h3>

        {/* Progress bar with color breakdown */}
        <div className="w-full h-2.5 bg-[#1a273b] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-[#3b82f6]"
            style={{ width: `${(storage.imagesGB / storage.totalGB) * 100}%` }}
            title="Images"
          />
          <div
            className="h-full bg-[#06b6d4]"
            style={{ width: `${(storage.audiosMB / (storage.totalGB * 1024)) * 100}%` }}
            title="Audios"
          />
          <div
            className="h-full bg-[#a855f7]"
            style={{ width: `${(storage.videosGB / storage.totalGB) * 100}%` }}
            title="Videos"
          />
        </div>

        {/* Legend */}
        <div className="pt-2 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
              <span className="text-slate-300">Images</span>
            </div>
            <span className="font-medium text-white">{storage.imagesGB} GB</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
              <span className="text-slate-300">Audios</span>
            </div>
            <span className="font-medium text-white">{storage.audiosMB} MB</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
              <span className="text-slate-300">Videos</span>
            </div>
            <span className="font-medium text-white">{storage.videosGB} GB</span>
          </div>
        </div>
      </div>

      {/* Admin Control Panel Card */}
      {onOpenAdminPanel && (
        <button
          type="button"
          onClick={onOpenAdminPanel}
          className="w-full bg-[#111e33] hover:bg-[#162744] border border-blue-500/40 rounded-2xl p-4 flex items-center justify-between transition-colors shadow-md shadow-blue-950/20"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-[15px] font-semibold text-white flex items-center gap-1.5">
                <span>Admin Panel</span>
                <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase">Master</span>
              </h4>
              <p className="text-xs text-slate-400">Change website name, logo & view user passwords</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      )}

      {/* App Settings Card */}
      <button
        type="button"
        onClick={onOpenAppSettings}
        className="w-full bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl p-4 flex items-center justify-between transition-colors shadow-sm"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#14223d] border border-[#213a69] flex items-center justify-center text-[#3b82f6] shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-[15px] font-semibold text-white">App Settings</h4>
            <p className="text-xs text-slate-400">Cloud synchronization & security</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500" />
      </button>

      {/* Sign Out Card */}
      <div className="bg-[#121c2c] border border-[#1f3049] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-between p-4 hover:bg-[#162338] transition-colors text-rose-400"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-rose-400" />
            <span className="text-sm font-medium">Sign out</span>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400" />
        </button>
      </div>
    </div>
  );
};
