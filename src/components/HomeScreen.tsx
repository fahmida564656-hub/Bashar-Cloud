import React from 'react';
import { Search, Bell, HardDrive, Clock, Image as ImageIcon, Video, FileText, Music, Trash2, Upload, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';
import { GPCloudLogo } from './GPCloudLogo';
import { StorageUsage, FileType } from '../types';

interface HomeScreenProps {
  storage: StorageUsage;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onSelectCategory: (type: FileType) => void;
  onOpenRecycleBin: () => void;
  onOpenUpload: () => void;
  onOpenAnalysis: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  storage,
  onOpenSearch,
  onOpenNotifications,
  onSelectCategory,
  onOpenRecycleBin,
  onOpenUpload,
  onOpenAnalysis,
}) => {
  const hasFiles = storage.usedGB > 0 || (storage.imagesCount + storage.videosCount + storage.audiosCount + storage.docsCount > 0);
  const usedSpaceText = hasFiles ? `${storage.usedGB} GB` : '0 B';
  const availableSpaceText = hasFiles ? `${(storage.totalGB - storage.usedGB).toFixed(2)} GB` : '100 GB';
  const percentUsed = hasFiles ? Math.round((storage.usedGB / storage.totalGB) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GPCloudLogo size="md" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
              GP Cloud
            </h1>
            <p className="text-[12px] text-slate-400">
              Manage all your files in one place
            </p>
          </div>
        </div>

        {/* Right Search & Notification Icons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-10 h-10 rounded-full bg-[#131f32] border border-[#20324e] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Search files"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative w-10 h-10 rounded-full bg-[#131f32] border border-[#20324e] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#131f32]" />
          </button>
        </div>
      </div>

      {/* Total Storage Card (Gradient blue / cyan) */}
      <div
        onClick={onOpenAnalysis}
        className="cursor-pointer relative overflow-hidden rounded-3xl p-5 mb-4 shadow-xl border border-sky-500/20 bg-gradient-to-br from-[#12396d] via-[#104b86] to-[#096a94] hover:border-sky-400/40 transition-all"
        title="Tap to view Storage Analysis"
      >
        {/* Soft background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top storage title & badge */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-sky-200 uppercase tracking-wider">Total Storage</p>
              <h3 className="text-xl font-bold text-white leading-tight">100 GB</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs text-sky-100 font-medium">
            <Clock className="w-3.5 h-3.5 text-sky-300" />
            <span>30 Days</span>
          </div>
        </div>

        {/* Space Stats */}
        <div className="flex items-baseline justify-between mb-3 relative z-10">
          <div>
            <span className="text-2xl font-black text-white tracking-tight">{usedSpaceText}</span>
            <p className="text-xs text-sky-200/90 font-medium mt-0.5">Used space</p>
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-sky-100">{availableSpaceText}</span>
            <p className="text-xs text-sky-200/90 font-medium mt-0.5">Available</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-[1px] relative z-10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-200 via-sky-300 to-white shadow-sm transition-all duration-700"
            style={{ width: `${Math.max(percentUsed, hasFiles ? 3 : 0)}%` }}
          />
        </div>
      </div>

      {/* Storage Analysis Quick Link */}
      <div className="flex items-center justify-between px-1 mb-4">
        <span className="text-xs text-slate-400">Storage Insights:</span>
        <button
          type="button"
          onClick={onOpenAnalysis}
          className="flex items-center gap-1.5 text-[11px] font-semibold bg-[#142033] hover:bg-[#1a2c47] text-sky-400 px-3 py-1.5 rounded-xl border border-[#20324e] transition-colors"
        >
          <PieChartIcon className="w-3.5 h-3.5 text-sky-400" />
          <span>Storage Analysis</span>
        </button>
      </div>

      {!hasFiles ? (
        /* Empty State Matching Screenshot 7 */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
          <div className="w-24 h-24 rounded-full bg-[#121c2e] border border-[#1e2f4a] flex items-center justify-center mb-6 shadow-inner">
            <GPCloudLogo size="md" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
            Welcome to GP Cloud
          </h2>
          <p className="text-sm text-slate-400 max-w-[290px] leading-relaxed mb-6">
            Your cloud storage is looking a little empty! Start uploading your files, photos, and videos to keep them safe and accessible anywhere.
          </p>

          <button
            type="button"
            onClick={onOpenUpload}
            className="w-full max-w-[280px] bg-[#3658dc] hover:bg-blue-600 active:scale-[0.99] text-white font-medium py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-blue-900/40 text-[15px] transition-all"
          >
            <Upload className="w-5 h-5" />
            <span>Upload your first file</span>
          </button>
        </div>
      ) : (
        /* Populated State Matching Screenshot 15 */
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight">
            Your files
          </h2>

          {/* 2x2 Grid of file types */}
          <div className="grid grid-cols-2 gap-3">
            {/* Images */}
            <div
              onClick={() => onSelectCategory('image')}
              className="bg-[#121c2c] hover:bg-[#172438] active:scale-[0.98] border border-[#1f3049] rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#17253d] border border-[#253b60] flex items-center justify-center text-blue-400 mb-2">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-white">Images</h4>
                <p className="text-xs text-slate-400 mt-0.5">{storage.imagesCount} items</p>
              </div>
            </div>

            {/* Videos */}
            <div
              onClick={() => onSelectCategory('video')}
              className="bg-[#121c2c] hover:bg-[#172438] active:scale-[0.98] border border-[#1f3049] rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#122a3d] border border-[#1a4463] flex items-center justify-center text-cyan-400 mb-2">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-white">Videos</h4>
                <p className="text-xs text-slate-400 mt-0.5">{storage.videosCount} items</p>
              </div>
            </div>

            {/* Documents */}
            <div
              onClick={() => onSelectCategory('document')}
              className="bg-[#121c2c] hover:bg-[#162338] active:scale-[0.98] border border-[#1f3049] rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#26193d] border border-[#432770] flex items-center justify-center text-purple-400 mb-2">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-white">Documents</h4>
                <p className="text-xs text-slate-400 mt-0.5">{storage.docsCount} item</p>
              </div>
            </div>

            {/* Audios */}
            <div
              onClick={() => onSelectCategory('audio')}
              className="bg-[#121c2c] hover:bg-[#162338] active:scale-[0.98] border border-[#1f3049] rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#332515] border border-[#5c401e] flex items-center justify-center text-amber-400 mb-2">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-white">Audios</h4>
                <p className="text-xs text-slate-400 mt-0.5">{storage.audiosCount} items</p>
              </div>
            </div>
          </div>

          {/* Recycle Bin Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenRecycleBin}
              className="w-full bg-[#121c2c] hover:bg-[#162338] active:scale-[0.99] border border-[#1f3049] rounded-2xl py-3 px-4 flex items-center gap-3 text-slate-300 hover:text-white transition-colors"
            >
              <Trash2 className="w-5 h-5 text-slate-400" />
              <span className="text-[14px] font-medium">Recycle Bin</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
