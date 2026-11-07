import React, { useState } from 'react';
import {
  X,
  Trash2,
  RefreshCw,
  Play,
  Pause,
  Music,
  FolderPlus,
  AlertTriangle,
  Folder,
} from 'lucide-react';
import { CloudFile } from '../types';

/* ================= RECYCLE BIN MODAL ================= */
interface RecycleBinProps {
  isOpen: boolean;
  onClose: () => void;
  deletedFiles: CloudFile[];
  onRestore: (file: CloudFile) => void;
  onEmptyBin: () => void;
  onDeletePermanently?: (fileId: string) => void;
}

export const RecycleBinModal: React.FC<RecycleBinProps> = ({
  isOpen,
  onClose,
  deletedFiles,
  onRestore,
  onEmptyBin,
  onDeletePermanently,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#121c2e] border-t sm:border border-[#20324e] rounded-t-3xl sm:rounded-3xl p-5 max-w-[420px] w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2f4a]">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Recycle Bin</h3>
            <span className="text-xs text-slate-400">({deletedFiles.length} items)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {deletedFiles.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Recycle Bin is empty
            </div>
          ) : (
            deletedFiles.map((f) => (
              <div
                key={f.id}
                className="bg-[#162338] border border-[#233857] rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white truncate">{f.name}</h4>
                  <p className="text-[11px] text-slate-400">{f.formattedSize} • In Bin</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Restore */}
                  <button
                    type="button"
                    onClick={() => onRestore(f)}
                    className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                    title="Restore file"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  {/* Delete Forever (সারা জীবনের জন্য ডিলিট) */}
                  {onDeletePermanently && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmDeleteId === f.id) {
                          onDeletePermanently(f.id);
                          setConfirmDeleteId(null);
                        } else {
                          setConfirmDeleteId(f.id);
                          setTimeout(() => setConfirmDeleteId(null), 3000);
                        }
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        confirmDeleteId === f.id
                          ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                          : 'bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border-rose-500/30'
                      }`}
                      title="Delete permanently forever"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{confirmDeleteId === f.id ? 'Confirm?' : 'Delete Forever'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {deletedFiles.length > 0 && (
          <div className="pt-3 border-t border-[#1f2f4a]">
            <button
              type="button"
              onClick={onEmptyBin}
              className="w-full bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-medium py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/40"
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty Recycle Bin (Delete All Forever)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ================= AUDIO PLAYER MODAL ================= */
interface AudioPlayerProps {
  file: CloudFile | null;
  onClose: () => void;
}

export const AudioPlayerModal: React.FC<AudioPlayerProps> = ({ file, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(35);

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#121c2e] border-t sm:border border-[#20324e] rounded-t-3xl sm:rounded-3xl p-5 max-w-[420px] w-full space-y-4 animate-in slide-in-from-bottom-8">
        <div className="flex items-center justify-between pb-2 border-b border-[#1f2f4a]">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Audio Player</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center py-2 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#332515] border border-[#5c401e] flex items-center justify-center text-[#f59e0b] shadow-xl mb-4">
            <Music className="w-10 h-10 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-white max-w-[260px] truncate">{file.name}</h3>
          <p className="text-xs text-slate-400 mt-1">{file.formattedSize} • AAC Audio</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div
            className="w-full h-2 bg-[#1b2b46] rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const p = Math.round(((e.clientX - rect.left) / rect.width) * 100);
              setProgress(p);
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>01:14</span>
            <span>03:28</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 rounded-full bg-[#3658dc] hover:bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/50"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= NEW FOLDER MODAL ================= */
interface NewFolderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string) => void;
}

export const NewFolderModal: React.FC<NewFolderProps> = ({ isOpen, onClose, onCreateFolder }) => {
  const [folderName, setFolderName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreateFolder(folderName.trim());
      setFolderName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#121c2e] border border-[#20324e] rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Create New Folder</h3>
            <p className="text-xs text-slate-400">Organize your files in cloud storage</p>
          </div>
        </div>

        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Folder name (e.g. Travel 2026)"
          required
          autoFocus
          className="w-full bg-[#162338] border border-[#273d61] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-[#3658dc] hover:bg-blue-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
};
