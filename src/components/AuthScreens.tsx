import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  ArrowLeft,
  Upload,
  Camera,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { UserProfile, RegisteredUser } from '../types';
import { firestoreService } from '../firebase/firestoreService';
import { compressImageToSafeDataUrl } from '../utils/fileVault';
import {
  buildDeterministicAccountId,
  findMatchingUserRecords,
  selectCanonicalUserRecord,
  shouldProceedWithSignupAfterLookup,
} from '../utils/accountManagement';
import {
  isFirestoreQuotaCooldownActive,
  isFirestoreWriteQuotaCooldownActive,
} from '../firebase/errorHandler';
import {
  isValidResetEmail,
  isValidSixDigitCode,
  maskEmailAddress,
  normalizeResetEmail,
  sanitizeSixDigitInput,
  validateNewPasswordPair,
} from '../utils/passwordResetValidation';

interface AuthScreenProps {
  websiteName?: string;
  logoUrl?: string;
  registeredUsers: RegisteredUser[];
  hasRemoteUsers?: boolean;
  onAccountIdsResolved?: (ids: string[]) => void;
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
  hasRemoteUsers = false,
  onAccountIdsResolved,
  onSuccess,
  onUserRegistered,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(() =>
    registeredUsers.length === 0 && !hasRemoteUsers ? 'signup' : 'signin'
  );
  const [userToggledMode, setUserToggledMode] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');

  // Form Fields - starts clean with NO demo values
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('যাচাই করা হচ্ছে...');

