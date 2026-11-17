import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Search,
  Bell,
  X,
  CheckCheck,
  Megaphone,
  Gift,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { AdminAnnouncement, AnnouncementCategory } from '../types';
import { AppTheme } from '../utils/theme';
import {
  ANNOUNCEMENT_CATEGORY_META,
  filterAnnouncements,
  getUnreadAnnouncementCount,
  isAnnouncementUnread,
  isSafeExternalUrl,
  normalizeAnnouncementCategory,
} from '../utils/announcements';

interface NotificationsScreenProps {
  announcements: AdminAnnouncement[];
  lastReadTimestamp: number;
  onMarkAllRead: () => void;
  onBack: () => void;
  theme?: AppTheme;
}

const CategoryIcon: React.FC<{ category: AnnouncementCategory; className?: string }> = ({
  category,
  className = 'w-5 h-5',
}) => {
  switch (category) {
    case 'offer':
      return <Gift className={className} />;
    case 'important':
      return <AlertTriangle className={className} />;
    case 'update':
      return <Sparkles className={className} />;
    default:
      return <Megaphone className={className} />;
  }
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  announcements,
  lastReadTimestamp,
  onMarkAllRead,
  onBack,
  theme = 'dark',
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Snapshot initial lastReadTimestamp on mount so the user can clearly see which ads arrived as "নতুন"
  const [sessionBaselineTs, setSessionBaselineTs] = useState<number>(lastReadTimestamp);

  const isLight = theme === 'light';
  const unreadCount = getUnreadAnnouncementCount(announcements, sessionBaselineTs);
  const currentUnreadLive = getUnreadAnnouncementCount(announcements, lastReadTimestamp);

  useEffect(() => {
    if (announcements.length > 0 && currentUnreadLive > 0) {
      // Mark all as read in storage so the Home bell badge clears after visiting Notifications
      onMarkAllRead();
    }
  }, [announcements.length, currentUnreadLive, onMarkAllRead]);

  const filteredAds = filterAnnouncements(announcements, {
    filter,
    lastReadTimestamp: sessionBaselineTs,
    query: searchQuery,
  });

  const handleMarkEverythingRead = () => {
    const newestTs = announcements.reduce(
      (max, ad) => Math.max(max, Number(ad.createdTimestamp) || 0),
      Date.now()
    );
    setSessionBaselineTs(newestTs);
    onMarkAllRead();
  };

  return (
    <div
      className={`flex-1 flex flex-col px-4 pt-3 pb-8 overflow-y-auto ${
        isLight ? 'text-slate-900' : 'text-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
            isLight
              ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
              : 'bg-[#142033] border-[#233552] text-slate-300 hover:text-white'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-lg font-bold tracking-tight">নোটিফিকেশন ও বিজ্ঞাপন</h1>
          <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            অ্যাডমিন ঘোষিত সর্বশেষ অফার ও নোটিশ
          </p>
        </div>

        {announcements.length > 0 && unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkEverythingRead}
            title="সব পড়া হয়েছে চিহ্নিত করুন"
            className={`min-h-[44px] px-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              isLight
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : 'bg-[#13223a] border-blue-500/30 text-sky-300 hover:bg-[#1a2f50]'
            }`}
          >
            <CheckCheck className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">সব পড়া</span>
          </button>
        ) : (
          <div className="w-11" aria-hidden="true" />
        )}
      </div>

      {/* Search Bar */}
      <div
        className={`orbit-card relative flex items-center border rounded-xl px-3.5 py-2.5 mb-3.5 transition-colors ${
          isLight
            ? 'bg-white border-slate-200 focus-within:border-blue-500 shadow-sm'
            : 'bg-[#131e30] border-[#233552] focus-within:border-blue-500'
        }`}
      >
        <Search className={`w-4 h-4 mr-2.5 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="বিজ্ঞাপন বা নোটিশ খুঁজুন..."
          className={`w-full bg-transparent focus:outline-none text-sm ${
            isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-slate-500'
          }`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Segmented Bar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer tabular-nums ${
              filter === 'all'
                ? 'bg-blue-600 text-white ai-solid-text-white shadow-md shadow-blue-900/25'
                : isLight
                ? 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                : 'bg-[#121c2c] border border-[#1f3049] text-slate-300 hover:text-white'
            }`}
          >
            সকল ({announcements.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer tabular-nums ${
              filter === 'unread'
                ? 'bg-blue-600 text-white ai-solid-text-white shadow-md shadow-blue-900/25'
                : isLight
                ? 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                : 'bg-[#121c2c] border border-[#1f3049] text-slate-300 hover:text-white'
            }`}
          >
            নতুন ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkEverythingRead}
            className={`text-[11px] font-semibold underline cursor-pointer ${
              isLight ? 'text-blue-600 hover:text-blue-700' : 'text-sky-400 hover:text-sky-300'
            }`}
          >
            সব পড়া হিসেবে চিহ্নিত করুন
          </button>
        )}
      </div>

      {/* Content Area */}
      {filteredAds.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <div
            className={`orbit-card w-full border rounded-3xl p-8 flex flex-col items-center text-center shadow-sm ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#121c2c] border-[#1f3049]'
            }`}
          >
            <div
              className={`w-20 h-20 rounded-full border flex items-center justify-center mb-5 ${
                isLight
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-[#1e345e] border-[#2d4d8c] text-[#4c84f6]'
              }`}
            >
              <Bell className="w-9 h-9" />
            </div>

            <h3 className="text-lg font-bold mb-1.5 tracking-tight">
              {filter === 'unread'
                ? 'কোনো নতুন অপঠিত বিজ্ঞাপন নেই'
                : searchQuery.trim()
                ? 'খোঁজার সাথে কোনো বিজ্ঞাপন মেলেনি'
                : 'এখনো কোনো বিজ্ঞাপন বা নোটিফিকেশন নেই'}
            </h3>
            <p className={`text-xs max-w-[280px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {filter === 'unread'
                ? 'সকল বিজ্ঞাপন ও নোটিশ দেখতে "সকল" ট্যাবে ক্লিক করুন।'
                : 'অ্যাডমিন প্যানেল থেকে কোনো অফার, জরুরি নোটিশ বা বিজ্ঞাপন প্রকাশ করলে তা সাথে সাথে এখানে দেখা যাবে।'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAds.map((ad) => {
            const cat = normalizeAnnouncementCategory(ad.category);
            const meta = ANNOUNCEMENT_CATEGORY_META[cat];
            const unread = isAnnouncementUnread(ad, sessionBaselineTs);
            const hasSafeUrl = isSafeExternalUrl(ad.actionUrl);

            return (
              <article
                key={ad.id}
                className={`orbit-card relative overflow-hidden border rounded-2xl transition-all shadow-md ${
                  isLight
                    ? unread
                      ? 'bg-white border-blue-300 shadow-blue-100/60'
                      : 'bg-white border-slate-200'
                    : unread
                    ? 'bg-[#142238] border-blue-500/45 shadow-blue-950/50'
                    : 'bg-[#121c2c] border-[#1f3049]'
                }`}
              >
                {/* Top Color Accent Ribbon */}
                <div className={`h-1 w-full bg-gradient-to-r ${meta.accentBar}`} />

                {/* Optional Ad Banner Image */}
                {ad.imageUrl && (
                  <div className={`w-full max-h-48 overflow-hidden border-b ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0b1320] border-[#1b2b42]'}`}>
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="w-full h-44 object-cover"
                    />
                  </div>
                )}

                <div className="p-4 space-y-2.5">
                  {/* Top Meta Row */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                          isLight ? meta.iconBgLight : meta.iconBgDark
                        }`}
                      >
                        <CategoryIcon category={cat} className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isLight ? meta.badgeLight : meta.badgeDark
                            }`}
                          >
                            {meta.bnLabel}
                          </span>
                          {unread && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-600 text-white ai-solid-text-white">
                              নতুন
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-1 text-[10.5px] shrink-0 tabular-nums ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{ad.createdAt}</span>
                    </div>
                  </div>

                  {/* Ad Title & Full Body */}
                  <div>
                    <h3 className="text-[15px] font-extrabold leading-snug">{ad.title}</h3>
                    <p
                      className={`text-xs mt-1.5 leading-relaxed whitespace-pre-line ${
                        isLight ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      {ad.message}
                    </p>
                  </div>

                  {/* Optional External Action CTA */}
                  {hasSafeUrl && (
                    <div className="pt-1">
                      <a
                        href={ad.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white ai-solid-text-white text-xs font-bold shadow-md transition-all"
                      >
                        <span>{ad.actionLabel || 'বিস্তারিত দেখুন'}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
