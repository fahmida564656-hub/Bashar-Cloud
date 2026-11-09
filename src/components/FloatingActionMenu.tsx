import React, { useRef } from 'react';
import {
  Plus,
  X,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  FolderPlus,
  FilePlus,
  Archive,
} from 'lucide-react';

export type FabActionType =
  | 'create-file'
  | 'upload-zip'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'folder';

interface FloatingActionMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectAction: (action: FabActionType) => void;
  onUploadNativeFile?: (file: File) => void;
}

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
  isOpen,
  onToggle,
  onSelectAction,
  onUploadNativeFile,
}) => {
  const genericInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleNativeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadNativeFile) {
      onUploadNativeFile(e.target.files[0]);
    }
  };

  return (
    <>
      {/* Hidden file input for general files */}
      <input
        type="file"
        ref={genericInputRef}
        onChange={handleNativeUpload}
        className="hidden"
      />

      {/* Hidden file input for ZIP files specifically */}
      <input
        type="file"
        ref={zipInputRef}
        accept=".zip,.rar,.7z,.tar,.gz"
        onChange={handleNativeUpload}
        className="hidden"
      />

      {/* Dimmed backdrop when FAB is open */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="absolute inset-0 bg-[#070c14]/75 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      {/* Action items stack */}
      <div className="absolute bottom-20 right-4 flex flex-col items-end gap-2.5 z-40">
        {isOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-1 animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* 1. Create New File ("ফাইল তৈরি করতে পারবে, ফাইলের নাম দিতে পারবে") */}
            <div className="flex items-center gap-2">
              <span className="bg-[#121c2e] border border-blue-500/30 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                নতুন ফাইল তৈরি করুন
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelectAction('create-file');
                  onToggle();
                }}
                className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border border-blue-400/50"
                title="Create New File"
              >
                <FilePlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* 2. Upload ZIP Archive ("জিপ ফাইল আপলোড করতে পারবে") */}
            <div className="flex items-center gap-2">
              <span className="bg-[#121c2e] border border-amber-500/30 text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                জিপ ফাইল আপলোড (ZIP)
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelectAction('upload-zip');
                  zipInputRef.current?.click();
                  onToggle();
                }}
                className="w-11 h-11 rounded-2xl bg-[#362712] border border-[#6b4c1a] text-amber-400 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                title="Upload ZIP File"
              >
                <Archive className="w-5 h-5 group-hover:scale-110 transition-transform text-amber-400" />
              </button>
            </div>

            {/* 3. New Folder */}
            <div className="flex items-center gap-2">
              <span className="bg-[#121c2e] border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                নতুন ফোল্ডার
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelectAction('folder');
                  onToggle();
                }}
                className="w-11 h-11 rounded-2xl bg-[#143324] border border-[#21613e] text-emerald-400 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                title="Create Folder"
              >
                <FolderPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* 4. Images */}
            <div className="flex items-center gap-2">
              <span className="bg-[#121c2e] border border-sky-500/30 text-sky-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                ছবি আপলোড (Photos)
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelectAction('image');
                  genericInputRef.current?.click();
                  onToggle();
                }}
                className="w-11 h-11 rounded-2xl bg-[#132d42] border border-[#1d4d73] text-[#06b6d4] shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                title="Upload Images"
              >
                <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* 5. Documents */}
            <div className="flex items-center gap-2">
              <span className="bg-[#121c2e] border border-purple-500/30 text-purple-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                ডকুমেন্ট ফাইল (Docs)
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelectAction('document');
                  genericInputRef.current?.click();
                  onToggle();
                }}
                className="w-11 h-11 rounded-2xl bg-[#2a1c42] border border-[#522d86] text-[#a855f7] shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                title="Upload Documents"
              >
                <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* 6. Videos */}
            <div className="flex items-center gap-2">
              <span className="bg-[#121c2e] border border-rose-500/30 text-rose-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                ভিডিও আপলোড
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelectAction('video');
                  genericInputRef.current?.click();
                  onToggle();
                }}
                className="w-11 h-11 rounded-2xl bg-[#3b1928] border border-[#6b2545] text-rose-400 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                title="Upload Videos"
              >
                <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* 7. Audios */}
            <div className="flex items-center gap-2">
              <span className="bg-[#121c2e] border border-yellow-500/30 text-yellow-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                অডিও আপলোড
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelectAction('audio');
                  genericInputRef.current?.click();
                  onToggle();
                }}
                className="w-11 h-11 rounded-2xl bg-[#332b13] border border-[#63531f] text-yellow-400 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                title="Upload Audios"
              >
                <Music className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* The Main Trigger FAB */}
        <button
          type="button"
          onClick={onToggle}
          className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
            isOpen
              ? 'bg-[#1b2b46] border border-[#2c4570] text-blue-400 rotate-90 shadow-blue-900/40'
              : 'bg-[#5b87f7] hover:bg-blue-600 text-white shadow-blue-600/50 hover:shadow-blue-500/60'
          }`}
          title={isOpen ? 'Close menu' : 'Add files or folders'}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-7 h-7 stroke-[2.5]" />
          )}
        </button>
      </div>
    </>
  );
};
