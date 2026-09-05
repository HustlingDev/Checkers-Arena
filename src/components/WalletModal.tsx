import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, STAKE_TIERS, WalletTransaction } from '../types';
import { apiFetchJson } from '../lib/api';
import { saveUserProfileToFirestore } from '../lib/firebase';
import {
  initiateMobileMoneyDeposit,
  verifyMobileMoneyStatus,
  withdrawMobileMoney,
  fetchUserTransactions,
} from '../lib/paymentService';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Check,
  CreditCard,
  Smartphone,
  Info,
} from 'lucide-react';

interface WalletModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdated: (newBalance: number) => void;
  initialTab?: 'deposit' | 'withdraw' | 'history';
}

const DEPOSIT_PRESET_AMOUNTS = [
  { amount: 500, label: '500 UGX', category: 'The Streets' },
  { amount: 1000, label: '1,000 UGX', category: 'Kawajyi' },
  { amount: 2000, label: '2,000 UGX', category: 'Kagujje' },
  { amount: 5000, label: '5,000 UGX', category: 'Abanene' },
  { amount: 10000, label: '10,000 UGX', category: 'The Streets' },
  { amount: 20000, label: '20,000 UGX', category: 'The Experts' },
];

const CASHOUT_PRESET_AMOUNTS = [
  { amount: 1000, label: '1,000 UGX' },
  { amount: 2000, label: '2,000 UGX' },
  { amount: 5000, label: '5,000 UGX' },
  { amount: 10000, label: '10,000 UGX' },
  { amount: 20000, label: '20,000 UGX' },
];

