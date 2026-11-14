import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Lock,
  Sparkles,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  Calendar,
  HardDrive,
  ArrowDownAZ,
  Archive,
  Info,
  Share2,
} from 'lucide-react';
import { CloudFile, FileType, FileVersion } from '../types';
import { ViewMode, toggleViewMode, normalizeViewMode } from '../utils/fileView';
import { SortKey, SortOrder, SORT_OPTIONS, sortFiles } from '../utils/fileSort';
import {
  getFileAccentTheme,
  summarizeSelectedFiles,
  buildBulkShareText,
} from '../utils/fileBulkActions';
import { FileInfoModal } from './Modals';

interface FilesScreenProps {
  files: CloudFile[];
  isLocked?: boolean;
  onOpenPayment?: () => void;
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
  onClearAllFiles?: () => void;
  onRestoreVersion?: (file: CloudFile, version: FileVersion) => void;
  onUploadNewVersion?: (file: CloudFile, newFile: File) => void;
  initialFilter?: string;
  initialFolderId?: string | null;
  onSelectionStateChange?: (active: boolean) => void;
}

export const FilesScreen: React.FC<FilesScreenProps> = ({
  files,
  isLocked = false,
  onOpenPayment,
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
  onRestoreVersion,
  onUploadNewVersion,
  initialFilter = 'all',
  initialFolderId = null,
  onSelectionStateChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedInfoFile, setSelectedInfoFile] = useState<CloudFile | null>(null);
  const [filter, setFilter] = useState<string>(initialFilter);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(initialFolderId ?? null);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    setActiveFolderId(initialFolderId ?? null);
  }, [initialFolderId]);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('bashar_cloud_files_view');
      return normalizeViewMode(saved, 'grid');
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('bashar_cloud_files_view', mode);
    } catch {}
  };

  const handleToggleViewMode = () => {
    const next = toggleViewMode(viewMode);
    handleSetViewMode(next);
  };

  // Sorting state (name, date, size) with localStorage persistence
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    try {
      const saved = localStorage.getItem('bashar_cloud_files_sort_key');
      if (saved === 'name' || saved === 'date' || saved === 'size') return saved;
    } catch {}
    return 'date';
  });

  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    try {
      const saved = localStorage.getItem('bashar_cloud_files_sort_order');
      if (saved === 'asc' || saved === 'desc') return saved;
    } catch {}
    return 'desc';
  });

  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);

  const handleSelectSort = (key: SortKey, order: SortOrder) => {
    setSortKey(key);
    setSortOrder(order);
    setIsSortMenuOpen(false);
    try {
      localStorage.setItem('bashar_cloud_files_sort_key', key);
      localStorage.setItem('bashar_cloud_files_sort_order', order);
    } catch {}
  };

  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Share modal & bulk action toast state
  const [shareModalFiles, setShareModalFiles] = useState<CloudFile[] | null>(null);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  // Lockout modal state
  const [showLockModal, setShowLockModal] = useState<boolean>(false);
  const [lockModalAction, setLockModalAction] = useState<string>('দেখা বা ব্যবহার');

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

  useEffect(() => {
    onSelectionStateChange?.(isSelectionMode || selectedIds.size > 0);
  }, [isSelectionMode, selectedIds.size, onSelectionStateChange]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(files.map((f) => f.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [files]);

  const filterTabs = [
    { id: 'all', label: 'All', icon: null },
    { id: 'image', label: 'Images', icon: <ImageIcon className="w-3.5 h-3.5 mr-1" /> },
    { id: 'video', label: 'Videos', icon: <Video className="w-3.5 h-3.5 mr-1" /> },
    { id: 'audio', label: 'Audios', icon: <Music className="w-3.5 h-3.5 mr-1" /> },
    { id: 'document', label: 'Documents', icon: <FileText className="w-3.5 h-3.5 mr-1" /> },
    { id: 'archive', label: 'ZIP Files', icon: <Archive className="w-3.5 h-3.5 mr-1" /> },
  ];

  const activeFolder = useMemo(
    () => (activeFolderId ? files.find((f) => f.id === activeFolderId && f.type === 'folder') || null : null),
    [files, activeFolderId]
  );

  // Filter and sort files by folder, type, key (name, date, size) and order (asc, desc)
  const filteredFiles = useMemo(() => {
    const filtered = files.filter((f) => {
      if (filter === 'all') {
        const folderTarget = activeFolder ? activeFolder.id : null;
        return (f.parentFolderId ?? null) === folderTarget && f.id !== folderTarget;
      }
      if (filter === 'image') return f.type === 'image';
      if (filter === 'video') return f.type === 'video';
      if (filter === 'audio') return f.type === 'audio';
      if (filter === 'document') return f.type === 'document';
      if (filter === 'archive') return f.type === 'archive';
      return true;
    });
    return sortFiles(filtered, sortKey, sortOrder, true);
  }, [files, filter, activeFolder, sortKey, sortOrder]);

  const availableFolders = files.filter((f) => f.type === 'folder');
  const activeInfoFile = selectedInfoFile
    ? files.find((f) => f.id === selectedInfoFile.id) || selectedInfoFile
    : null;

  const requireUnlocked = (actionLabel: string): boolean => {
    if (isLocked) {
      setLockModalAction(actionLabel);
      setShowLockModal(true);
      return false;
    }
    return true;
  };

  // Selection handlers
  const toggleSelectFile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size > 0) {
        setIsSelectionMode(true);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
      setIsSelectionMode(true);
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

    if (!requireUnlocked('ফাইল দেখতে')) return;

    if (file.type === 'folder') {
      setActiveFolderId(file.id);
      setFilter('all');
      if (onOpenFolder) onOpenFolder(file);
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
    if (!requireUnlocked('নাম পরিবর্তন করতে')) return;
    setFileToRename(file);
    setRenameInputValue(file.name);
  };

  // Save Rename
  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireUnlocked('নাম পরিবর্তন করতে')) return;
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
    if (!requireUnlocked('কপি করতে')) return;
    if (onCopyFile) {
      onCopyFile(file);
    }
  };

  // Handle single move
  const handleOpenSingleMove = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveMenuFileId(null);
    if (!requireUnlocked('মুভ করতে')) return;
    setSingleMoveFileId(fileId);
    setIsMoveModalOpen(true);
  };

  // Bulk actions
  const handleExecuteBulkDelete = () => {
    if (!requireUnlocked('ডিলিট করতে')) return;
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
    if (!requireUnlocked('ডিলিট করতে')) return;
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
    if (!requireUnlocked('কপি করতে')) return;
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
    if (!requireUnlocked('মুভ করতে')) return;
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
    if (!requireUnlocked('ফাইল আপলোড করতে')) {
      e.target.value = '';
      return;
    }
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
      case 'archive':
        return <Archive className="w-5 h-5 text-amber-400" />;
      default:
        return <FileText className="w-5 h-5 text-emerald-400" />;
    }
  };

  const selectionSummary = useMemo(
    () => summarizeSelectedFiles(files, selectedIds),
    [files, selectedIds]
  );

  const handleExecuteBulkShare = async () => {
    if (!requireUnlocked('শেয়ার করতে')) return;
    const targets = selectionSummary.selectedFiles;
    if (targets.length === 0) return;

    const shareText = buildBulkShareText(targets, 'Bashar Cloud');
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Bashar Cloud — ${targets.length} File${targets.length > 1 ? 's' : ''}`,
          text: shareText,
        });
        handleExitSelection();
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    setShareCopied(false);
    setShareModalFiles(targets);
  };

  const handleExecuteBulkDownload = () => {
    if (!requireUnlocked('ডাউনলোড করতে')) return;
    const targets = selectionSummary.selectedFiles.filter((f) => f.type !== 'folder');
    if (targets.length === 0) return;

    targets.forEach((file, index) => {
      setTimeout(() => {
        let href = file.url || '';
        let shouldRevoke = false;
        if (!href && typeof file.content === 'string') {
          const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
          href = URL.createObjectURL(blob);
          shouldRevoke = true;
        }
        if (!href) return;
        const a = document.createElement('a');
        a.href = href;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (shouldRevoke) {
          setTimeout(() => URL.revokeObjectURL(href), 1500);
        }
      }, index * 180);
    });
    handleExitSelection();
  };

  const handleCopyShareSummary = async () => {
    if (!shareModalFiles || shareModalFiles.length === 0) return;
    const text = buildBulkShareText(shareModalFiles, 'Bashar Cloud');
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {}
  };

  const isAllSelected = filteredFiles.length > 0 && selectedIds.size === filteredFiles.length;

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadMultipleFiles) {
      if (requireUnlocked('ফাইল আপলোড করতে')) {
        onUploadMultipleFiles(Array.from(e.dataTransfer.files));
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col px-4 pt-3 text-white relative ${
        selectedIds.size > 0 ? 'pb-3' : 'pb-24'
      }`}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-950/90 backdrop-blur-md border-2 border-dashed border-blue-400 rounded-3xl m-2 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400 flex items-center justify-center text-blue-300 mb-3 animate-bounce">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">ফাইলগুলো এখানে ছেড়ে দিন (Drop Files Here)</h3>
          <p className="text-xs text-blue-200">ফাইলগুলো সরাসরি Bashar Cloud ড্রাইভে আপলোড ও সেভ হবে</p>
        </div>
      )}

      {/* Hidden Multi-file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {activeFolder && filter === 'all' && (
              <button
                type="button"
                onClick={() => setActiveFolderId(activeFolder.parentFolderId ?? null)}
                className="w-8 h-8 rounded-xl bg-[#131f32] border border-[#20324e] flex items-center justify-center text-slate-300 hover:text-white shrink-0 cursor-pointer"
                title="Back to parent folder"
                aria-label="Back to parent folder"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-white leading-tight truncate">
              {activeFolder && filter === 'all' ? activeFolder.name : 'All Files'}
            </h1>
          </div>
          <p className="text-[12px] text-slate-400">
            {filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''} available
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle Button: Switch between list view and grid view */}
          <button
            type="button"
            onClick={handleToggleViewMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              viewMode === 'grid'
                ? 'bg-[#15233c] border-blue-500/40 text-blue-300 hover:bg-[#1a2c4b] shadow-sm'
                : 'bg-[#15233c] border-sky-500/40 text-sky-300 hover:bg-[#1a2c4b] shadow-sm'
            }`}
            title={viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
            aria-label={viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
          >
            {viewMode === 'grid' ? (
              <>
                <ListIcon className="w-4 h-4 text-blue-400" />
                <span>List</span>
              </>
            ) : (
              <>
                <GridIcon className="w-4 h-4 text-sky-400" />
                <span>Grid</span>
              </>
            )}
          </button>

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
            aria-pressed={isSelectionMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isSelectionMode
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-md shadow-blue-900/40'
                : 'bg-[#131f32] border-[#20324e] text-slate-300 hover:text-white hover:border-blue-500/40'
            }`}
          >
            {isSelectionMode ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>Select</span>
              </>
            )}
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

      {/* Select All Checkbox & Quick Control Bar */}
      {filteredFiles.length > 0 && (
        <div className="bg-[#121c2e] border border-[#1f2f48] rounded-xl px-3 py-2 mb-2 flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded text-blue-600 bg-[#162338] border-slate-500 focus:ring-0 cursor-pointer"
            />
            <span className="font-semibold text-slate-200">
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </span>
          </label>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-sky-300 font-bold bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                {selectedIds.size} selected
              </span>
            )}

            {/* Sorting Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSortMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#142134] hover:bg-[#1a2d48] border border-[#1e2f4a] text-slate-300 hover:text-white transition-colors text-xs font-medium cursor-pointer"
                title="Sort files by name, date, or size"
                aria-label="Sort files"
                aria-expanded={isSortMenuOpen}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-medium hidden xs:inline">
                  {sortKey === 'name' ? 'Name' : sortKey === 'size' ? 'Size' : 'Date'}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isSortMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSortMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-[#0e1726] border border-[#1f3250] rounded-2xl p-1.5 shadow-2xl text-xs space-y-1 animate-in zoom-in-95 backdrop-blur-md"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1b2b42] mb-1">
                      Sort Files By (সাজান)
                    </div>

                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = sortKey === opt.key && sortOrder === opt.order;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectSort(opt.key, opt.order)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                              : 'hover:bg-[#16253c] text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {opt.key === 'name' && <ArrowDownAZ className="w-3.5 h-3.5 text-sky-400" />}
                            {opt.key === 'date' && <Calendar className="w-3.5 h-3.5 text-amber-400" />}
                            {opt.key === 'size' && <HardDrive className="w-3.5 h-3.5 text-emerald-400" />}
                            <span>{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Grid / List Switcher */}
            <div className="flex items-center bg-[#142134] border border-[#1e2f4a] rounded-lg p-0.5 shrink-0" role="group" aria-label="View toggle">
              <button
                type="button"
                onClick={() => handleSetViewMode('grid')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs font-medium ${
                  viewMode === 'grid' ? 'bg-[#223554] text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid view (Better for images)"
                aria-label="Grid view"
              >
                <GridIcon className="w-3.5 h-3.5" />
                <span className="text-[11px]">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('list')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs font-medium ${
                  viewMode === 'list' ? 'bg-[#223554] text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="List view"
                aria-label="List view"
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span className="text-[11px]">List</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Filter Pills */}
      <div className="flex items-center gap-2 pb-2.5 pt-0.5 overflow-x-auto no-scrollbar">
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

      {/* Lock banner if expired */}
      {isLocked && (
        <div className="bg-gradient-to-r from-rose-950/70 to-[#2c1319] border border-rose-500/50 rounded-2xl p-3 mb-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-rose-200">১ মাসের ফ্রি ট্রায়াল শেষ হয়েছে</h4>
              <p className="text-[10px] text-slate-300">ফাইল দেখতে ও আনলক করতে ১০০ টাকা পেমেন্ট সম্পন্ন করুন</p>
            </div>
          </div>
          {onOpenPayment && (
            <button
              type="button"
              onClick={onOpenPayment}
              className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>আনলক করুন</span>
            </button>
          )}
        </div>
      )}

      {/* Folder Breadcrumb Bar when inside a subfolder */}
      {activeFolder && filter === 'all' && (
        <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#111b2c] border border-[#1d2e4a] rounded-xl px-3 py-1.5 mb-2">
          <button
            type="button"
            onClick={() => setActiveFolderId(null)}
            className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
          >
            All Files
          </button>
          <span className="text-slate-500">/</span>
          <span className="text-white font-semibold truncate">{activeFolder.name}</span>
        </div>
      )}

      {/* Files List / Grid */}
      {filteredFiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 bg-[#121c2c]/60 rounded-3xl border border-[#1f3049]/60 my-2 shadow-inner">
          <div className="w-16 h-16 rounded-2xl bg-[#142134] border border-[#20324e] flex items-center justify-center mb-3 text-slate-400">
            <Folder className="w-8 h-8 text-blue-400/80" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {activeFolder && filter === 'all'
              ? `"${activeFolder.name}" ফোল্ডারটি খালি`
              : filter !== 'all'
              ? `কোনো ${filter} ফাইল নেই`
              : 'আপনার ক্লাউড ড্রাইভ সম্পূর্ণ খালি'}
          </h3>
          <p className="text-xs text-slate-400 mb-4 max-w-[280px] leading-relaxed">
            {filter !== 'all'
              ? 'এই ক্যাটাগরিতে কোনো ফাইল নেই। নতুন ফাইল আপলোড করুন।'
              : 'এখানে আপনার আপলোড করা বা তৈরি করা ফাইলগুলো সুরক্ষিত থাকবে। শুরু করতে নতুন ফাইল আপলোড করুন।'}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-[260px]">
            <button
              type="button"
              onClick={() => {
                if (requireUnlocked('ফাইল আপলোড করতে')) {
                  fileInputRef.current?.click();
                }
              }}
              className="w-full bg-[#3658dc] hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>ফাইল আপলোড (Upload Files)</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 gap-3 pb-3">
          {filteredFiles.map((file) => {
            const isSelected = selectedIds.has(file.id);
            const isMenuOpen = activeMenuFileId === file.id;
            const accent = getFileAccentTheme(file.type);

            return (
              <div
                key={file.id}
                onClick={() => handleItemClick(file)}
                className={`group orbit-card relative overflow-hidden bg-[#121c2c] hover:bg-[#162338] rounded-2xl cursor-pointer transition-all flex flex-col justify-between select-none shadow-md ${
                  isSelected
                    ? 'ring-2 ring-blue-500/80 bg-[#162847]'
                    : ''
                }`}
              >
                <div className="p-2.5 flex flex-col justify-between flex-1 relative z-10">
                  {/* Top Action & Type Badge & Star & Three-dot menu */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        aria-label={isSelected ? `Deselect ${file.name}` : `Select ${file.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectFile(file.id);
                        }}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : isSelectionMode
                            ? 'border-2 border-sky-400/80 bg-[#0b1322]'
                            : 'opacity-55 group-hover:opacity-100 border border-slate-500 bg-[#0b1322]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <span
                        className={`text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded-md border ${accent.badgeClass}`}
                      >
                        {accent.shortTag}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(file.id);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
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
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a2d47] transition-colors cursor-pointer"
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuFileId(null);
                                  setSelectedInfoFile(file);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#182944] text-slate-200 flex items-center gap-2"
                              >
                                <Info className="w-3.5 h-3.5 text-amber-400" />
                                <span>তথ্য ও ভার্সন ইতিহাস</span>
                              </button>

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
                                  if (!requireUnlocked('ডিলিট করতে')) return;
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
                                    if (!requireUnlocked('ডিলিট করতে')) return;
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

                  {/* Visual Preview / Thumbnail Area */}
                  {file.type === 'image' ? (
                    <div className="w-full h-24 rounded-xl overflow-hidden bg-[#09111f] mb-2 relative flex items-center justify-center border border-[#1b2a42] group-hover:border-blue-500/50 transition-colors">
                      {(file.thumbnail || file.url) ? (
                        <img
                          src={file.url || file.thumbnail}
                          alt={file.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#12233f] to-[#0a111e] text-blue-400 p-2 text-center">
                          <ImageIcon className="w-7 h-7 mb-1 opacity-80" />
                          <span className="text-[10px] font-semibold text-blue-300">Photo Preview</span>
                        </div>
                      )}
                      <span className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-[9px] text-white font-medium px-1.5 py-0.5 rounded shadow">
                        {file.formattedSize}
                      </span>
                    </div>
                  ) : file.type === 'video' ? (
                    <div className="w-full h-24 rounded-xl overflow-hidden bg-[#0f0e1a] mb-2 relative flex items-center justify-center border border-[#2c1d3f] group-hover:border-purple-500/50 transition-colors">
                      {file.url ? (
                        <video src={file.url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#24133b] to-[#0f0e1a] text-purple-400 p-2 text-center">
                          <Video className="w-7 h-7 mb-1 opacity-80" />
                          <span className="text-[10px] font-semibold text-purple-300">Video</span>
                        </div>
                      )}
                      <span className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-[9px] text-white font-medium px-1.5 py-0.5 rounded shadow">
                        {file.formattedSize}
                      </span>
                    </div>
                  ) : (
                    <div className={`w-full h-20 rounded-xl flex flex-col items-center justify-center mb-2 border transition-all ${
                      file.type === 'audio' ? 'bg-[#291e10]/45 border-amber-500/25 text-amber-400' :
                      file.type === 'archive' ? 'bg-[#2a190d]/50 border-orange-500/25 text-orange-400' :
                      file.type === 'folder' ? 'bg-[#16263f]/45 border-sky-500/25 text-sky-400' :
                      'bg-[#0f2923]/45 border-emerald-500/25 text-emerald-400'
                    }`}>
                      {getFileIcon(file.type)}
                      <span className="text-[10px] font-semibold capitalize mt-1 opacity-85">
                        {file.type === 'folder'
                          ? `${files.filter((c) => c.parentFolderId === file.id).length} items`
                          : file.type}
                      </span>
                    </div>
                  )}

                  {/* File info */}
                  <div className="pt-0.5">
                    <h4 className="text-xs font-semibold text-white truncate mb-0.5" title={file.name}>
                      {file.name}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{file.formattedSize}</span>
                      <span>{file.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2 pb-3">
          {filteredFiles.map((file) => {
            const isSelected = selectedIds.has(file.id);
            const isMenuOpen = activeMenuFileId === file.id;
            const accent = getFileAccentTheme(file.type);

            return (
              <div
                key={file.id}
                onClick={() => handleItemClick(file)}
                className={`group orbit-card relative overflow-hidden bg-[#121c2c] hover:bg-[#162338] rounded-2xl cursor-pointer transition-all select-none shadow-sm ${
                  isSelected
                    ? 'ring-2 ring-blue-500/80 bg-[#162847]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {/* Selection Checkbox */}
                    <button
                      type="button"
                      aria-label={isSelected ? `Deselect ${file.name}` : `Select ${file.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectFile(file.id);
                      }}
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md'
                          : isSelectionMode
                          ? 'border-2 border-sky-400/80 bg-[#0b1322]'
                          : 'opacity-50 group-hover:opacity-100 border border-slate-500 bg-[#0b1322]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {file.type === 'image' && (file.url || file.thumbnail) ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[#1b2a42] bg-[#09111f]">
                        <img src={file.url || file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        file.type === 'image' ? 'bg-[#15233c] text-blue-400' :
                        file.type === 'video' ? 'bg-[#25173c] text-purple-400' :
                        file.type === 'audio' ? 'bg-[#291e10] text-amber-400' :
                        file.type === 'archive' ? 'bg-[#2a190d] text-orange-400' :
                        file.type === 'folder' ? 'bg-[#16263f] text-sky-400' :
                        'bg-[#0f2923] text-emerald-400'
                      }`}>
                        {getFileIcon(file.type)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <span
                          className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${accent.badgeClass}`}
                        >
                          {accent.shortTag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {file.formattedSize} • {file.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(file.id);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
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
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a2d47] transition-colors cursor-pointer"
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuFileId(null);
                                setSelectedInfoFile(file);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#182944] text-slate-200 flex items-center gap-2"
                            >
                              <Info className="w-3.5 h-3.5 text-amber-400" />
                              <span>তথ্য ও ভার্সন ইতিহাস</span>
                            </button>

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
                                if (!requireUnlocked('ডিলিট করতে')) return;
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
                                  if (!requireUnlocked('ডিলিট করতে')) return;
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
              </div>
            );
          })}
        </div>
      )}

      {/* Professional 2-Row Bulk Actions Dock (Sits cleanly directly ABOVE the 5 bottom navigation tabs) */}
      {selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Bulk file actions"
          className="orbit-card-vivid sticky bottom-2 z-30 mt-auto rounded-2xl overflow-hidden bg-[#0e182a]/95 backdrop-blur-xl shadow-2xl shadow-black/60 text-white animate-in fade-in slide-in-from-bottom-3"
        >
          {/* Compact Selection Status Strip */}
          <div className="px-3 py-1.5 border-b border-[#1c2d48] flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 font-bold text-sky-300 whitespace-nowrap">
                <Check className="w-3.5 h-3.5 text-blue-400" />
                {selectionSummary.count} selected
              </span>
              <span className="text-slate-400 truncate">• {selectionSummary.formattedTotalSize}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-0.5 rounded-lg bg-[#16253e] hover:bg-[#1d3152] border border-[#273e63] text-sky-300 font-semibold transition-colors cursor-pointer"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={handleExitSelection}
                aria-label="Clear selection"
                className="px-2 py-0.5 rounded-lg bg-[#1a273d] hover:bg-[#243452] text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Two Clean Rows of Bulk Actions */}
          <div className="p-2 space-y-1.5">
            {/* Row 1: Share, Move, Copy, Fav */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={handleExecuteBulkShare}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-gradient-to-b from-sky-500/20 to-blue-600/15 hover:from-sky-500/30 hover:to-blue-600/25 border border-sky-400/35 text-sky-200 transition-all active:scale-95 cursor-pointer"
                title="Share selected files"
              >
                <Share2 className="w-4 h-4 text-sky-400" />
                <span className="text-[10.5px] font-semibold leading-none">Share</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSingleMoveFileId(null);
                  setIsMoveModalOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-gradient-to-b from-emerald-500/20 to-teal-600/15 hover:from-emerald-500/30 hover:to-teal-600/25 border border-emerald-400/35 text-emerald-200 transition-all active:scale-95 cursor-pointer"
                title="Move selected files to folder"
              >
                <FolderInput className="w-4 h-4 text-emerald-400" />
                <span className="text-[10.5px] font-semibold leading-none">Move</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteBulkCopy}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-gradient-to-b from-blue-500/20 to-indigo-600/15 hover:from-blue-500/30 hover:to-indigo-600/25 border border-blue-400/35 text-blue-200 transition-all active:scale-95 cursor-pointer"
                title="Copy selected files"
              >
                <Copy className="w-4 h-4 text-blue-400" />
                <span className="text-[10.5px] font-semibold leading-none">Copy</span>
              </button>

              <button
                type="button"
                onClick={() => handleExecuteBulkFavorite(!selectionSummary.allFavorites)}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-gradient-to-b from-amber-500/20 to-orange-600/15 hover:from-amber-500/30 hover:to-orange-600/25 border border-amber-400/35 text-amber-200 transition-all active:scale-95 cursor-pointer"
                title={selectionSummary.allFavorites ? 'Remove from Favorites' : 'Add all to Favorites'}
              >
                <Star className={`w-4 h-4 text-amber-400 ${selectionSummary.allFavorites ? '' : 'fill-amber-400'}`} />
                <span className="text-[10.5px] font-semibold leading-none">
                  {selectionSummary.allFavorites ? 'Unfav' : 'Favorite'}
                </span>
              </button>
            </div>

            {/* Row 2: Download, Rename, Recycle Bin, Delete Forever */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={handleExecuteBulkDownload}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-gradient-to-b from-indigo-500/20 to-violet-600/15 hover:from-indigo-500/30 hover:to-violet-600/25 border border-indigo-400/35 text-indigo-200 transition-all active:scale-95 cursor-pointer"
                title="Download selected files"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span className="text-[10.5px] font-semibold leading-none">Download</span>
              </button>

              <button
                type="button"
                disabled={!selectionSummary.canRename}
                onClick={() => {
                  const target = selectionSummary.selectedFiles[0];
                  if (target) handleOpenRename(target);
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all ${
                  selectionSummary.canRename
                    ? 'bg-gradient-to-b from-cyan-500/20 to-teal-600/15 hover:from-cyan-500/30 hover:to-teal-600/25 border-cyan-400/35 text-cyan-200 active:scale-95 cursor-pointer'
                    : 'bg-[#121e33]/60 border-[#1c2d49] text-slate-500 cursor-not-allowed'
                }`}
                title={selectionSummary.canRename ? 'Rename selected file' : 'Select a single file to rename'}
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-[10.5px] font-semibold leading-none">Rename</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-rose-200 transition-all active:scale-95 cursor-pointer"
                title="Move selected files to Recycle Bin"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="text-[10.5px] font-semibold leading-none">Bin</span>
              </button>

              <button
                type="button"
                onClick={() => setPermanentDeleteTargetIds(Array.from(selectedIds))}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-gradient-to-b from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 border border-rose-400/50 text-white ai-solid-text-white shadow-md transition-all active:scale-95 cursor-pointer"
                title="Permanently Delete Forever"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-[10.5px] font-semibold leading-none">Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCKOUT MODAL (when trial expired & user tries to act) */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-rose-500/50 rounded-3xl p-5 max-w-[360px] w-full text-white space-y-4 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shadow-lg">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">
                ১ মাসের ফ্রি ট্রায়াল শেষ হয়েছে!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                ফাইল {lockModalAction} করতে সারাজীবনের জন্য ১০০ টাকা বিকাশ বা নগদে সেন্ড মানি করে আনলক সম্পন্ন করুন।
              </p>
            </div>

            <div className="bg-[#17253b] border border-[#233857] rounded-xl p-3 text-xs text-left space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>ফি:</span>
                <span className="font-bold text-amber-300">১০০ টাকা (সারাজীবন)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>পেমেন্ট মেথড:</span>
                <span className="font-bold text-white">bKash / Nagad Send Money</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLockModal(false);
                  if (onOpenPayment) onOpenPayment();
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>পেমেন্ট সম্পন্ন করুন (Go to Payment)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
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

      {/* BULK SHARE MODAL */}
      {shareModalFiles && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121c2e] border border-sky-500/40 rounded-3xl p-5 max-w-[380px] w-full text-white space-y-3.5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1f2f4a]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center text-sky-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Share {shareModalFiles.length} Item{shareModalFiles.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-[10.5px] text-slate-400">ফাইল তালিকা ও বিবরণ শেয়ার করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalFiles(null)}
                aria-label="Close share dialog"
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 bg-[#0c1423] border border-[#1d2e4a] rounded-2xl p-2.5 text-xs">
              {shareModalFiles.map((sf) => (
                <div key={sf.id} className="flex items-center justify-between gap-2 py-1 border-b border-[#18263f] last:border-b-0">
                  <span className="truncate font-medium text-slate-200">{sf.name}</span>
                  <span className="text-[10.5px] text-slate-400 shrink-0">{sf.formattedSize}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyShareSummary}
                className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold py-2.5 px-3 rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied Summary!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Share Details</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareModalFiles(null);
                  handleExitSelection();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#18263e] hover:bg-[#213354] text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILE INFO & VERSION HISTORY MODAL */}
      {activeInfoFile && (
        <FileInfoModal
          file={activeInfoFile}
          isOpen={!!activeInfoFile}
          onClose={() => setSelectedInfoFile(null)}
          onRestoreVersion={onRestoreVersion}
          onUploadNewVersion={onUploadNewVersion}
        />
      )}
    </div>
  );
};
