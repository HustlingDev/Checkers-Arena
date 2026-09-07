import React, { useEffect, useState } from 'react';
import { AppLogo } from './AppLogo';
import { Crown, Sparkles, Coins } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1800,
}) => {
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Hide native Capacitor splash screen if available
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.SplashScreen) {
        (window as any).Capacitor.Plugins.SplashScreen.hide().catch(() => {});
      }
    } catch {}

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));
      setProgress(pct);

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        setFading(true);
        setTimeout(() => {
          if (onFinish) onFinish();
        }, 350);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDurationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[999] bg-slate-950 flex flex-col items-center justify-between p-6 select-none transition-opacity duration-300 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-amber-500/15 via-rose-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Top spacing */}
      <div className="h-6" />

      {/* Center: Logo, Title & Prominent Slogan */}
      <div className="flex flex-col items-center text-center space-y-4 relative z-10">
        {/* App Logo with Radiant Ring */}
        <div className="relative">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-amber-400/30 to-rose-500/20 blur-lg animate-pulse" />
          <AppLogo size="lg" className="w-24 h-24 sm:w-28 sm:h-28 shadow-2xl relative" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-100 via-amber-300 to-rose-400 bg-clip-text text-transparent drop-shadow-md">
            Checkers Arena
          </h1>

          {/* Slogan directly below logo & title */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-rose-500/20 border border-amber-400/60 text-amber-300 text-xs sm:text-sm font-black tracking-wide shadow-lg shadow-amber-500/10 animate-bounce-subtle">
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="uppercase">Win real cash</span>
              <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
            </div>
          </div>
        </div>

        {/* Value Proposition Pills */}
        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-bold pt-2">
          <span className="flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-400" /> Instant Stakes
          </span>
          <span>•</span>
          <span>Fast Payouts</span>
          <span>•</span>
          <span>Live Matches</span>
        </div>
      </div>

      {/* Bottom Loading Progress Bar */}
      <div className="w-full max-w-xs space-y-2 relative z-10 pb-4">
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono font-bold px-1">
          <span className="text-amber-400">Loading Arena...</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-rose-500 rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
