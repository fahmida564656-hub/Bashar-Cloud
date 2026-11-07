import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Upload,
  Users,
  HardDrive,
  Trash2,
  Check,
  ChevronLeft,
  Search,
  Key,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { SiteSettings, RegisteredUser } from '../types';

interface AdminPanelScreenProps {
  settings: SiteSettings;
  users: RegisteredUser[];
  onSaveSettings: (updated: SiteSettings) => void;
  onDeleteUser: (userId: string) => void;
  onBack: () => void;
}

export const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({
  settings,
  users,
  onSaveSettings,
  onDeleteUser,
  onBack,
}) => {
  // Session authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [showEnteredPassword, setShowEnteredPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Branding & Settings form state
  const [websiteName, setWebsiteName] = useState<string>(settings.websiteName || 'Bashar Cloud');
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '');
  const [totalStorageGB, setTotalStorageGB] = useState<number>(settings.totalStorageGB || 1000);
  const [newAdminPassword, setNewAdminPassword] = useState<string>(settings.adminPassword || 'Admin@Bashar2026!');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Users search state
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

  // Password verification - strictly confidential, never displayed
  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPassword === (settings.adminPassword || 'Admin@Bashar2026!')) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('ভুল অ্যাডমিন পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন। (Incorrect admin password.)');
    }
  };

  const handleSaveAllSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      websiteName: websiteName.trim() || 'Bashar Cloud',
      logoUrl: logoUrl.trim(),
      totalStorageGB: Number(totalStorageGB) || 1000,
      adminPassword: newAdminPassword.trim() || 'Admin@Bashar2026!',
    });
    setSaveSuccessMsg('ওয়েবসাইটের নাম ও লোগো সফলভাবে আপডেট হয়েছে! (Settings updated everywhere)');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.phone.includes(userSearchQuery)
  );

  // If not yet authenticated, render the secure master admin gate WITHOUT showing password hint
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col justify-between px-6 py-8 text-white">
        <div className="flex items-center mb-6">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-white ml-auto mr-auto pr-10">
            Admin Authentication
          </h1>
        </div>

        <div className="w-full max-w-sm mx-auto my-auto bg-[#101b2d] border border-[#203454] rounded-3xl p-6 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Master Admin Gate</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            প্রশাসনিক প্যানেল অ্যাক্সেস করতে গোপন মাস্টার পাসওয়ার্ড দিন।
          </p>

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div className="relative flex items-center bg-[#142238] border border-[#233857] focus-within:border-blue-500 rounded-xl px-4 py-3 transition-colors text-left">
              <Key className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type={showEnteredPassword ? 'text' : 'password'}
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                placeholder="Enter secret admin password"
                required
                autoFocus
                className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowEnteredPassword(!showEnteredPassword)}
                className="text-slate-400 hover:text-white p-1 ml-1"
              >
                {showEnteredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {authError && (
              <p className="text-xs text-rose-400 bg-rose-500/15 border border-rose-500/30 px-3 py-2 rounded-xl text-left">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Unlock Admin Panel</span>
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-slate-500">
          Bashar Cloud Secured Administration System
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 text-white space-y-4 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1f2f49]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight flex items-center gap-2">
              <span>Admin Control Panel</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                Authorized
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Manage website identity, branding, and registered accounts
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAuthenticated(false)}
          className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 transition-colors"
        >
          Lock
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-3.5 py-2.5 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Card 1: Website Branding & Configuration */}
      <div className="bg-[#121c2d] border border-[#1f3049] rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#1b2b42]">
          <Globe className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Website Branding & Identity</h3>
            <p className="text-[11px] text-slate-400">এখানে পরিবর্তন করলে পুরো সাইটে সাথে সাথে আপডেট হবে</p>
          </div>
        </div>

        {/* Live Header Preview Mockup */}
        <div className="bg-[#0b121f] border border-[#1c2e47] rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold pb-1 border-b border-[#18273d]">
            <span>Live Header Preview</span>
            <span className="text-sky-400 font-normal">Real-time simulation</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#142033] border border-blue-500/30 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-500/50 flex items-center justify-center text-[10px] text-white font-bold">☁</div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">{websiteName || 'Bashar Cloud'}</h4>
                <p className="text-[10px] text-slate-400 leading-tight">Manage all your files in one place</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 opacity-60">
              <div className="w-6 h-6 rounded-full bg-[#142238] flex items-center justify-center text-[10px]">🔍</div>
              <div className="w-6 h-6 rounded-full bg-[#142238] flex items-center justify-center text-[10px]">🔔</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveAllSettings} className="space-y-4">
          {/* Website Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Website Name (ওয়েবসাইটের নাম)
            </label>
            <div className="flex items-center bg-[#142134] border border-[#223654] focus-within:border-blue-500 rounded-xl px-3.5 py-2.5">
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="e.g. Bashar Cloud"
                required
                className="w-full bg-transparent text-white text-sm focus:outline-none font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Default is Bashar Cloud. Updates headers, titles, and welcome screens.</p>
          </div>

          {/* Professional Logo Upload Card */}
          <div className="bg-[#0f1828] border border-[#1e314d] rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">
                Official Website Logo (অফিসিয়াল লোগো)
              </label>
              <span className="text-[10px] text-slate-400 bg-[#162438] px-2 py-0.5 rounded-full">
                PNG, JPG, SVG, WebP
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="relative w-16 h-16 rounded-2xl bg-[#142238] border-2 border-dashed border-[#2b446c] flex items-center justify-center overflow-hidden shrink-0 group">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-7 h-7 text-slate-500" />
                )}
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <label className="cursor-pointer inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md w-fit active:scale-95">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{logoUrl ? 'Change Custom Logo' : 'Upload Logo File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoUrl ? (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium text-left flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset to default logo</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    লোগো আপলোড না করলে ডিফল্ট থ্রি-ডি ক্লাউড লোগো প্রদর্শিত হবে।
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Total Storage Quota (GB) & Master Password Edit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Storage Quota (GB)
              </label>
              <div className="flex items-center bg-[#142134] border border-[#223654] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500">
                <input
                  type="number"
                  value={totalStorageGB}
                  onChange={(e) => setTotalStorageGB(Number(e.target.value))}
                  min={100}
                  max={100000}
                  className="w-full bg-transparent text-white text-sm focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Admin Password Modification */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative flex items-center bg-[#142134] border border-[#223654] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full bg-transparent text-white text-sm focus:outline-none font-medium pr-6"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-2 text-slate-400 hover:text-white"
                >
                  {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/40 transition-all active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>Save Website Settings (সংরক্ষণ করুন)</span>
          </button>
        </form>
      </div>

      {/* Card 2: Registered Users Directory */}
      <div className="bg-[#121c2d] border border-[#1f3049] rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#1b2b42]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Registered Users Directory</h3>
              <p className="text-[11px] text-slate-400">সাইন আপ করা ব্যবহারকারীদের তালিকা ও পাসওয়ার্ড ইনস্পেক্টর</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            {users.length} Users
          </span>
        </div>

        {/* Search users */}
        <div className="relative flex items-center bg-[#142134] border border-[#223654] rounded-xl px-3 py-2 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Users List */}
        <div className="space-y-2.5 pt-1">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              কোনো সাইন আপ করা ব্যবহারকারী নেই।
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isRevealed = revealedPasswords.has(u.id);
              const initial = (u.name.charAt(0) || u.email.charAt(0) || 'U').toUpperCase();

              return (
                <div
                  key={u.id}
                  className="bg-[#152338] border border-[#223654] rounded-xl p-3 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-blue-400" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-white truncate">{u.name}</h4>
                        <p className="text-[11px] text-slate-300 truncate">{u.email}</p>
                        {u.phone && <p className="text-[10px] text-slate-400">{u.phone}</p>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete user ${u.name}?`)) {
                          onDeleteUser(u.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors shrink-0"
                      title="Delete User"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Password Inspector */}
                  <div className="bg-[#0e1726] border border-[#1b2b42] rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[10px] text-slate-400">Password:</span>
                      <span className="font-mono text-[11px] text-sky-200">
                        {isRevealed ? (u.passwordPlain || '••••••••') : '••••••••'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePasswordReveal(u.id)}
                      className="text-slate-400 hover:text-white p-0.5 text-[11px] flex items-center gap-1"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="w-3 h-3 text-slate-300" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 text-sky-400" />
                          <span className="text-sky-300">View</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-[#1a2b42]">
                    <span>Registered: {u.registeredAt}</span>
                    <span>{u.filesCount || 0} files ({u.storageUsedMB || 0} MB)</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
