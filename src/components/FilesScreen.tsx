import React, { useState, useRef } from 'react';
import {
  Search,
  Grid as GridIcon,
  List as ListIcon,
  Folder,
  Music,
  Image as ImageIcon,
  Video,
  FileText,
  MoreVertical,
  Star,
  Trash2,
  Download,
  CheckSquare,
  Square,
  Check,
  FolderInput,
  X,
  Upload,
  Plus,
  Edit2,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { CloudFile, FileType } from '../types';

interface FilesScreenProps {
  files: CloudFile[];
  onOpenSearch: () => void;
  onToggleFavorite: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onDeletePermanently?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkDeletePermanently?: (ids: string[]) => void;
  onBulkFavorite?: (ids: string[], makeFavorite: boolean) => void;
  onBulkMove?: (ids: string[], destinationFolderId: string | null) => void;
  onBulkCopy?: (ids: string[]) => void;
  onRenameFile?: (id: string, newName: string) => void;
  onCopyFile?: (file: CloudFile) => void;
  onMoveFile?: (id: string, destinationFolderId: string | null) => void;
  onOpenFolder?: (folder: CloudFile) => void;
  onPlayAudio?: (file: CloudFile) => void;
  onOpenFilePreview?: (file: CloudFile) => void;
  onUploadMultipleFiles?: (files: File[]) => void;
  initialFilter?: string;
}

export const FilesScreen: React.FC<FilesScreenProps> = ({
  files,
  onOpenSearch,
  onToggleFavorite,
  onDeleteFile,
  onDeletePermanently,
  onBulkDelete,
  onBulkDeletePermanently,
  onBulkFavorite,
  onBulkMove,
  onBulkCopy,
  onRenameFile,
  onCopyFile,
  onMoveFile,
  onOpenFolder,
  onPlayAudio,
  onOpenFilePreview,
  onUploadMultipleFiles,
  initialFilter = 'all',
}) => {
  const [filter, setFilter] = useState<string>(initialFilter);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Bulk selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Folder Move Modal state
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [singleMoveFileId, setSingleMoveFileId] = useState<string | null>(null);

  // Rename modal state
  const [fileToRename, setFileToRename] = useState<CloudFile | null>(null);
  const [renameInputValue, setRenameInputValue] = useState<string>('');

  // Active action menu popover
  const [activeMenuFileId, setActiveMenuFileId] = useState<string | null>(null);

  // Permanent delete confirmation modal
  const [permanentDeleteTargetIds, setPermanentDeleteTargetIds] = useState<string[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filterTabs = [
    { id: 'all', label: 'All', icon: null },
    { id: 'image', label: 'Images', icon: <ImageIcon className="w-3.5 h-3.5 mr-1" /> },
    { id: 'video', label: 'Videos', icon: <Video className="w-3.5 h-3.5 mr-1" /> },
    { id: 'audio', label: 'Audios', icon: <Music className="w-3.5 h-3.5 mr-1" /> },
    { id: 'document', label: 'Documents', icon: <FileText className="w-3.5 h-3.5 mr-1" /> },
  ];

  const filteredFiles = files.filter((f) => {
    if (filter === 'all') return true;
    if (filter === 'image') return f.type === 'image';
    if (filter === 'video') return f.type === 'video';
    if (filter === 'audio') return f.type === 'audio';
    if (filter === 'document') return f.type === 'document';
    return true;
  });

  const availableFolders = files.filter((f) => f.type === 'folder');

  // Selection handlers
  const toggleSelectFile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleExitSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleItemClick = (file: CloudFile) => {
    if (isSelectionMode) {
      toggleSelectFile(file.id);
      return;
    }

    if (file.type === 'folder' && onOpenFolder) {
      onOpenFolder(file);
    } else if (file.type === 'audio' && onPlayAudio) {
      onPlayAudio(file);
    } else if (onOpenFilePreview) {
      onOpenFilePreview(file);
    }
  };

  // Open Rename Dialog
  const handleOpenRename = (file: CloudFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveMenuFileId(null);
    setFileToRename(file);
    setRenameInputValue(file.name);
  };

  // Save Rename
  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileToRename && renameInputValue.trim() && onRenameFile) {
      onRenameFile(fileToRename.id, renameInputValue.trim());
      setFileToRename(null);
      setRenameInputValue('');
    }
  };

  // Handle single copy
  const handleSingleCopy = (file: CloudFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveMenuFileId(null);
    if (onCopyFile) {
      onCopyFile(file);
    }
  };

  // Handle single move
  const handleOpenSingleMove = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveMenuFileId(null);
    setSingleMoveFileId(fileId);
    setIsMoveModalOpen(true);
  };

  // Bulk actions
  const handleExecuteBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onBulkDelete) {
      onBulkDelete(ids);
    } else {
      ids.forEach((id) => onDeleteFile(id));
    }
    handleExitSelection();
  };

  // Bulk Permanent Delete (সারা জীবনের জন্য ডিলিট)
  const handleExecuteBulkPermanentDelete = () => {
    if (!permanentDeleteTargetIds || permanentDeleteTargetIds.length === 0) return;
    if (onBulkDeletePermanently) {
      onBulkDeletePermanently(permanentDeleteTargetIds);
    } else if (onDeletePermanently) {
      permanentDeleteTargetIds.forEach((id) => onDeletePermanently(id));
    }
    setPermanentDeleteTargetIds(null);
    handleExitSelection();
  };

  const handleExecuteBulkCopy = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onBulkCopy) {
      onBulkCopy(ids);
    } else if (onCopyFile) {
      const filesToCopy = files.filter((f) => selectedIds.has(f.id));
      filesToCopy.forEach((f) => onCopyFile(f));
    }
    handleExitSelection();
  };

  const handleExecuteBulkFavorite = (makeFav: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onBulkFavorite) {
      onBulkFavorite(ids, makeFav);
    } else {
      ids.forEach((id) => onToggleFavorite(id));
    }
    handleExitSelection();
  };

  const handleExecuteMove = (destinationFolderId: string | null) => {
    if (singleMoveFileId) {
      if (onMoveFile) onMoveFile(singleMoveFileId, destinationFolderId);
      setSingleMoveFileId(null);
    } else if (selectedIds.size > 0) {
      const ids = Array.from(selectedIds);
      if (onBulkMove) {
        onBulkMove(ids, destinationFolderId);
      }
      handleExitSelection();
    }
    setIsMoveModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUploadMultipleFiles) {
      onUploadMultipleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-400" />;
      case 'audio':
        return <Music className="w-5 h-5 text-amber-400" />;
      case 'folder':
        return <Folder className="w-5 h-5 text-sky-400" />;
      default:
        return <FileText className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 text-white relative">
      {/* Hidden Multi-file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
            All Files
          </h1>
          <p className="text-[12px] text-slate-400">
            {filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''} available
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Select Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isSelectionMode) {
                handleExitSelection();
              } else {
                setIsSelectionMode(true);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isSelectionMode
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-[#131f32] border-[#20324e] text-slate-300 hover:text-white'
            }`}
          >
            {isSelectionMode ? 'Cancel' : 'Select'}
          </button>

          {/* Search Icon */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-10 h-10 rounded-full bg-[#131f32] border border-[#20324e] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Filter Pills & View Toggles */}
      <div className="flex items-center justify-between gap-2 pb-2.5 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {filterTabs.map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'bg-[#142134] text-slate-400 hover:text-slate-200 border border-[#1e2f4a]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grid / List Switcher */}
        <div className="flex items-center bg-[#142134] border border-[#1e2f4a] rounded-xl p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-[#223554] text-blue-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Grid view"
          >
            <GridIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-[#223554] text-blue-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="List view"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selection Toolbar Banner when in selection mode */}
      {isSelectionMode && (
        <div className="bg-[#12233f] border border-blue-500/40 rounded-2xl px-4 py-2.5 mb-3 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 font-semibold text-blue-300 hover:text-white"
            >
              {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{selectedIds.size === filteredFiles.length ? 'Deselect All' : 'Select All'}</span>
            </button>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300 font-medium">
              {selectedIds.size} of {filteredFiles.length} selected
            </span>
          </div>

          <button
            type="button"
            onClick={handleExitSelection}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Files List / Grid */}
      {filteredFiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-[#142134] border border-[#20324e] flex items-center justify-center mb-3">
            <Folder className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No files found</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-[240px]">
            {filter !== 'all' ? `No ${filter}s in your cloud storage yet.` : 'Start by uploading your files or photos.'}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#3658dc] hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 gap-3">
          {filteredFiles.map((file) => {
            const isSelected = selectedIds.has(file.id);
            const isMenuOpen = activeMenuFileId === file.id;

            return (
              <div
                key={file.id}
                onClick={() => handleItemClick(file)}
                className={`group relative bg-[#121c2c] hover:bg-[#162338] border rounded-2xl p-3 cursor-pointer transition-all flex flex-col justify-between min-h-[148px] select-none ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50 bg-[#162847]'
                    : 'border-[#1f3049]'
                }`}
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'border border-slate-500 bg-[#0b1322]'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                )}

                {/* Top Action & Star & Three-dot menu */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelectionMode ? 'ml-6' : ''} ${
                    file.type === 'image' ? 'bg-[#15233c] text-blue-400' :
                    file.type === 'video' ? 'bg-[#25173c] text-purple-400' :
                    file.type === 'audio' ? 'bg-[#291e10] text-amber-400' :
                    file.type === 'folder' ? 'bg-[#16263f] text-sky-400' :
                    'bg-[#0f2923] text-emerald-400'
                  }`}>
                    {getFileIcon(file.type)}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(file.id);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                      title={file.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    >
                      <Star className={`w-4 h-4 ${file.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {/* Three-dot Action Trigger */}
                    {!isSelectionMode && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuFileId(isMenuOpen ? null : file.id);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a2d47] transition-colors"
                          title="More actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 z-30 w-44 bg-[#101b2d] border border-[#203454] rounded-2xl p-1.5 shadow-2xl text-xs space-y-1 animate-in zoom-in-95"
                          >
                            <button
                              type="button"
                              onClick={(e) => handleOpenRename(file, e)}
                              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#182944] text-slate-200 flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                              <span>Rename</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleSingleCopy(file, e)}
                              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#182944] text-slate-200 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5 text-blue-400" />
                              <span>Copy</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenSingleMove(file.id, e)}
                              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#182944] text-slate-200 flex items-center gap-2"
                            >
                              <FolderInput className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Move</span>
                            </button>

                            <div className="border-t border-[#1b2b42] my-1" />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuFileId(null);
                                onDeleteFile(file.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-rose-500/15 text-rose-300 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Recycle Bin</span>
                            </button>

                            {onDeletePermanently && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuFileId(null);
                                  setPermanentDeleteTargetIds([file.id]);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-rose-600/25 text-rose-400 font-semibold flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Delete Forever</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* File info */}
                <div>
                  <h4 className="text-xs font-semibold text-white truncate mb-0.5" title={file.name}>
                    {file.name}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{file.formattedSize}</span>
                    <span>{file.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const isSelected = selectedIds.has(file.id);
            const isMenuOpen = activeMenuFileId === file.id;

            return (
              <div
                key={file.id}
                onClick={() => handleItemClick(file)}
                className={`group flex items-center justify-between bg-[#121c2c] hover:bg-[#162338] border rounded-2xl p-3 cursor-pointer transition-all select-none relative ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50 bg-[#162847]'
                    : 'border-[#1f3049]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'border border-slate-500 bg-[#0b1322]'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  )}

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    file.type === 'image' ? 'bg-[#15233c] text-blue-400' :
                    file.type === 'video' ? 'bg-[#25173c] text-purple-400' :
                    file.type === 'audio' ? 'bg-[#291e10] text-amber-400' :
                    file.type === 'folder' ? 'bg-[#16263f] text-sky-400' :
                    'bg-[#0f2923] text-emerald-400'
                  }`}>
                    {getFileIcon(file.type)}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {file.formattedSize} • {file.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(file.id);
                    }}
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    <Star className={`w-4 h-4 ${file.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>

                  {!isSelectionMode && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuFileId(isMenuOpen ? null : file.id);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a2d47] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-7 z-30 w-44 bg-[#101b2d] border border-[#203454] rounded-2xl p-1.5 shadow-2xl text-xs space-y-1 animate-in zoom-in-95"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleOpenRename(file, e)}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#182944] text-slate-200 flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                            <span>Rename</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleSingleCopy(file, e)}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#182944] text-slate-200 flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5 text-blue-400" />
                            <span>Copy</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleOpenSingleMove(file.id, e)}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#182944] text-slate-200 flex items-center gap-2"
                          >
                            <FolderInput className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Move</span>
                          </button>

                          <div className="border-t border-[#1b2b42] my-1" />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuFileId(null);
                              onDeleteFile(file.id);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-rose-500/15 text-rose-300 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Recycle Bin</span>
                          </button>

                          {onDeletePermanently && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuFileId(null);
                                setPermanentDeleteTargetIds([file.id]);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-rose-600/25 text-rose-400 font-semibold flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Delete Forever</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bulk Action Toolbar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-[410px] mx-auto bg-[#101b2e]/95 backdrop-blur-xl border border-blue-500/50 rounded-2xl p-2.5 shadow-2xl flex items-center justify-between text-white animate-in slide-in-from-bottom-5">
          <div className="text-xs font-semibold text-sky-300 pl-1 shrink-0">
            {selectedIds.size} selected
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {/* If exactly 1 file selected, show Rename button */}
            {selectedIds.size === 1 && (
              <button
                type="button"
                onClick={() => {
                  const targetId = Array.from(selectedIds)[0];
                  const targetFile = files.find((f) => f.id === targetId);
                  if (targetFile) handleOpenRename(targetFile);
                }}
                className="flex items-center gap-1 bg-[#182945] hover:bg-[#20375c] border border-[#2b446e] px-2 py-1.5 rounded-xl text-xs font-medium text-sky-300 transition-colors shrink-0"
                title="Rename file"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Rename</span>
              </button>
            )}

            {/* Bulk Favorite */}
            <button
              type="button"
              onClick={() => handleExecuteBulkFavorite(true)}
              className="flex items-center gap-1 bg-[#182945] hover:bg-[#20375c] border border-[#2b446e] px-2 py-1.5 rounded-xl text-xs font-medium text-amber-300 transition-colors shrink-0"
              title="Add all to Favorites"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>Fav</span>
            </button>

            {/* Bulk Copy (New!) */}
            <button
              type="button"
              onClick={handleExecuteBulkCopy}
              className="flex items-center gap-1 bg-[#182945] hover:bg-[#20375c] border border-[#2b446e] px-2 py-1.5 rounded-xl text-xs font-medium text-blue-300 transition-colors shrink-0"
              title="Copy selected files"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>

            {/* Bulk Move */}
            <button
              type="button"
              onClick={() => {
                setSingleMoveFileId(null);
                setIsMoveModalOpen(true);
              }}
              className="flex items-center gap-1 bg-[#182945] hover:bg-[#20375c] border border-[#2b446e] px-2 py-1.5 rounded-xl text-xs font-medium text-emerald-300 transition-colors shrink-0"
              title="Move selected files to a folder"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Move</span>
            </button>

            {/* Bulk Delete to Recycle Bin */}
            <button
              type="button"
              onClick={handleExecuteBulkDelete}
              className="flex items-center gap-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 px-2 py-1.5 rounded-xl text-xs font-medium text-rose-300 transition-colors shrink-0"
              title="Move selected files to Recycle Bin"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bin</span>
            </button>

            {/* Bulk Permanent Delete (সারা জীবনের জন্য ডিলিট) */}
            <button
              type="button"
              onClick={() => setPermanentDeleteTargetIds(Array.from(selectedIds))}
              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-500 text-white px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 shadow-md"
              title="Permanently Delete Forever"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Forever</span>
            </button>
          </div>
        </div>
      )}

      {/* RENAME MODAL DIALOG */}
      {fileToRename && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmRename}
            className="bg-[#121c2e] border border-[#20324e] rounded-3xl p-5 max-w-[360px] w-full space-y-4 text-white shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#1f2f4a]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Rename {fileToRename.type}</h3>
              </div>
              <button
                type="button"
                onClick={() => setFileToRename(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Name
              </label>
              <input
                type="text"
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
                required
                autoFocus
                className="w-full bg-[#162338] border border-[#273d61] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1f2f4a]">
              <button
                type="button"
                onClick={() => setFileToRename(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MOVE DESTINATION MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-[#20324e] rounded-2xl p-5 max-w-[360px] w-full text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2f4a] mb-3">
              <div className="flex items-center gap-2">
                <FolderInput className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Move {singleMoveFileId ? '1 file' : `${selectedIds.size} files`} to...
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMoveModalOpen(false);
                  setSingleMoveFileId(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 py-2 max-h-[220px] overflow-y-auto">
              <button
                type="button"
                onClick={() => handleExecuteMove(null)}
                className="w-full text-left p-2.5 rounded-xl bg-[#17253b] hover:bg-[#1f324f] border border-[#233857] flex items-center gap-2.5 text-xs text-white transition-colors"
              >
                <Folder className="w-4 h-4 text-blue-400" />
                <span>Root Directory (All Files)</span>
              </button>

              {availableFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => handleExecuteMove(folder.id)}
                  className="w-full text-left p-2.5 rounded-xl bg-[#17253b] hover:bg-[#1f324f] border border-[#233857] flex items-center gap-2.5 text-xs text-white transition-colors"
                >
                  <Folder className="w-4 h-4 text-amber-400" />
                  <span>{folder.name}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1f2f4a] mt-3">
              <button
                type="button"
                onClick={() => {
                  setIsMoveModalOpen(false);
                  setSingleMoveFileId(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION DIALOG */}
      {permanentDeleteTargetIds && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-rose-500/40 rounded-3xl p-5 max-w-[360px] w-full text-white space-y-3.5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Forever (সারা জীবনের জন্য ডিলিট)</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete {permanentDeleteTargetIds.length} item(s) permanently? They will bypass the recycle bin and be erased forever.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1f2f4a]">
              <button
                type="button"
                onClick={() => setPermanentDeleteTargetIds(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkPermanentDelete}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md"
              >
                Yes, Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
