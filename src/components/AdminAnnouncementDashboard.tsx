import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Clock,
  ExternalLink,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AdminAnnouncement } from '../types';
import {
  ANNOUNCEMENT_CATEGORY_META,
  isSafeExternalUrl,
  normalizeAnnouncementCategory,
  sortAnnouncementsNewestFirst,
} from '../utils/announcements';

interface AdminAnnouncementDashboardProps {
  announcements: AdminAnnouncement[];
  onDeleteAnnouncement: (adId: string) => void;
}

export const AdminAnnouncementDashboard: React.FC<AdminAnnouncementDashboardProps> = ({
  announcements,
  onDeleteAnnouncement,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pendingDeleteAd, setPendingDeleteAd] = useState<AdminAnnouncement | null>(null);

  const sortedAnnouncements = useMemo(
    () => sortAnnouncementsNewestFirst(announcements || []),
    [announcements]
  );

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sortedAnnouncements;
    return sortedAnnouncements.filter((ad) => {
      const catMeta = ANNOUNCEMENT_CATEGORY_META[normalizeAnnouncementCategory(ad.category)];
      return (
        ad.title.toLowerCase().includes(q) ||
        ad.message.toLowerCase().includes(q) ||
        catMeta.bnLabel.toLowerCase().includes(q) ||
        catMeta.enLabel.toLowerCase().includes(q)
      );
    });
  }, [sortedAnnouncements, searchQuery]);

  // Allow closing confirmation modal with Escape key
  useEffect(() => {
    if (!pendingDeleteAd) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingDeleteAd(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDeleteAd]);

  const handleConfirmDelete = () => {
    if (!pendingDeleteAd) return;
    onDeleteAnnouncement(pendingDeleteAd.id);
    setPendingDeleteAd(null);
  };

  return (
    <>
      <section
        aria-label="Admin Announcement Dashboard"
        className="bg-[#121c2d] border border-[#1f3049] rounded-2xl p-4 shadow-xl space-y-3"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1b2b42]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-sky-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                বিজ্ঞাপন ড্যাশবোর্ড (Announcement Dashboard)
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                জমা থাকা সকল বিজ্ঞাপনের তালিকা — যেকোনো সময় নিরাপদে ডিলিট করুন
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold bg-blue-500/20 text-sky-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full shrink-0 tabular-nums">
            মোট {sortedAnnouncements.length}টি
          </span>
        </div>

        {/* Search Filter */}
        {sortedAnnouncements.length > 0 && (
          <div className="relative flex items-center bg-[#142134] border border-[#223654] focus-within:border-blue-500 rounded-xl px-3 py-2 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="শিরোনাম বা বার্তা দিয়ে বিজ্ঞাপন খুঁজুন..."
              aria-label="Search announcements"
              className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="text-slate-400 hover:text-white p-0.5 ml-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Table View or Empty State */}
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 bg-[#142134]/40 rounded-xl border border-[#20324e]/60 px-4 space-y-1">
            <p className="font-semibold text-slate-300">
              {searchQuery.trim()
                ? 'খোঁজার সাথে কোনো বিজ্ঞাপন মেলেনি।'
                : 'এখনো কোনো বিজ্ঞাপন জমা নেই।'}
            </p>
            <p className="text-[11px] text-slate-400">
              উপরের ফর্ম থেকে বিজ্ঞাপন দিলে এখানে টেবিল আকারে স্থায়ীভাবে জমা থাকবে।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto rounded-xl border border-[#20324e] bg-[#0e1726]">
            <table className="w-full text-left border-collapse min-w-[440px]">
              <thead className="sticky top-0 z-10 bg-[#142236] border-b border-[#233859] text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-2.5 px-3">
                    বিজ্ঞাপন ও ধরন
                  </th>
                  <th scope="col" className="py-2.5 px-3">
                    বার্তা (Message)
                  </th>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                    সময়
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-right">
                    অ্যাকশন
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2d47] text-xs">
                {filteredAnnouncements.map((ad) => {
                  const cat = normalizeAnnouncementCategory(ad.category);
                  const meta = ANNOUNCEMENT_CATEGORY_META[cat];
                  const hasSafeUrl = isSafeExternalUrl(ad.actionUrl);

                  return (
                    <tr
                      key={ad.id}
                      className="hover:bg-[#152338]/75 transition-colors align-top"
                    >
                      <td className="py-3 px-3 max-w-[165px]">
                        <div className="flex items-start gap-2">
                          {ad.imageUrl && (
                            <img
                              src={ad.imageUrl}
                              alt={ad.title}
                              className="w-9 h-9 rounded-lg object-cover border border-[#273d61] shrink-0 mt-0.5"
                            />
                          )}
                          <div className="min-w-0 space-y-1">
                            <span
                              className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${meta.badgeDark}`}
                            >
                              {meta.bnLabel}
                            </span>
                            <div className="font-bold text-white leading-snug break-words line-clamp-2">
                              {ad.title}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-[175px]">
                        <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2 break-words">
                          {ad.message}
                        </p>
                        {hasSafeUrl && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-sky-300 font-medium">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {ad.actionLabel || 'লিংক সংযুক্ত'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 tabular-nums">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{ad.createdAt}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteAd(ad)}
                          aria-label={`Delete ${ad.title}`}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/35 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Clear Confirmation Dialog Modal */}
      {pendingDeleteAd && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-announcement-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPendingDeleteAd(null);
            }
          }}
        >
          <div className="w-full max-w-[360px] bg-[#121c2d] border border-rose-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h4
                  id="delete-announcement-dialog-title"
                  className="text-sm font-bold text-white leading-snug"
                >
                  বিজ্ঞাপনটি ডিলিট নিশ্চিত করুন
                </h4>
                <p className="text-[11px] text-slate-400">
                  Confirm Announcement Deletion
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteAd(null)}
                aria-label="Close confirmation dialog"
                className="w-8 h-8 rounded-lg bg-[#162338] hover:bg-[#1d2e49] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#162338] border border-[#253a5c] rounded-xl p-3 space-y-1">
              <div className="text-xs font-bold text-white line-clamp-2">
                {pendingDeleteAd.title}
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-2">
                {pendingDeleteAd.message}
              </p>
            </div>

            <p className="text-xs text-rose-300/90 leading-relaxed">
              আপনি কি নিশ্চিত? এই বিজ্ঞাপনটি ডিলিট করলে অ্যাডমিন ড্যাশবোর্ড এবং সকল ব্যবহারকারীর নোটিফিকেশন থেকে স্থায়ীভাবে মুছে যাবে।
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingDeleteAd(null)}
                className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-[#162338] hover:bg-[#1d2e49] border border-[#273d61] text-slate-200 font-bold text-xs cursor-pointer transition-colors"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white ai-solid-text-white font-bold text-xs shadow-lg shadow-rose-900/40 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>ডিলিট নিশ্চিত (Delete)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
