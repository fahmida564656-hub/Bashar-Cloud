import React, { useState } from 'react';
import { ChevronLeft, User, Phone, Mail, Camera, Upload, Check, Save } from 'lucide-react';
import { UserProfile } from '../types';
import { compressImageToSafeDataUrl } from '../utils/fileVault';

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
  const [fullName, setFullName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [email, setEmail] = useState(user.email || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user.avatarUrl || '');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle avatar upload (compressed cleanly so Firestore 1MB limit is never exceeded)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const compressed = await compressImageToSafeDataUrl(file, {
        maxDim: 320,
        maxChars: 150_000,
        fallbackToRaw: true,
      });
      if (compressed) {
        setAvatarUrl(compressed);
      }
    }
  };

  // Direct save without any OTP or verification code ("ভেরিফিকেশন করতে হবে না")
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!fullName.trim()) {
      setErrorMsg('অনুগ্রহ করে আপনার পুরো নাম লিখুন (Please enter your name)');
      return;
    }

    onSaveProfile({
      name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      avatarUrl: avatarUrl || undefined,
    });

    setSuccessMsg('প্রোফাইল সফলভাবে আপডেট করা হয়েছে! (Profile updated successfully)');
    setTimeout(() => {
      onBack();
    }, 700);
  };

  const initial = (fullName.charAt(0) || user.email.charAt(0) || 'U').toUpperCase();

  return (
    <div className="flex-1 flex flex-col justify-between px-5 pt-3 pb-8 text-white relative overflow-y-auto">
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

        {/* User Avatar with Camera / Upload Trigger */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-2 group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName || 'User'}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-500/70 shadow-2xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 ring-4 ring-blue-500/50 shadow-2xl flex items-center justify-center text-white font-black text-3xl">
                {initial}
              </div>
            )}

            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer shadow-lg ring-2 ring-[#0b111c] transition-transform active:scale-90">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          <h3 className="text-base font-bold text-white tracking-tight">
            {fullName || 'User'}
          </h3>
          <p className="text-xs text-slate-400">নাম ও ছবি সরাসরি পরিবর্তন করুন</p>
        </div>

        {/* Edit Form without any verification codes */}
        <form onSubmit={handleSave} className="space-y-4">
          <h4 className="text-xs font-bold tracking-wider uppercase text-sky-400 mb-2">
            BASIC INFORMATION
          </h4>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              পুরো নাম (Full name) <span className="text-rose-400">*</span>
            </label>
            <div className="relative flex items-center bg-[#121c2c] border border-[#1f3049] focus-within:border-blue-500 rounded-xl px-4 py-3 transition-colors">
              <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full bg-transparent text-white font-medium focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              মোবাইল নম্বর (Phone number)
            </label>
            <div className="relative flex items-center bg-[#121c2c] border border-[#1f3049] focus-within:border-blue-500 rounded-xl px-4 py-3 transition-colors">
              <Phone className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(+880) 17XXXXXXXX"
                className="w-full bg-transparent text-white font-medium focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ইমেইল (Email address)
            </label>
            <div className="relative flex items-center bg-[#121c2c] border border-[#1f3049] focus-within:border-blue-500 rounded-xl px-4 py-3 transition-colors">
              <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full bg-transparent text-white font-medium focus:outline-none text-sm"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center justify-center gap-2">
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 text-[15px] flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes (সংরক্ষণ করুন)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
