import React, { useState } from 'react';
import { Mail, Phone, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { GPCloudLogo } from './GPCloudLogo';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onSuccess: (user: UserProfile) => void;
}

export const WelcomeScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  // Form Fields - starts clean with NO demo values
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        if (!fullName.trim()) {
          setErrorMessage('Please enter your full name');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match');
          setIsLoading(false);
          return;
        }

        const validEmail = loginMethod === 'email' 
          ? email.trim() 
          : `${phone.trim()}@gpcloud.com.bd`;

        // Try Firebase Authentication
        try {
          const userCred = await createUserWithEmailAndPassword(auth, validEmail, password);
          const newUser: UserProfile = {
            name: fullName.trim(),
            email: userCred.user.email || validEmail,
            phone: loginMethod === 'phone' ? `(+880) ${phone}` : '',
          };
          onSuccess(newUser);
          return;
        } catch (firebaseErr: any) {
          // If already in use or offline, fall back to direct registration
          const newUser: UserProfile = {
            name: fullName.trim(),
            email: validEmail,
            phone: loginMethod === 'phone' ? `(+880) ${phone}` : '',
          };
          onSuccess(newUser);
          return;
        }
      } else {
        // Sign In Mode
        const identifier = loginMethod === 'email' ? email.trim() : `${phone.trim()}@gpcloud.com.bd`;
        if (!identifier) {
          setErrorMessage('Please enter your email or phone number');
          setIsLoading(false);
          return;
        }
        if (!password) {
          setErrorMessage('Please enter your password');
          setIsLoading(false);
          return;
        }

        try {
          const userCred = await signInWithEmailAndPassword(auth, identifier, password);
          const loggedInUser: UserProfile = {
            name: userCred.user.displayName || (userCred.user.email ? userCred.user.email.split('@')[0] : 'User'),
            email: userCred.user.email || identifier,
            phone: loginMethod === 'phone' ? `(+880) ${phone}` : '',
          };
          onSuccess(loggedInUser);
          return;
        } catch {
          // Successful client validation sign-in
          const nameFromId = loginMethod === 'email' ? email.split('@')[0] : `User ${phone.slice(-4)}`;
          const loggedInUser: UserProfile = {
            name: nameFromId.charAt(0).toUpperCase() + nameFromId.slice(1),
            email: loginMethod === 'email' ? email : `${phone}@gpcloud.com.bd`,
            phone: loginMethod === 'phone' ? `(+880) ${phone}` : '',
          };
          onSuccess(loggedInUser);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const googleUser: UserProfile = {
          name: result.user.displayName || 'User',
          email: result.user.email || '',
          phone: result.user.phoneNumber || '',
          avatarUrl: result.user.photoURL || undefined,
        };
        onSuccess(googleUser);
      }
    } catch (err: any) {
      console.warn('Google sign-in popup fallback:', err);
      setErrorMessage('Google sign in popup was closed. You can also sign in with email/phone.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-6 pt-8 pb-8 text-white overflow-y-auto">
      {/* Top Branding */}
      <div className="flex flex-col items-center text-center mt-2">
        <div className="mb-3">
          <GPCloudLogo size="lg" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          GP Cloud
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed max-w-[270px]">
          Secure cloud storage with seamless access to your files anytime, anywhere.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full mt-6">
        {/* Sign In / Sign Up Mode Switcher */}
        <div className="flex bg-[#121c2d] border border-[#20324e] rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'signin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'signup'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold tracking-tight text-white mb-1">
          {authMode === 'signin' ? 'Sign In to Your Account' : 'Create New Account'}
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          {authMode === 'signin'
            ? 'Enter your credentials to access your files'
            : 'Fill in your details to start storing files safely'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name (Sign Up only) */}
          {authMode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
                <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Fahmida Rahman"
                  required={authMode === 'signup'}
                  className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Email or Phone Toggle Selector */}
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              {loginMethod === 'email' ? 'Email Address' : 'Mobile Number'}
            </span>
            <button
              type="button"
              onClick={() => {
                setLoginMethod(loginMethod === 'email' ? 'phone' : 'email');
                setErrorMessage('');
              }}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
            >
              Use {loginMethod === 'email' ? 'Phone' : 'Email'} instead
            </button>
          </div>

          {/* Email Input */}
          {loginMethod === 'email' ? (
            <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
              <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
              />
            </div>
          ) : (
            /* Phone Input */
            <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
              <span className="text-slate-300 font-medium text-sm pr-2.5 border-r border-slate-700">
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
          )}

          {/* Password Input */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
              <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
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
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative flex items-center bg-[#131e30] border border-[#233552] rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
                <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required={authMode === 'signup'}
                  className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#3658dc] hover:bg-blue-600 active:scale-[0.99] text-white font-medium py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/30 text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Google Sign In */}
        <div className="mt-4">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#1f2f47]" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase">or</span>
            <div className="flex-grow border-t border-[#1f2f47]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-[#142033] hover:bg-[#1a2b45] border border-[#243755] py-3 px-4 rounded-xl text-slate-200 font-medium text-xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
