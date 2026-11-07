import React, { useRef } from 'react';
import { Search, Bell, HardDrive, Image as ImageIcon, Video, FileText, Music, Trash2, Upload, PieChart as PieChartIcon, Plus } from 'lucide-react';
import { GPCloudLogo } from './GPCloudLogo';
import { StorageUsage, FileType } from '../types';

interface HomeScreenProps {
  storage: StorageUsage;
  websiteName?: string;
  logoUrl?: string;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onSelectCategory: (type: FileType) => void;
  onOpenRecycleBin: () => void;
  onOpenUpload: () => void;
  onOpenAnalysis: () => void;
  onUploadMultipleFiles?: (files: File[]) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  storage,
  websiteName = 'Bashar Cloud',
  logoUrl,
  onOpenSearch,
  onOpenNotifications,
  onSelectCategory,
  onOpenRecycleBin,
  onOpenUpload,
  onOpenAnalysis,
  onUploadMultipleFiles,
}) => {
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const hasFiles = storage.usedGB > 0 || (storage.imagesCount + storage.videosCount + storage.audiosCount + storage.docsCount > 0);
  const usedSpaceText = hasFiles ? `${storage.usedGB} GB` : '0 B';
  const availableSpaceText = `${(storage.totalGB - storage.usedGB).toFixed(hasFiles ? 2 : 0)} GB`;
  const percentUsed = hasFiles ? Math.min(100, Math.round((storage.usedGB / storage.totalGB) * 100)) : 0;

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUploadMultipleFiles) {
      const filesArray = Array.from(e.target.files);
      onUploadMultipleFiles(filesArray);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 text-white">
      {/* Hidden Multi-file input for uploading multiple files at once */}
      <input
        type="file"
        ref={multiFileInputRef}
        multiple
        onChange={handleMultiFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={websiteName} className="w-10 h-10 rounded-2xl object-cover shadow-lg border border-blue-500/30" />
          ) : (
            <GPCloudLogo size="md" />
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
              {websiteName}
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

      {/* Total Storage Card (Gradient blue / cyan) - No days badge, 1000 GB */}
      <div
        onClick={onOpenAnalysis}
        className="cursor-pointer relative overflow-hidden rounded-3xl p-5 mb-4 shadow-xl border border-sky-500/20 bg-gradient-to-br from-[#12396d] via-[#104b86] to-[#096a94] hover:border-sky-400/40 transition-all"
        title="Tap to view Storage Analysis"
      >
        {/* Soft background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top storage title without days */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-sky-200 uppercase tracking-wider">Total Storage</p>
              <h3 className="text-xl font-bold text-white leading-tight">{storage.totalGB} GB</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs text-sky-100 font-medium">
            <span>{percentUsed}% Used</span>
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
            style={{ width: `${Math.max(percentUsed, hasFiles ? 2 : 0)}%` }}
          />
        </div>
      </div>

      {/* Storage Analysis Quick Link & Multi-Upload Shortcut */}
      <div className="flex items-center justify-between px-1 mb-4">
        <button
          type="button"
          onClick={() => multiFileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95"
          title="Upload multiple files simultaneously"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Batch Upload</span>
        </button>

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
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
          <div className="w-24 h-24 rounded-full bg-[#121c2e] border border-[#1e2f4a] flex items-center justify-center mb-6 shadow-inner">
            {logoUrl ? (
              <img src={logoUrl} alt={websiteName} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <GPCloudLogo size="md" />
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
            Welcome to {websiteName}
          </h2>
          <p className="text-sm text-slate-400 max-w-[290px] leading-relaxed mb-6">
            Your cloud storage is looking clean! Start uploading your files, photos, and videos to keep them safe and accessible anywhere.
          </p>

          <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
            <button
              type="button"
              onClick={() => multiFileInputRef.current?.click()}
              className="w-full bg-[#3658dc] hover:bg-blue-600 active:scale-[0.99] text-white font-medium py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-blue-900/40 text-[15px] transition-all"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Multiple Files</span>
            </button>
          </div>
        </div>
      ) : (
        /* Populated State */
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
                <h4 className="text-sm font-semibold text-white">Images</h4>
                <p className="text-xs text-slate-400">{storage.imagesCount} items</p>
              </div>
            </div>

            {/* Videos */}
            <div
              onClick={() => onSelectCategory('video')}
              className="bg-[#121c2c] hover:bg-[#172438] active:scale-[0.98] border border-[#1f3049] rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#271a3d] border border-[#442870] flex items-center justify-center text-purple-400 mb-2">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Videos</h4>
                <p className="text-xs text-slate-400">{storage.videosCount} items</p>
              </div>
            </div>

            {/* Documents */}
            <div
              onClick={() => onSelectCategory('document')}
              className="bg-[#121c2c] hover:bg-[#172438] active:scale-[0.98] border border-[#1f3049] rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#102b23] border border-[#18493a] flex items-center justify-center text-emerald-400 mb-2">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Documents</h4>
                <p className="text-xs text-slate-400">{storage.docsCount} items</p>
              </div>
            </div>

            {/* Audios */}
            <div
              onClick={() => onSelectCategory('audio')}
              className="bg-[#121c2c] hover:bg-[#172438] active:scale-[0.98] border border-[#1f3049] rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2e2313] border border-[#4d391c] flex items-center justify-center text-amber-400 mb-2">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Audios</h4>
                <p className="text-xs text-slate-400">{storage.audiosCount} items</p>
              </div>
            </div>
          </div>

          {/* Recycle Bin Button */}
          <button
            type="button"
            onClick={onOpenRecycleBin}
            className="w-full bg-[#121c2c] hover:bg-[#172438] border border-[#1f3049] rounded-2xl p-4 flex items-center justify-between text-slate-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2a1720] border border-[#472031] flex items-center justify-center text-rose-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-white">Recycle Bin</span>
            </div>
            <span className="text-xs text-slate-400">Recover deleted files</span>
          </button>
        </div>
      )}
    </div>
  );
};
