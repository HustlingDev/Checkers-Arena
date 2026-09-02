import React, { useState } from 'react';
import {
  Palette,
  Volume2,
  VolumeX,
  LogOut,
  Trash2,
  X,
  Sparkles,
  Check,
  AlertTriangle,
  ShieldAlert,
  Phone,
  Edit2,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { sounds } from '../lib/sound';
import { BoardTheme } from './CheckersBoard';
import { UserProfile } from '../types';
import { validateUgandaPhoneNumber } from '../lib/ugandaPhone';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  currentTheme: BoardTheme;
  onSelectTheme?: (theme: BoardTheme) => void;
  onChangeTheme?: (theme: BoardTheme) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void> | void;
  onUpdatePhoneNumber?: (newPhone: string) => Promise<{ success: boolean; message: string }>;
}

const THEME_OPTIONS: { id: BoardTheme; name: string; darkHex: string; lightHex: string; borderHex: string }[] = [
  {
    id: 'wood',
    name: 'Classic Mahogany',
    darkHex: '#3b2314',
    lightHex: '#e6d5be',
    borderHex: '#78350f',
  },
  {
    id: 'crimson',
    name: 'Royal Crimson',
    darkHex: '#581420',
    lightHex: '#fcecd3',
    borderHex: '#e11d48',
  },
  {
    id: 'neon',
    name: 'Cyberpunk Neon',
    darkHex: '#0b1329',
    lightHex: '#1e293b',
    borderHex: '#06b6d4',
  },
  {
    id: 'emerald',
    name: 'Emerald Marble',
    darkHex: '#064e3b',
    lightHex: '#dcfce7',
    borderHex: '#10b981',
  },
  {
    id: 'slate',
    name: 'Midnight Steel',
    darkHex: '#18181b',
    lightHex: '#cbd5e1',
    borderHex: '#64748b',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentTheme,
  onSelectTheme,
  onChangeTheme,
  soundEnabled,
  onToggleSound,
  onLogout,
  onDeleteAccount,
  onUpdatePhoneNumber,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Phone Number Edit state
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(currentUser?.phoneNumber || '');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleThemeChange = (themeId: BoardTheme) => {
    sounds.playMove();
    if (onChangeTheme) onChangeTheme(themeId);
    if (onSelectTheme) onSelectTheme(themeId);
    localStorage.setItem('checkers_board_theme', themeId);
  };

  const isDeleteConfirmed = deleteInputText.trim() === 'Delete my account';

  const handleConfirmDelete = async () => {
    if (!isDeleteConfirmed) return;
    setIsDeleting(true);
    try {
      await onDeleteAccount();
      setShowDeleteConfirm(false);
      onClose();
    } catch (e) {
      console.warn('Delete account error handled:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const phoneValidation = validateUgandaPhoneNumber(phoneInput);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneMessage(null);

    if (!phoneValidation.isValid) {
      setPhoneMessage({ type: 'error', text: phoneValidation.error || 'Please enter a valid Ugandan phone number.' });
      return;
    }

    if (!onUpdatePhoneNumber) return;

    setPhoneSaving(true);
    sounds.playMove();
    try {
      const result = await onUpdatePhoneNumber(phoneValidation.formatted);
      if (result.success) {
        setPhoneMessage({ type: 'success', text: result.message });
        setIsEditingPhone(false);
        sounds.playKing();
      } else {
        setPhoneMessage({ type: 'error', text: result.message });
      }
    } catch (err: any) {
      setPhoneMessage({ type: 'error', text: err?.message || 'Failed to update phone number.' });
    } finally {
      setPhoneSaving(false);
    }
  };

  const currentPhoneVal = currentUser?.phoneNumber ? validateUgandaPhoneNumber(currentUser.phoneNumber) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Palette className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Game & Account Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
          {/* 1. Mobile Money Phone Number (Uganda 🇺🇬) */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span>Mobile Money Number</span>
                    <span className="text-xs">🇺🇬</span>
                  </div>
                  <div className="text-[11px] text-slate-400">For MTN Momo & Airtel Money payments</div>
                </div>
              </div>

              {!isEditingPhone && (
                <button
                  onClick={() => {
                    setPhoneInput(currentUser?.phoneNumber || '');
                    setIsEditingPhone(true);
                    setPhoneMessage(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{currentUser?.phoneNumber ? 'Edit Number' : 'Add Number'}</span>
                </button>
              )}
            </div>

            {/* Current Phone Display */}
            {!isEditingPhone ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-white font-mono tracking-wide">
                    {currentUser?.phoneNumber || 'No phone number linked'}
                  </div>
                  {currentPhoneVal?.operator && (
                    <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                      ✓ {currentPhoneVal.operator}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Uganda 🇺🇬
                  </span>
                </div>
              </div>
            ) : (
              /* Phone Edit Form */
              <form onSubmit={handleSavePhone} className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Enter Ugandan Phone Number (+256)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => {
                        setPhoneInput(e.target.value);
                        setPhoneMessage(null);
                      }}
                      placeholder="e.g. 0772 123456 or 0701 234567"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-white font-mono text-sm outline-none transition"
                      autoFocus
                    />
                  </div>

                  {/* Live Validation & Network Badge */}
                  {phoneInput.trim().length > 0 && (
                    <div className="text-[11px] font-semibold flex items-center justify-between px-1">
                      {phoneValidation.isValid ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{phoneValidation.operator} • {phoneValidation.formatted}</span>
                        </span>
                      ) : (
                        <span className="text-rose-400">{phoneValidation.error}</span>
                      )}
                    </div>
                  )}
                </div>

                {phoneMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold ${
                      phoneMessage.type === 'success'
                        ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                        : 'bg-rose-950/80 border border-rose-700 text-rose-300'
                    }`}
                  >
                    {phoneMessage.text}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPhone(false);
                      setPhoneMessage(null);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!phoneValidation.isValid || phoneSaving}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow ${
                      phoneValidation.isValid && !phoneSaving
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{phoneSaving ? 'Saving...' : 'Save Number'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 2. Theme Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Board Theme
              </label>
              <span className="text-xs text-slate-400 font-semibold">
                {THEME_OPTIONS.find((t) => t.id === currentTheme)?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-2.5 relative group ${
                      isSelected
                        ? 'bg-slate-950 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                    style={{ borderColor: isSelected ? theme.borderHex : undefined }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-slate-200">{theme.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>

                    {/* Mini board preview tiles */}
                    <div className="grid grid-cols-2 grid-rows-2 w-full h-8 rounded-lg overflow-hidden border border-slate-700/50 shadow-inner">
                      <div style={{ backgroundColor: theme.lightHex }} />
                      <div style={{ backgroundColor: theme.darkHex }} />
                      <div style={{ backgroundColor: theme.darkHex }} />
                      <div style={{ backgroundColor: theme.lightHex }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Audio & Sound FX Section */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${soundEnabled ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-white">In-Game Sound FX</div>
                  <div className="text-xs text-slate-400">Movement, captures, blasts</div>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={onToggleSound}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 border ${
                  soundEnabled ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 4. Account Actions (Logout & Delete Account) */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">
              Account Management
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Logout Button */}
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs transition active:scale-95 shadow"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Log Out</span>
              </button>

              {/* Delete Account Button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 font-bold text-xs transition active:scale-95 shadow"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Pop-out Modal for Account Deletion */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-600 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Permanently Delete Account?</h3>
                <p className="text-xs text-rose-400 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                Deleting your account will permanently remove your profile, match history, and records.
              </p>
              <div className="font-bold text-amber-400">
                To confirm, please type <span className="text-white font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 select-all">Delete my account</span> below:
              </div>
            </div>

            {/* Verification text input */}
            <div>
              <input
                type="text"
                value={deleteInputText}
                onChange={(e) => setDeleteInputText(e.target.value)}
                placeholder="Type 'Delete my account'"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl text-white font-mono text-sm outline-none transition"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInputText('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!isDeleteConfirmed || isDeleting}
                onClick={handleConfirmDelete}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg ${
                  isDeleteConfirmed && !isDeleting
                    ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer active:scale-95'
                    : 'bg-rose-950/40 text-rose-800 border border-rose-900/50 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
