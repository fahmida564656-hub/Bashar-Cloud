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
  CreditCard,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { SiteSettings, RegisteredUser, PaymentRequest, PaymentStatus } from '../types';
import { compressImageToSafeDataUrl } from '../utils/fileVault';

interface AdminPanelScreenProps {
  settings: SiteSettings;
  users: RegisteredUser[];
  paymentRequests: PaymentRequest[];
  onSaveSettings: (updated: SiteSettings) => void;
  onDeleteUser: (userId: string) => void;
  onDeleteAllUsers?: () => void;
  onClearUserFiles?: (userId: string) => void;
  onApprovePayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onBack: () => void;
}

export const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({
  settings,
  users,
  paymentRequests,
  onSaveSettings,
  onDeleteUser,
  onDeleteAllUsers,
  onClearUserFiles,
  onApprovePayment,
  onRejectPayment,
  onBack,
}) => {
  // Session authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [showEnteredPassword, setShowEnteredPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Active admin tab: 'branding' | 'payments' | 'users'
  const [activeTab, setActiveTab] = useState<'payments' | 'branding' | 'users'>('payments');

  // Branding & Settings form state
  const [websiteName, setWebsiteName] = useState<string>(settings.websiteName || 'Bashar Cloud');
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '/assets/aistudio/0a4ee58c-1d1d-4faa-8126-cfb8779227ba_f85ac4d0.png');
  const [totalStorageGB, setTotalStorageGB] = useState<number>(settings.totalStorageGB || 1000);
  const [bkashNumber, setBkashNumber] = useState<string>(settings.bkashNumber || '01734211584');
  const [nagadNumber, setNagadNumber] = useState<string>(settings.nagadNumber || '01734211584');
  const [subscriptionFee, setSubscriptionFee] = useState<number>(settings.subscriptionFee || 100);
  const [newAdminPassword, setNewAdminPassword] = useState<string>(settings.adminPassword || 'Fahmida3421');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Search & Filter states
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);
  const [confirmDeleteAllUsers, setConfirmDeleteAllUsers] = useState<boolean>(false);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [confirmClearFilesUserId, setConfirmClearFilesUserId] = useState<string | null>(null);

  // Password verification - strictly Fahmida3421 or admin-updated password
  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const currentActivePassword = settings.adminPassword || 'Fahmida3421';
    if (enteredPassword === currentActivePassword) {
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
      bkashNumber: bkashNumber.trim() || '01734211584',
      nagadNumber: nagadNumber.trim() || '01734211584',
      subscriptionFee: Number(subscriptionFee) || 100,
      adminPassword: newAdminPassword.trim() || 'Fahmida3421',
    });
    setSaveSuccessMsg('ওয়েবসাইটের সেটিংস ও পেমেন্ট নম্বর সফলভাবে আপডেট হয়েছে!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const compressed = await compressImageToSafeDataUrl(file, {
        maxDim: 320,
        maxChars: 200_000,
        fallbackToRaw: true,
      });
      if (compressed) {
        setLogoUrl(compressed);
      }
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

  const handleCopyTrx = (trx: string) => {
    navigator.clipboard?.writeText(trx);
    setCopiedTrxId(trx);
    setTimeout(() => setCopiedTrxId(null), 2500);
  };

  const pendingPaymentsCount = paymentRequests.filter((p) => p.status === 'pending').length;

  const filteredPayments = paymentRequests.filter((p) => {
    if (paymentFilter === 'all') return true;
    return p.status === paymentFilter;
  });

  const uniqueUsers = React.useMemo(() => {
    const seen = new Set<string>();
    return users.filter((u) => {
      if (!u || !u.id || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [users]);

  const filteredUsers = uniqueUsers.filter((u) => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.toLowerCase().includes(q))
    );
  });

  // 1. Password Protection Gate
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col justify-between px-4 pt-4 pb-8 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Admin Authentication
          </h1>
        </div>

        <div className="w-full max-w-[360px] mx-auto bg-[#121c2d] border border-[#203454] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-900/40">
            <ShieldCheck className="w-9 h-9" />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-lg font-extrabold text-white">Master Admin Gate</h2>
            <p className="text-xs text-slate-400">
              প্রশাসনিক প্যানেল অ্যাক্সেস করতে গোপন মাস্টার পাসওয়ার্ড দিন।
            </p>
          </div>

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div className="space-y-1.5">
              <div className="relative flex items-center bg-[#152338] border border-[#243859] focus-within:border-blue-500 rounded-xl px-3.5 py-3">
                <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                <input
                  type={showEnteredPassword ? 'text' : 'password'}
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="Enter secret admin password"
                  autoFocus
                  required
                  className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowEnteredPassword(!showEnteredPassword)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  {showEnteredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && (
                <p className="text-xs text-rose-400 pl-1 font-medium">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Unlock Admin Panel</span>
            </button>
          </form>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          Bashar Cloud Secured Administration System
        </div>
      </div>
    );
  }

  // 2. Authorized Master Admin Panel
  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 text-white space-y-4 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#1b2b42]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight flex items-center gap-1.5">
              <span>Admin Control Panel</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Authorized
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Manage branding, payments & registered users</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAuthenticated(false)}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-[#1b273b] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-[#273852] transition-colors"
        >
          Lock
        </button>
      </div>

      {/* Navigation Tabs (Payments, Branding, Users) */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#101b2d] p-1 rounded-2xl border border-[#1e2f4a]">
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative ${
            activeTab === 'payments'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>পেমেন্টস</span>
          {pendingPaymentsCount > 0 && (
            <span className="bg-amber-400 text-black text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              {pendingPaymentsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'branding'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>ব্র্যান্ডিং</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>ইউজার ({users.length})</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* TAB 1: PAYMENTS APPROVAL SECTION */}
      {activeTab === 'payments' && (
        <div className="space-y-3 animate-in fade-in">
          <div className="bg-[#121c2d] border border-[#1f3049] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1b2b42]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">বিকাশ ও নগদ পেমেন্ট অনুমোদন</h3>
                  <p className="text-[11px] text-slate-400">
                    সঠিক ট্রানজেকশন আইডি দেখে অ্যাপ্রুভ বা রিজেক্ট করুন
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                {pendingPaymentsCount} Pending
              </span>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPaymentFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    paymentFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#152338] text-slate-400 hover:text-white border border-[#21334f]'
                  }`}
                >
                  {st} ({paymentRequests.filter((p) => st === 'all' || p.status === st).length})
                </button>
              ))}
            </div>

            {/* Payments List */}
            <div className="space-y-3 pt-1">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-[#142134]/40 rounded-xl border border-[#20324e]/50">
                  কোনো {paymentFilter !== 'all' ? paymentFilter : ''} পেমেন্ট রিকোয়েস্ট নেই।
                </div>
              ) : (
                filteredPayments.map((p) => {
                  const isBkash = p.method === 'bkash';

                  return (
                    <div
                      key={p.id}
                      className={`border rounded-2xl p-3.5 space-y-2.5 text-xs transition-all ${
                        p.status === 'pending'
                          ? 'bg-[#14233c] border-amber-500/40 shadow-lg'
                          : p.status === 'approved'
                          ? 'bg-[#102422] border-emerald-500/40'
                          : 'bg-[#221319] border-rose-500/30'
                      }`}
                    >
                      {/* Top Row: User & Method */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            isBkash
                              ? 'bg-[#d8195a]/25 text-[#ff649c] border border-[#d8195a]/40'
                              : 'bg-[#f05a28]/25 text-[#ff8e66] border border-[#f05a28]/40'
                          }`}>
                            {p.method}
                          </span>
                          <span className="font-bold text-white text-sm">{p.userName}</span>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'pending'
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : p.status === 'approved'
                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-rose-400/20 text-rose-300 border border-rose-400/40'
                        }`}>
                          {p.status}
                        </span>
                      </div>

                      {/* Detail Grid */}
                      <div className="bg-[#0c1626] border border-[#1b2b42] rounded-xl p-2.5 space-y-1.5 text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">প্রেরক মোবাইল:</span>
                          <span className="font-mono text-white font-bold">{p.senderPhone}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">TrxID:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-amber-300 font-extrabold tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {p.transactionId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyTrx(p.transactionId)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                              title="Copy TrxID"
                            >
                              {copiedTrxId === p.transactionId ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">পরিমাণ:</span>
                          <span className="text-white font-bold">৳{p.amount} TK (Lifetime)</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#18283e]">
                          <span>জমা দেওয়ার সময়: {p.submittedAt}</span>
                          {p.userEmail && <span>{p.userEmail}</span>}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onApprovePayment(p.id)}
                          disabled={p.status === 'approved'}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            p.status === 'approved'
                              ? 'bg-emerald-950/60 text-emerald-500/60 border border-emerald-900/30 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{p.status === 'approved' ? 'অনুমোদিত (Approved)' : 'অ্যাপ্রুভ করুন (Approve)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRejectPayment(p.id)}
                          disabled={p.status === 'rejected'}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            p.status === 'rejected'
                              ? 'bg-rose-950/60 text-rose-500/60 border border-rose-900/30 cursor-not-allowed'
                              : 'bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/40'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{p.status === 'rejected' ? 'বাতিলকৃত (Rejected)' : 'রিজেক্ট করুন (Reject)'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRANDING & IDENTITY SETTINGS */}
      {activeTab === 'branding' && (
        <div className="bg-[#121c2d] border border-[#1f3049] rounded-2xl p-4 shadow-xl space-y-4 animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-white">Website Branding & Identity</h3>
            <p className="text-[11px] text-slate-400">
              ওয়েবসাইটের নাম, লোগো, বিকাশ ও নগদ নম্বর পরিবর্তন করুন
            </p>
          </div>

          <form onSubmit={handleSaveAllSettings} className="space-y-4 text-xs">
            {/* Website Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Website Name (ওয়েবসাইটের নাম)
              </label>
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="e.g. Bashar Cloud"
                className="w-full bg-[#162338] border border-[#273d61] focus:border-blue-500 rounded-xl px-3 py-2 text-white font-medium focus:outline-none"
              />
            </div>

            {/* Official bKash & Nagad numbers */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  বিকাশ নম্বর (Personal)
                </label>
                <input
                  type="text"
                  value={bkashNumber}
                  onChange={(e) => setBkashNumber(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full bg-[#162338] border border-[#273d61] focus:border-blue-500 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  নগদ নম্বর (Personal)
                </label>
                <input
                  type="text"
                  value={nagadNumber}
                  onChange={(e) => setNagadNumber(e.target.value)}
                  placeholder="018XXXXXXXX"
                  className="w-full bg-[#162338] border border-[#273d61] focus:border-blue-500 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Official Logo Upload Card */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold">
                Official Website Logo (অফিসিয়াল লোগো)
              </label>
              <div className="bg-[#162338] border border-dashed border-[#2b446e] rounded-xl p-3 flex flex-col items-center justify-center text-center relative hover:border-blue-500 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-6 h-6 text-blue-400 mb-1" />
                <span className="text-xs font-semibold text-white">Upload Logo File</span>
                <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG, WebP supported</span>
              </div>
            </div>

            {/* Storage Quota & Admin Password */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Storage Quota (GB)
                </label>
                <input
                  type="number"
                  value={totalStorageGB}
                  onChange={(e) => setTotalStorageGB(Number(e.target.value))}
                  className="w-full bg-[#162338] border border-[#273d61] focus:border-blue-500 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Admin Password
                </label>
                <div className="relative flex items-center bg-[#162338] border border-[#273d61] rounded-xl px-3 py-2">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full bg-transparent text-white font-mono focus:outline-none pr-6"
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
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Website Settings (সংরক্ষণ করুন)</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: REGISTERED USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-[#121c2d] border border-[#1f3049] rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b2b42]">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Registered Users Directory</h3>
                <p className="text-[11px] text-slate-400">সকল নিবন্ধিত অ্যাকাউন্ট ও পাসওয়ার্ড কন্ট্রোল</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              {users.length} Users
            </span>
          </div>

          {/* Quick Notice & Master Delete All Accounts Action */}
          <div className="bg-[#101b2d] border border-[#1e2e48] rounded-xl p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>কোনো ডিফল্ট নকল ফাইল বা অ্যাকাউন্ট নেই। অ্যাডমিন যেকোনো অ্যাকাউন্ট বা ফাইল সম্পূর্ণ মুছতে পারবেন।</span>
            </div>

            {users.length > 0 && onDeleteAllUsers && (
              confirmDeleteAllUsers ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteAllUsers();
                      setConfirmDeleteAllUsers(false);
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer shadow-sm"
                  >
                    নিশ্চিত মুছুন
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAllUsers(false)}
                    className="bg-[#1b2940] hover:bg-[#233654] text-slate-300 px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    বাতিল
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAllUsers(true)}
                  className="bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
                  title="Delete all registered accounts and clear all files"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>সকল অ্যাকাউন্ট মুছুন (Delete All)</span>
                </button>
              )
            )}
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
          <div className="space-y-3 pt-1">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 bg-[#142134]/30 rounded-xl border border-[#20324e]/40 p-4 space-y-1">
                <p className="font-semibold text-slate-300">কোনো সাইন আপ করা ব্যবহারকারী নেই।</p>
                <p className="text-[11px] text-slate-400">নতুন ইউজার সাইন আপ করলে সরাসরি এই তালিকায় প্রদর্শিত হবে।</p>
              </div>
            ) : (
              filteredUsers.map((u, idx) => {
                const isRevealed = revealedPasswords.has(u.id);
                const initial = (u.name.charAt(0) || u.email.charAt(0) || 'U').toUpperCase();

                return (
                  <div
                    key={`${u.id}-${idx}`}
                    className="bg-[#152338] border border-[#223654] rounded-xl p-3.5 space-y-2.5 text-xs shadow-md"
                  >
                    {/* Top Row: User Avatar, Name, Email & Delete */}
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
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-white truncate">{u.name}</h4>
                            {u.isLifetimeApproved ? (
                              <span className="text-[9px] bg-emerald-500/25 text-emerald-300 font-extrabold px-1.5 py-0.2 rounded-full border border-emerald-500/40">
                                VIP Lifetime
                              </span>
                            ) : (
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-full">
                                Trial
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 truncate">{u.email}</p>
                          {u.phone && <p className="text-[10px] text-slate-400 font-mono">{u.phone}</p>}
                        </div>
                      </div>

                      {confirmDeleteUserId === u.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteUser(u.id);
                              setConfirmDeleteUserId(null);
                            }}
                            className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                          >
                            নিশ্চিত
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUserId(null)}
                            className="px-2 py-1.5 rounded-lg bg-[#1d2e49] text-slate-300 text-[11px] font-semibold cursor-pointer"
                          >
                            বাতিল
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteUserId(u.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                          title="Delete User Account"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>ডিলিট (Delete)</span>
                        </button>
                      )}
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
                        className="text-slate-400 hover:text-white p-0.5 text-[11px] flex items-center gap-1 cursor-pointer"
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

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#1a2b42]">
                      <span>নিবন্ধন: {u.registeredAt}</span>
                      <span>{u.filesCount || 0} ফাইল ({u.storageUsedMB || 0} MB)</span>
                    </div>

                    {/* Action buttons row for this user */}
                    {onClearUserFiles && (
                      <div className="flex items-center gap-2 pt-1 border-t border-[#18273d]">
                        {confirmClearFilesUserId === u.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <button
                              type="button"
                              onClick={() => {
                                onClearUserFiles(u.id);
                                setConfirmClearFilesUserId(null);
                              }}
                              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg cursor-pointer"
                            >
                              হ্যাঁ, সব ফাইল মুছুন
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmClearFilesUserId(null)}
                              className="px-3 bg-[#1d2e49] text-slate-300 text-[10px] font-semibold py-1.5 rounded-lg cursor-pointer"
                            >
                              বাতিল
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmClearFilesUserId(u.id)}
                            className="flex-1 bg-[#1a263a] hover:bg-[#22334e] border border-[#283e61] text-slate-300 hover:text-white text-[10px] font-semibold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                            title="Clear all files for this user"
                          >
                            <Trash2 className="w-3 h-3 text-amber-400" />
                            <span>সকল ফাইল মুছুন</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
