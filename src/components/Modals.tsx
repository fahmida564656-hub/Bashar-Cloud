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
  FilePlus,
  Check,
  Edit3,
  Archive,
  Download,
  FolderArchive,
  FileText,
  Copy,
  Info,
  History,
  Clock,
  ArrowUpCircle,
  HardDrive,
} from 'lucide-react';
import { CloudFile, FileVersion } from '../types';
import { ensureFileVersions } from '../utils/fileVersioning';

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

/* ================= CREATE NEW FILE MODAL (ফাইল তৈরি করুন ও ফাইলের নাম দিন) ================= */
interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (fileName: string, type: string, content: string) => void;
}

export const CreateFileModal: React.FC<CreateFileModalProps> = ({ isOpen, onClose, onCreateFile }) => {
  const [name, setName] = useState('');
  const [extension, setExtension] = useState('.txt');
  const [content, setContent] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<string>('custom');

  if (!isOpen) return null;

  const fileExtensions = [
    { ext: '.txt', label: 'Text (.txt)' },
    { ext: '.docx', label: 'Doc (.docx)' },
    { ext: '.md', label: 'Markdown (.md)' },
    { ext: '.pdf', label: 'PDF (.pdf)' },
    { ext: '.csv', label: 'Sheet (.csv)' },
    { ext: '.json', label: 'Data (.json)' },
  ];

  const quickTemplates = [
    {
      id: 'notes',
      title: '📝 ব্যক্তিগত নোট',
      ext: '.txt',
      suggestedName: 'ব্যক্তিগত_নোটবুক',
      body: `# শিরোনাম: ব্যক্তিগত গুরুত্বপূর্ণ নোট\nতারিখ: ${new Date().toLocaleDateString('bn-BD')}\n\nএখানে আপনার দৈনন্দিন চিন্তা, পরিকল্পনা বা জরুরি তথ্য লিখে রাখুন...`,
    },
    {
      id: 'todo',
      title: '📋 দৈনিক টু-ডু লিস্ট',
      ext: '.txt',
      suggestedName: 'আজকের_কাজের_তালিকা',
      body: `আজকের জরুরি কাজের তালিকা:\n[ ] ১. গুরুত্বপূর্ণ ক্লাউড ফাইল ব্যাকআপ নেওয়া\n[ ] ২. বিকাশ / নগদ পেমেন্ট ও ট্রানজেকশন নিশ্চিতকরণ\n[ ] ৩. ড্রাইভ ফোল্ডার সাজানো ও অপ্রয়োজনীয় ফাইল মোছা\n[ ] ৪. জরুরি ডকুমেন্ট বন্ধুদের সাথে শেয়ার করা`,
    },
    {
      id: 'budget',
      title: '📊 বাজেট ও হিসাব',
      ext: '.csv',
      suggestedName: 'মাসিক_হিসাব_খাতা',
      body: `তারিখ,বিবরণ,আয় (টাকা),ব্যয় (টাকা),ব্যালেন্স\n০১/০৩/২০২৬,মাসিক আয়,৭৫০০০,-,৭৫০০০\n০৫/০৩/২০২৬,বাড়ি ভাড়া,-,১৮০০০,৫৭০০০\n১০/০৩/২০২৬,বাজার ও কেনাকাটা,-,১২০০০,৪৫০০০\n১৫/০৩/২০২৬,ইউটিলিটি বিল,-,৩৫০০,৪১৫০০`,
    },
    {
      id: 'meeting',
      title: '🤝 মিটিং মিনিটস',
      ext: '.docx',
      suggestedName: 'প্রজেক্ট_মিটিং_সামারি',
      body: `মিটিং সামারি ও সিদ্ধান্তসমূহ:\n\nতারিখ: ${new Date().toLocaleDateString('bn-BD')}\nউপস্থিত: টিম সদস্যবৃন্দ\n\nআলোচ্য বিষয়:\n১. ক্লাউড স্টোরেজ পারফরম্যান্স ও মাল্টি-ডোমেন সিঙ্ক\n২. ১০০ টাকা লাইফটাইম অ্যাক্সেস পলিসি\n\nপরবর্তী পদক্ষেপ: আগামী সপ্তাহের মধ্যে সিস্টেম আপডেট নিশ্চিত করা।`,
    },
    {
      id: 'json',
      title: '💻 JSON কনফিগ',
      ext: '.json',
      suggestedName: 'app_config',
      body: `{\n  "appName": "Bashar Cloud",\n  "version": "2.4.0",\n  "maxStorageGB": 1000,\n  "offlineSync": true,\n  "securityLevel": "enterprise"\n}`,
    },
  ];

  const applyTemplate = (tpl: typeof quickTemplates[0]) => {
    setActiveTemplate(tpl.id);
    setName(tpl.suggestedName);
    setExtension(tpl.ext);
    setContent(tpl.body);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setContent((prev) => (prev ? `${prev}\n${text}` : text));
      }
    } catch {
      // Fallback if browser permission denied
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalName = name.trim();
    if (!finalName) return;

    if (!finalName.toLowerCase().endsWith(extension)) {
      finalName = `${finalName}${extension}`;
    }

    onCreateFile(finalName, 'document', content);
    setName('');
    setContent('');
    onClose();
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const byteSize = new Blob([content]).size;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#121c2e] border border-[#20324e] rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1f2f4a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/40 shrink-0">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>নতুন ফাইল তৈরি করুন</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Create File
                </span>
              </h3>
              <p className="text-xs text-slate-400">টেমপ্লেট থেকে দ্রুত ফাইল তৈরি বা নাম দিয়ে লিখুন</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
          {/* Quick Templates Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                দ্রুত টেমপ্লেট নির্বাচন (Quick Templates)
              </span>
              {activeTemplate !== 'custom' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTemplate('custom');
                    setName('');
                    setContent('');
                  }}
                  className="text-[10px] text-sky-400 hover:underline"
                >
                  ক্লিয়ার করুন
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className={`py-1.5 px-2.5 rounded-xl text-[11px] font-medium border transition-all ${
                    activeTemplate === tpl.id
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40'
                      : 'bg-[#152236] text-slate-300 border-[#243754] hover:bg-[#1a2c46]'
                  }`}
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* File Name Input */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              ফাইলের নাম (File Name) <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center bg-[#162338] border border-[#273d61] rounded-xl px-3.5 py-2 focus-within:border-blue-500">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setActiveTemplate('custom');
                }}
                placeholder="যেমন: Amar-Notepad বা Project-Summary"
                required
                autoFocus
                className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm font-medium"
              />
              <span className="text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-1 rounded-md border border-blue-800/40 ml-2">
                {extension}
              </span>
            </div>
          </div>

          {/* Extension selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              ফাইলের ধরন (File Format)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {fileExtensions.map((item) => (
                <button
                  key={item.ext}
                  type="button"
                  onClick={() => setExtension(item.ext)}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border text-center transition-all ${
                    extension === item.ext
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/50 scale-[1.02]'
                      : 'bg-[#162338] text-slate-400 border-[#233857] hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Textarea & Paste from Clipboard */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                ফাইলের কন্টেন্ট / নোট লিখুন
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-[10px] text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
                  title="ক্লিপবোর্ডে কপি করা লেখা এখানে পেস্ট করুন"
                >
                  <Copy className="w-3 h-3" />
                  <span>ক্লিপবোর্ড থেকে পেস্ট</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  {wordCount} শব্দ • {byteSize} B
                </span>
              </div>
            </div>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="এখানে আপনার ফাইল বা নোটের লেখা লিখুন অথবা উপরের টেমপ্লেট নির্বাচন করুন..."
              className="w-full bg-[#162338] border border-[#273d61] rounded-xl p-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f2f4a]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white"
          >
            বাতিল (Cancel)
          </button>
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>তৈরি ও সেভ করুন (Create & Save)</span>
          </button>
        </div>
      </form>
    </div>
  );
};

