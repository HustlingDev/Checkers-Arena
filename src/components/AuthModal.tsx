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
  X,
} from 'lucide-react';
import {
  isUsernameTaken,
  registerInAppUser,
  loginWithUsernameOrPhone,
  saveUserProfileToFirestore,
  setAuthRememberMe,
  signUpWithFirebaseEmail,
  signInWithFirebaseEmail,
  sendFirebasePasswordReset,
  isPhoneNumberTaken,
  signInWithGoogle,
} from '../lib/firebase';
import { validateUgandaPhoneNumber } from '../lib/ugandaPhone';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAuthSuccess: (userProfile: UserProfile) => void;
  initialMode?: 'signin' | 'signup';
  allowDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'signup',
  allowDismiss = false,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [authMethod, setAuthMethod] = useState<'email' | 'username'>('email');

  // Sign Up In-App Fields
  const [realName, setRealName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedAvatarId, setSelectedAvatarId] = useState('avatar-crown');

  // Sign In Field for Username/Phone mode
  const [loginIdentifier, setLoginIdentifier] = useState('');

  // Password Reset Email
  const [resetEmail, setResetEmail] = useState('');

  // Local saved profile detection for 1-Tap Fast Login
  const [savedUser, setSavedUser] = useState<UserProfile | null>(null);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // General feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Real-time Username Availability & Lowercase Letters Validation Check
  useEffect(() => {
    if (mode !== 'signup') return;
    const clean = username.trim().toLowerCase();

    if (!clean) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    // Strictly lower case letters only (a-z)
    if (!/^[a-z]+$/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameError('Username must contain lowercase letters only (a-z, no numbers or symbols).');
      return;
    }

    if (clean.length < 3 || clean.length > 20) {
      setUsernameStatus('invalid');
      setUsernameError('Username must be 3 to 20 lowercase letters long.');
      return;
    }

    setUsernameStatus('checking');
    setUsernameError(null);

    const timer = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(clean);
        if (taken) {
          setUsernameStatus('taken');
          setUsernameError(`Username "${clean}" is already taken. Please choose another.`);
        } else {
          setUsernameStatus('available');
          setUsernameError(null);
        }
      } catch (err) {
        setUsernameStatus('available');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode]);

  if (!isOpen) return null;

  const phoneValidation = validateUgandaPhoneNumber(phoneNumber);

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

      setSuccessMsg(`Welcome back, ${profile.username}! Entering arena...`);
      setTimeout(() => {
        onAuthSuccess(profile);
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      // If email auth fails, try lowercase username fallback
      try {
        const handleProfile = await loginWithUsernameOrPhone(cleanEmail.toLowerCase());
        if (handleProfile) {
          setSuccessMsg(`Welcome back, ${handleProfile.username}!`);
          setTimeout(() => {
            onAuthSuccess(handleProfile);
            if (onClose) onClose();
          }, 500);
          return;
        }
      } catch (e) {
        // ignore
      }
      setErrorMsg(err?.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct In-App Username or Phone Login Handler
  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    if (!identifier) {
      setErrorMsg('Please enter your unique lowercase username or phone number.');
      return;
    }

    try {
      setIsSubmitting(true);
      await setAuthRememberMe(rememberMe);

      // Look up user in Firestore
      const profile = await loginWithUsernameOrPhone(identifier);
      if (profile) {
        setSuccessMsg(`Welcome back, ${profile.username}! Entering arena...`);
        setTimeout(() => {
          onAuthSuccess(profile);
          if (onClose) onClose();
        }, 500);
        return;
      }

      // Check local saved profile match
      if (
        savedUser &&
        (savedUser.username.toLowerCase() === identifier ||
          savedUser.phoneNumber === identifier)
      ) {
        const updated = { ...savedUser, isOnline: true, lastActiveTimestamp: Date.now() };
        await saveUserProfileToFirestore(updated);
        setSuccessMsg(`Welcome back, ${updated.username}!`);
        setTimeout(() => {
          onAuthSuccess(updated);
          if (onClose) onClose();
        }, 500);
        return;
      }

      setErrorMsg(`No active account found for "${identifier}". Please check for typos or register a new profile below!`);
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
      onAuthSuccess(updated);
      if (onClose) onClose();
    } catch (e) {
      onAuthSuccess(savedUser);
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Sign-In Handler (Native Google Play Services on Android APK, Web Popup on Browser)
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setIsSubmitting(true);
      const profile = await signInWithGoogle(rememberMe);
      setSuccessMsg(`Welcome, ${profile.username}! Entering arena...`);
      setTimeout(() => {
        onAuthSuccess(profile);
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      console.warn('Google Sign-In error:', err);
      const msg = err?.message || String(err);
      if (!msg.includes('canceled') && !msg.includes('popup-closed-by-user') && !msg.includes('12501')) {
        setErrorMsg(err?.message || 'Google Sign-In failed. Please try again or use the fields below.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct In-App Account Registration Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanRealName = realName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim();

    if (!cleanRealName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!cleanUsername || !/^[a-z]+$/.test(cleanUsername)) {
      setErrorMsg('Unique username must contain lowercase letters only (a-z).');
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      setErrorMsg('Username must be 3 to 20 lowercase letters.');
      return;
    }

    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      setErrorMsg(usernameError || 'Please choose an available username with lowercase letters only.');
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

    if (!phoneValidation.isValid) {
      setErrorMsg(phoneValidation.error || 'Please enter a valid Ugandan mobile phone number (+256).');
      return;
    }

    if (!termsAccepted) {
      setErrorMsg('You must accept the Terms and Conditions to proceed.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check if phone number is already registered to another active account
      const phoneTaken = await isPhoneNumberTaken(phoneValidation.formatted);
      if (phoneTaken) {
        setErrorMsg('This mobile phone number is already registered to an existing account. Please sign in instead.');
        setIsSubmitting(false);
        return;
      }

      // Check username one last time
      const userTaken = await isUsernameTaken(cleanUsername);
      if (userTaken) {
        setErrorMsg(`Username "${cleanUsername}" is already taken by another player.`);
        setIsSubmitting(false);
        return;
      }

      // Register directly in Firebase Auth and Firestore
      const newProfile = await signUpWithFirebaseEmail({
        email: cleanEmail,
        password,
        username: cleanUsername,
        realName: cleanRealName,
        phoneNumber: phoneValidation.formatted,
        avatarId: selectedAvatarId,
        rememberMe,
      });

      setSuccessMsg(`Welcome, ${newProfile.username}! 200 UGX bonus activated.`);

      setTimeout(() => {
        onAuthSuccess(newProfile);
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      console.warn('Sign up error:', err);
      // Fallback: direct Firestore registration if Firebase email signup meets network limits
      try {
        const directProfile = await registerInAppUser({
          username: cleanUsername,
          realName: cleanRealName,
          phoneNumber: phoneValidation.formatted,
          avatarId: selectedAvatarId,
        });
        setSuccessMsg(`Welcome, ${directProfile.username}! 200 UGX bonus activated.`);
        setTimeout(() => {
          onAuthSuccess(directProfile);
          if (onClose) onClose();
        }, 500);
      } catch (fallbackErr: any) {
        setErrorMsg(err?.message || fallbackErr?.message || 'Account registration failed. Please try again.');
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
      setSuccessMsg(`Password reset instructions sent to ${cleanEmail}! Check your inbox.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl my-auto overflow-hidden p-5 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto custom-scrollbar relative">
        {/* Optional Dismiss button if already logged in */}
        {allowDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 shadow-lg shadow-amber-900/40">
            <Crown className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>Checkers Arena</span>
              <span className="text-lg">🇺🇬</span>
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-bold mt-1 shadow-sm">
              <span>Uganda Only</span>
              <span>•</span>
              <span>MTN Momo & Airtel Money</span>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        {mode !== 'forgot' && (
          <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
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
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'signin'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        )}

        {/* Welcome Bonus Notice on Sign Up */}
        {mode === 'signup' && (
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-2.5 flex items-center gap-2 text-[11px] text-amber-300 font-semibold shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>200 UGX Welcome Bonus included for new Ugandan accounts!</span>
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

        {/* Google 1-Tap Sign In */}
        {mode !== 'forgot' && (
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold text-xs sm:text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 border border-slate-200"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                or {mode === 'signup' ? 'fill form below' : 'with password'}
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>
          </div>
        )}

        {/* Saved Local Profile 1-Tap Quick Login */}
        {mode === 'signin' && savedUser && (
          <div className="p-2.5 bg-slate-950 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <AvatarBadge avatarId={savedUser.avatarId} size="sm" />
              <div className="truncate">
                <div className="text-xs font-black text-amber-400 truncate">{savedUser.username}</div>
                <div className="text-[10px] text-slate-400">
                  {savedUser.rating || 1200} ELO • Saved Account
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickRestore}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition shadow flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>1-Tap Play</span>
            </button>
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <div className="space-y-3">
            <div className="flex text-[11px] font-bold border-b border-slate-800 pb-1 gap-4">
              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                className={`pb-1 transition flex items-center gap-1.5 cursor-pointer ${
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
                onClick={() => setAuthMethod('username')}
                className={`pb-1 transition flex items-center gap-1.5 cursor-pointer ${
                  authMethod === 'username'
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
                      placeholder="e.g. player@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition outline-none"
                    />
                  </div>
                </div>

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
                      className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer"
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
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
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
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/30 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to Arena</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleUsernameLogin} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Username or Mobile Phone
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value.toLowerCase())}
                      placeholder="e.g. checkersking or 0772123456"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition outline-none font-mono lowercase"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
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
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/30 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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

        {/* SIGN UP FORM (Full Name, Unique Username lowercase only, Email, Password, Mobile Phone) */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            {/* 1. Full Name */}
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
                  placeholder="e.g. John Mukasa"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition outline-none"
                />
              </div>
            </div>

            {/* 2. Unique Username (Lower Case Letters Only) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Unique Username <span className="text-amber-400 text-[10px] lowercase font-normal">(lower case letters only)</span>
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
                  onChange={(e) => {
                    // Strictly enforce lowercase letters only (a-z)
                    const clean = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
                    setUsername(clean);
                  }}
                  placeholder="e.g. checkersking, queenmaster"
                  maxLength={20}
                  className={`w-full pl-10 pr-10 py-2 bg-slate-950 border ${
                    usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-rose-500 focus:border-rose-500'
                      : usernameStatus === 'available'
                      ? 'border-emerald-500/80 focus:border-emerald-500'
                      : 'border-slate-800 focus:border-amber-500'
                  } rounded-xl text-slate-100 placeholder-slate-600 text-xs font-mono lowercase font-semibold transition outline-none`}
                />
                {usernameStatus === 'available' && (
                  <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                )}
              </div>
              {usernameError ? (
                <p className="text-[10px] text-rose-400 font-medium pt-0.5">{usernameError}</p>
              ) : (
                <p className="text-[10px] text-slate-500 font-normal">a-z only, 3 to 20 letters.</p>
              )}
            </div>

            {/* 3. Email Address */}
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
                  placeholder="e.g. john@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition outline-none"
                />
              </div>
            </div>

            {/* 4. Password */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Password <span className="text-slate-400 text-[10px] font-normal">(min 6 characters)</span>
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
                  className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 5. Mobile Phone Number (Uganda Format) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Mobile Phone Number <span className="text-amber-400 text-[10px] font-normal">(MTN / Airtel Uganda)</span>
                </label>
                {phoneValidation.isValid && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {phoneValidation.operator}
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0772 123456 or 0701 234567"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-mono font-semibold transition outline-none"
                />
              </div>
              {phoneNumber.trim().length > 0 && !phoneValidation.isValid && (
                <p className="text-[10px] text-rose-400 font-medium pt-0.5">{phoneValidation.error}</p>
              )}
            </div>

            {/* Avatar Picker */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Choose Avatar
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {AVATAR_OPTIONS.map((avatar) => {
                  const isSelected = avatar.id === selectedAvatarId;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className={`flex flex-col items-center gap-1 p-1 rounded-xl shrink-0 transition cursor-pointer ${
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
                  I accept the <strong className="text-amber-400">Terms & Conditions</strong>
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
              disabled={
                isSubmitting ||
                !termsAccepted ||
                usernameStatus === 'taken' ||
                usernameStatus === 'invalid' ||
                !username.trim() ||
                !realName.trim() ||
                !email.trim() ||
                !password ||
                !phoneValidation.isValid
              }
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/30 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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

        {/* FORGOT PASSWORD VIEW */}
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
                  placeholder="e.g. player@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-semibold transition outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !resetEmail.trim()}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
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
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}

        {/* Security badge */}
        <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 pt-1 border-t border-slate-800/60">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Firebase In-App Authentication & Cloud Firestore</span>
        </div>
      </div>
    </div>
  );
};