  // Forgot Password (6-digit Gmail OTP recovery) state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'code' | 'new_password'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotInfoMessage, setForgotInfoMessage] = useState('');
  const [maskedTargetEmail, setMaskedTargetEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [forgotTargetUser, setForgotTargetUser] = useState<RegisteredUser | null>(null);
  const [forgotMatchingIds, setForgotMatchingIds] = useState<string[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  React.useEffect(() => {
    const hasStartedTyping = Boolean(fullName || email || phone || password || confirmPassword);
    if (!userToggledMode && !isForgotPassword && !hasStartedTyping) {
      setAuthMode(registeredUsers.length === 0 && !hasRemoteUsers ? 'signup' : 'signin');
    }
  }, [
    registeredUsers.length,
    hasRemoteUsers,
    userToggledMode,
    isForgotPassword,
    fullName,
    email,
    phone,
    password,
    confirmPassword,
  ]);

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

  const openForgotPasswordFlow = () => {
    const candidateEmail =
      email.trim() || (phone.includes('@') ? phone.trim() : '');
    setIsForgotPassword(true);
    setForgotStep('email');
    setForgotEmail(candidateEmail);
    setForgotOtpCode('');
    setForgotResetToken('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotInfoMessage('');
    setMaskedTargetEmail('');
    setForgotTargetUser(null);
    setForgotMatchingIds([]);
    setErrorMessage('');
    setSuccessBanner('');
  };

  const exitForgotPasswordFlow = () => {
    setIsForgotPassword(false);
    setForgotStep('email');
    setErrorMessage('');
    setForgotInfoMessage('');
  };

  const handleRequestResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setForgotInfoMessage('');

    const normalizedEmail = normalizeResetEmail(forgotEmail);
    if (!isValidResetEmail(normalizedEmail)) {
      setErrorMessage('অনুগ্রহ করে আপনার সঠিক জিমেইল ঠিকানা লিখুন (যেমন: name@gmail.com)।');
      return;
    }

    setIsLoading(true);
    setLoadingText('অ্যাকাউন্ট যাচাই ও জিমেইলে কোড পাঠানো হচ্ছে...');

    try {
      // 1. Verify registered account exists locally or in Cloud Firestore/mirror
      const localMatches = findMatchingUserRecords(registeredUsers, { email: normalizedEmail });
      let targetUser: RegisteredUser | undefined = selectCanonicalUserRecord(localMatches);
      const collectedIds = new Set<string>(localMatches.map((u) => u.id));
      let quotaExceeded = false;

      if (!isFirestoreQuotaCooldownActive() || !targetUser) {
        try {
          const lookupRes = await firestoreService.lookupRegisteredAccount(normalizedEmail);
          quotaExceeded = lookupRes.quotaExceeded;
          lookupRes.matchingIds.forEach((id) => collectedIds.add(id));
          if (lookupRes.user) {
            targetUser =
              selectCanonicalUserRecord(
                targetUser ? [lookupRes.user, ...localMatches] : [lookupRes.user]
              ) || lookupRes.user;
          }
        } catch (lookupErr) {
          console.warn('Forgot-password account lookup warning:', lookupErr);
        }
      }

      if (!targetUser) {
        setErrorMessage(
          quotaExceeded
            ? 'এই মুহূর্তে ক্লাউড ডাটাবেস (Firestore) এর দৈনিক ফ্রি রিড কোটা পূর্ণ থাকায় দূরবর্তী সার্ভার থেকে অ্যাকাউন্ট যাচাই করা যাচ্ছে না।'
            : 'এই জিমেইল ঠিকানায় কোনো অ্যাকাউন্ট পাওয়া যায়নি। সঠিক জিমেইল দিন অথবা নতুন অ্যাকাউন্ট খুলুন।'
        );
        return;
      }

      setForgotTargetUser(targetUser);
      setForgotMatchingIds(Array.from(collectedIds));

      // 2. Ask server to generate 6-digit OTP and send real email
      const response = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          appName: websiteName,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (typeof data.retryAfterSeconds === 'number' && data.retryAfterSeconds > 0) {
          setResendCooldown(data.retryAfterSeconds);
        }
        setErrorMessage(
          data.error || 'জিমেইলে ভেরিফিকেশন কোড পাঠানো যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
        );
        return;
      }

      const masked = data.maskedEmail || maskEmailAddress(normalizedEmail);
      setMaskedTargetEmail(masked);
      setForgotOtpCode('');
      setResendCooldown(typeof data.cooldownSeconds === 'number' ? data.cooldownSeconds : 60);
      setForgotInfoMessage(
        `${masked} জিমেইল ঠিকানায় ৬ সংখ্যার একটি ভেরিফিকেশন কোড পাঠানো হয়েছে।`
      );
      setForgotStep('code');
    } catch (err: any) {
      setErrorMessage(err?.message || 'নেটওয়ার্ক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const normalizedEmail = normalizeResetEmail(forgotEmail);
    const cleanedCode = sanitizeSixDigitInput(forgotOtpCode);
    if (!isValidSixDigitCode(cleanedCode)) {
      setErrorMessage('অনুগ্রহ করে জিমেইলে পাঠানো ৬ সংখ্যার সম্পূর্ণ কোডটি লিখুন।');
      return;
    }

    setIsLoading(true);
    setLoadingText('৬ সংখ্যার কোড যাচাই করা হচ্ছে...');

    try {
      const response = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          code: cleanedCode,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.resetToken) {
        setErrorMessage(data.error || 'কোডটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে।');
        return;
      }

      setForgotResetToken(data.resetToken);
      setForgotInfoMessage('কোড যাচাই সফল হয়েছে! এখন আপনার নতুন পাসওয়ার্ড সেট করুন।');
      setForgotStep('new_password');
    } catch (err: any) {
      setErrorMessage(err?.message || 'কোড যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const pairCheck = validateNewPasswordPair(forgotNewPassword, forgotConfirmPassword);
    if (!pairCheck.valid) {
      setErrorMessage(pairCheck.error || 'সঠিক পাসওয়ার্ড দিন।');
      return;
    }

    const normalizedEmail = normalizeResetEmail(forgotEmail);
    setIsLoading(true);
    setLoadingText('নতুন পাসওয়ার্ড সংরক্ষণ করা হচ্ছে...');

    try {
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          resetToken: forgotResetToken,
          newPassword: forgotNewPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data.error || 'পাসওয়ার্ড পরিবর্তন করা যায়নি। আবার চেষ্টা করুন।');
        return;
      }

      const updatedUser = await firestoreService.updateRegisteredAccountPassword({
        email: normalizedEmail,
        newPassword: forgotNewPassword,
        targetUser: forgotTargetUser,
        matchingIds: forgotMatchingIds,
      });

      if (updatedUser && onUserRegistered) {
        onUserRegistered(updatedUser);
      }

      setIsForgotPassword(false);
      setForgotStep('email');
      setUserToggledMode(true);
      setAuthMode('signin');
      setLoginMethod('email');
      setEmail(normalizedEmail);
      setPassword('');
      setConfirmPassword('');
      setForgotOtpCode('');
      setForgotResetToken('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotInfoMessage('');
      setSuccessBanner(
        'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! এখন আপনার নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'পাসওয়ার্ড সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessBanner('');
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
        let existing: RegisteredUser | undefined = registeredUsers.find(
          (u) =>
            (normalizedPhone && cleanPhone(u.phone) === normalizedPhone) ||
            (normalizedEmail && u.email.toLowerCase() === normalizedEmail)
        );
        let resolvedIds: string[] = existing ? [existing.id] : [];

        // 2. Also check directly in Cloud Firestore / Server Mirror (O(1) indexed) to prevent duplicates across websites
        if (!existing) {
          const cloudCheck = await firestoreService.lookupRegisteredAccount([
            normalizedPhone,
            normalizedEmail,
          ]);
          if (cloudCheck.user) {
            existing = cloudCheck.user;
            resolvedIds = cloudCheck.matchingIds;
          }
        }

        if (!shouldProceedWithSignupAfterLookup(existing) && existing) {
          if (onUserRegistered) {
            onUserRegistered(existing);
          }
          if (onAccountIdsResolved && resolvedIds.length > 0) {
            onAccountIdsResolved(resolvedIds);
          }
          setUserToggledMode(true);
          setAuthMode('signin');
          setLoginMethod(normalizedEmail ? 'email' : 'phone');
          setErrorMessage(
            'এই মোবাইল নম্বর বা ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে নিচে পাসওয়ার্ড দিয়ে লগইন করুন।'
          );
          setIsLoading(false);
          return;
        }

        const newId = buildDeterministicAccountId(normalizedEmail, normalizedPhone);
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
        let savedToCloud = await firestoreService
          .saveRegisteredUser(newRecord)
          .catch(() => false);
        if (!savedToCloud && !isFirestoreWriteQuotaCooldownActive()) {
          await new Promise((r) => setTimeout(r, 600));
          savedToCloud = await firestoreService
            .saveRegisteredUser(newRecord)
            .catch(() => false);
        }

        if (onAccountIdsResolved) {
          onAccountIdsResolved([newId]);
        }
        if (onUserRegistered) {
          onUserRegistered(newRecord);
        }

        onSuccess(newUserProfile, password, savedToCloud ? newRecord : undefined, true);
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

        // Step A: Search local state (and consolidate any duplicate local records deterministically)
        const localMatches = findMatchingUserRecords(
          registeredUsers,
          isPhoneMode ? { phone: searchIdentifier } : { email: searchIdentifier }
        );
        let foundUser: RegisteredUser | undefined = selectCanonicalUserRecord(localMatches);
        const collectedIds = new Set<string>(localMatches.map((u) => u.id));
        let lookupQuotaExceeded = false;

        // Step B: Always check Cloud Firestore when quota allows so Website 2 & Website 1 stay unified
        // (falls back cleanly to localMatches if offline or quota exhausted)
        if (!isFirestoreQuotaCooldownActive() || !foundUser) {
          try {
            const lookupRes = await firestoreService.lookupRegisteredAccount(searchIdentifier);
            lookupQuotaExceeded = lookupRes.quotaExceeded;
            lookupRes.matchingIds.forEach((id) => collectedIds.add(id));
            if (lookupRes.user) {
              const combined = selectCanonicalUserRecord(
                foundUser ? [lookupRes.user, ...localMatches] : [lookupRes.user]
              );
              if (combined) {
                foundUser = {
                  ...combined,
                  passwordPlain: lookupRes.user.passwordPlain || combined.passwordPlain,
                };
                if (onUserRegistered) {
                  onUserRegistered(foundUser);
                }
              }
            }
          } catch (cloudErr) {
            console.warn('Cloud search error:', cloudErr);
          }
        }

        // If user STILL not found anywhere
        if (!foundUser) {
          if (lookupQuotaExceeded) {
            setErrorMessage(
              'এই মুহূর্তে ক্লাউড ডাটাবেস (Firestore) এর দৈনিক ফ্রি রিড কোটা পূর্ণ থাকায় দূরবর্তী সার্ভার থেকে পুরোনো অ্যাকাউন্ট যাচাই করা যাচ্ছে না। আপনি এখনই "নতুন অ্যাকাউন্ট (Sign Up)" থেকে প্রবেশ করতে পারেন অথবা কোটা রিসেট/আপগ্রেডের পর লগইন করুন।'
            );
          } else {
            setErrorMessage(
              'কোনো অ্যাকাউন্ট পাওয়া যায়নি! লগইন করতে প্রথমে সাইন আপ করুন। (No account found! Please sign up first.)'
            );
          }
          setIsLoading(false);
          return;
        }

        // Step C: Verify password
        if (foundUser.passwordPlain && foundUser.passwordPlain !== password) {
          setErrorMessage('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন। (Incorrect password! Please try again.)');
          setIsLoading(false);
          return;
        }

        if (onAccountIdsResolved) {
          onAccountIdsResolved(Array.from(collectedIds));
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
          নিরাপদ ব্যক্তিগত ক্লাউড স্টোরেজ ও Bashar Cloud AI — সারাজীবনের জন্য সম্পূর্ণ ফ্রি
        </p>
      </div>

      {/* Main Authentication Container */}
      <div className="w-full mt-1 space-y-3">
        {isForgotPassword ? (
          <div className="orbit-card bg-[#0d1626]/95 rounded-2xl p-4 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={exitForgotPasswordFlow}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>লগইনে ফিরে যান</span>
              </button>
              <span className="text-[11px] font-medium text-slate-400">
                ধাপ {forgotStep === 'email' ? '১/৩' : forgotStep === 'code' ? '২/৩' : '৩/৩'}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white">
                  পাসওয়ার্ড রিসেট করুন
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  {forgotStep === 'email'
                    ? 'আপনার নিবন্ধিত জিমেইল ঠিকানা দিন — সেখানে ৬ সংখ্যার ভেরিফিকেশন কোড পাঠানো হবে'
                    : forgotStep === 'code'
                    ? 'আপনার জিমেইল ইনবক্স বা স্প্যাম ফোল্ডার থেকে ৬ সংখ্যার কোডটি নিচে লিখুন'
                    : 'যাচাই সম্পন্ন হয়েছে — এখন আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড দিন'}
                </p>
              </div>
            </div>

            {forgotInfoMessage && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{forgotInfoMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {forgotStep === 'email' && (
              <form onSubmit={handleRequestResetOtp} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    নিবন্ধিত জিমেইল / ইমেইল (Gmail Address)
                  </label>
                  <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
                    <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      required
                      className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-white" />}
                  <span>{isLoading ? loadingText : '৬ সংখ্যার কোড পাঠান'}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            )}

            {forgotStep === 'code' && (
              <form onSubmit={handleVerifyResetOtp} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      ৬ সংখ্যার কোড (6-Digit Code)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('email');
                        setErrorMessage('');
                        setForgotInfoMessage('');
                      }}
                      className="text-[11px] text-sky-400 hover:underline cursor-pointer"
                    >
                      জিমেইল পরিবর্তন করুন
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={forgotOtpCode}
                    onChange={(e) => setForgotOtpCode(sanitizeSixDigitInput(e.target.value))}
                    placeholder="••••••"
                    required
                    className="w-full bg-[#131e30] border border-[#233552] focus:border-blue-500 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.45em] text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                  {maskedTargetEmail && (
                    <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                      প্রাপক: <span className="text-slate-200 font-medium">{maskedTargetEmail}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || forgotOtpCode.length !== 6}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-white" />}
                  <span>{isLoading ? loadingText : 'কোড যাচাই করুন'}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={() => handleRequestResetOtp()}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendCooldown > 0
                      ? `পুনরায় কোড পাঠাতে অপেক্ষা করুন (${resendCooldown}s)`
                      : 'পুনরায় ৬ সংখ্যার কোড পাঠান'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'new_password' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    নতুন পাসওয়ার্ড (New Password)
                  </label>
                  <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
                    <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type={showForgotPassword ? 'text' : 'password'}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                      required
                      minLength={6}
                      className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                    />
                    <button
                      type="button"
                      aria-label={showForgotPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowForgotPassword(!showForgotPassword)}
                      className="text-slate-400 hover:text-white p-1 ml-1 cursor-pointer"
                    >
                      {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    নতুন পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
                  </label>
                  <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 transition-colors">
                    <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type={showForgotPassword ? 'text' : 'password'}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                      required
                      minLength={6}
                      className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-950/40 text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-white" />}
                  <span>{isLoading ? loadingText : 'পাসওয়ার্ড পরিবর্তন করুন'}</span>
                  {!isLoading && <CheckCircle2 className="w-4 h-4" />}
                </button>
              </form>
            )}
          </div>
        ) : (
        <>
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
              setSuccessBanner('');
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

          {successBanner && authMode === 'signin' && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{successBanner}</span>
            </div>
          )}

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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                পাসওয়ার্ড (Password)
              </label>
              {authMode === 'signin' && (
                <button
                  type="button"
                  onClick={openForgotPasswordFlow}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              )}
            </div>
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
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
        </>
        )}
      </div>
      </div>
    </div>
  );
};
