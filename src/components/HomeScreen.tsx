import React, { useRef, useState } from 'react';
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
  Sparkles,
  ShieldCheck,
  Lock,
  Clock,
  AlertTriangle,
  FilePlus,
  Archive,
} from 'lucide-react';
import { CloudFile, StorageUsage, FileType, UserSubscription } from '../types';
import { getStorageAlertLevel, getStorageAlertStyles } from '../utils/storageAlert';
import { formatTotalBytesUsed } from '../utils/fileVault';
import { toBengaliDigits } from '../utils/subscription';

interface HomeScreenProps {
  storage: StorageUsage;
  files?: CloudFile[];
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
  onOpenFilePreview?: (file: CloudFile) => void;
  onViewAllFiles?: () => void;
  unreadNotificationsCount?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  storage,
  files = [],
  subscription,
  websiteName = 'Bashar Cloud',
  logoUrl,
  onOpenSearch,
  onOpenNotifications,
  onSelectCategory,
  onOpenRecycleBin,
  onOpenAnalysis,
  onOpenPayment,
  onOpenCreateFile,
  onUploadMultipleFiles,
  unreadNotificationsCount = 0,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  const totalLimitGB = storage.totalGB || 1000;
  const realTotalBytes = files.reduce((sum, f) => sum + (Number(f.sizeBytes) || 0), 0);
  const hasFiles =
    storage.usedGB > 0 ||
    files.length > 0 ||
    storage.imagesCount + storage.videosCount + storage.audiosCount + storage.docsCount > 0;
  const usedSpaceText =
    storage.usedGB >= 1
      ? `${storage.usedGB} GB`
      : realTotalBytes > 0
      ? formatTotalBytesUsed(realTotalBytes)
      : storage.usedGB > 0
      ? `${storage.usedGB} GB`
      : '0 B';
  const availableSpaceText = `${Math.max(0, totalLimitGB - storage.usedGB).toFixed(hasFiles ? 1 : 0)} GB`;
  const percentUsed = Math.min(100, Math.round((storage.usedGB / totalLimitGB) * 100));

  // Storage alert calculation (Warning when reaching 90% of 1000GB limit)
  const alertLevel = getStorageAlertLevel(storage.usedGB, totalLimitGB);
  const alertStyles = getStorageAlertStyles(alertLevel);
  const isStorageWarning = alertLevel !== 'normal';

