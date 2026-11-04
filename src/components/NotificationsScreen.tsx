import React, { useState } from 'react';
import { ChevronLeft, Search, Bell, X, CheckCheck } from 'lucide-react';

interface NotificationsScreenProps {
  onBack: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    desc: string;
    date: string;
    unread: boolean;
  }>>([]);

  const addDemoNotification = () => {
    const newNotif = {
      id: Date.now().toString(),
      title: 'Cloud Backup Complete',
      desc: 'All recent photos and media backed up safely to GP Cloud.',
      date: 'Just now',
      unread: true,
    };
    setNotifications([newNotif, ...notifications]);
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread' && !n.unread) return false;
    if (searchQuery.trim() && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 text-white">
      {/* Header */}
      <div className="flex items-center mb-5">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white ml-auto mr-auto pr-10">
          Notifications
        </h1>
      </div>

      {/* Search notifications bar matching Screenshot 3 */}
      <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-3 mb-4 focus-within:border-blue-500 transition-colors">
        <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notifications"
          className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs matching Screenshot 3 */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/40'
              : 'bg-[#121c2c] border border-[#1f3049] text-slate-300 hover:text-white'
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === 'unread'
              ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/40'
              : 'bg-[#121c2c] border border-[#1f3049] text-slate-300 hover:text-white'
          }`}
        >
          Unread ({notifications.filter((n) => n.unread).length})
        </button>
      </div>

      {/* Content Area */}
      {filteredNotifs.length === 0 ? (
        /* Empty State matching Screenshot 3 */
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full bg-[#121c2c] border border-[#1f3049] rounded-3xl p-8 flex flex-col items-center text-center">
            {/* Bell icon in blue circle */}
            <div className="w-20 h-20 rounded-full bg-[#1e345e] border border-[#2d4d8c] flex items-center justify-center text-[#4c84f6] mb-6 shadow-inner">
              <Bell className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
              Looks like there's nothing here
            </h3>
            <p className="text-sm text-slate-400 max-w-[280px] leading-relaxed">
              We'll notify you about important updates like file uploads, shares, and storage alerts.
            </p>

            <button
              type="button"
              onClick={addDemoNotification}
              className="mt-6 text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Simulate Test Notification
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((n) => (
            <div
              key={n.id}
              className="bg-[#121c2c] border border-[#1f3049] rounded-2xl p-4 flex items-start gap-3.5"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white truncate">{n.title}</h4>
                  <span className="text-[10px] text-slate-400">{n.date}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
