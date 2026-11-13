import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Send,
  Square,
  Menu,
  X,
  Search,
  Check,
  Copy,
  Paperclip,
  BookmarkPlus,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Zap,
  Brain,
  Code2,
  BookOpen,
  Calculator,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { AiAttachment, AiChatThread, AiMessage, AiMode, CloudFile } from '../types';
import { AppTheme } from '../utils/theme';
import { filterAiThreads } from '../utils/aiChats';
import { MarkdownMessage } from './MarkdownMessage';

interface BasharAiScreenProps {
  threads: AiChatThread[];
  activeThreadId: string;
  userName?: string;
  websiteName?: string;
  logoUrl?: string;
  theme?: AppTheme;
  cloudFiles?: CloudFile[];
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => AiChatThread;
  onTogglePinThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
  onDeleteThread: (threadId: string) => void;
  onChangeMode: (threadId: string, mode: AiMode) => void;
  onSendMessage: (
    threadId: string,
    prompt: string,
    mode: AiMode,
    attachment?: AiAttachment | null
  ) => Promise<void>;
  onStopStreaming: () => void;
  isStreaming: boolean;
  streamingThreadId: string | null;
  errorMsg: string | null;
  onClearError: () => void;
  onSaveAnswerToCloud?: (title: string, content: string) => void;
}

const STARTER_PROMPTS: Array<{
  title: string;
  subtitle: string;
  prompt: string;
  mode: AiMode;
  accentClass: string;
  icon: React.ReactNode;
}> = [
  {
    title: 'কোডিং ও ওয়েব সমাধান',
    subtitle: 'React, TypeScript, Python বা যেকোনো বাগ ফিক্স',
    prompt: 'একটি প্রফেশনাল ওয়েবসাইটের জন্য রেস্পন্সিভ নেভিগেশন বার ও ডার্ক-লাইট থিম কোডসহ লিখে দাও।',
    mode: 'deep',
    accentClass: 'bg-sky-500/12 border-sky-500/25 text-sky-400',
    icon: <Code2 className="w-4 h-4 text-sky-400" />,
  },
  {
    title: 'পড়াশোনা ও গণিত সমাধান',
    subtitle: 'ধাপে ধাপে অংক, বিজ্ঞান ও পরীক্ষার প্রস্তুতি',
    prompt: 'দ্বিঘাত সমীকরণ সমাধানের সূত্র সহজ বাংলায় উদাহরণসহ ধাপে ধাপে বুঝিয়ে দাও।',
    mode: 'deep',
    accentClass: 'bg-emerald-500/12 border-emerald-500/25 text-emerald-400',
    icon: <Calculator className="w-4 h-4 text-emerald-400" />,
  },
  {
    title: 'অফিসিয়াল লেখালেখি ও ইমেইল',
    subtitle: 'চিঠি, সিভি, ব্যবসা বা ডকুমেন্ট ড্রাফট',
    prompt: 'একটি প্রতিষ্ঠানের ক্লায়েন্টের জন্য প্রফেশনাল প্রজেক্ট প্রপোজাল ইমেইল লিখে দাও (বাংলা ও ইংরেজিতে)।',
    mode: 'general',
    accentClass: 'bg-amber-500/12 border-amber-500/25 text-amber-400',
    icon: <BookOpen className="w-4 h-4 text-amber-400" />,
  },
  {
    title: 'ক্লাউড ফাইল ও ডাটা গাইড',
    subtitle: 'নথি সংক্ষিপ্তকরণ, পরিকল্পনা ও আইডিয়া',
    prompt: 'আমার ক্লাউড ফাইল ও গুরুত্বপূর্ণ ডকুমেন্ট কীভাবে নিরাপদে ক্যাটাগরি করে সাজিয়ে রাখব?',
    mode: 'fast',
    accentClass: 'bg-purple-500/12 border-purple-500/25 text-purple-400',
    icon: <FileText className="w-4 h-4 text-purple-400" />,
  },
];

const MODE_OPTIONS: Array<{
  id: AiMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'general',
    label: 'General',
    description: 'সব কাজের ভারসাম্যপূর্ণ উত্তর',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: 'deep',
    label: 'Deep Solve',
    description: 'কোড, গণিত ও গভীর বিশ্লেষণ',
    icon: <Brain className="w-3.5 h-3.5" />,
  },
  {
    id: 'fast',
    label: 'Fast',
    description: 'তাৎক্ষণিক সংক্ষিপ্ত উত্তর',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
];

