import React, { useState, useEffect } from 'react';
import { AvatarBadge } from './AvatarBadge';
import {
  Crown,
  Loader2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
} from 'lucide-react';
import { signInWithGoogle, saveUserProfileToFirestore } from '../lib/firebase';
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
  allowDismiss = false,
}) => {
  const [savedUser, setSavedUser] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const raw = localStorage.getItem('checkers_user_profile');
      if (raw) {
        setSavedUser(JSON.parse(raw));
      }
    } catch {
      // ignore JSON parse error
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Google 1-Tap Sign In / Sign Up
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setIsSubmitting(true);
      const profile = await signInWithGoogle(true);
      setSuccessMsg(`Welcome, ${profile.username}! Entering arena...`);
      setTimeout(() => {
        onAuthSuccess(profile);
        if (onClose) onClose();
      }, 500);
    } catch (err: any) {
      console.warn('Google Sign-In error:', err);
      const msg = err?.message || String(err);
      if (
        !msg.includes('canceled') &&
        !msg.includes('popup-closed-by-user') &&
        !msg.includes('12501')
      ) {
        setErrorMsg(msg || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-Tap Resume for returning players
  const handleQuickRestore = async () => {
    if (!savedUser) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const updated = {
        ...savedUser,
        isOnline: true,
        lastActiveTimestamp: Date.now(),
      };
      await saveUserProfileToFirestore(updated);
      onAuthSuccess(updated);
      if (onClose) onClose();
    } catch {
      onAuthSuccess(savedUser);
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl my-auto overflow-hidden p-5 sm:p-7 space-y-5 relative">
        {/* Dismiss button if allowed */}
        {allowDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-red-500 shadow-xl shadow-amber-900/40">
            <Crown className="w-7 h-7 text-slate-950" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>Checkers Arena</span>
              <span className="text-xl">🇺🇬</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Uganda's Premier Online Checkers & Staking Arena
            </p>
          </div>
        </div>

        {/* Welcome Bonus Callout */}
        <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-amber-300 font-semibold shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>200 UGX Welcome Bonus on your first Google Sign-In!</span>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-950/90 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/90 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="block font-bold">Sign-In Error</span>
              <span className="block text-[11px] text-rose-200">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Returning Player 1-Tap Resume */}
        {savedUser && (
          <div className="p-3.5 bg-slate-950/90 border border-amber-500/40 rounded-2xl space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>Saved Account on Device</span>
              <span className="text-amber-400">⚡ Ready</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AvatarBadge avatarId={savedUser.avatarId} size="md" />
                <div className="truncate">
                  <div className="text-sm font-black text-white truncate">
                    {savedUser.username}
                  </div>
                  <div className="text-[11px] text-amber-400 font-bold">
                    {savedUser.rating || 1200} ELO • {(savedUser.walletBalance || 0).toLocaleString()} UGX
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickRestore}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shrink-0 transition shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            </div>
          </div>
        )}

        {/* Divider if saved account present */}
        {savedUser && (
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              or sign in with google
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>
        )}

        {/* Google Sign-In Main Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold text-sm shadow-xl shadow-slate-950/50 transition active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 border border-slate-200"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <span>{isSubmitting ? 'Authenticating with Google...' : 'Continue with Google'}</span>
          </button>

          <p className="text-[11px] text-center text-slate-400">
            One tap to sign in or create your Checkers account. No phone number or password needed!
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Secure account linked to your verified Google profile</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Play live, challenge friends, and stake via MTN & Airtel</span>
          </div>
        </div>
      </div>
    </div>
  );
};
