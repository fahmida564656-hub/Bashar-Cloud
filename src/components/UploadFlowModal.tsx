import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  X,
  Paperclip,
  User,
  Folder,
  FolderPlus,
  Cloud,
  Upload,
  Eye,
  Check,
  Clock,
  AlertCircle,
  Video,
  Image as ImageIcon,
  FileText,
  Music,
  Archive,
  ChevronRight,
  Pause,
  Play,
  List,
  Loader2,
} from 'lucide-react';
import { CloudFile, UserProfile, FileType } from '../types';
import {
  UploadQueueItem,
  UploadDestination,
  calculateTotalSize,
  formatSelectedCount,
  createQueueItem,
  estimateRemainingTime,
} from '../utils/uploadFlow';
import { buildCloudFileFromBrowserFile } from '../utils/fileVault';

interface UploadFlowModalProps {
  isOpen: boolean;
  initialFiles: File[];
  user: UserProfile;
  logoUrl?: string;
  websiteName?: string;
  existingFolders?: CloudFile[];
  onClose: () => void;
  onFinishUpload: (
    uploadedFiles: CloudFile[],
    destinationFolderId?: string | null,
    options?: { navigateToFiles?: boolean }
  ) => Promise<void> | void;
  onCreateFolder?: (folderName: string) => CloudFile;
}