export const BasharAiScreen: React.FC<BasharAiScreenProps> = ({
  threads,
  activeThreadId,
  userName,
  websiteName = 'Bashar Cloud',
  logoUrl,
  theme = 'dark',
  cloudFiles = [],
  onSelectThread,
  onCreateThread,
  onTogglePinThread,
  onRenameThread,
  onDeleteThread,
  onChangeMode,
  onSendMessage,
  onStopStreaming,
  isStreaming,
  streamingThreadId,
  errorMsg,
  onClearError,
  onSaveAnswerToCloud,
}) => {
  const isLight = theme === 'light';
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);
  const [headerDraftTitle, setHeaderDraftTitle] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [savedCloudMsgId, setSavedCloudMsgId] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<AiAttachment | null>(null);
  const [isAttachPickerOpen, setIsAttachPickerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeThread =
    threads.find((t) => t.id === activeThreadId) || threads[0] || null;
  const activeMode: AiMode = activeThread?.mode || 'general';
  const filteredThreads = filterAiThreads(threads, searchQuery);
  const pinnedThreads = filteredThreads.filter((t) => t.pinned);
  const recentThreads = filteredThreads.filter((t) => !t.pinned);
  const allPinnedCount = threads.filter((t) => t.pinned).length;

  const attachableFiles = cloudFiles.filter(
    (f) => f.type === 'document' || (typeof f.content === 'string' && f.content.trim().length > 0)
  );

  // Auto-scroll smoothly when active thread or streamed tokens change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [
    activeThread?.id,
    activeThread?.messages.length,
    activeThread?.messages[activeThread.messages.length - 1]?.text,
  ]);

  // Auto-size textarea neatly as user types on desktop or mobile
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!inputText) {
      el.style.height = '40px';
      return;
    }
    el.style.height = '40px';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [inputText]);

  const handleStartRename = (thread: AiChatThread) => {
    setEditingThreadId(thread.id);
    setEditingTitle(thread.title);
  };

  const handleCommitRename = (threadId: string) => {
    if (editingTitle.trim()) {
      onRenameThread(threadId, editingTitle);
    }
    setEditingThreadId(null);
    setEditingTitle('');
  };

  const handleStartHeaderRename = () => {
    if (!activeThread) return;
    setHeaderDraftTitle(activeThread.title);
    setIsHeaderEditing(true);
  };

  const handleCommitHeaderRename = () => {
    if (activeThread && headerDraftTitle.trim()) {
      onRenameThread(activeThread.id, headerDraftTitle);
    }
    setIsHeaderEditing(false);
    setHeaderDraftTitle('');
  };

  const handleSubmitPrompt = async (overridePrompt?: string, overrideMode?: AiMode) => {
    const promptToSend = (overridePrompt !== undefined ? overridePrompt : inputText).trim();
    if (!promptToSend || isStreaming) return;

    let targetThread = activeThread;
    if (!targetThread) {
      targetThread = onCreateThread();
    }

    const modeToUse = overrideMode || targetThread.mode || 'general';
    if (overridePrompt === undefined) {
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
      }
    }

    const attachmentToSend = selectedAttachment;
    setSelectedAttachment(null);
    setIsAttachPickerOpen(false);
    onClearError();

    await onSendMessage(targetThread.id, promptToSend, modeToUse, attachmentToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmitPrompt();
    }
  };

  const handleCopyMessage = async (msg: AiMessage) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const handleSaveCloudAnswer = (msg: AiMessage) => {
    if (!onSaveAnswerToCloud) return;
    onSaveAnswerToCloud(
      `${(activeThread?.title || 'AI Note').slice(0, 36)}.md`,
      msg.text
    );
    setSavedCloudMsgId(msg.id);
    setTimeout(() => setSavedCloudMsgId(null), 2000);
  };

  const handleRetryLast = () => {
    if (!activeThread || isStreaming) return;
    const lastUserMsg = [...activeThread.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      onSendMessage(activeThread.id, lastUserMsg.text, activeMode, lastUserMsg.attachment || null);
    }
  };

  const handlePickCloudFile = (file: CloudFile) => {
    const snippet =
      file.content?.trim() ||
      `File Name: ${file.name}\nType: ${file.type}\nSize: ${file.formattedSize}\nDate: ${file.date}`;
    setSelectedAttachment({
      id: file.id,
      name: file.name,
      snippet: snippet.slice(0, 8000),
    });
    setIsAttachPickerOpen(false);
  };

  const renderThreadRow = (thread: AiChatThread) => {
    const isSelected = activeThread?.id === thread.id;
    const isEditingThis = editingThreadId === thread.id;

    return (
      <div
        key={thread.id}
        className={`rounded-xl transition-colors border ${
          isSelected
            ? isLight
              ? 'bg-blue-50 border-blue-200 text-slate-900'
              : 'bg-[#172844] border-blue-500/40 text-white'
            : isLight
            ? 'border-transparent hover:bg-slate-100 text-slate-700'
            : 'border-transparent hover:bg-[#142138] text-slate-300'
        }`}
      >
        {isEditingThis ? (
          <div className="flex items-center gap-1 p-1.5">
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCommitRename(thread.id);
                } else if (e.key === 'Escape') {
                  setEditingThreadId(null);
                }
              }}
              autoFocus
              aria-label={`Rename conversation ${thread.title}`}
              className={`flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg border outline-none ${
                isLight
                  ? 'bg-white border-blue-400 text-slate-900'
                  : 'bg-[#0b1320] border-blue-500 text-white'
              }`}
            />
            <button
              type="button"
              onClick={() => handleCommitRename(thread.id)}
              aria-label="Save chat name"
              className="w-8 h-8 rounded-lg bg-blue-600 text-white ai-solid-text-white flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditingThreadId(null)}
              aria-label="Cancel rename"
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${
                isLight ? 'bg-slate-200 text-slate-700' : 'bg-[#1e2e4a] text-slate-300'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1">
            <button
              type="button"
              onClick={() => {
                onSelectThread(thread.id);
                setIsDrawerOpen(false);
              }}
              className="flex-1 min-w-0 flex items-center gap-2 py-2 px-1 text-left cursor-pointer"
            >
              {thread.pinned ? (
                <Pin className="w-3.5 h-3.5 text-blue-400 shrink-0 fill-blue-400/20" />
              ) : (
                <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{thread.title}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  {thread.messages.length > 0
                    ? `${thread.messages.length} মেসেজ`
                    : 'নতুন কথোপকথন'}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onTogglePinThread(thread.id)}
                aria-label={thread.pinned ? `Unpin "${thread.title}"` : `Pin "${thread.title}"`}
                title={thread.pinned ? 'আনপিন করুন (Unpin)' : 'পিন করুন (Pin)'}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  thread.pinned
                    ? 'text-blue-400 hover:bg-blue-500/15'
                    : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10'
                }`}
              >
                {thread.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleStartRename(thread)}
                aria-label={`Rename "${thread.title}"`}
                title="নাম পরিবর্তন করুন (Rename)"
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteThread(thread.id)}
                aria-label={`Delete "${thread.title}"`}
                title="চ্যাট ডিলিট করুন (Delete)"
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeMessages = activeThread?.messages || [];

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col relative overflow-hidden ${
        isLight ? 'bg-white text-slate-900' : 'bg-[#0b111c] text-white'
      }`}
    >
      {/* In-Frame Slide-Over Chats & Pinned Drawer (stays strictly inside mobile phone container) */}
      {isDrawerOpen && (
        <div className="absolute inset-0 z-40 flex">
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <aside
            aria-label="Conversation sidebar"
            className={`relative z-10 w-[85%] max-w-[330px] h-full flex flex-col shadow-2xl border-r ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-[#09101b] border-[#1c2c47] text-white'
            }`}
          >
            {/* Drawer Header & New Chat */}
            <div className={`p-3 border-b ${isLight ? 'border-slate-200' : 'border-[#192842]'}`}>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={logoUrl || '/assets/aistudio/0a4ee58c-1d1d-4faa-8126-cfb8779227ba_f85ac4d0.png'}
                    alt={websiteName}
                    className="w-8 h-8 rounded-xl object-cover border border-blue-500/30 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">Bashar Cloud AI</div>
                    <div className="text-[10.5px] text-slate-400 truncate">সংরক্ষিত ও পিন করা চ্যাট</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close chat history"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer ${
                    isLight
                      ? 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                      : 'text-slate-400 hover:bg-[#142138] hover:text-white'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onCreateThread();
                  setIsDrawerOpen(false);
                }}
                className="w-full min-h-[40px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white ai-solid-text-white font-semibold text-xs px-3 py-2 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="whitespace-nowrap">নতুন চ্যাট (New Chat)</span>
              </button>

              {/* Search Saved Chats */}
              <div className="relative mt-2.5">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="চ্যাট খুঁজুন..."
                  aria-label="Search conversations"
                  className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                      : 'bg-[#101a2b] border-[#1d2e4a] text-white placeholder:text-slate-500 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Pinned + Recent Thread List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-4">
              {pinnedThreads.length > 0 && (
                <section aria-label="Pinned conversations">
                  <div className="px-2 mb-1.5 flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-400">
                      পিন করা চ্যাট (Pinned)
                    </span>
                    <span className="text-[10.5px] font-semibold text-slate-400 tabular-nums">
                      {pinnedThreads.length}
                    </span>
                  </div>
                  <div className="space-y-1">{pinnedThreads.map(renderThreadRow)}</div>
                </section>
              )}

              <section aria-label="Recent conversations">
                <div className="px-2 mb-1.5 flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    সব চ্যাট (History)
                  </span>
                  <span className="text-[10.5px] font-semibold text-slate-400 tabular-nums">
                    {recentThreads.length}
                  </span>
                </div>
                {recentThreads.length > 0 ? (
                  <div className="space-y-1">{recentThreads.map(renderThreadRow)}</div>
                ) : (
                  pinnedThreads.length === 0 && (
                    <p className="text-xs text-slate-400 px-2 py-4 text-center">
                      কোনো সংরক্ষিত চ্যাট নেই
                    </p>
                  )
                )}
              </section>
            </div>
          </aside>
        </div>
      )}

      {/* Compact Professional Mobile App Header */}
      <header
        className={`shrink-0 px-3 py-2.5 border-b flex items-center justify-between gap-2 ${
          isLight
            ? 'bg-white/95 border-slate-200'
            : 'bg-[#0d1524]/95 border-[#192842]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open chat history"
            title="চ্যাট ইতিহাস ও পিন করা চ্যাট"
            className={`relative w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-[#121e33] border-[#1f3150] text-slate-200 hover:bg-[#192945]'
            }`}
          >
            <Menu className="w-4.5 h-4.5" />
            {allPinnedCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white ai-solid-text-white text-[9px] font-bold flex items-center justify-center shadow"
                aria-hidden="true"
              >
                {allPinnedCount}
              </span>
            )}
          </button>

          {isHeaderEditing && activeThread ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                type="text"
                value={headerDraftTitle}
                onChange={(e) => setHeaderDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCommitHeaderRename();
                  } else if (e.key === 'Escape') {
                    setIsHeaderEditing(false);
                  }
                }}
                autoFocus
                aria-label="Edit conversation title"
                className="flex-1 min-w-0 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={handleCommitHeaderRename}
                aria-label="Save title"
                className="w-8 h-8 rounded-xl bg-blue-600 text-white ai-solid-text-white flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsHeaderEditing(false)}
                aria-label="Cancel title edit"
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                  isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#17243b] text-slate-300'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white ai-solid-text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <h1 className="text-[13.5px] font-bold truncate leading-tight">
                    {activeThread?.title || 'Bashar Cloud AI'}
                  </h1>
                  {activeThread && (
                    <button
                      type="button"
                      onClick={handleStartHeaderRename}
                      aria-label="Rename active conversation"
                      title="চ্যাটের নাম পরিবর্তন করুন"
                      className="w-6 h-6 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 leading-tight">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isStreaming ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                  <span className="truncate">
                    {isStreaming ? 'উত্তর লিখছে...' : 'Bashar Cloud AI • Ready'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Compact Header Actions: Pin + New Chat */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeThread && (
            <button
              type="button"
              onClick={() => onTogglePinThread(activeThread.id)}
              aria-label={activeThread.pinned ? 'Unpin active conversation' : 'Pin active conversation'}
              title={activeThread.pinned ? 'আনপিন করুন' : 'পিন করে রাখুন'}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                activeThread.pinned
                  ? 'bg-blue-600/15 border-blue-500/50 text-blue-400'
                  : isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600'
                  : 'bg-[#121e33] border-[#1f3150] text-slate-300 hover:text-blue-400'
              }`}
            >
              {activeThread.pinned ? (
                <PinOff className="w-4 h-4" />
              ) : (
                <Pin className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onCreateThread()}
            aria-label="Start new chat"
            title="নতুন চ্যাট"
            className="h-9 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white ai-solid-text-white flex items-center justify-center gap-1 text-[11px] font-semibold shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </header>

      {/* Unified Clean AI Mode Segmented Strip */}
      <div
        role="group"
        aria-label="AI Mode selector"
        className={`shrink-0 px-3 py-1.5 border-b grid grid-cols-3 gap-1.5 ${
          isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-[#0a111e] border-[#16233a]'
        }`}
      >
        {MODE_OPTIONS.map((opt) => {
          const selected = activeMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => activeThread && onChangeMode(activeThread.id, opt.id)}
              title={opt.description}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                selected
                  ? 'bg-blue-600 text-white ai-solid-text-white shadow-sm'
                  : isLight
                  ? 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                  : 'bg-[#121c2e] border border-[#1d2e49] text-slate-300 hover:text-white'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Message Thread (Mobile-Proportioned Clean Layout) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3.5">
        {activeMessages.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-2 pb-2">
            {/* Hero Identity Card */}
            <div
              className={`w-full rounded-3xl border p-4 mb-3.5 relative overflow-hidden ${
                isLight
                  ? 'bg-gradient-to-b from-blue-50/90 to-white border-blue-200/80'
                  : 'bg-gradient-to-b from-[#13213a] to-[#0f1727] border-[#213556]'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white ai-solid-text-white shadow-lg shadow-blue-900/30 flex items-center justify-center mb-2.5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-base font-extrabold tracking-tight mb-1">
                Bashar Cloud AI
              </h2>
              <p
                className={`text-[11.5px] leading-relaxed max-w-[320px] mx-auto ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {userName ? `হ্যালো ${userName}! ` : ''}যেকোনো প্রশ্ন করুন—কোডিং, গণিত, লেখালেখি,
                গবেষণা বা ক্লাউড ফাইল নিয়ে নির্ভুল ও পেশাদার সমাধান পান।
              </p>
            </div>

            {/* Quick Access Strip for Pinned Chats (if user pinned any) */}
            {pinnedThreads.length > 0 && (
              <div className="w-full mb-3.5 text-left">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-400">
                    পিন করা চ্যাট (Pinned)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    className="text-[10.5px] font-semibold text-slate-400 hover:text-blue-400 cursor-pointer"
                  >
                    সব দেখুন →
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {pinnedThreads.slice(0, 5).map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => onSelectThread(pt.id)}
                      className={`shrink-0 max-w-[175px] px-2.5 py-1.5 rounded-xl border text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                          : 'bg-[#122038] border-blue-500/35 text-blue-300 hover:bg-[#172947]'
                      }`}
                    >
                      <Pin className="w-3 h-3 shrink-0 fill-current" />
                      <span className="truncate">{pt.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Starter Prompt Cards */}
            <div className="w-full space-y-2 text-left">
              {STARTER_PROMPTS.map((card, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSubmitPrompt(card.prompt, card.mode)}
                  className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer active:scale-[0.99] ${
                    isLight
                      ? 'bg-slate-50 hover:bg-blue-50/70 border-slate-200 hover:border-blue-300'
                      : 'bg-[#111b2d] hover:bg-[#16233a] border-[#1f304c] hover:border-blue-500/40'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${card.accentClass}`}
                  >
                    {card.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{card.title}</div>
                    <p
                      className={`text-[11px] leading-snug truncate mt-0.5 ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      {card.subtitle}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {activeMessages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isCurrentlyStreaming =
                isStreaming &&
                streamingThreadId === activeThread?.id &&
                !isUser &&
                idx === activeMessages.length - 1;

              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-xs bg-gradient-to-br from-blue-600 to-indigo-600 text-white ai-solid-text-white px-3.5 py-2.5 shadow-md">
                      {msg.attachment && (
                        <div className="mb-1.5 px-2 py-0.5 rounded-lg bg-black/20 text-[10.5px] font-medium flex items-center gap-1.5 w-fit max-w-full">
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span className="truncate">{msg.attachment.name}</span>
                        </div>
                      )}
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                );
              }

              if (msg.isError && errorMsg && idx === activeMessages.length - 1) {
                return null;
              }

              return (
                <div key={msg.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white ai-solid-text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div
                    className={`flex-1 min-w-0 rounded-2xl rounded-tl-xs border px-3.5 py-2.5 ${
                      msg.isError
                        ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-[#111b2d] border-[#1f304c] text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                        Bashar Cloud AI
                      </span>
                      {isCurrentlyStreaming && (
                        <span className="text-[10px] font-medium text-amber-400">
                          লিখছে...
                        </span>
                      )}
                    </div>

                    {msg.text ? (
                      <MarkdownMessage text={msg.text} isLight={isLight} />
                    ) : (
                      <p className="text-xs text-slate-400">উত্তর তৈরি হচ্ছে...</p>
                    )}

                    {!isCurrentlyStreaming && msg.text && !msg.isError && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/25 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg)}
                          className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                              : 'bg-[#17243b] text-slate-300 hover:text-white'
                          }`}
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {onSaveAnswerToCloud && (
                          <button
                            type="button"
                            onClick={() => handleSaveCloudAnswer(msg)}
                            className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                              isLight
                                ? 'bg-white border border-slate-200 text-slate-600 hover:text-blue-600'
                                : 'bg-[#17243b] text-slate-300 hover:text-sky-400'
                            }`}
                          >
                            {savedCloudMsgId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3 h-3" />
                                <span>Save to Cloud</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inline Error Banner with Retry */}
        {errorMsg && (
          <div
            role="alert"
            className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-xs text-rose-200"
          >
            <div className="flex items-start gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug text-[11.5px]">{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={handleRetryLast}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white ai-solid-text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* In-Frame Cloud File Picker Popover */}
      {isAttachPickerOpen && (
        <div
          className={`shrink-0 mx-3 mb-2 rounded-2xl border p-3 shadow-xl ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-900'
              : 'bg-[#111b2d] border-[#213454] text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold">ক্লাউড ফাইল যুক্ত করুন</span>
            <button
              type="button"
              onClick={() => setIsAttachPickerOpen(false)}
              aria-label="Close file picker"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {attachableFiles.length > 0 ? (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {attachableFiles.slice(0, 12).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handlePickCloudFile(f)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer ${
                    isLight
                      ? 'hover:bg-blue-50 text-slate-800'
                      : 'hover:bg-[#192844] text-slate-200'
                  }`}
                >
                  <span className="truncate font-medium">{f.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{f.formattedSize}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 py-1.5">
              কোনো টেক্সট বা ডকুমেন্ট ফাইল এখনো নেই। আগে Files বা Home থেকে একটি ফাইল তৈরি বা আপলোড করুন।
            </p>
          )}
        </div>
      )}

      {/* Sticky Keyboard & Mobile-Friendly Composer */}
      <div
        className={`shrink-0 border-t px-3 py-2 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0b111c] border-[#192842]'
        }`}
      >
        {selectedAttachment && (
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400 text-[11px] font-medium">
              <Paperclip className="w-3 h-3" />
              <span className="truncate max-w-[200px]">{selectedAttachment.name}</span>
              <button
                type="button"
                onClick={() => setSelectedAttachment(null)}
                aria-label="Remove attached file"
                className="ml-0.5 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        <div
          className={`flex items-end gap-1 rounded-2xl border p-1 transition-colors focus-within:border-blue-500 ${
            isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#111b2d] border-[#223554]'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsAttachPickerOpen((v) => !v)}
            aria-label="Attach cloud file"
            title="ক্লাউড ফাইল যুক্ত করুন"
            className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
              isAttachPickerOpen
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-slate-400 hover:text-blue-400'
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            enterKeyHint="send"
            autoComplete="off"
            rows={1}
            placeholder="যেকোনো প্রশ্ন লিখুন... (Enter = পাঠান)"
            aria-label="Ask Bashar Cloud AI"
            className={`flex-1 min-w-0 resize-none bg-transparent border-0! outline-none py-2 px-1 text-[13px] leading-snug max-h-[132px] ${
              isLight
                ? 'text-slate-900 placeholder:text-slate-400'
                : 'text-white placeholder:text-slate-400'
            }`}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              aria-label="Stop generating"
              title="থামান (Stop)"
              className="min-w-[40px] min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white ai-solid-text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmitPrompt()}
              disabled={!inputText.trim()}
              aria-label="Send message"
              title="পাঠান (Send)"
              className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                inputText.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white ai-solid-text-white shadow-md'
                  : isLight
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#18253d] text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