  const isApproved = subscription?.isLifetimeApproved;
  const isExpired = Boolean(subscription?.isExpired && !isApproved);

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isExpired) {
      e.target.value = '';
      onOpenPayment?.();
      return;
    }
    if (e.target.files && e.target.files.length > 0 && onUploadMultipleFiles) {
      const filesArray = Array.from(e.target.files);
      onUploadMultipleFiles(filesArray);
      e.target.value = '';
    }
  };

  const handleProtectedUploadClick = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (isExpired) {
      onOpenPayment?.();
      return;
    }
    ref.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isExpired) {
      onOpenPayment?.();
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadMultipleFiles) {
      onUploadMultipleFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 flex flex-col px-4 pt-3 pb-24 text-white"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-950/90 backdrop-blur-md border-2 border-dashed border-blue-400 rounded-3xl m-2 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400 flex items-center justify-center text-blue-300 mb-3 animate-bounce">
            {isExpired ? <Lock className="w-8 h-8 text-rose-400" /> : <Upload className="w-8 h-8" />}
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {isExpired
              ? '৩০ দিনের ট্রায়াল শেষ — অ্যাকাউন্ট লক'
              : 'ফাইলগুলো এখানে ছেড়ে দিন (Drop Files Here)'}
          </h3>
          <p className="text-xs text-blue-200">
            {isExpired
              ? 'ফাইল আপলোড করতে ১০০ টাকা পেমেন্ট করে আনলক করুন'
              : 'ছবি, ভিডিও, অডিও, ডকুমেন্ট বা জিপ ফাইল ড্রাইভে আপলোড হবে'}
          </p>
        </div>
      )}

      {/* Hidden Multi-file input */}
      <input
        type="file"
        ref={multiFileInputRef}
        multiple
        onChange={handleMultiFileChange}
        className="hidden"
      />

      {/* Hidden ZIP file input */}
      <input
        type="file"
        ref={zipFileInputRef}
        accept=".zip,.rar,.7z,.tar,.gz"
        multiple
        onChange={handleMultiFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logoUrl || '/assets/aistudio/0a4ee58c-1d1d-4faa-8126-cfb8779227ba_f85ac4d0.png'}
            alt={websiteName}
            className="w-10 h-10 rounded-2xl object-cover shadow-lg border border-blue-500/30 shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight truncate">
              {websiteName}
            </h1>
            <p className="text-[12px] text-slate-400 truncate">
              Manage all your files in one place
            </p>
          </div>
        </div>

        {/* Right Search & Notification Icons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-11 h-11 rounded-full bg-[#131f32] border border-[#20324e] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Search files"
            aria-label="Search files"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative w-11 h-11 rounded-full bg-[#131f32] border border-[#20324e] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Notifications"
            aria-label={
              unreadNotificationsCount > 0
                ? `Notifications (${unreadNotificationsCount} unread)`
                : 'Notifications'
            }
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white ai-solid-text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-[#0b111c] tabular-nums shadow-sm">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Subscription / Daily Countdown / Lock Status Card */}
      {subscription && (
        <div className="mb-3.5">
          {isApproved ? (
            <div className="bg-gradient-to-r from-emerald-950/80 to-[#102923] border border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">Lifetime VIP Active</span>
                  <p className="text-[10.5px] text-emerald-300/80 truncate">সারাজীবনের জন্য অনুমোদিত ক্লাউড স্টোরেজ</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30 shrink-0">
                VIP Member
              </span>
            </div>
          ) : isExpired ? (
            <button
              type="button"
              onClick={onOpenPayment}
              className="w-full min-h-[52px] text-left bg-gradient-to-r from-rose-950/85 to-[#2c131a] border border-rose-500/50 rounded-2xl p-3 flex items-center justify-between gap-2.5 shadow-lg cursor-pointer hover:border-rose-400 transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/35 flex items-center justify-center text-rose-400 shrink-0">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-rose-200 block">
                    ৩০ দিনের ফ্রি ট্রায়াল শেষ • অ্যাকাউন্ট লক
                  </span>
                  <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                    আপলোড, ডাউনলোড, দেখা ও নাম পরিবর্তন বন্ধ — ১০০ টাকা পেমেন্ট করে আনলক করুন
                  </p>
                </div>
              </div>
              <span className="bg-rose-600 hover:bg-rose-500 text-white ai-solid-text-white text-[11px] font-bold px-3 py-2 rounded-xl shadow-md flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>আনলক</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPayment}
              className="w-full min-h-[50px] text-left bg-[#12233e] border border-blue-500/35 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-md cursor-pointer hover:border-blue-400 transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Clock className="w-4.5 h-4.5 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">
                    ফ্রি ট্রায়াল: আর {toBengaliDigits(subscription.daysRemaining)} দিন বাকি
                  </span>
                  <p className="text-[10.5px] text-slate-400 truncate">
                    ৩০ দিন পর লক হবে • সারাজীবনের জন্য ১০০ টাকা পেমেন্ট করুন
                  </p>
                </div>
              </div>
              <span className="text-[10.5px] bg-blue-600/30 text-sky-300 font-bold px-2.5 py-1 rounded-full border border-blue-500/30 shrink-0">
                ৳১০০ সারাজীবন
              </span>
            </button>
          )}
        </div>
      )}

      {/* Total Storage Card */}
      <div
        onClick={onOpenAnalysis}
        className={`orbit-card cursor-pointer relative overflow-hidden rounded-3xl p-4 mb-3.5 shadow-xl transition-all ${alertStyles.cardBorder}`}
        title="Tap to view Storage Analysis"
      >
        <div
          className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none ${
            isStorageWarning ? 'bg-amber-500/30' : 'bg-sky-400/20'
          }`}
        />

        <div className="flex items-center justify-between mb-2.5 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl border backdrop-blur-md flex items-center justify-center ${
                isStorageWarning
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p
                className={`text-[11px] font-medium uppercase tracking-wider ${
                  isStorageWarning ? 'text-amber-300' : 'text-sky-200'
                }`}
              >
                Total Storage
              </p>
              <h3 className="text-xl font-bold text-white leading-tight tabular-nums">{totalLimitGB} GB</h3>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 backdrop-blur-md border px-3 py-1 rounded-full text-xs font-bold shadow-sm tabular-nums ${alertStyles.badgeClass}`}
          >
            {isStorageWarning && <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />}
            <span>{percentUsed}% Used</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mb-2 relative z-10">
          <div>
            <span
              className={`text-2xl font-black tracking-tight tabular-nums ${
                isStorageWarning ? 'text-amber-200' : 'text-white'
              }`}
            >
              {usedSpaceText}
            </span>
            <p className="text-xs text-slate-300/90 font-medium mt-0.5">Used space</p>
          </div>
          <div className="text-right">
            <span
              className={`text-base font-bold tabular-nums ${
                isStorageWarning ? 'text-amber-300' : 'text-sky-100'
              }`}
            >
              {availableSpaceText}
            </span>
            <p className="text-xs text-slate-300/90 font-medium mt-0.5">Available</p>
          </div>
        </div>

        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-[1.5px] relative z-10 border border-white/10 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-700 ${alertStyles.barGradient}`}
            style={{ width: `${Math.max(percentUsed, hasFiles ? 2 : 0)}%` }}
          />
        </div>

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
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-[12px] truncate">
                  {percentUsed >= 100
                    ? 'Storage Limit Exceeded (স্টোরেজ পূর্ণ)'
                    : 'Storage Warning: 90% Reached (স্টোরেজ সতর্কবার্তা)'}
                </h4>
                <p className="text-[10px] text-amber-200/90 truncate">
                  You have used {percentUsed}% of your {totalLimitGB} GB limit.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-[10px] shrink-0 shadow-md">
              Clean Up
            </span>
          </div>
        )}
      </div>

      {/* Quick Action Shortcut Bar (Locked when trial expired) */}
      <div className="grid grid-cols-3 gap-2 mb-3.5">
        <button
          type="button"
          onClick={() => {
            if (isExpired) {
              onOpenPayment?.();
              return;
            }
            onOpenCreateFile?.();
          }}
          className={`min-h-[44px] flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2.5 px-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer border ${
            isExpired
              ? 'bg-[#1a1824] border-rose-500/35 text-rose-300 opacity-85'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white ai-solid-text-white border-blue-400/40'
          }`}
          title="নতুন ফাইল তৈরি করুন ও ফাইলের নাম দিন"
        >
          {isExpired ? <Lock className="w-3.5 h-3.5 shrink-0" /> : <FilePlus className="w-3.5 h-3.5 shrink-0" />}
          <span className="truncate">নতুন ফাইল তৈরি</span>
        </button>

        <button
          type="button"
          onClick={() => handleProtectedUploadClick(zipFileInputRef)}
          className={`min-h-[44px] flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2.5 px-2 rounded-xl border transition-colors cursor-pointer shadow-md ${
            isExpired
              ? 'bg-[#1a1824] border-rose-500/35 text-rose-300 opacity-85'
              : 'bg-[#2a1c0d] hover:bg-[#382613] text-amber-300 border-amber-500/40'
          }`}
          title="জিপ ফাইল আপলোড করুন"
        >
          {isExpired ? (
            <Lock className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Archive className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          )}
          <span className="truncate">জিপ আপলোড</span>
        </button>

        <button
          type="button"
          onClick={() => handleProtectedUploadClick(multiFileInputRef)}
          className={`min-h-[44px] flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2.5 px-2 rounded-xl border transition-colors cursor-pointer shadow-md ${
            isExpired
              ? 'bg-[#1a1824] border-rose-500/35 text-rose-300 opacity-85'
              : 'bg-[#142033] hover:bg-[#1a2c47] text-sky-400 border-[#20324e]'
          }`}
          title="ফাইল ও ছবি আপলোড করুন"
        >
          {isExpired ? (
            <Lock className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Upload className="w-3.5 h-3.5 shrink-0 text-sky-400" />
          )}
          <span className="truncate">ফাইল আপলোড</span>
        </button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3.5">
        <button
          type="button"
          onClick={() => onSelectCategory('image')}
          className="orbit-card min-h-[82px] flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121c2c] hover:bg-[#162338] cursor-pointer transition-all active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1">
            <ImageIcon className="w-4.5 h-4.5" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Images</span>
          <span className="text-[10px] text-slate-500 tabular-nums">{storage.imagesCount}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('video')}
          className="orbit-card min-h-[82px] flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121c2c] hover:bg-[#162338] cursor-pointer transition-all active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1">
            <Video className="w-4.5 h-4.5" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Videos</span>
          <span className="text-[10px] text-slate-500 tabular-nums">{storage.videosCount}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('audio')}
          className="orbit-card min-h-[82px] flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121c2c] hover:bg-[#162338] cursor-pointer transition-all active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1">
            <Music className="w-4.5 h-4.5" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Audios</span>
          <span className="text-[10px] text-slate-500 tabular-nums">{storage.audiosCount}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('document')}
          className="orbit-card min-h-[82px] flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121c2c] hover:bg-[#162338] cursor-pointer transition-all active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Docs</span>
          <span className="text-[10px] text-slate-500 tabular-nums">{storage.docsCount}</span>
        </button>
      </div>

      {/* Recycle Bin Button */}
      <button
        type="button"
        onClick={onOpenRecycleBin}
        className="orbit-card w-full bg-[#121c2c] hover:bg-[#162338] rounded-2xl py-3 pl-3.5 pr-16 flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          {isExpired ? (
            <Lock className="w-4 h-4 text-rose-400" />
          ) : (
            <Trash2 className="w-4 h-4 text-rose-400" />
          )}
          <span>Recycle Bin</span>
        </div>
        <span className="text-slate-500 text-[11px]">
          {isExpired ? 'লক করা আছে (৳১০০ আনলক)' : 'View deleted items'}
        </span>
      </button>
    </div>
  );
};
