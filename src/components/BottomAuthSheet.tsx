import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  signInWithGoogle,
  saveUserProfileToFirestore,
  getUserProfileFromFirestore,
  isPhoneNumberTaken,
  isBonusClaimedForPhone,
  recordBonusClaimedForPhone,
} from '../lib/firebase';
import { sounds } from '../lib/sound';
import { AppLogo } from './AppLogo';
import { validateUgandaPhoneNumber } from '../lib/ugandaPhone';
import {
  Phone,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Crown,
  AlertCircle,
  X,
  Smartphone,
} from 'lucide-react';

interface BottomAuthSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  defaultEmail?: string;
  allowDismiss?: boolean;
}

export const BottomAuthSheet: React.FC<BottomAuthSheetProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultEmail = '',
  allowDismiss = false,
}) => {
  // Step: 'google' (main Google sign-in) -> 'phone' (link Uganda Mobile Money)
  const [step, setStep] = useState<'google' | 'phone'>('google');

  // Authenticated Google user info while linking phone
  const [tempGoogleUser, setTempGoogleUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    avatarId: string;
  } | null>(null);

  // Phone input state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneBonusNotice, setPhoneBonusNotice] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const phoneValidation = validateUgandaPhoneNumber(phoneNumber);

  // 1. Primary Google Sign In Action
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    sounds.playMove();

    try {
      const existingOrNewProfile = await signInWithGoogle(true);

      // If user already has a valid Ugandan phone number linked, log straight in
      if (existingOrNewProfile.phoneNumber && existingOrNewProfile.phoneNumber.trim().length > 6) {
        sounds.playKing();
        onLoginSuccess(existingOrNewProfile);
        onClose();
        return;
      }

      // Otherwise prompt for Uganda phone number to link Mobile Money
      setTempGoogleUser({
        uid: existingOrNewProfile.id,
        email: '',
        displayName: existingOrNewProfile.username || 'Player',
        avatarId: existingOrNewProfile.avatarId || 'avatar-crown',
      });
      setStep('phone');
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      // Fallback for standalone/PWA environment if popup blocked:
      if (defaultEmail) {
        const cleanName = defaultEmail.split('@')[0] || 'Player';
        const uid = `g_${defaultEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const existing = await getUserProfileFromFirestore(uid);
        if (existing) {
          sounds.playKing();
          onLoginSuccess(existing);
          onClose();
          return;
        }
        setTempGoogleUser({
          uid,
          email: defaultEmail,
          displayName: cleanName,
          avatarId: 'avatar-crown',
        });
        setStep('phone');
      } else {
        setError(err?.message || 'Google Sign-In was cancelled or failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Complete Uganda Phone Linking & Onboarding
  const handleCompletePhoneLinking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || 'Please enter a valid Ugandan phone number (+256).');
      return;
    }

    if (!tempGoogleUser) {
      setError('Session expired. Please sign in with Google again.');
      setStep('google');
      return;
    }

    setLoading(true);
    sounds.playMove();

    try {
      // Check if phone number is taken by another active account
      const taken = await isPhoneNumberTaken(phoneValidation.formatted, tempGoogleUser.uid);
      if (taken) {
        setError('This phone number is already registered to another active account.');
        setLoading(false);
        return;
      }

      // Check if this phone number has EVER claimed welcome bonus before (anti-bonus abuse)
      const alreadyClaimedBonus = await isBonusClaimedForPhone(phoneValidation.normalized);

      // Check existing user doc
      let profile = await getUserProfileFromFirestore(tempGoogleUser.uid);
      const isFirstTimeAccount = !profile;

      const bonusAmount = alreadyClaimedBonus ? 0 : 200;

      if (!profile) {
        profile = {
          id: tempGoogleUser.uid,
          username: tempGoogleUser.displayName || 'Player',
          realName: tempGoogleUser.displayName || 'Player',
          phoneNumber: phoneValidation.formatted,
          normalizedPhone: phoneValidation.normalized,
          avatarId: tempGoogleUser.avatarId || 'avatar-crown',
          rating: 1200,
          elo: 1200,
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
          walletBalance: bonusAmount,
          welcomeBonusClaimed: true,
          termsAccepted: true,
          isGuest: false,
          status: 'online',
          isOnline: true,
          createdAt: Date.now(),
          lastActiveTimestamp: Date.now(),
        };
      } else {
        profile.phoneNumber = phoneValidation.formatted;
        profile.normalizedPhone = phoneValidation.normalized;
        profile.isGuest = false;
        profile.isOnline = true;
        profile.lastActiveTimestamp = Date.now();
        // If they had default bonus and phone already claimed, zero it out
        if (alreadyClaimedBonus && profile.walletBalance === 200 && profile.gamesPlayed === 0) {
          profile.walletBalance = 0;
        }
      }

      // Save user to Firestore
      await saveUserProfileToFirestore(profile);
      localStorage.setItem('checkers_user_profile', JSON.stringify(profile));

      // Record phone in claimed bonus registry
      await recordBonusClaimedForPhone(phoneValidation.normalized, profile.id);

      sounds.playKing();
      onLoginSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Phone linking error:', err);
      setError(err?.message || 'Failed to link phone number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative">
        {/* Dismiss Button (Only if allowDismiss is true) */}
        {allowDismiss && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <AppLogo size="lg" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>Checkers Arena</span>
              <span className="text-lg">🇺🇬</span>
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-bold mt-1 shadow-sm">
              <span>Uganda Only</span>
              <span>•</span>
              <span>MTN Momo & Airtel Money</span>
            </div>
          </div>
        </div>

        {/* STEP 1: Google Sign In */}
        {step === 'google' && (
          <div className="space-y-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-center">
              <div className="text-xs font-bold text-slate-300">
                Sign in with your Google account to play real-time multiplayer matches with instant Mobile Money payouts.
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] font-extrabold text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>200 UGX Welcome Bonus for New Ugandan Players!</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-black text-sm transition flex items-center justify-center gap-3 shadow-lg shadow-white/10 active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Uganda Exclusivity Badge */}
            <div className="text-center pt-2">
              <span className="text-[11px] text-slate-500 font-semibold">
                🔒 Protected by Firebase Authentication & Zero-Trust Security
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: Link Uganda Mobile Money Number */}
        {step === 'phone' && (
          <form onSubmit={handleCompletePhoneLinking} className="space-y-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1 text-center">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>Link Ugandan Mobile Money</span>
              </div>
              <p className="text-xs text-slate-300">
                Enter your MTN or Airtel Uganda phone number for instant deposits and cashouts.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Uganda Phone Number (+256)</span>
              </label>

              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. 0772 123456 or 0701 234567"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-white font-mono text-sm outline-none transition"
                  autoFocus
                />
              </div>

              {/* Dynamic Network / Validation Feedback */}
              {phoneNumber.trim().length > 0 && (
                <div className="text-[11px] font-semibold flex items-center justify-between px-1">
                  {phoneValidation.isValid ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{phoneValidation.operator} • {phoneValidation.formatted}</span>
                    </span>
                  ) : (
                    <span className="text-rose-400">{phoneValidation.error}</span>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Bonus Details Box */}
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-2.5 text-[11px] text-amber-300 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                New numbers receive a <strong>200 UGX Welcome Bonus</strong>. If previously registered, game balance starts at 0 UGX.
              </span>
            </div>

            <button
              type="submit"
              disabled={!phoneValidation.isValid || loading}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                phoneValidation.isValid && !loading
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>{loading ? 'Verifying Account...' : 'Confirm & Enter Arena'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
