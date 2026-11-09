import React, { useRef } from 'react';
import {
  Search,
  Bell,
  HardDrive,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Trash2,
  Upload,
  PieChart as PieChartIcon,
  Plus,
  Sparkles,
  ShieldCheck,
  Lock,
  Clock,
  AlertTriangle,
  FilePlus,
  Archive,
} from 'lucide-react';
import { GPCloudLogo } from './GPCloudLogo';
import { StorageUsage, FileType, UserSubscription } from '../types';
import { getStorageAlertLevel, getStorageAlertStyles } from '../utils/storageAlert';

interface HomeScreenProps {
  storage: StorageUsage;
  subscription?: UserSubscription;
  websiteName?: string;
  logoUrl?: string;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onSelectCategory: (type: FileType) => void;
  onOpenRecycleBin: () => void;
  onOpenUpload: () => void;
  onOpenAnalysis: () => void;
  onOpenPayment?: () => void;
  onOpenCreateFile?: () => void;
  onUploadMultipleFiles?: (files: File[]) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  storage,
  subscription,
  websiteName = 'Bashar Cloud',
  logoUrl,
  onOpenSearch,
  onOpenNotifications,
  onSelectCategory,
  onOpenRecycleBin,
  onOpenUpload,
  onOpenAnalysis,
  onOpenPayment,
  onOpenCreateFile,
  onUploadMultipleFiles,
}) => {
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  const totalLimitGB = storage.totalGB || 1000;
  const hasFiles = storage.usedGB > 0 || (storage.imagesCount + storage.videosCount + storage.audiosCount + storage.docsCount > 0);
  const usedSpaceText = hasFiles ? `${storage.usedGB} GB` : '0 B';
  const availableSpaceText = `${Math.max(0, totalLimitGB - storage.usedGB).toFixed(hasFiles ? 1 : 0)} GB`;
  const percentUsed = Math.min(100, Math.round((storage.usedGB / totalLimitGB) * 100));

  // Storage alert calculation (Warning when reaching 90% of 1000GB limit)
  const alertLevel = getStorageAlertLevel(storage.usedGB, totalLimitGB);
  const alertStyles = getStorageAlertStyles(alertLevel);
  const isStorageWarning = alertLevel !== 'normal';

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUploadMultipleFiles) {
      const filesArray = Array.from(e.target.files);
      onUploadMultipleFiles(filesArray);
      e.target.value = '';
    }
  };

  const isApproved = subscription?.isLifetimeApproved;
  const isExpired = subscription?.isExpired && !isApproved;

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

      {/* Hidden ZIP file input specifically for archives */}
      <input
        type="file"
        ref={zipFileInputRef}
        accept=".zip,.rar,.7z,.tar,.gz"
        multiple
        onChange={handleMultiFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl || '/assets/aistudio/0a4ee58c-1d1d-4faa-8126-cfb8779227ba_f85ac4d0.png'}
            alt={websiteName}
            className="w-10 h-10 rounded-2xl object-cover shadow-lg border border-blue-500/30"
          />
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

      {/* Subscription Status Card */}
      {subscription && (
        <div className="mb-3">
          {isApproved ? (
            <div className="bg-gradient-to-r from-emerald-950/80 to-[#102923] border border-emerald-500/40 rounded-2xl p-2.5 px-3 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white">Lifetime VIP Active</span>
                  <p className="text-[10px] text-emerald-300/80">সারাজীবনের জন্য অনুমোদিত ক্লাউড স্টোরেজ</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                VIP Member
              </span>
            </div>
          ) : isExpired ? (
            <div
              onClick={onOpenPayment}
              className="bg-gradient-to-r from-rose-950/80 to-[#2c131a] border border-rose-500/40 rounded-2xl p-2.5 px-3 flex items-center justify-between shadow-md cursor-pointer hover:border-rose-400 transition-all"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-rose-200">১ মাসের ফ্রি ট্রায়াল শেষ</span>
                  <p className="text-[10px] text-slate-300">১০০ টাকা সেন্ড মানি করে আনলক করুন</p>
                </div>
              </div>
              <button
                type="button"
                className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>আনলক</span>
              </button>
            </div>
          ) : (
            <div
              onClick={onOpenPayment}
              className="bg-[#12233e] border border-blue-500/30 rounded-2xl p-2.5 px-3 flex items-center justify-between shadow-md cursor-pointer hover:border-blue-400 transition-all"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white">
                    ফ্রি ট্রায়াল: আর {subscription.daysRemaining} দিন বাকি
                  </span>
                  <p className="text-[10px] text-slate-400">সারাজীবনের জন্য ১০০ টাকা পেমেন্ট করতে ট্যাপ করুন</p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-600/30 text-sky-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30 shrink-0">
                ৳১০০ সারাজীবন
              </span>
            </div>
          )}
        </div>
      )}

      {/* Total Storage Card with Visual Progress Bar Alert (Threshold: >= 90% of 1000GB) */}
      <div
        onClick={onOpenAnalysis}
        className={`cursor-pointer relative overflow-hidden rounded-3xl p-5 mb-4 shadow-xl border transition-all ${alertStyles.cardBorder}`}
        title="Tap to view Storage Analysis"
      >
        {/* Soft background glow */}
        <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none ${
          isStorageWarning ? 'bg-amber-500/30' : 'bg-sky-400/20'
        }`} />

        {/* Top storage title */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border backdrop-blur-md flex items-center justify-center ${
              isStorageWarning ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : 'bg-white/10 border-white/20 text-white'
            }`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[11px] font-medium uppercase tracking-wider ${
                isStorageWarning ? 'text-amber-300' : 'text-sky-200'
              }`}>
                Total Storage
              </p>
              <h3 className="text-xl font-bold text-white leading-tight">{totalLimitGB} GB</h3>
            </div>
          </div>

          {/* Used percentage badge with visual warning indicator */}
          <div className={`flex items-center gap-1.5 backdrop-blur-md border px-3 py-1 rounded-full text-xs font-bold shadow-sm ${alertStyles.badgeClass}`}>
            {isStorageWarning && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            )}
            <span>{percentUsed}% Used</span>
          </div>
        </div>

        {/* Space Stats */}
        <div className="flex items-baseline justify-between mb-3 relative z-10">
          <div>
            <span className={`text-2xl font-black tracking-tight ${
              isStorageWarning ? 'text-amber-200' : 'text-white'
            }`}>
              {usedSpaceText}
            </span>
            <p className="text-xs text-slate-300/90 font-medium mt-0.5">Used space</p>
          </div>
          <div className="text-right">
            <span className={`text-base font-bold ${
              isStorageWarning ? 'text-amber-300' : 'text-sky-100'
            }`}>
              {availableSpaceText}
            </span>
            <p className="text-xs text-slate-300/90 font-medium mt-0.5">Available</p>
          </div>
        </div>

        {/* Visual Progress Bar (Color changes to warning gradient at >= 90%) */}
        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-[1.5px] relative z-10 border border-white/10 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-700 ${alertStyles.barGradient}`}
            style={{ width: `${Math.max(percentUsed, hasFiles ? 2 : 0)}%` }}
          />
        </div>

        {/* 90% Storage Warning Alert Banner */}
        {isStorageWarning && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenAnalysis();
            }}
            className={`mt-3.5 p-3 rounded-2xl border flex items-center justify-between gap-2.5 text-xs shadow-lg animate-in fade-in slide-in-from-top-2 relative z-10 cursor-pointer ${alertStyles.warningBannerClass}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/25 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-[12px] truncate">
                  {percentUsed >= 100
                    ? 'Storage Limit Exceeded (স্টোরেজ পূর্ণ)'
                    : 'Storage Warning: 90% Reached (স্টোরেজ সতর্কবার্তা)'}
                </h4>
                <p className="text-[10px] text-amber-200/90 truncate">
                  You have used {percentUsed}% of your 1000 GB limit. Free up space soon.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-[10px] shrink-0 shadow-md transition-all cursor-pointer"
            >
              Clean Up
            </button>
          </div>
        )}
      </div>

      {/* Storage Analysis Quick Link & Multi-Upload Shortcut */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          type="button"
          onClick={onOpenCreateFile}
          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 px-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer border border-blue-400/40"
          title="নতুন ফাইল তৈরি করুন ও ফাইলের নাম দিন"
        >
          <FilePlus className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">নতুন ফাইল তৈরি</span>
        </button>

        <button
          type="button"
          onClick={() => zipFileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold bg-[#2a1c0d] hover:bg-[#382613] text-amber-300 py-2 px-2 rounded-xl border border-amber-500/40 transition-colors cursor-pointer shadow-md"
          title="জিপ ফাইল আপলোড করুন"
        >
          <Archive className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span className="truncate">জিপ আপলোড</span>
        </button>

        <button
          type="button"
          onClick={() => multiFileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold bg-[#142033] hover:bg-[#1a2c47] text-sky-400 py-2 px-2 rounded-xl border border-[#20324e] transition-colors cursor-pointer"
          title="ফাইল ও ছবি আপলোড করুন"
        >
          <Upload className="w-3.5 h-3.5 shrink-0 text-sky-400" />
          <span className="truncate">ফাইল আপলোড</span>
        </button>
      </div>

      {/* Clean Slate Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#121c2c] border border-[#1f3049] rounded-3xl mb-4 shadow-inner">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#162744] to-[#1e345e] border border-[#264375] flex items-center justify-center text-blue-400 mb-3 shadow-lg">
          <Upload className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">
          Welcome to {websiteName}
        </h2>
        <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed mb-4">
          নিরাপদ ক্লাউড স্টোরেজ। সহজেই নতুন ফাইল তৈরি করুন, ফাইলের নাম দিন, যেকোনো ফাইল এবং জিপ ফাইল (ZIP) আপলোড করুন।
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenCreateFile}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            <span>নতুন ফাইল তৈরি করুন</span>
          </button>

          <button
            type="button"
            onClick={() => zipFileInputRef.current?.click()}
            className="bg-[#2a1c0d] hover:bg-[#3b2713] border border-amber-500/50 text-amber-300 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Archive className="w-4 h-4 text-amber-400" />
            <span>জিপ আপলোড (.ZIP)</span>
          </button>

          <button
            type="button"
            onClick={() => multiFileInputRef.current?.click()}
            className="bg-[#16263f] hover:bg-[#1d3254] border border-blue-500/30 text-sky-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>ফাইল আপলোড</span>
          </button>
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div
          onClick={() => onSelectCategory('image')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] cursor-pointer transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1.5">
            <ImageIcon className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Images</span>
          <span className="text-[9px] text-slate-500">{storage.imagesCount}</span>
        </div>

        <div
          onClick={() => onSelectCategory('video')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] cursor-pointer transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1.5">
            <Video className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Videos</span>
          <span className="text-[9px] text-slate-500">{storage.videosCount}</span>
        </div>

        <div
          onClick={() => onSelectCategory('audio')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] cursor-pointer transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5">
            <Music className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Audios</span>
          <span className="text-[9px] text-slate-500">{storage.audiosCount}</span>
        </div>

        <div
          onClick={() => onSelectCategory('document')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] cursor-pointer transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Docs</span>
          <span className="text-[9px] text-slate-500">{storage.docsCount}</span>
        </div>
      </div>

      {/* Recycle Bin Button */}
      <button
        type="button"
        onClick={onOpenRecycleBin}
        className="w-full bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-2xl p-3 flex items-center justify-between text-xs text-slate-300 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Recycle Bin</span>
        </div>
        <span className="text-slate-500 text-[11px]">View deleted items</span>
      </button>
    </div>
  );
};
