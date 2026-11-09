import React, { useState } from 'react';
import {
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Send,
  Sparkles,
  Smartphone,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { SiteSettings, PaymentRequest, PaymentMethod, UserProfile, UserSubscription } from '../types';
import { validateBangladeshiPhone, validateTrxId } from '../utils/subscription';

interface PaymentScreenProps {
  user: UserProfile;
  settings: SiteSettings;
  subscription: UserSubscription;
  existingPayment?: PaymentRequest;
  onSubmitPayment: (request: Omit<PaymentRequest, 'id' | 'submittedAt' | 'submittedTimestamp' | 'status'>) => void;
  onBack: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  user,
  settings,
  subscription,
  existingPayment,
  onSubmitPayment,
  onBack,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('bkash');
  const [senderPhone, setSenderPhone] = useState<string>(user.phone || '');
  const [transactionId, setTransactionId] = useState<string>('');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [justSubmitted, setJustSubmitted] = useState<boolean>(false);

  const bkashNumber = settings.bkashNumber || '01734211584';
  const nagadNumber = settings.nagadNumber || '01734211584';
  const feeAmount = settings.subscriptionFee || 100;

  const handleCopyNumber = (num: string, type: string) => {
    navigator.clipboard?.writeText(num);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = senderPhone.trim();
    const cleanTrx = transactionId.trim().toUpperCase();

    if (!cleanPhone) {
      setErrorMsg('প্রেরক মোবাইল নম্বর লিখুন। (Please enter sender phone number)');
      return;
    }

    if (!validateBangladeshiPhone(cleanPhone)) {
      setErrorMsg('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
      return;
    }

    if (!cleanTrx) {
      setErrorMsg('ট্রানজেকশন আইডি (TrxID) লিখুন। (Please enter Transaction ID)');
      return;
    }

    if (!validateTrxId(cleanTrx)) {
      setErrorMsg('সঠিক ট্রানজেকশন আইডি দিন (কমপক্ষে ৬ সংখ্যার অক্ষর/নম্বর)।');
      return;
    }

    onSubmitPayment({
      userId: user.email || user.phone || 'guest-user',
      userName: user.name || 'User',
      userEmail: user.email || '',
      userPhone: user.phone || '',
      method,
      senderPhone: cleanPhone,
      transactionId: cleanTrx,
      amount: feeAmount,
    });

    setJustSubmitted(true);
  };

  const isApproved = subscription.isLifetimeApproved || existingPayment?.status === 'approved';
  const isPending = !isApproved && (existingPayment?.status === 'pending' || justSubmitted);
  const isRejected = !isApproved && existingPayment?.status === 'rejected' && !justSubmitted;

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-8 text-white">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white shrink-0 transition-colors shadow-sm"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white leading-tight flex items-center gap-2">
            <span>সারাজীবনের জন্য ক্লাউড অ্যাক্সেস</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </h1>
          <p className="text-[11px] text-slate-400">
            বিকাশ বা নগদ সেন্ড মানি করে আজীবনের জন্য আনলক করুন
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-0.5">
        {/* Status Card */}
        {isApproved ? (
          <div className="bg-gradient-to-r from-emerald-950/80 to-[#102a24] border border-emerald-500/50 rounded-2xl p-4 shadow-xl text-center space-y-2 animate-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">সারাজীবনের অ্যাক্সেস সক্রিয়! (Lifetime VIP Active)</h3>
            <p className="text-xs text-emerald-300/90 leading-relaxed max-w-[320px] mx-auto">
              আপনার একাউন্ট অ্যাডমিন কর্তৃক অনুমোদিত হয়েছে। আপনি আজীবন আনলিমিটেড ফাইল দেখতে, আপলোড করতে, ডাউনলোড ও ডিলিট করতে পারবেন।
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved • ৳{feeAmount} TK Paid</span>
            </div>
          </div>
        ) : isPending ? (
          <div className="bg-gradient-to-r from-amber-950/80 to-[#2c2211] border border-amber-500/50 rounded-2xl p-4 shadow-xl text-center space-y-2 animate-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white">অ্যাডমিন অনুমোদনের অপেক্ষায় (Pending Approval)</h3>
            <p className="text-xs text-amber-200/90 leading-relaxed max-w-[320px] mx-auto">
              আপনার পেমেন্ট তথ্য সফলভাবে পাঠানো হয়েছে। অ্যাডমিন ট্রানজেকশন আইডি যাচাই করে অ্যাপ্রুভ করলেই আপনার সারাজীবনের অ্যাক্সেস চালু হয়ে যাবে।
            </p>
            {existingPayment && (
              <div className="bg-[#182335]/90 border border-[#273a57] rounded-xl p-2.5 text-xs text-slate-300 max-w-[320px] mx-auto text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">মেথড:</span>
                  <span className="font-bold uppercase text-white">{existingPayment.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">প্রেরক নম্বর:</span>
                  <span className="font-mono text-white">{existingPayment.senderPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">TrxID:</span>
                  <span className="font-mono text-amber-300 font-bold">{existingPayment.transactionId}</span>
                </div>
              </div>
            )}
          </div>
        ) : isRejected ? (
          <div className="bg-gradient-to-r from-rose-950/80 to-[#2c1319] border border-rose-500/50 rounded-2xl p-4 shadow-xl text-center space-y-2 animate-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-rose-300">পেমেন্ট বাতিল হয়েছে (Rejected)</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-[320px] mx-auto">
              পূর্বের ট্রানজেকশন আইডি সঠিক পাওয়া যায়নি। অনুগ্রহ করে ১০০ টাকা সেন্ড মানি করে সঠিক TrxID দিয়ে পুনরায় ফর্ম পূরণ করুন।
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#12233f] to-[#162744] border border-blue-500/40 rounded-2xl p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  ৳
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">আজীবন সাবস্ক্রিপশন ফি</h3>
                  <p className="text-[11px] text-slate-400">এককালীন ১০০ টাকা পেমেন্ট</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-blue-400 font-mono">৳{feeAmount}</span>
                <span className="text-[10px] text-slate-400 block">এককালীন (Lifetime)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed border-t border-[#1c3050] pt-2">
              নিয়ম অনুযায়ী অ্যাকাউন্ট খোলার পর ১ মাস ফ্রি ব্যবহার করা যায়। এরপর ফাইল দেখা, আপলোড, ডাউনলোড বা ডিলিট করতে ১০০ টাকা সেন্ড মানি করতে হবে।
            </p>
          </div>
        )}

        {/* Official Payment Numbers Card */}
        <div className="bg-[#121c2d] border border-[#1f3049] rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b2b42]">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>সেন্ড মানি করার অফিশিয়াল নম্বর</span>
            </h3>
            <span className="text-[10px] text-amber-400 font-medium">Send Money (Personal)</span>
          </div>

          {/* bKash Option */}
          <div className="bg-[#162135] hover:bg-[#1a2840] border border-[#243754] rounded-xl p-3 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#d8195a]/20 border border-[#d8195a]/40 text-[#ff4f8e] font-bold text-xs flex items-center justify-center">
                bK
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">বিকাশ (bKash)</span>
                  <span className="text-[10px] bg-[#d8195a]/20 text-[#ff74a4] px-1.5 py-0.2 rounded font-semibold">Personal</span>
                </div>
                <p className="font-mono text-sm font-bold text-slate-200 mt-0.5">{bkashNumber}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyNumber(bkashNumber, 'bkash')}
              className="px-2.5 py-1.5 rounded-lg bg-[#20324d] hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-all"
            >
              {copiedType === 'bkash' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">কপি হয়েছে</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>কপি</span>
                </>
              )}
            </button>
          </div>

          {/* Nagad Option */}
          <div className="bg-[#162135] hover:bg-[#1a2840] border border-[#243754] rounded-xl p-3 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#f05a28]/20 border border-[#f05a28]/40 text-[#ff794d] font-bold text-xs flex items-center justify-center">
                নগদ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">নগদ (Nagad)</span>
                  <span className="text-[10px] bg-[#f05a28]/20 text-[#ff906b] px-1.5 py-0.2 rounded font-semibold">Personal</span>
                </div>
                <p className="font-mono text-sm font-bold text-slate-200 mt-0.5">{nagadNumber}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyNumber(nagadNumber, 'nagad')}
              className="px-2.5 py-1.5 rounded-lg bg-[#20324d] hover:bg-orange-600 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-all"
            >
              {copiedType === 'nagad' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">কপি হয়েছে</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>কপি</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Submission Form (Shown if not approved or if rejected/wants to resubmit) */}
        {!isApproved && (
          <form
            onSubmit={handleSubmit}
            className="bg-[#121c2d] border border-[#1f3049] rounded-2xl p-4 space-y-3.5 shadow-lg"
          >
            <div className="pb-2 border-b border-[#1b2b42]">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-400" />
                <span>পেমেন্ট তথ্য সাবমিট করুন</span>
              </h3>
              <p className="text-[11px] text-slate-400">টাকা পাঠানোর পর নিচের তথ্য পূরণ করুন</p>
            </div>

            {errorMsg && (
              <div className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-2.5 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Method Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                পেমেন্ট মেথড নির্বাচন করুন *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMethod('bkash')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    method === 'bkash'
                      ? 'bg-[#d8195a]/20 border-[#ff4f8e] text-white shadow-md'
                      : 'bg-[#152236] border-[#223652] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#ff4f8e]" />
                  <span>বিকাশ (bKash)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('nagad')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    method === 'nagad'
                      ? 'bg-[#f05a28]/20 border-[#ff794d] text-white shadow-md'
                      : 'bg-[#152236] border-[#223652] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#ff794d]" />
                  <span>নগদ (Nagad)</span>
                </button>
              </div>
            </div>

            {/* Sender Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                প্রেরক মোবাইল নম্বর (Sender Phone Number) *
              </label>
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                required
                className="w-full bg-[#162338] border border-[#273d61] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">যে নম্বর থেকে সেন্ড মানি করেছেন</p>
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ট্রানজেকশন আইডি (Transaction ID / TrxID) *
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. BLM49XK2P"
                required
                className="w-full bg-[#162338] border border-[#273d61] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none uppercase tracking-wider"
              />
              <p className="text-[10px] text-slate-400 mt-1">সেন্ড মানি করার পর প্রাপ্ত এসএমএস থেকে TrxID দিন</p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>পেমেন্ট তথ্য সাবমিট করুন (Submit for Approval)</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