/* ================= RENAME FILE MODAL (ফাইলের নাম পরিবর্তন করুন) ================= */
interface RenameFileModalProps {
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (fileId: string, newName: string) => void;
}

export const RenameFileModal: React.FC<RenameFileModalProps> = ({
  file,
  isOpen,
  onClose,
  onRename,
}) => {
  const [newName, setNewName] = useState('');

  React.useEffect(() => {
    if (file) {
      setNewName(file.name);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onRename(file.id, newName.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#121c2e] border border-[#20324e] rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">ফাইলের নাম পরিবর্তন</h3>
            <p className="text-xs text-slate-400 truncate max-w-[200px]">{file.name}</p>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
            নতুন নাম (New Name)
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
            className="w-full bg-[#162338] border border-[#273d61] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            বাতিল
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md"
          >
            সেভ করুন
          </button>
        </div>
      </form>
    </div>
  );
};

/* ================= ZIP ARCHIVE INSPECTOR & EXTRACTOR MODAL ================= */
interface ZipArchiveModalProps {
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
  onExtractAll?: (file: CloudFile) => void;
}

export const ZipArchiveModal: React.FC<ZipArchiveModalProps> = ({
  file,
  isOpen,
  onClose,
  onExtractAll,
}) => {
  const [extractedToast, setExtractedToast] = useState(false);

  if (!isOpen || !file) return null;

  const entries = file.archiveEntries || [];

  const handleExtract = () => {
    if (entries.length === 0) return;
    if (onExtractAll) {
      onExtractAll(file);
    }
    setExtractedToast(true);
    setTimeout(() => {
      setExtractedToast(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#121c2e] border-t sm:border border-[#20324e] rounded-t-3xl sm:rounded-3xl p-5 max-w-[420px] w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2f4a]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-950/40">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-[220px]">{file.name}</h3>
              <p className="text-[11px] text-amber-300 font-medium">
                ZIP Archive • {file.formattedSize} • {entries.length} {entries.length === 1 ? 'File' : 'Files'} Inside
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Entries list */}
        <div className="py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            আর্কাইভের ভেতরের ফাইলসমূহ (Archive Contents):
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 max-h-[320px]">
          {entries.length === 0 ? (
            <div className="text-center py-10 px-4 bg-[#162338]/50 border border-[#233857] rounded-xl text-xs text-slate-400">
              এই আর্কাইভে কোনো এন্ট্রি পাওয়া যায়নি অথবা ফরম্যাটটি .ZIP নয়।
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div
                key={idx}
                className="bg-[#162338] border border-[#233857] rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-amber-500/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-mono text-slate-200 truncate">{entry.name}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono shrink-0 bg-[#0e1726] px-2 py-0.5 rounded border border-slate-800">
                  {entry.size}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#1f2f4a] flex items-center gap-2">
          {file.url && (
            <a
              href={file.url}
              download={file.name}
              className="flex-1 bg-[#1b2b46] hover:bg-[#233859] border border-[#2e4771] text-slate-200 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>ডাউনলোড জিপ</span>
            </a>
          )}

          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleExtract}
              className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-950/50 flex items-center justify-center gap-1.5"
            >
              <FolderArchive className="w-4 h-4" />
              <span>{extractedToast ? 'ফাইলগুলো এক্সট্র্যাক্ট হচ্ছে...' : 'আনজিপ ও এক্সট্র্যাক্ট করুন'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================= FILE INFO & VERSION HISTORY MODAL ================= */
export interface FileInfoModalProps {
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
  onRestoreVersion?: (file: CloudFile, version: FileVersion) => void;
  onUploadNewVersion?: (file: CloudFile, newFile: File) => void;
}

export const FileInfoModal: React.FC<FileInfoModalProps> = ({
  file,
  isOpen,
  onClose,
  onRestoreVersion,
  onUploadNewVersion,
}) => {
  const [versionToast, setVersionToast] = useState<string | null>(null);
  const fileUploadInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen || !file) return null;

  const versions = ensureFileVersions(file);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadNewVersion) {
      const selected = e.target.files[0];
      onUploadNewVersion(file, selected);
      setVersionToast(`নতুন ভার্সন (v${versions.length + 1}) সফলভাবে যুক্ত হয়েছে!`);
      setTimeout(() => setVersionToast(null), 3000);
      e.target.value = '';
    }
  };

  const getActionColor = (action: FileVersion['action']) => {
    switch (action) {
      case 'Created':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Modified':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Renamed':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Re-uploaded':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Restored':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#121c2e] border-t sm:border border-[#20324e] rounded-t-3xl sm:rounded-3xl p-5 max-w-[440px] w-full max-h-[88vh] flex flex-col animate-in slide-in-from-bottom-8">
        {/* Hidden input for uploading new version of this file */}
        <input
          type="file"
          ref={fileUploadInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2f4a]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{file.name}</h3>
              <p className="text-[11px] text-slate-400">
                ফাইল তথ্য ও ভার্সন ইতিহাস (File Info & Version History)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {versionToast && (
          <div className="mt-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-2 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{versionToast}</span>
          </div>
        )}

        {/* Basic File Details Card */}
        <div className="mt-3 bg-[#152338] border border-[#233857] rounded-2xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">ফাইলের আকার (Size):</span>
            <span className="font-semibold text-white">{file.formattedSize}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">ধরন (Type):</span>
            <span className="capitalize font-semibold text-sky-300">{file.type}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">তারিখ (Date):</span>
            <span className="font-semibold text-slate-200">{file.date}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">সর্বমোট ভার্সন (Total Versions):</span>
            <span className="font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {versions.length} {versions.length === 1 ? 'version' : 'versions'}
            </span>
          </div>
        </div>

        {/* Version History Section */}
        <div className="mt-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <History className="w-4 h-4 text-amber-400" />
            <span>পূর্ববর্তী আপলোড ও পরিবর্তনের ইতিহাস</span>
          </div>

          {onUploadNewVersion && (
            <button
              type="button"
              onClick={() => fileUploadInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-sm cursor-pointer"
              title="Upload an updated version of this file"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>নতুন ভার্সন আপলোড</span>
            </button>
          )}
        </div>

        {/* Timeline of versions */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[300px]">
          {versions.map((ver, idx) => {
            const isCurrent = idx === 0;

            return (
              <div
                key={ver.versionId || idx}
                className={`border rounded-2xl p-3 space-y-2 text-xs transition-all ${
                  isCurrent
                    ? 'bg-[#152744] border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                    : 'bg-[#142034] border-[#1e304d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-300 font-extrabold flex items-center justify-center text-[11px] border border-blue-500/40">
                      v{ver.versionNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getActionColor(ver.action)}`}>
                      {ver.action}
                    </span>
                    {isCurrent && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                        বর্তমান (Current)
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {ver.formattedSize}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{ver.timestamp}</span>
                  </div>
                  {ver.name && ver.name !== file.name && (
                    <span className="text-[10px] text-sky-300 italic truncate max-w-[150px]">
                      {ver.name}
                    </span>
                  )}
                </div>

                {ver.note && (
                  <p className="text-[11px] text-slate-400 bg-[#0e1726] p-2 rounded-xl border border-[#1b2b42]">
                    {ver.note}
                  </p>
                )}

                {/* Restore button if not current version */}
                {!isCurrent && onRestoreVersion && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreVersion(file, ver);
                        setVersionToast(`v${ver.versionNumber} সফলভাবে রিস্টোর করা হয়েছে!`);
                        setTimeout(() => setVersionToast(null), 3000);
                      }}
                      className="bg-[#1a2c47] hover:bg-blue-600 text-sky-200 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold border border-[#26416a] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <History className="w-3 h-3 text-amber-400" />
                      <span>এই ভার্সনে ফিরিয়ে নিন (Restore v{ver.versionNumber})</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#1f2f4a] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#162338] hover:bg-[#1d304f] border border-[#273d61] text-white font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};


