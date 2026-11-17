import React, { useState } from 'react';
import { Mail, Phone, Lock, Eye, EyeOff, User, ArrowRight, Upload, Camera, ShieldCheck, UserPlus, LogIn, AlertCircle, Globe, CheckCircle2, RefreshCw } from 'lucide-react';
import { UserProfile, RegisteredUser } from '../types';
import { firestoreService } from '../firebase/firestoreService';
import { compressImageToSafeDataUrl } from '../utils/fileVault';

interface AuthScreenProps {
  websiteName?: string;
  logoUrl?: string;
  registeredUsers: RegisteredUser[];
  onSuccess: (
    user: UserProfile,
    passwordPlain?: string,
    cloudRecord?: RegisteredUser,
    isNewSignup?: boolean
  ) => void;
  onUserRegistered?: (user: RegisteredUser) => void;
}

export const WelcomeScreen: React.FC<AuthScreenProps> = ({
  websiteName = 'Bashar Cloud',
  logoUrl,
  registeredUsers,
  onSuccess,
  onUserRegistered,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(() =>
    registeredUsers.length === 0 ? 'signup' : 'signin'
  );
  const [userToggledMode, setUserToggledMode] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');

  React.useEffect(() => {
    if (!userToggledMode) {
      setAuthMode(registeredUsers.length === 0 ? 'signup' : 'signin');
    }
  }, [registeredUsers.length, userToggledMode]);

  // Form Fields - starts clean with NO demo values
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('যাচাই করা হচ্ছে...');

  // Profile picture upload handler (compressed cleanly so Firestore 1MB limit is never exceeded)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const cleanPhone = (p: string) => (p || '').replace(/[^0-9]/g, '').slice(-10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        // ==========================================
        // SIGN UP (নতুন অ্যাকাউন্ট তৈরি)
        // ==========================================
        setLoadingText('অ্যাকাউন্ট তৈরি ও ক্লাউডে সিঙ্ক করা হচ্ছে...');

        if (!fullName.trim()) {
          setErrorMessage('অনুগ্রহ করে আপনার পুরো নাম লিখুন (Please enter your full name)');
          setIsLoading(false);
          return;
        }
        if (!phone.trim()) {
          setErrorMessage('অনুগ্রহ করে আপনার মোবাইল নম্বর দিন (Please enter phone number)');
          setIsLoading(false);
          return;
        }
        if (!email.trim()) {
          setErrorMessage('অনুগ্রহ করে আপনার ইমেইল ঠিকানা দিন (Please enter email address)');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে (Password must be at least 6 characters)');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('পাসওয়ার্ড দুটি মিলছে না (Passwords do not match)');
          setIsLoading(false);
          return;
        }

        const normalizedPhone = cleanPhone(phone);
        const normalizedEmail = email.trim().toLowerCase();

        // 1. Check local list first
        let existing = registeredUsers.find(
          (u) =>
            cleanPhone(u.phone) === normalizedPhone ||
            u.email.toLowerCase() === normalizedEmail
        );

        // 2. Also check directly in Cloud Firestore to prevent duplicates across websites
        if (!existing) {
          const cloudCheck = await firestoreService.findRegisteredUser(normalizedPhone);
          if (cloudCheck) {
            existing = cloudCheck;
          } else {
            const cloudEmailCheck = await firestoreService.findRegisteredUser(normalizedEmail);
            if (cloudEmailCheck) {
              existing = cloudEmailCheck;
            }
          }
        }

        if (existing) {
          setErrorMessage('এই মোবাইল নম্বর বা ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।');
          setIsLoading(false);
          return;
        }

        const newId = `user-${Date.now()}`;
        const newUserProfile: UserProfile = {
          name: fullName.trim(),
          email: normalizedEmail,
          phone: `(+880) ${normalizedPhone}`,
          avatarUrl: avatarUrl || undefined,
        };

        const newRecord: RegisteredUser = {
          id: newId,
          name: fullName.trim(),
          email: normalizedEmail,
          phone: `(+880) ${normalizedPhone}`,
          passwordPlain: password,
          avatarUrl: avatarUrl || undefined,
          registeredAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          registeredTimestamp: Date.now(),
          filesCount: 0,
          storageUsedMB: 0,
          isLifetimeApproved: false,
          paymentStatus: 'none',
        };

        // Persist to Cloud Firestore immediately so all other sites have it instantly
        await firestoreService.saveRegisteredUser(newRecord).catch((err) => {
          console.warn('Firestore cloud user sync warning:', err);
        });

        if (onUserRegistered) {
          onUserRegistered(newRecord);
        }

        onSuccess(newUserProfile, password, newRecord, true);
        return;
      } else {
        // ==========================================
        // SIGN IN (লগইন)
        // Cross-domain Firestore verified
        // ==========================================
        setLoadingText('ক্লাউড সার্ভারে অ্যাকাউন্ট যাচাই করা হচ্ছে...');

        let searchIdentifier = '';
        const rawPhoneInput = phone.trim();
        let isPhoneMode = loginMethod === 'phone' && !rawPhoneInput.includes('@');

        if (isPhoneMode) {
          const inputPhone = cleanPhone(rawPhoneInput);
          if (!inputPhone) {
            setErrorMessage('অনুগ্রহ করে আপনার মোবাইল নম্বর দিন');
            setIsLoading(false);
            return;
          }
          searchIdentifier = inputPhone;
        } else {
          const inputEmail = (rawPhoneInput.includes('@') && loginMethod === 'phone' ? rawPhoneInput : email)
            .trim()
            .toLowerCase();
          if (!inputEmail) {
            setErrorMessage('অনুগ্রহ করে আপনার জিমেইল / ইমেইল দিন');
            setIsLoading(false);
            return;
          }
          searchIdentifier = inputEmail;
          isPhoneMode = false;
        }

        if (!password) {
          setErrorMessage('অনুগ্রহ করে পাসওয়ার্ড দিন');
          setIsLoading(false);
          return;
        }

        // Step A: Search in local state
        let foundUser: RegisteredUser | undefined = registeredUsers.find((u) => {
          if (isPhoneMode) {
            return cleanPhone(u.phone) === searchIdentifier;
          } else {
            return u.email.toLowerCase() === searchIdentifier;
          }
        });

        // Step B: If not found locally (or local password differs), query directly from Cloud Firestore!
        if (!foundUser || (foundUser.passwordPlain && foundUser.passwordPlain !== password)) {
          try {
            const cloudUser = await firestoreService.findRegisteredUser(searchIdentifier);
            if (cloudUser) {
              foundUser = cloudUser;
              if (onUserRegistered) {
                onUserRegistered(cloudUser);
              }
            }
          } catch (cloudErr) {
            console.warn('Cloud search error:', cloudErr);
          }
        }

        // If user STILL not found anywhere
        if (!foundUser) {
          setErrorMessage('কোনো অ্যাকাউন্ট পাওয়া যায়নি! লগইন করতে প্রথমে সাইন আপ করুন। (No account found! Please sign up first.)');
          setIsLoading(false);
          return;
        }

        // Step C: Verify password
        if (foundUser.passwordPlain && foundUser.passwordPlain !== password) {
          setErrorMessage('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন। (Incorrect password! Please try again.)');
          setIsLoading(false);
          return;
        }

        const loggedInUser: UserProfile = {
          name: foundUser.name,
          email: foundUser.email,
          phone: foundUser.phone,
          avatarUrl: foundUser.avatarUrl,
        };

        onSuccess(loggedInUser, password, foundUser, false);
        return;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-4 text-white overflow-y-auto">
      <div className="my-auto flex flex-col gap-3">
      {/* Top Branding Header */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-2 relative">
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-blue-500/45 shadow-xl bg-[#111e33] flex items-center justify-center">
            <img
              src={logoUrl || '/assets/aistudio/0a4ee58c-1d1d-4faa-8126-cfb8779227ba_f85ac4d0.png'}
              alt={websiteName}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-white mb-0.5">
          {websiteName}
        </h1>
        <p className="text-[11.5px] text-slate-400 leading-snug max-w-[300px]">
          নিরাপদ ব্যক্তিগত ক্লাউড স্টোরেজ ও Bashar Cloud AI — ৩০ দিনের ফ্রি ট্রায়ালসহ শুরু করুন
        </p>
      </div>

      {/* Main Authentication Container */}
      <div className="w-full mt-1 space-y-3">
        {/* Clean Sign In / Sign Up Switcher */}
        <div className="orbit-card bg-[#0d1626] rounded-2xl p-1.5 shadow-lg flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setUserToggledMode(true);
              setAuthMode('signin');
              setErrorMessage('');
            }}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ai-solid-text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>লগইন (Sign In)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setUserToggledMode(true);
              setAuthMode('signup');
              setErrorMessage('');
            }}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              authMode === 'signup'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ai-solid-text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>নতুন অ্যাকাউন্ট (Sign Up)</span>
          </button>
        </div>

        {/* Auth Card */}
        <div className="orbit-card bg-[#0d1626]/95 rounded-2xl p-4 shadow-xl space-y-3">
          {/* Section Heading */}
          <div>
            <h2 className="text-base font-bold tracking-tight text-white">
              {authMode === 'signin' ? 'অ্যাকাউন্টে প্রবেশ করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {authMode === 'signin'
                ? 'যেকোনো ডিভাইস থেকে নিবন্ধিত জিমেইল বা মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে প্রবেশ করুন'
                : 'নাম, মোবাইল নম্বর, জিমেইল/ইমেইল ও পাসওয়ার্ড দিয়ে নতুন অ্যাকাউন্ট খুলুন'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* Sign Up: Optional Avatar / Profile Picture Upload */}
            {authMode === 'signup' && (
              <div className="orbit-card flex items-center gap-3.5 bg-[#121c2d] rounded-2xl p-3">
              <div className="relative w-12 h-12 rounded-full bg-[#182740] border border-blue-500/40 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-slate-400" />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <span className="block text-xs font-semibold text-white">প্রোফাইল ছবি / লোগো (ঐচ্ছিক)</span>
                <label className="cursor-pointer text-[11px] text-sky-400 hover:underline flex items-center gap-1 mt-0.5">
                  <Upload className="w-3 h-3" />
                  <span>{avatarUrl ? 'ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন (Upload Image)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Full Name (Sign Up only) */}
          {authMode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                পুরো নাম (Full Name) <span className="text-rose-400">*</span>
              </label>
              <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
                <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Bashar"
                  required
                  className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Sign Up Mode: BOTH Mobile Phone AND Email required */}
          {authMode === 'signup' ? (
            <>
              {/* Mobile Phone Number */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  মোবাইল নম্বর (Phone Number) <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
                  <span className="text-slate-300 font-medium text-xs pr-2.5 border-r border-slate-700">
                    +880
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="17XXXXXXXX"
                    required
                    className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm pl-2.5"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  ইমেইল ঠিকানা (Email Address) <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
                  <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Sign In Mode: Prominent 2-Tab Switcher (Phone+Password OR Gmail+Password) */
            <>
              <div className="orbit-card bg-[#111b2d] rounded-xl p-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('phone');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    loginMethod === 'phone'
                      ? 'bg-blue-600 text-white ai-solid-text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>মোবাইল ও পাসওয়ার্ড</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('email');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    loginMethod === 'email'
                      ? 'bg-blue-600 text-white ai-solid-text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>জিমেইল / ইমেইল ও পাসওয়ার্ড</span>
                </button>
              </div>

              {loginMethod === 'phone' ? (
                <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
                  <span className="text-slate-300 font-medium text-xs pr-2.5 border-r border-slate-700">
                    +880
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="17XXXXXXXX"
                    required
                    className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm pl-2.5"
                  />
                </div>
              ) : (
                <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
                  <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    required
                    className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                  />
                </div>
              )}
            </>
          )}

          {/* Password Input */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              পাসওয়ার্ড (Password)
            </label>
            <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
              <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড লিখুন"
                required
                className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-white p-1 ml-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Sign Up only) */}
          {authMode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
              </label>
              <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
                <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  required
                  className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 text-sm flex items-center justify-center gap-2 mt-3 disabled:opacity-60"
          >
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-white" />}
            <span>
              {isLoading
                ? loadingText
                : authMode === 'signin'
                ? 'লগইন করুন (Sign In)'
                : 'অ্যাকাউন্ট তৈরি সম্পন্ন করুন'}
            </span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-1 text-center">
          <p className="text-[11px] text-slate-400">
            {authMode === 'signin'
              ? 'অ্যাকাউন্ট নেই? উপরের বারে "নতুন অ্যাকাউন্ট (Sign Up)" চাপুন'
              : 'ইতিমধ্যে অ্যাকাউন্ট আছে? উপরের বারে "লগইন (Sign In)" চাপুন'}
          </p>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
};