export const UploadFlowModal: React.FC<UploadFlowModalProps> = ({
  isOpen,
  initialFiles,
  user,
  logoUrl = '/assets/aistudio/0a4ee58c-1d1d-4faa-8126-cfb8779227ba_f85ac4d0.png',
  websiteName = 'Bashar Cloud',
  existingFolders = [],
  onClose,
  onFinishUpload,
  onCreateFolder,
}) => {
  // Step state: 1 = Start Upload, 2 = Select Destination, 3 = Create Folder (bottom sheet over step 2), 4 = Upload Progress
  const [currentStep, setCurrentStep] = useState<1 | 2 | 4>(1);
  const [isCreateFolderSheetOpen, setIsCreateFolderSheetOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('Untitled');

  // Selected Destination
  const [destination, setDestination] = useState<UploadDestination>({
    id: null,
    name: 'Bashar Cloud',
  });
  const [tempSelectedDestination, setTempSelectedDestination] = useState<UploadDestination>({
    id: null,
    name: 'Bashar Cloud',
  });

  // Local folder list
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>(() => {
    return existingFolders
      .filter((f) => f.type === 'folder')
      .map((f) => ({ id: f.id, name: f.name }));
  });

  // Upload Queue
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [savedBatchCount, setSavedBatchCount] = useState<number>(0);
  const [uploadSpeedMs] = useState<number>(180); // snappy smooth progress tick
  const committedIdsRef = useRef<Set<string>>(new Set());

  // Hidden input for "Upload More"
  const uploadMoreInputRef = useRef<HTMLInputElement>(null);

  // Initialize queue ONLY with real user-selected files (never reset on websiteName updates)
  useEffect(() => {
    if (!isOpen) return;

    committedIdsRef.current = new Set();
    setSavedBatchCount(0);

    if (initialFiles && initialFiles.length > 0) {
      const items = initialFiles.map((file, idx) =>
        createQueueItem(file, file, idx)
      );
      setQueue(items);
    } else {
      setQueue([]);
    }

    setDestination({ id: null, name: websiteName || 'Bashar Cloud' });
    setTempSelectedDestination({ id: null, name: websiteName || 'Bashar Cloud' });
    setCurrentStep(1);
    setIsCreateFolderSheetOpen(false);
    setIsPaused(false);
    setIsCommitting(false);
  }, [isOpen, initialFiles]);

  // Keep folders synchronized with existingFolders
  useEffect(() => {
    const fresh = existingFolders
      .filter((f) => f.type === 'folder')
      .map((f) => ({ id: f.id, name: f.name }));
    setFolders(fresh);
  }, [existingFolders]);

  // Upload Progress Engine (Simulates multi-file upload progress smoothly)
  useEffect(() => {
    if (!isOpen || currentStep !== 4 || isPaused) return;

    const interval = setInterval(() => {
      setQueue((prevQueue) => {
        // Find first item that is not 'done' and not 'failed'
        const activeIndex = prevQueue.findIndex((item) => item.status !== 'done' && item.status !== 'failed');
        if (activeIndex === -1) {
          clearInterval(interval);
          return prevQueue; // All completed
        }

        const activeItem = prevQueue[activeIndex];
        const nextQueue = [...prevQueue];

        if (activeItem.status === 'preparing') {
          nextQueue[activeIndex] = {
            ...activeItem,
            status: 'uploading',
            progress: 25,
          };
        } else if (activeItem.status === 'uploading') {
          const nextProgress = activeItem.progress + 38;
          if (nextProgress >= 100) {
            nextQueue[activeIndex] = {
              ...activeItem,
              status: 'done',
              progress: 100,
            };
          } else {
            nextQueue[activeIndex] = {
              ...activeItem,
              progress: nextProgress,
            };
          }
        }

        return nextQueue;
      });
    }, uploadSpeedMs);

    return () => clearInterval(interval);
  }, [isOpen, currentStep, isPaused, uploadSpeedMs]);

  const buildAndCommitItems = async (
    itemsToCommit: UploadQueueItem[],
    navigateToFiles: boolean
  ) => {
    const uncommitted = itemsToCommit.filter((i) => !committedIdsRef.current.has(i.id));
    if (uncommitted.length === 0) {
      if (navigateToFiles) {
        onFinishUpload([], destination.id, { navigateToFiles: true });
        onClose();
      }
      return;
    }

    uncommitted.forEach((i) => committedIdsRef.current.add(i.id));
    setIsCommitting(true);
    try {
      const baseTime = Date.now();
      const finalFiles: CloudFile[] = await Promise.all(
        uncommitted.map(async (item, idx) => {
          const uniqueId = `uploaded-${baseTime}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
          if (item.fileObj) {
            return await buildCloudFileFromBrowserFile(item.fileObj, {
              id: uniqueId,
              parentFolderId: destination.id,
              uploaderName: user.name,
              typeOverride: item.type,
            });
          }

          return {
            id: uniqueId,
            name: item.name,
            type: item.type,
            sizeBytes: item.sizeBytes,
            formattedSize: item.formattedSize,
            date: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            isFavorite: false,
            parentFolderId: destination.id,
          };
        })
      );

      await onFinishUpload(finalFiles, destination.id, { navigateToFiles });
      setSavedBatchCount((prev) => prev + finalFiles.length);
      if (navigateToFiles) {
        onClose();
      }
    } catch (err) {
      // Allow retry if build failed unexpectedly
      uncommitted.forEach((i) => committedIdsRef.current.delete(i.id));
      console.error('Upload commit error:', err);
    } finally {
      setIsCommitting(false);
    }
  };

  // Auto-commit files permanently to IndexedDB + localStorage + Firestore the moment they finish uploading!
  useEffect(() => {
    if (!isOpen || currentStep !== 4 || queue.length === 0 || isCommitting) return;
    const allFinished = queue.every((i) => i.status === 'done');
    if (!allFinished) return;

    const uncommittedDone = queue.filter((i) => i.status === 'done' && !committedIdsRef.current.has(i.id));
    if (uncommittedDone.length > 0) {
      void buildAndCommitItems(uncommittedDone, false);
    }
  }, [isOpen, currentStep, queue, isCommitting]);

  if (!isOpen) return null;

  // Statistics calculation for Step 4
  const totalCount = queue.length;
  const doneCount = queue.filter((i) => i.status === 'done').length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;
  const queuedCount = totalCount - doneCount - failedCount;
  const totalBytes = queue.reduce((sum, i) => sum + i.sizeBytes, 0);
  const doneBytes = queue.reduce((sum, i) => (i.status === 'done' ? sum + i.sizeBytes : sum + (i.sizeBytes * i.progress) / 100), 0);
  const overallPercent = totalCount > 0 ? Math.min(100, Math.round((doneBytes / Math.max(1, totalBytes)) * 100)) : 0;
  const currentUploadingIndex = Math.min(totalCount, doneCount + 1);

  // User display phone / email
  const displayAccount = user.phone
    ? user.phone.startsWith('+88') || user.phone.startsWith('(+88')
      ? user.phone
      : `+88${user.phone}`
    : user.email || user.name || 'Signed-in Account';

  // Handler for adding more files via "Upload More"
  const handleUploadMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems = Array.from(e.target.files).map((f, i) =>
        createQueueItem(f, f, queue.length + i)
      );
      setQueue((prev) => [...prev, ...newItems]);
      e.target.value = '';
    }
  };

  // Handler for finishing and viewing uploaded files (commits any remaining items if clicked early)
  const handleFinishAndCommit = async () => {
    if (isCommitting) return;
    if (queue.length === 0) {
      onClose();
      return;
    }

    await buildAndCommitItems(queue, true);
  };

  // Handler for creating a new folder in Step 3
  const handleConfirmCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim() || 'Untitled';
    let newFolderId = `folder-${Date.now()}`;

    if (onCreateFolder) {
      const created = onCreateFolder(trimmed);
      newFolderId = created.id;
    }

    const newFolderObj = { id: newFolderId, name: trimmed };
    setFolders((prev) => [...prev, newFolderObj]);
    setTempSelectedDestination(newFolderObj);
    setIsCreateFolderSheetOpen(false);
    setNewFolderName('Untitled');
  };

  // Helper icon for file types
  const renderTypeIcon = (type: FileType) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5 text-sky-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-emerald-400" />;
      case 'audio':
        return <Music className="w-5 h-5 text-purple-400" />;
      case 'archive':
        return <Archive className="w-5 h-5 text-amber-400" />;
      default:
        return <FileText className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden file input for Upload More */}
      <input
        type="file"
        ref={uploadMoreInputRef}
        multiple
        onChange={handleUploadMore}
        className="hidden"
      />

      <div className="relative w-full max-w-[420px] h-[92vh] max-h-[820px] bg-[#0c1626] text-white rounded-3xl border border-sky-500/25 shadow-2xl flex flex-col overflow-hidden font-sans">
        {/* Decorative electric wave glowing bands matching screenshot */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-blue-600/20 via-sky-500/10 to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* ======================================================== */}
        {/* STEP 1: START UPLOAD SCREEN (Image 1)                    */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="relative flex-1 flex flex-col justify-between p-5 overflow-y-auto">
            {/* Top Navigation & App Branding */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl bg-[#142236]/90 border border-[#233550] flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-md active:scale-95"
                  title="Go Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Centered Bashar Cloud Logo & Branding */}
                <div className="flex items-center gap-2">
                  <img
                    src={logoUrl}
                    alt={websiteName}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-blue-400/40 shadow-sm"
                  />
                  <div className="text-left">
                    <div className="text-sm font-extrabold tracking-tight text-white leading-tight">
                      Bashar <span className="text-sky-400">Cloud</span>
                    </div>
                    <div className="text-[9px] text-slate-400 tracking-wider">
                      Store • Share • Access Anywhere
                    </div>
                  </div>
                </div>

                <div className="w-10" /> {/* Spacer */}
              </div>

              {/* Title Section */}
              <div className="text-center mt-5 mb-5 space-y-1">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Start Upload
                </h1>
                <h2 className="text-base font-bold text-slate-200">
                  Upload to Bashar Cloud
                </h2>
                <p className="text-xs text-slate-400">
                  Review and configure your upload
                </p>
              </div>

              {/* Configuration Cards Stack (Cards 1, 2, 3 from Image 1) */}
              <div className="space-y-3.5">
                {/* CARD 1: Selected files info */}
                <div className="bg-[#121f33]/90 border border-[#213552] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
                  <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Paperclip className="w-5 h-5 -rotate-45" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                      {formatSelectedCount(queue.length)}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Total size: {calculateTotalSize(queue)}
                    </p>
                  </div>
                </div>

                {/* CARD 2: Account identification */}
                <div className="bg-[#121f33]/90 border border-[#213552] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 font-medium">Account</div>
                    <div className="text-sm font-bold text-white font-mono truncate">
                      {displayAccount}
                    </div>
                  </div>
                </div>

                {/* CARD 3: Destination Folder (Clickable -> opens Step 2) */}
                <div
                  onClick={() => {
                    setTempSelectedDestination(destination);
                    setCurrentStep(2);
                  }}
                  className="bg-[#121f33]/90 hover:bg-[#162740] border border-[#213552] hover:border-sky-500/40 rounded-2xl p-4 flex items-center justify-between gap-3.5 shadow-lg cursor-pointer transition-all group active:scale-[0.99]"
                  title="Click to select destination folder"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 group-hover:text-indigo-300">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-slate-400 font-medium">Upload to</div>
                      <div className="text-sm font-bold text-white truncate">
                        {destination.name}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors shrink-0" />
                </div>
              </div>
            </div>

            {/* Bottom Action: Big Blue "Start Upload" Button */}
            <div className="pt-4">
              <button
                type="button"
                disabled={queue.length === 0}
                onClick={() => setCurrentStep(4)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/35 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Cloud className="w-5 h-5" />
                <span>Start Upload</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: SELECT DESTINATION SCREEN (Image 2)             */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="relative flex-1 flex flex-col justify-between p-5 overflow-y-auto">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1b2b42]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-9 h-9 rounded-xl bg-[#142236] border border-[#233550] flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Close and return"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-base font-bold text-white">
                  Select Destination
                </h2>

                {/* Create Folder Button (FolderPlus) -> opens Step 3 bottom sheet */}
                <button
                  type="button"
                  onClick={() => setIsCreateFolderSheetOpen(true)}
                  className="w-9 h-9 rounded-xl bg-[#142236] hover:bg-[#1b2c44] border border-[#233550] flex items-center justify-center text-sky-400 hover:text-sky-300 transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Create New Folder"
                >
                  <FolderPlus className="w-5 h-5" />
                </button>
              </div>

              {/* Destination Folder Selection Options */}
              <div className="space-y-2 mt-4">
                {/* Default: Root Cloud Storage */}
                <div
                  onClick={() =>
                    setTempSelectedDestination({ id: null, name: 'Bashar Cloud' })
                  }
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    tempSelectedDestination.id === null
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-[#121f33]/70 border-[#213552] text-slate-300 hover:bg-[#162740]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Folder className={`w-5 h-5 ${tempSelectedDestination.id === null ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="text-sm font-semibold">Bashar Cloud (Root)</span>
                  </div>
                  {tempSelectedDestination.id === null && (
                    <Check className="w-4 h-4 text-blue-400" />
                  )}
                </div>

                {/* Custom Folders */}
                {folders.map((f) => {
                  const isSelected = tempSelectedDestination.id === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() =>
                        setTempSelectedDestination({ id: f.id, name: f.name })
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                          : 'bg-[#121f33]/70 border-[#213552] text-slate-300 hover:bg-[#162740]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Folder className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="text-sm font-semibold truncate">{f.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                  );
                })}
              </div>

              {/* Empty state illustration if no custom folders (exactly like in Screenshot 2) */}
              {folders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="w-20 h-20 rounded-3xl bg-[#142135]/80 border border-[#213655] flex items-center justify-center text-slate-500 shadow-inner">
                    <Folder className="w-10 h-10" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">
                    The folder is empty
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-[240px]">
                    টপ-রাইটের ফোল্ডার বাটনে ট্যাপ করে নতুন ফোল্ডার তৈরি করতে পারবেন।
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions: Cancel and Select */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#1b2b42]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-3 rounded-xl bg-[#152338] hover:bg-[#1a2b44] border border-[#233856] text-white font-semibold text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDestination(tempSelectedDestination);
                  setCurrentStep(1);
                }}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Select
              </button>
            </div>

            {/* ======================================================== */}
            {/* STEP 3: CREATE FOLDER BOTTOM SHEET MODAL (Image 3)       */}
            {/* ======================================================== */}
            {isCreateFolderSheetOpen && (
              <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
                <div className="bg-[#121c2d] border-t border-x border-[#233550] rounded-t-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
                  {/* Top Handle bar */}
                  <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-1" />

                  <h3 className="text-base font-bold text-white">Create Folder</h3>

                  <form onSubmit={handleConfirmCreateFolder} className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-medium mb-1.5">
                        Folder name
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Untitled"
                        className="w-full bg-[#152338] border border-[#243755] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateFolderSheetOpen(false);
                          setNewFolderName('Untitled');
                        }}
                        className="flex-1 py-3 rounded-xl bg-[#152338] hover:bg-[#1a2b44] border border-[#233856] text-white font-semibold text-sm transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: UPLOAD PROGRESS SCREEN (Image 4)                 */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="relative flex-1 flex flex-col justify-between p-5 overflow-y-auto">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-9 h-9 rounded-xl bg-[#142236] border border-[#233550] flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <h1 className="text-base font-bold text-white">Upload</h1>

                <div className="w-9" /> {/* Spacer */}
              </div>

              {/* Action Buttons: "Upload More" and "View Uploaded Files" */}
              <div className="space-y-2.5">
                {savedBatchCount > 0 && !isCommitting && (
                  <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-300 shadow-sm">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{savedBatchCount}টি ফাইল ড্রাইভে স্থায়ীভাবে সেভ হয়েছে ✓</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isCommitting}
                  onClick={() => uploadMoreInputRef.current?.click()}
                  className="w-full py-3.5 rounded-xl bg-[#3b82f6] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload More</span>
                </button>

                <button
                  type="button"
                  disabled={isCommitting || queue.length === 0}
                  onClick={handleFinishAndCommit}
                  className={`w-full py-3.5 rounded-xl disabled:opacity-60 border text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    doneCount === totalCount && totalCount > 0
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-400/50 shadow-lg shadow-emerald-900/40'
                      : 'bg-[#152338] hover:bg-[#1c2e48] border-[#233755]'
                  }`}
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                      <span>সুরক্ষিতভাবে সেভ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 text-white" />
                      <span>View Uploaded Files</span>
                    </>
                  )}
                </button>
              </div>

              {/* Upload Progress Card Container */}
              <div className="bg-[#121f33]/90 border border-[#213552] rounded-2xl p-4 space-y-3.5 shadow-xl">
                {/* Header row with Counter badge (e.g. 2/49) */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Upload Progress</h3>
                  <span className="bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                    {doneCount}/{totalCount}
                  </span>
                </div>

                {/* Progress Text and percentage */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    Uploading {currentUploadingIndex} of {totalCount} files
                  </span>
                  <span className="font-bold text-white font-mono">
                    {overallPercent}%
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-2.5 bg-[#0b1422] rounded-full overflow-hidden border border-[#1d2e47]">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>

                {/* Estimated Remaining Time */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    About {estimateRemainingTime(doneCount, totalCount, doneCount * 2)} remaining
                  </span>
                </div>

                {/* 3 Stat Boxes Grid (Done, Queued, Failed) from Image 4 */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {/* Done Box (Green) */}
                  <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center shadow-sm">
                    <Check className="w-4 h-4 text-emerald-400 mb-0.5" />
                    <span className="text-base font-extrabold text-emerald-300 font-mono">
                      {doneCount}
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-medium">Done</span>
                  </div>

                  {/* Queued Box (Blue) */}
                  <div className="bg-blue-950/50 border border-blue-500/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center shadow-sm">
                    <Clock className="w-4 h-4 text-blue-400 mb-0.5" />
                    <span className="text-base font-extrabold text-blue-300 font-mono">
                      {queuedCount}
                    </span>
                    <span className="text-[10px] text-blue-400/80 font-medium">Queued</span>
                  </div>

                  {/* Failed Box (Red) */}
                  <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center shadow-sm">
                    <AlertCircle className="w-4 h-4 text-rose-400 mb-0.5" />
                    <span className="text-base font-extrabold text-rose-300 font-mono">
                      {failedCount}
                    </span>
                    <span className="text-[10px] text-rose-400/80 font-medium">Failed</span>
                  </div>
                </div>
              </div>

              {/* Currently Uploading Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">Currently uploading</h3>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {queue.map((item) => {
                    const isDone = item.status === 'done';
                    const isUploading = item.status === 'uploading';

                    return (
                      <div
                        key={item.id}
                        className="bg-[#142135] border border-[#203452] rounded-xl p-3 flex items-center justify-between gap-3 shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#1b2b42] flex items-center justify-center shrink-0">
                            {renderTypeIcon(item.type)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 capitalize">
                              {item.formattedSize} • {item.type}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 rounded-lg px-2 py-0.5 shadow-xs">
                              <Check className="w-3 h-3 text-emerald-400" />
                              Done
                            </span>
                          ) : isUploading ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 bg-sky-950/60 border border-sky-500/40 rounded-lg px-2 py-0.5 shadow-xs">
                              <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
                              {item.progress}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-slate-900/60 border border-slate-700/40 rounded-lg px-2 py-0.5">
                              • Preparing
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Floating Control Bar (as shown in Image 4) */}
            <div className="flex justify-center pt-2">
              <div className="bg-[#3b5998]/90 backdrop-blur-md p-1.5 rounded-2xl flex items-center gap-2 border border-blue-400/30 shadow-2xl">
                <button
                  type="button"
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaused((prev) => !prev)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                  title={isPaused ? 'Resume Upload' : 'Pause Upload'}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                  title="Cancel Upload"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
