import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Folder,
  Star,
  Trash2,
  Download,
  Calendar,
  FileCode,
  Edit2,
  Check,
  Copy,
  FolderInput,
  AlertTriangle,
} from 'lucide-react';
import { CloudFile } from '../types';

interface FilePreviewModalProps {
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite?: (id: string) => void;
  onDeleteFile?: (id: string) => void;
  onDeletePermanently?: (id: string) => void;
  onRenameFile?: (id: string, newName: string) => void;
  onCopyFile?: (file: CloudFile) => void;
  onMoveFile?: (id: string, destinationFolderId: string | null) => void;
  availableFolders?: CloudFile[];
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onToggleFavorite,
  onDeleteFile,
  onDeletePermanently,
  onRenameFile,
  onCopyFile,
  onMoveFile,
  availableFolders = [],
}) => {
  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  // Move picker state
  const [isMovePickerOpen, setIsMovePickerOpen] = useState(false);

  // Permanent delete confirm state
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);

  // Action toast state
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      setNewName(file.name);
      setIsRenaming(false);
      setIsMovePickerOpen(false);
      setShowPermanentDeleteConfirm(false);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && onRenameFile) {
      onRenameFile(file.id, newName.trim());
      setIsRenaming(false);
      showFeedback('Name updated successfully!');
    }
  };

  const handleCopy = () => {
    if (onCopyFile) {
      onCopyFile(file);
      showFeedback('File copied successfully!');
    }
  };

  const handleSelectDestination = (folderId: string | null) => {
    if (onMoveFile) {
      onMoveFile(file.id, folderId);
      setIsMovePickerOpen(false);
      showFeedback('Moved successfully!');
    }
  };

  const getExtension = (name: string) => {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() : 'FILE';
  };

  const ext = getExtension(file.name);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#101928] border border-[#20324e] rounded-3xl max-w-[430px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white relative">
        
        {/* Feedback Toast */}
        {actionFeedback && (
          <div className="absolute top-3 left-4 right-4 z-50 bg-blue-600/90 text-white text-xs py-2 px-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
            <Check className="w-3.5 h-3.5" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-[#1d2d47] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              file.type === 'image' ? 'bg-blue-500/20 text-blue-400' :
              file.type === 'video' ? 'bg-purple-500/20 text-purple-400' :
              file.type === 'audio' ? 'bg-amber-500/20 text-amber-400' :
              file.type === 'document' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-blue-600/20 text-blue-400'
            }`}>
              {file.type === 'image' && <ImageIcon className="w-4 h-4" />}
              {file.type === 'video' && <Video className="w-4 h-4" />}
              {file.type === 'audio' && <Music className="w-4 h-4" />}
              {file.type === 'document' && <FileText className="w-4 h-4" />}
              {file.type === 'folder' && <Folder className="w-4 h-4" />}
            </div>

            {isRenaming ? (
              <form onSubmit={handleSaveRename} className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  className="bg-[#17253b] border border-blue-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-full"
                />
                <button
                  type="submit"
                  className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shrink-0"
                  title="Save Name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors shrink-0"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white truncate" title={file.name}>{file.name}</h3>
                  {onRenameFile && (
                    <button
                      type="button"
                      onClick={() => setIsRenaming(true)}
                      className="p-1 text-slate-400 hover:text-sky-300 transition-colors shrink-0"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 capitalize">{file.type} • {file.formattedSize}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#17253b] hover:bg-[#203452] flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="w-full bg-[#09101d] border border-[#1b2b42] rounded-2xl overflow-hidden min-h-[200px] max-h-[280px] flex items-center justify-center relative group">
            {file.type === 'image' ? (
              file.url ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-contain max-h-[260px]"
                />
              ) : (
                <div className="w-full py-10 px-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#0e1726] to-[#080d17]">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-semibold text-white mb-1">Image Preview</span>
                  <span className="text-[11px] text-slate-400">{file.name}</span>
                  <span className="mt-2 text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                    High Resolution Image • {file.formattedSize}
                  </span>
                </div>
              )
            ) : file.type === 'document' ? (
              <div className="w-full py-8 px-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#0f1d1b] to-[#071210]">
                <div className="w-16 h-20 rounded-xl bg-[#142d27] border border-[#1f5245] shadow-lg flex flex-col justify-between p-2.5 mb-3 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold bg-emerald-500 text-slate-950 px-1 py-0.5 rounded font-mono">
                      {ext}
                    </span>
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1 w-full py-1">
                    <div className="h-1 bg-emerald-400/40 rounded w-full" />
                    <div className="h-1 bg-emerald-400/30 rounded w-3/4" />
                    <div className="h-1 bg-emerald-400/20 rounded w-5/6" />
                  </div>
                  <span className="text-[8px] text-emerald-300 font-medium">Page 1 of 3</span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-0.5">{file.name}</h4>
                <p className="text-[11px] text-slate-400 mb-2">Encrypted Cloud Document</p>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  <FileCode className="w-3 h-3" />
                  <span>Secure View Available</span>
                </div>
              </div>
            ) : file.type === 'video' ? (
              <div className="w-full py-10 px-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#1a112c] to-[#0d0717]">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-3 shadow-lg">
                  <Video className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold text-white">Video Media File</span>
                <span className="text-[11px] text-slate-400 mt-1">{file.name}</span>
              </div>
            ) : file.type === 'audio' ? (
              <div className="w-full py-10 px-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#251b0d] to-[#120b04]">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                  <Music className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold text-white">Audio Track</span>
                <span className="text-[11px] text-slate-400 mt-1">{file.name}</span>
              </div>
            ) : (
              <div className="w-full py-10 px-6 flex flex-col items-center justify-center text-center">
                <Folder className="w-16 h-16 text-blue-400 mb-2" />
                <span className="text-xs font-semibold text-white">{file.name}</span>
              </div>
            )}
          </div>

          {/* Quick Action Grid (Rename, Copy, Move) */}
          <div className="grid grid-cols-3 gap-2">
            {/* Rename Button */}
            <button
              type="button"
              onClick={() => setIsRenaming(true)}
              className="py-2.5 px-3 rounded-xl bg-[#142134] hover:bg-[#1a2c47] border border-[#20324e] text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Rename</span>
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl bg-[#142134] hover:bg-[#1a2c47] border border-[#20324e] text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Copy</span>
            </button>

            {/* Move Button */}
            <button
              type="button"
              onClick={() => setIsMovePickerOpen(true)}
              className="py-2.5 px-3 rounded-xl bg-[#142134] hover:bg-[#1a2c47] border border-[#20324e] text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <FolderInput className="w-3.5 h-3.5 text-emerald-400" />
              <span>Move</span>
            </button>
          </div>

          {/* Move Picker Popover */}
          {isMovePickerOpen && (
            <div className="bg-[#121c2e] border border-blue-500/40 rounded-2xl p-3 space-y-2 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1f2f49] text-xs font-semibold text-white">
                <span className="flex items-center gap-1.5">
                  <FolderInput className="w-3.5 h-3.5 text-blue-400" />
                  <span>Choose Destination</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMovePickerOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => handleSelectDestination(null)}
                  className="w-full text-left p-2 rounded-lg bg-[#162438] hover:bg-[#1d304a] text-xs text-white flex items-center gap-2 transition-colors"
                >
                  <Folder className="w-3.5 h-3.5 text-blue-400" />
                  <span>Root (All Files)</span>
                </button>

                {availableFolders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectDestination(f.id)}
                    className="w-full text-left p-2 rounded-lg bg-[#162438] hover:bg-[#1d304a] text-xs text-white flex items-center gap-2 transition-colors"
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Basic Details List */}
          <div className="bg-[#121c2d] border border-[#1f2f49] rounded-2xl p-4 space-y-2.5 text-xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              File Details
            </h4>

            <div className="flex items-center justify-between py-1 border-b border-[#1b2b42]">
              <span className="text-slate-400">File Type</span>
              <span className="font-semibold text-white capitalize">{file.type} ({ext})</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#1b2b42]">
              <span className="text-slate-400">File Size</span>
              <span className="font-semibold text-white">{file.formattedSize} ({file.sizeBytes.toLocaleString()} bytes)</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#1b2b42]">
              <span className="text-slate-400">Date Added</span>
              <div className="flex items-center gap-1 font-semibold text-white">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{file.date}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Favorite</span>
              <span className={`font-semibold ${file.isFavorite ? 'text-amber-400' : 'text-slate-400'}`}>
                {file.isFavorite ? 'Starred (In Favourites)' : 'Not Starred'}
              </span>
            </div>
          </div>

          {/* Permanent Delete Confirmation Dialog if triggered */}
          {showPermanentDeleteConfirm && (
            <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Delete Permanently Forever?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                This file will be completely wiped from storage and cloud records forever. This cannot be undone.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPermanentDeleteConfirm(false)}
                  className="flex-1 py-1.5 rounded-lg bg-[#162338] text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeletePermanently) {
                      onDeletePermanently(file.id);
                    } else if (onDeleteFile) {
                      onDeleteFile(file.id);
                    }
                    onClose();
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions Toolbar */}
        <div className="p-4 bg-[#0d1522] border-t border-[#1d2d47] flex items-center gap-2">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(file.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                file.isFavorite
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-[#152338] border-[#223654] text-slate-300 hover:bg-[#1a2d47]'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{file.isFavorite ? 'Starred' : 'Favorite'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (file.url) {
                const a = document.createElement('a');
                a.href = file.url;
                a.download = file.name;
                a.click();
              } else {
                showFeedback(`Downloaded ${file.name}`);
              }
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          {/* Delete to Recycle Bin */}
          {onDeleteFile && (
            <button
              type="button"
              onClick={() => {
                onDeleteFile(file.id);
                onClose();
              }}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors"
              title="Move to Recycle Bin"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Delete Permanently (সারা জীবনের জন্য ডিলিট) */}
          {onDeletePermanently && (
            <button
              type="button"
              onClick={() => setShowPermanentDeleteConfirm(true)}
              className="py-2.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Delete Permanently Forever"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Forever</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
