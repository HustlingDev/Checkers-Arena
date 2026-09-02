import React, { useState, useEffect } from 'react';
import { AVATAR_OPTIONS } from '../lib/avatars';
import { AvatarBadge } from './AvatarBadge';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Crown,
  UserPlus,
  LogIn,
  Loader2,
  Sparkles,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  Info,
} from 'lucide-react';
import {
  isUsernameTaken,
  registerInAppUser,
  loginWithUsernameOrPhone,
  saveUserProfileToFirestore,
  setAuthRememberMe,
  signInWithGoogle,
  signUpWithFirebaseEmail,
  signInWithFirebaseEmail,
  sendFirebasePasswordReset,
} from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAuthSuccess: (userProfile: UserProfile) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'signup',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [authMethod, setAuthMethod] = useState<'email' | 'quick'>('email');

  // Sign Up / In-App Email Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [realName, setRealName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedAvatarId, setSelectedAvatarId] = useState('avatar-crown');

  // Quick Handle Sign In Field
  const [loginIdentifier, setLoginIdentifier] = useState('');

  // Password Reset Email
  const [resetEmail, setResetEmail] = useState('');

  // Local saved profile detection for 1-Tap Fast Login
  const [savedUser, setSavedUser] = useState<UserProfile | null>(null);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // General state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialSubmitting, setIsSocialSubmitting] = useState<'google' | 'apple' | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const raw = localStorage.getItem('checkers_user_profile');
      if (raw) {
        setSavedUser(JSON.parse(raw));
      }
    } catch (e) {
      // ignore
    }
  }, [isOpen, initialMode]);

  // Real-time Username Availability Check
  useEffect(() => {
    if (mode !== 'signup') return;
    const clean = username.trim();

    if (!clean) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    if (/\d/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameError('Usernames cannot contain numbers (0-9). Letters only.');
      return;
    }

    if (clean.length < 2 || clean.length > 20) {
      setUsernameStatus('invalid');
      setUsernameError('Username must be 2 to 20 characters long.');
      return;
    }

    setUsernameStatus('checking');
    setUsernameError(null);

    const timer = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(clean);
        if (taken) {
          setUsernameStatus('taken');
          setUsernameError('This username is already taken by another player!');
        } else {
          setUsernameStatus('available');
          setUsernameError(null);
        }
      } catch (err) {
        setUsernameStatus('available');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, mode]);

  if (!isOpen) return null;

  // Lock orientation to landscape on mobile
  const triggerLandscape = () => {
    if (typeof window !== 'undefined' && window.screen && (window.screen as any).orientation?.lock) {
      try {
        (window.screen as any).orientation.lock('landscape').catch(() => {});
      } catch (e) {
        // ignore
      }
    }
  };

  // Google Sign In Handler (with helpful notice)
  const handleGoogleSignIn = async () => {
    try {
      setIsSocialSubmitting('google');
      setErrorMsg(null);
      const profile = await signInWithGoogle(rememberMe);
      setSuccessMsg(`Welcome, ${profile.username}!`);
      triggerLandscape();
      setTimeout(() => {
        onAuthSuccess(profile);
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      console.warn('Google sign-in warning:', err);
      const msg = err?.code === 'auth/popup-closed-by-user'
        ? 'Sign in popup was closed. Use the 100% In-App form below for instant access without any external browser!'
        : err?.message || 'Google sign-in could not be completed. You can sign in directly using your email/username below!';
      setErrorMsg(msg);
    } finally {
      setIsSocialSubmitting(null);
    }
  };

  // Direct In-App Email & Password Login Handler
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const profile = await signInWithFirebaseEmail({
        email: cleanEmail,
        password,
        rememberMe,
      });

      setSuccessMsg(`Welcome back, ${profile.username}! Logging into arena...`);
      triggerLandscape();
      setTimeout(() => {
        onAuthSuccess(profile);
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      // If email auth fails, try handle fallback
      try {
        const handleProfile = await loginWithUsernameOrPhone(cleanEmail);
        if (handleProfile) {
          setSuccessMsg(`Welcome back, ${handleProfile.username}!`);
          triggerLandscape();
          setTimeout(() => {
            onAuthSuccess(handleProfile);
            if (onClose) onClose();
          }, 500);
          return;
        }
      } catch (e) {
        // ignore
      }
      setErrorMsg(err?.message || 'Sign in failed. Please check your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct In-App Handle (Username or Phone) Login Handler
  const handleQuickHandleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setErrorMsg('Please enter your username or phone number.');
      return;
    }

    try {
      setIsSubmitting(true);
      await setAuthRememberMe(rememberMe);

      // 1. Look up user directly in Firestore
      const profile = await loginWithUsernameOrPhone(identifier);
      if (profile) {
        setSuccessMsg(`Welcome back, ${profile.username}! Logging in...`);
        triggerLandscape();
        setTimeout(() => {
          onAuthSuccess(profile);
          if (onClose) onClose();
        }, 500);
        return;
      }

      // 2. Check local saved profile match
      if (
        savedUser &&
        (savedUser.username.toLowerCase() === identifier.toLowerCase() ||
          savedUser.phoneNumber === identifier)
      ) {
        const updated = { ...savedUser, isOnline: true, lastActiveTimestamp: Date.now() };
        await saveUserProfileToFirestore(updated);
        setSuccessMsg(`Welcome back, ${updated.username}!`);
        triggerLandscape();
        setTimeout(() => {
          onAuthSuccess(updated);
          if (onClose) onClose();
        }, 500);
        return;
      }

      // 3. User not found in Firestore
      setErrorMsg(
        `No account found with username/phone "${identifier}". Please check for typos or sign up with a new profile!`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-Tap Login
  const handleQuickRestore = async () => {
    if (!savedUser) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const updated = { ...savedUser, isOnline: true, lastActiveTimestamp: Date.now() };
      await saveUserProfileToFirestore(updated);
      triggerLandscape();
      onAuthSuccess(updated);
      if (onClose) onClose();
    } catch (e) {
      triggerLandscape();
      onAuthSuccess(savedUser);
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct In-App Firebase Account Creation Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanRealName = realName.trim();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanRealName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (usernameStatus === 'taken' || usernameStatus === 'invalid' || !cleanUsername) {
      setErrorMsg(usernameError || 'Please choose a valid unique username (letters only).');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (!cleanPhone) {
      setErrorMsg('Please enter your phone number.');
      return;
    }

    if (!termsAccepted) {
      setErrorMsg('You must accept the Terms and Policies to create an account.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Register directly with Firebase Auth and sync to Firestore
      const newProfile = await signUpWithFirebaseEmail({
        email: cleanEmail,
        password,
        username: cleanUsername,
        realName: cleanRealName,
        phoneNumber: cleanPhone,
        avatarId: selectedAvatarId,
        rememberMe,
      });

      setSuccessMsg(`Account created for ${newProfile.username}! Starting arena...`);
      triggerLandscape();

      setTimeout(() => {
        onAuthSuccess(newProfile);
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      // Fallback: If Firebase Email signup fails with configuration, register in Firestore directly
      try {
        const directProfile = await registerInAppUser({
          username: cleanUsername,
          realName: cleanRealName,
          phoneNumber: cleanPhone,
          avatarId: selectedAvatarId,
        });
        setSuccessMsg(`Account created for ${directProfile.username}! Starting arena...`);
        triggerLandscape();
        setTimeout(() => {
          onAuthSuccess(directProfile);
          if (onClose) onClose();
        }, 500);
      } catch (fallbackErr: any) {
        setErrorMsg(err?.message || fallbackErr?.message || 'Account creation failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Reset Handler
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = resetEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await sendFirebasePasswordReset(cleanEmail);
      setSuccessMsg(`Password reset email sent to ${cleanEmail}! Check your inbox.`);
      setTimeout(() => {
        setMode('signin');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl my-auto overflow-hidden p-4 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto custom-scrollbar">
        {/* Header Title */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 shadow-lg shadow-amber-900/30">
            <Crown className="w-5 h-5 text-slate-950" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {mode === 'signup'
              ? 'Join Checkers Arena'
              : mode === 'forgot'
              ? 'Reset Password'
              : 'Player In-App Login'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'signup'
              ? 'Create a 100% In-App Firebase account with no browser redirects!'
              : mode === 'forgot'
              ? 'Enter your account email to receive a password reset link.'
              : 'Sign in directly in-app to access your rank, wallet, and games.'}
          </p>
        </div>

        {/* Mode Switcher Tabs (Sign Up / Sign In) */}
        {mode !== 'forgot' && (
          <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                mode === 'signup'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                mode === 'signin'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          </div>
        )}

        {/* Quick Google Sign In */}
        {mode !== 'forgot' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSocialSubmitting !== null}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-100 transition shadow active:scale-95 disabled:opacity-50"
            >
              {isSocialSubmitting === 'google' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Or Use 100% In-App Authentication
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick In-App Restore Banner if Local User Exists */}
        {mode === 'signin' && savedUser && (
          <div className="p-2.5 bg-slate-950 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <AvatarBadge avatarId={savedUser.avatarId} size="sm" />
              <div className="truncate">
                <div className="text-xs font-black text-amber-400 truncate">{savedUser.username}</div>
                <div className="text-[10px] text-slate-400">
                  {savedUser.rating || 1200} ELO • Saved on this device
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickRestore}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition shadow flex items-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3 h-3" />
              <span>1-Tap Play</span>
            </button>
          </div>
        )}

        {/* In-App Sign In Form */}
        {mode === 'signin' && (
          <div className="space-y-3">
            {/* Toggle between Email Login and Username/Phone Login */}
            <div className="flex text-[11px] font-bold border-b border-slate-800 pb-1 gap-4">
              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                className={`pb-1 transition flex items-center gap-1.5 ${
                  authMethod === 'email'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email & Password</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('quick')}
                className={`pb-1 transition flex items-center gap-1.5 ${
                  authMethod === 'quick'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Username or Phone</span>
              </button>
            </div>

            {authMethod === 'email' ? (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g., player@example.com"
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setResetEmail(email);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] text-amber-400 hover:underline font-semibold"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span className="text-[11px] text-slate-300 font-medium">Keep me signed in</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim() || !password}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/30 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Log In (In-App)</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleQuickHandleLogin} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Username or Phone Number
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g., CheckersMaster or +256700000000"
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span className="text-[11px] text-slate-300 font-medium">Keep me signed in</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || !loginIdentifier.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/30 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Log In with Username/Phone</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* In-App Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            {/* Real Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="e.g., Alex Johnson"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition"
                />
              </div>
            </div>

            {/* Unique Username (Letters only, no digits) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Unique Username <span className="text-amber-400 text-[10px] lowercase">(letters only)</span>
                </label>
                {usernameStatus === 'checking' && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                  </span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Available!
                  </span>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., QueenMaster, CheckersKing"
                  maxLength={20}
                  className={`w-full pl-10 pr-10 py-2 bg-slate-950 border ${
                    usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-rose-500 focus:ring-rose-500'
                      : usernameStatus === 'available'
                      ? 'border-emerald-500/80 focus:ring-emerald-500'
                      : 'border-slate-800 focus:border-amber-500'
                  } rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition`}
                />
                {usernameStatus === 'available' && (
                  <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                )}
              </div>
              {usernameError && (
                <p className="text-[10px] text-rose-400 font-medium pt-0.5">{usernameError}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Email Address <span className="text-amber-400 text-[10px] lowercase">(for in-app account)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., player@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Password <span className="text-slate-400 text-[10px]">(min 6 characters)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Mobile Number <span className="text-amber-400 text-[10px] lowercase">(for prize payouts)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g., +256 700 000000"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition"
                />
              </div>
            </div>

            {/* Avatar Picker */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Player Avatar
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {AVATAR_OPTIONS.map((avatar) => {
                  const isSelected = avatar.id === selectedAvatarId;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className={`flex flex-col items-center gap-1 p-1 rounded-xl shrink-0 transition ${
                        isSelected
                          ? 'bg-amber-500/20 ring-2 ring-amber-400 scale-105'
                          : 'bg-slate-950 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <AvatarBadge avatarId={avatar.id} size="sm" />
                      <span className="text-[9px] font-bold text-slate-300 truncate w-12 text-center">
                        {avatar.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkboxes: Terms & Remember Me */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                />
                <span className="text-[11px] text-slate-300">
                  I accept the <strong className="text-amber-400">Terms and Policies</strong>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                />
                <span className="text-[11px] text-slate-300 font-medium">Keep me signed in</span>
              </label>
            </div>

            {/* Submit Sign Up Button */}
            <button
              type="submit"
              disabled={isSubmitting || !termsAccepted || usernameStatus === 'taken' || usernameStatus === 'invalid' || !email.trim() || !password}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/30 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Start Playing</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Forgot Password View */}
        {mode === 'forgot' && (
          <form onSubmit={handlePasswordReset} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="e.g., player@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !resetEmail.trim()}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Reset Email</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}

        {/* Real-time sync badge */}
        <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 pt-1 border-t border-slate-800/60">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Firebase In-App Authentication & Cloud Firestore</span>
        </div>
      </div>
    </div>
  );
};