export const WalletModal: React.FC<WalletModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onBalanceUpdated,
  initialTab = 'deposit',
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>(initialTab);
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [customDeposit, setCustomDeposit] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(1000);
  const [customWithdraw, setCustomWithdraw] = useState<string>('');

  // Auto-link phone number directly from user profile
  const profilePhone = currentUser.phoneNumber || currentUser.normalizedPhone || '';
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('mtn');

  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(false);

  // Active PesaJet Prompt State
  const [pendingPromptTxId, setPendingPromptTxId] = useState<string | null>(null);
  const [pendingPromptRef, setPendingPromptRef] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
      if (profilePhone) {
        detectProviderFromPhone(profilePhone);
      }
    } else {
      resetActivePayment();
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, currentUser.id, profilePhone]);

  const detectProviderFromPhone = (val: string) => {
    const clean = val.replace(/[\s\-\+]/g, '');
    if (
      clean.startsWith('077') ||
      clean.startsWith('078') ||
      clean.startsWith('076') ||
      clean.startsWith('25677') ||
      clean.startsWith('25678') ||
      clean.startsWith('25676')
    ) {
      setProvider('mtn');
    } else if (
      clean.startsWith('070') ||
      clean.startsWith('075') ||
      clean.startsWith('074') ||
      clean.startsWith('25670') ||
      clean.startsWith('25675') ||
      clean.startsWith('25674')
    ) {
      setProvider('airtel');
    }
  };

  const resetActivePayment = () => {
    setPendingPromptTxId(null);
    setPendingPromptRef(null);
    setIsVerifying(false);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const list = await fetchUserTransactions(currentUser.id);
      if (Array.isArray(list)) {
        setTransactions(list);
      }
    } catch (e) {
      console.error('Failed to fetch transactions', e);
    } finally {
      setTransactionsLoading(false);
    }
  };

  if (!isOpen) return null;

  const parsedCustomDeposit = customDeposit.trim() ? Number(customDeposit) : NaN;
  const effectiveDepositAmount = !isNaN(parsedCustomDeposit) && parsedCustomDeposit > 0
    ? parsedCustomDeposit
    : depositAmount;
  const effectiveWithdrawAmount = customWithdraw ? Number(customWithdraw) : withdrawAmount;
  const effectivePhoneNumber = profilePhone.trim();

  // 1. Initiate Mobile Money Deposit
  const handleInitiatePesaJetDeposit = async () => {
    if (!effectiveDepositAmount || effectiveDepositAmount < 500) {
      setStatusMessage({ type: 'error', text: 'Minimum deposit is 500 UGX.' });
      return;
    }

    if (!effectivePhoneNumber || effectivePhoneNumber.length < 9) {
      setStatusMessage({
        type: 'error',
        text: 'No phone number attached to your profile. Please add your number in Settings.',
      });
      return;
    }

    setLoading(true);
    setStatusMessage({ type: 'info', text: 'Initiating Mobile Money deposit prompt...' });

    try {
      const result = await initiateMobileMoneyDeposit({
        userId: currentUser.id,
        amount: effectiveDepositAmount,
        phoneNumber: effectivePhoneNumber,
        provider,
        currentUser,
        description: `Checkers Arena Deposit ${effectiveDepositAmount} UGX`,
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to initiate deposit. Please try again.');
      }

      const txId = result.transactionId;
      const ref = result.reference;
      setPendingPromptTxId(txId || null);
      setPendingPromptRef(ref || null);

      setStatusMessage({
        type: 'info',
        text: result.message || `PIN Prompt sent to ${effectivePhoneNumber}! Please enter your Mobile Money PIN on your phone.`,
      });

      // Start automatic polling every 3.5 seconds
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        if (txId || ref) {
          const completed = await checkPesaJetPaymentStatus(txId, ref, false);
          if (completed) {
            clearInterval(pollIntervalRef.current);
          }
        }
      }, 3500);
    } catch (err: any) {
      console.error('Deposit error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Deposit initiation failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Check Payment Status
  const checkPesaJetPaymentStatus = async (
    transactionId?: string | null,
    reference?: string | null,
    showFeedback: boolean = true
  ): Promise<boolean> => {
    if (showFeedback) setIsVerifying(true);
    try {
      const result = await verifyMobileMoneyStatus({
        transactionId,
        reference,
        userId: currentUser.id,
        amount: effectiveDepositAmount,
        currentUser,
      });

      if (result.completed) {
        const newBal = result.walletBalance !== undefined ? result.walletBalance : ((currentUser.walletBalance || 0) + effectiveDepositAmount);
        setStatusMessage({
          type: 'success',
          text: result.message || `Payment Confirmed! +${effectiveDepositAmount.toLocaleString()} UGX credited to your wallet.`,
        });
        onBalanceUpdated(newBal);

        fetchTransactions();
        setPendingPromptTxId(null);
        setPendingPromptRef(null);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return true;
      } else if (result.failed) {
        setStatusMessage({
          type: 'error',
          text: result.message || 'Payment was declined or cancelled on mobile device.',
        });
        setPendingPromptTxId(null);
        setPendingPromptRef(null);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return false;
      } else if (showFeedback) {
        setStatusMessage({
          type: 'info',
          text: result.message || 'Payment is pending. Please check your phone screen to approve with your PIN.',
        });
      }
      return false;
    } catch {
      return false;
    } finally {
      if (showFeedback) setIsVerifying(false);
    }
  };

  // 3. Withdrawal Cashout via Mobile Money (Minimum 1,000 UGX)
  const handleWithdraw = async () => {
    const amt = effectiveWithdrawAmount;
    if (!amt || amt < 1000) {
      setStatusMessage({ type: 'error', text: 'Minimum cashout amount is 1,000 UGX.' });
      return;
    }
    if ((currentUser.walletBalance || 0) < amt) {
      setStatusMessage({ type: 'error', text: 'Insufficient wallet balance for this cashout.' });
      return;
    }
    if (!effectivePhoneNumber || effectivePhoneNumber.length < 9) {
      setStatusMessage({
        type: 'error',
        text: 'No phone number attached to your profile. Please add your number in Settings.',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await withdrawMobileMoney({
        userId: currentUser.id,
        amount: amt,
        phoneNumber: effectivePhoneNumber,
        provider,
        currentUser,
      });

      if (result.success) {
        onBalanceUpdated(result.walletBalance);
        setStatusMessage({
          type: 'success',
          text: result.message,
        });
        fetchTransactions();
      } else {
        setStatusMessage({ type: 'error', text: result.message || 'Cashout failed. Please check your balance.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Cashout failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="wallet-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div id="wallet-modal-container" className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative space-y-4 max-h-[94vh] flex flex-col justify-between overflow-hidden">
        {/* Close Button */}
        <button
          id="btn-close-wallet-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header & Balance Card */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md font-black">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-1.5">
                <span>Checkers Arena Wallet</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Manage deposits, cashout winnings & transaction history
              </p>
            </div>
          </div>

          {/* Balance Hero Card */}
          <div id="wallet-balance-card" className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-inner">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Available Cash Balance
              </span>
              <div id="wallet-available-balance-text" className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                {(currentUser.walletBalance || 0).toLocaleString()}{' '}
                <span className="text-xs font-bold text-slate-400">UGX</span>
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-emerald-400 font-bold block">
                Won: +{(currentUser.totalWon || 0).toLocaleString()} UGX
              </span>
              <span className="text-[10px] text-slate-400 block">
                Staked: {(currentUser.totalStaked || 0).toLocaleString()} UGX
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div id="wallet-tabs-bar" className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            id="tab-btn-deposit"
            onClick={() => {
              setActiveTab('deposit');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg font-black text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'deposit'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Deposit
          </button>
          <button
            id="tab-btn-withdraw"
            onClick={() => {
              setActiveTab('withdraw');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg font-black text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'withdraw'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Cashout
          </button>
          <button
            id="tab-btn-history"
            onClick={() => {
              setActiveTab('history');
              setStatusMessage(null);
              fetchTransactions();
            }}
            className={`flex-1 py-2 rounded-lg font-black text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div
            id="wallet-status-banner"
            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                : 'bg-amber-950/80 border-amber-800 text-amber-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-amber-400" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
          </div>
        )}

        {/* ACTIVE PROMPT WAITING BANNER */}
        {pendingPromptTxId && (
          <div id="pending-prompt-box" className="p-3 bg-amber-950/70 border border-amber-500/50 rounded-2xl space-y-2.5 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
              <Smartphone className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Mobile Money USSD Prompt Sent</span>
            </div>
            <p className="text-[11px] text-amber-300/90">
              Check your mobile phone screen ({effectivePhoneNumber}), enter your Mobile Money PIN to authorize the deposit of {effectiveDepositAmount.toLocaleString()} UGX.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                id="btn-verify-prompt-status"
                onClick={() => checkPesaJetPaymentStatus(pendingPromptTxId, pendingPromptRef, true)}
                disabled={isVerifying}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking Status...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>I've Entered My PIN (Confirm)</span>
                  </>
                )}
              </button>
              <button
                id="btn-cancel-pending-prompt"
                onClick={resetActivePayment}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Deposit (Starts from 500 UGX, No 0, No Custom Amount, Profile Phone) */}
        {activeTab === 'deposit' && (
          <div id="deposit-tab-pane" className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                <span>Select Deposit Amount (UGX)</span>
                <span className="text-[10px] text-amber-400 font-bold">Starts from 500 UGX</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {DEPOSIT_PRESET_AMOUNTS.map((tier) => (
                  <button
                    id={`btn-stake-preset-${tier.amount}`}
                    key={tier.amount}
                    type="button"
                    onClick={() => {
                      setDepositAmount(tier.amount);
                      setCustomDeposit('');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black border transition flex flex-col items-center justify-center cursor-pointer ${
                      effectiveDepositAmount === tier.amount && !customDeposit
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{tier.label}</span>
                    <span className="text-[9px] text-slate-500 font-semibold">{tier.category}</span>
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Or Enter Desired Deposit Amount (UGX)
                </label>
                <div className="relative">
                  <input
                    id="input-custom-deposit-amount"
                    type="number"
                    min={500}
                    step={100}
                    placeholder="Enter any amount (min 500 UGX)"
                    value={customDeposit}
                    onChange={(e) => setCustomDeposit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-bold">UGX</span>
                </div>
                {customDeposit && Number(customDeposit) < 500 && (
                  <p className="text-[10px] text-rose-400 mt-1">Minimum deposit is 500 UGX.</p>
                )}
              </div>
            </div>

            {/* Network Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-300">Payment Network</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-network-select-mtn"
                  type="button"
                  onClick={() => setProvider('mtn')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                    provider === 'mtn'
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>MTN MoMo</span>
                </button>
                <button
                  id="btn-network-select-airtel"
                  type="button"
                  onClick={() => setProvider('airtel')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                    provider === 'airtel'
                      ? 'bg-rose-400/20 border-rose-400 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-rose-400" />
                  <span>Airtel Money</span>
                </button>
              </div>
            </div>

            {/* Registered Phone Display (No manual phone input) */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  Registered Mobile Money Phone
                </span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">
                  {provider === 'mtn' ? 'MTN' : 'Airtel'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white font-mono">
                  {effectivePhoneNumber || 'No phone set (Add in Settings)'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Auto-linked from Profile
                </span>
              </div>
            </div>

            {/* Deposit Button (Replaces "Prompt My Phone") */}
            <button
              id="btn-submit-deposit-prompt"
              onClick={handleInitiatePesaJetDeposit}
              disabled={loading || effectiveDepositAmount < 500}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg transition active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Deposit...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Deposit ({effectiveDepositAmount.toLocaleString()} UGX)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Cashout (Minimum 1,000 UGX, Profile Phone) */}
        {activeTab === 'withdraw' && (
          <div id="withdraw-tab-pane" className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                <span>Select Cashout Amount (UGX)</span>
                <span className="text-[10px] text-amber-400 font-bold">Min 1,000 UGX</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {CASHOUT_PRESET_AMOUNTS.map((tier) => (
                  <button
                    key={tier.amount}
                    type="button"
                    onClick={() => {
                      setWithdrawAmount(tier.amount);
                      setCustomWithdraw('');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black border transition flex flex-col items-center justify-center cursor-pointer ${
                      effectiveWithdrawAmount === tier.amount && !customWithdraw
                        ? 'bg-emerald-400/20 border-emerald-400 text-emerald-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{tier.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <input
                  id="input-withdraw-amount"
                  type="number"
                  placeholder="Or enter cashout amount (min 1,000 UGX)"
                  value={customWithdraw}
                  onChange={(e) => setCustomWithdraw(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs font-bold focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Available balance: {(currentUser.walletBalance || 0).toLocaleString()} UGX
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-300">Payout Network</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-withdraw-network-mtn"
                  type="button"
                  onClick={() => setProvider('mtn')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                    provider === 'mtn'
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>MTN MoMo</span>
                </button>
                <button
                  id="btn-withdraw-network-airtel"
                  type="button"
                  onClick={() => setProvider('airtel')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                    provider === 'airtel'
                      ? 'bg-rose-400/20 border-rose-400 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-rose-400" />
                  <span>Airtel Money</span>
                </button>
              </div>
            </div>

            {/* Registered Phone Display */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  Payout Mobile Money Number
                </span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">
                  {provider === 'mtn' ? 'MTN' : 'Airtel'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white font-mono">
                  {effectivePhoneNumber || 'No phone registered (Set in Settings)'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Auto-linked from Profile
                </span>
              </div>
            </div>

            {/* Cashout Button */}
            <button
              id="btn-submit-withdraw-cashout"
              onClick={handleWithdraw}
              disabled={loading || (currentUser.walletBalance || 0) < 1000 || effectiveWithdrawAmount < 1000}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg transition active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Cashout...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Cashout ({effectiveWithdrawAmount.toLocaleString()} UGX)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 3: History */}
        {activeTab === 'history' && (
          <div id="history-tab-pane" className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-300">Transaction History</span>
              <button
                id="btn-refresh-tx-history"
                onClick={fetchTransactions}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${transactionsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {transactionsLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-xs">Loading ledger transactions...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-center">
                <Info className="w-6 h-6 text-slate-600" />
                <span className="text-xs font-semibold">No transactions recorded yet.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus'
                              ? 'bg-emerald-400'
                              : 'bg-rose-400'
                          }`}
                        />
                        <span className="capitalize">{tx.type}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{tx.description}</p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-black font-mono ${
                          tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.amount >= 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} UGX
                      </span>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
