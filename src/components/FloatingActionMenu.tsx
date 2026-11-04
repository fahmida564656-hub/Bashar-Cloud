import React, { useRef } from 'react';
import { Plus, X, Image as ImageIcon, Video, Music, FileText, FolderPlus } from 'lucide-react';

interface FloatingActionMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectAction: (action: 'image' | 'video' | 'audio' | 'document' | 'folder') => void;
  onUploadNativeFile?: (file: File) => void;
}

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
  isOpen,
  onToggle,
  onSelectAction,
  onUploadNativeFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNativeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadNativeFile) {
      onUploadNativeFile(e.target.files[0]);
    }
  };

  return (
    <>
      {/* Hidden file input for real uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleNativeUpload}
        className="hidden"
      />

      {/* Dimmed backdrop when FAB is open */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="absolute inset-0 bg-[#070c14]/70 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      {/* Action items stack */}
      <div className="absolute bottom-20 right-5 flex flex-col items-center gap-3 z-40">
        {isOpen && (
          <div className="flex flex-col items-center gap-3.5 mb-1 animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* 1. Images (Blue) */}
            <button
              type="button"
              onClick={() => {
                onSelectAction('image');
                fileInputRef.current?.click();
              }}
              className="w-13 h-13 rounded-full bg-[#162744] border border-[#2b4470] text-[#3b82f6] shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
              title="Upload Images"
            >
              <ImageIcon className="w-6 h-6 group-hover:scale-110 transition-transform text-[#3b82f6]" />
            </button>

            {/* 2. Videos (Cyan) */}
            <button
              type="button"
              onClick={() => {
                onSelectAction('video');
                fileInputRef.current?.click();
              }}
              className="w-13 h-13 rounded-full bg-[#132d42] border border-[#1d4d73] text-[#06b6d4] shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
              title="Upload Videos"
            >
              <Video className="w-6 h-6 group-hover:scale-110 transition-transform text-[#06b6d4]" />
            </button>

            {/* 3. Audios (Amber) */}
            <button
              type="button"
              onClick={() => {
                onSelectAction('audio');
                fileInputRef.current?.click();
              }}
              className="w-13 h-13 rounded-full bg-[#352a16] border border-[#6b501b] text-[#f59e0b] shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
              title="Upload Audios"
            >
              <Music className="w-6 h-6 group-hover:scale-110 transition-transform text-[#f59e0b]" />
            </button>

            {/* 4. Documents (Purple) */}
            <button
              type="button"
              onClick={() => {
                onSelectAction('document');
                fileInputRef.current?.click();
              }}
              className="w-13 h-13 rounded-full bg-[#2a1c42] border border-[#522d86] text-[#a855f7] shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
              title="Upload Documents"
            >
              <FileText className="w-6 h-6 group-hover:scale-110 transition-transform text-[#a855f7]" />
            </button>

            {/* 5. Folder (Orange) */}
            <button
              type="button"
              onClick={() => onSelectAction('folder')}
              className="w-13 h-13 rounded-full bg-[#332212] border border-[#693e15] text-[#fb923c] shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
              title="Create New Folder"
            >
              <FolderPlus className="w-6 h-6 group-hover:scale-110 transition-transform text-[#fb923c]" />
            </button>
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
