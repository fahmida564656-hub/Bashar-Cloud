import React, { useState } from 'react';
import { ChevronLeft, Edit2, Shield, Lock, Eye, EyeOff, X } from 'lucide-react';
import { BasharAvatar } from './BasharAvatar';
import { UserProfile } from '../types';

interface EditProfileScreenProps {
  user: UserProfile;
  onBack: () => void;
  onSaveProfile: (updated: Partial<UserProfile>) => void;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  user,
  onBack,
  onSaveProfile,
}) => {
  const [fullName, setFullName] = useState(user.name);
  const [activeBottomSheet, setActiveBottomSheet] = useState<'phone' | 'email' | null>(null);

  // Phone bottom sheet states
  const [phoneInput, setPhoneInput] = useState(user.phone ? user.phone.replace(/[^0-9]/g, '').slice(-10) : '');
  const [phonePassword, setPhonePassword] = useState('');
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [phoneStep, setPhoneStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');

  // Email bottom sheet states
  const [emailInput, setEmailInput] = useState(user.email);
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2>(1);

  const [notificationMsg, setNotificationMsg] = useState('');

  const handleSave = () => {
    onSaveProfile({ name: fullName });
    setNotificationMsg('Profile changes saved successfully');
    setTimeout(() => {
      onBack();
    }, 600);
  };

  const handleSendPhoneOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phonePassword) {
      alert('Please enter your password to verify identity');
      return;
    }
    setPhoneStep(2);
  };

  const handleVerifyPhoneOtp = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({ phone: `(+880) ${phoneInput}` });
    setActiveBottomSheet(null);
    setPhoneStep(1);
    setPhonePassword('');
    setNotificationMsg('Phone number updated successfully');
  };

  const handleSendEmailOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailPassword) {
      alert('Please enter your password to verify identity');
      return;
    }
    setEmailStep(2);
  };

  const handleVerifyEmailOtp = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({ email: emailInput });
    setActiveBottomSheet(null);
    setEmailStep(1);
    setEmailPassword('');
    setNotificationMsg('Email updated successfully');
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 pt-3 pb-8 text-white relative">
      <div>
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#142033] border border-[#233552] flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-white ml-auto mr-auto pr-10">
            Edit Profile
          </h1>
        </div>

        {/* User Avatar & Name */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={fullName || 'User'}
                className="w-24 h-24 rounded-full object-cover ring-2 ring-blue-500 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 ring-2 ring-blue-500 shadow-xl flex items-center justify-center text-white font-bold text-3xl">
                {(fullName ? fullName.charAt(0) : user.email ? user.email.charAt(0) : 'U').toUpperCase()}
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            {fullName || user.email || 'User'}
          </h3>
        </div>

        {/* Basic Information Form */}
        <div className="space-y-5">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            BASIC INFORMATION
          </h4>

          {/* Full Name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#121c2c] border border-[#1f3049] rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-blue-500 text-[15px]"
            />
          </div>

          {/* Phone Number with Pencil */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Phone number</label>
            <div
              onClick={() => setActiveBottomSheet('phone')}
              className="w-full bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-xl px-4 py-3.5 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="text-[15px] text-slate-300">{user.phone}</span>
              <Edit2 className="w-4 h-4 text-blue-400" />
            </div>
          </div>

          {/* Email with Pencil */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Email</label>
            <div
              onClick={() => setActiveBottomSheet('email')}
              className="w-full bg-[#121c2c] hover:bg-[#162338] border border-[#1f3049] rounded-xl px-4 py-3.5 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="text-[15px] text-slate-300 truncate mr-2">{user.email}</span>
              <Edit2 className="w-4 h-4 text-blue-400 shrink-0" />
            </div>
          </div>
        </div>

        {notificationMsg && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 text-center animate-in fade-in">
            {notificationMsg}
          </div>
        )}
      </div>

      {/* Save Changes Button */}
      <div className="pt-6">
        <button
          type="button"
          onClick={handleSave}
          className="w-full bg-[#3658dc] hover:bg-blue-600 active:scale-[0.99] text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 text-[15px]"
        >
          Save Changes
        </button>
      </div>

      {/* ================= UPDATE PHONE BOTTOM SHEET (Screenshot 17) ================= */}
      {activeBottomSheet === 'phone' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-[#0b1322] border-t border-[#1e2f4a] rounded-t-3xl p-5 space-y-4 max-w-[420px] mx-auto w-full animate-in slide-in-from-bottom-8">
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Update phone number
              </h3>
              <button
                type="button"
                onClick={() => setActiveBottomSheet(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Blue framed Identity Step card matching Screenshot 17 */}
            <div className="bg-[#101b2d] border border-blue-500/80 rounded-2xl p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-white leading-tight">
                    {phoneStep === 1 ? 'Step 1: Verify Identity' : 'Step 2: Enter OTP Code'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    {phoneStep === 1
                      ? "We'll send verification code to the contact"
                      : `A 4-digit code was sent to +880 ${phoneInput}`}
                  </p>
                </div>
              </div>

              {phoneStep === 1 ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-3.5">
                  {/* Phone input with +880 */}
                  <div className="flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3">
                    <span className="text-slate-300 font-medium text-sm pr-3 border-r border-slate-700">
                      +880
                    </span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Mobile number"
                      required
                      className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm pl-3 font-medium"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3 focus-within:border-blue-500">
                    <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type={showPhonePassword ? 'text' : 'password'}
                      value={phonePassword}
                      onChange={(e) => setPhonePassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPhonePassword(!showPhonePassword)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      {showPhonePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="w-full bg-[#3658dc] hover:bg-blue-600 active:scale-[0.99] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Send Verification Code</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-3.5">
                  <div className="flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 4-digit code (e.g. 5621)"
                      autoFocus
                      required
                      className="w-full bg-transparent text-white text-center text-lg tracking-widest placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl text-sm shadow-md"
                  >
                    Confirm & Update Phone
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= UPDATE EMAIL BOTTOM SHEET (Screenshot 6) ================= */}
      {activeBottomSheet === 'email' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-[#0b1322] border-t border-[#1e2f4a] rounded-t-3xl p-5 space-y-4 max-w-[420px] mx-auto w-full animate-in slide-in-from-bottom-8">
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Update email
              </h3>
              <button
                type="button"
                onClick={() => setActiveBottomSheet(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Blue framed Identity Step card matching Screenshot 6 */}
            <div className="bg-[#101b2d] border border-blue-500/80 rounded-2xl p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-white leading-tight">
                    {emailStep === 1 ? 'Step 1: Verify Identity' : 'Step 2: Enter Verification Code'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    {emailStep === 1
                      ? "We'll send verification code to the contact"
                      : `A confirmation link was sent to ${emailInput}`}
                  </p>
                </div>
              </div>

              {emailStep === 1 ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-3.5">
                  {/* Email input */}
                  <div className="flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter new email address"
                      required
                      className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm font-medium"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3 focus-within:border-blue-500">
                    <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type={showEmailPassword ? 'text' : 'password'}
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="w-full bg-[#3658dc] hover:bg-blue-600 active:scale-[0.99] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Send Verification Code</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-3.5">
                  <div className="flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      autoFocus
                      required
                      className="w-full bg-transparent text-white text-center text-lg tracking-widest placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl text-sm shadow-md"
                  >
                    Confirm & Update Email
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
