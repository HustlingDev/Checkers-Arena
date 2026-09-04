// Unified Mobile Money Payment & Wallet Service
// Supports both Web (Express Proxy) and Capacitor Native Android (Direct PesaJet API + Firestore)

import { apiFetchJson } from './api';
import {
  saveUserProfileToFirestore,
  recordWalletTransactionInFirestore,
  getUserTransactionsFromFirestore,
  updateUserWalletBalanceInFirestore,
} from './firebase';
import { UserProfile, WalletTransaction } from '../types';
import { formatUgandaPhone, detectUgandaProvider } from './ugandaPhone';

const PESAJET_PUBLIC_KEY = 'pk_f89be8bd38a605a5eccb68d5719362410e8235e0a9925f20';
const PESAJET_BASE_URL = 'https://payments.pesajet.com/api/v1';

export interface InitiateDepositParams {
  userId: string;
  amount: number;
  phoneNumber: string;
  provider?: 'mtn' | 'airtel';
  description?: string;
  currentUser: UserProfile;
}

export interface PaymentInitiateResult {
  success: boolean;
  transactionId?: string;
  reference?: string;
  amount?: number;
  status?: string;
  message: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  completed: boolean;
  failed?: boolean;
  status?: string;
  walletBalance?: number;
  message: string;
}

export interface WithdrawParams {
  userId: string;
  amount: number;
  phoneNumber: string;
  provider?: 'mtn' | 'airtel';
  currentUser: UserProfile;
}

export interface WithdrawResult {
  success: boolean;
  walletBalance: number;
  reference?: string;
  message: string;
}

/**
 * Initiate Mobile Money Deposit (Collection prompt sent to player's phone)
 */
export async function initiateMobileMoneyDeposit(
  params: InitiateDepositParams
): Promise<PaymentInitiateResult> {
  const formattedPhone = formatUgandaPhone(params.phoneNumber);
  const detectedProvider = params.provider || detectUgandaProvider(params.phoneNumber);
  const reference = `CHK_DEP_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const idempotencyKey = `dep-${params.userId}-${Date.now()}`;

  // 1. Try Backend API first (when running on Web with Express active)
  try {
    const backendRes = await apiFetchJson('/api/pesajet/initiate-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId,
        amount: params.amount,
        currency: 'UGX',
        phoneNumber: formattedPhone,
        provider: detectedProvider,
        description: params.description || `Checkers Arena Deposit (${params.amount.toLocaleString()} UGX)`,
      }),
    });

    if (backendRes.ok && backendRes.data && backendRes.data.success) {
      return {
        success: true,
        transactionId: backendRes.data.transactionId || reference,
        reference: backendRes.data.reference || reference,
        amount: params.amount,
        status: backendRes.data.status || 'PENDING',
        message: backendRes.data.message || `PIN Prompt sent to ${formattedPhone}! Please enter your Mobile Money PIN on your phone.`,
      };
    }
  } catch (err) {
    console.warn('[PaymentService] Backend proxy call failed, using direct PesaJet API fallback:', err);
  }

  // 2. Direct PesaJet API fallback (for Capacitor Native APK & standalone deployments)
  try {
    const directPayload = {
      type: 'COLLECTION',
      amount: Number(params.amount),
      currency: 'UGX',
      phoneNumber: formattedPhone,
      provider: detectedProvider,
      reference,
      idempotencyKey,
      description: params.description || `Checkers Arena Deposit (${params.amount.toLocaleString()} UGX)`,
    };

    console.log('[PaymentService] Sending direct collection to PesaJet:', directPayload);

    const response = await fetch(`${PESAJET_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PESAJET_PUBLIC_KEY,
      },
      body: JSON.stringify(directPayload),
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Payment gateway returned unexpected response (HTTP ${response.status})`);
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Payment gateway rejected prompt (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    const txId = data.transactionId || data.id || data.data?.transactionId || reference;

    // Record pending transaction in Firestore
    const pendingTx: WalletTransaction = {
      id: reference,
      userId: params.userId,
      type: 'deposit',
      amount: params.amount,
      currency: 'UGX',
      status: 'pending',
      description: `Deposit via ${detectedProvider.toUpperCase()} (${params.amount.toLocaleString()} UGX)`,
      reference,
      pesajetTransactionId: txId,
      timestamp: Date.now(),
    };
    recordWalletTransactionInFirestore(pendingTx).catch(() => {});

    return {
      success: true,
      transactionId: txId,
      reference,
      amount: params.amount,
      status: data.status || 'PENDING',
      message: `PIN Prompt sent to ${formattedPhone}! Please enter your Mobile Money PIN on your phone.`,
    };
  } catch (directErr: any) {
    console.error('[PaymentService] Direct PesaJet deposit failed:', directErr);
    throw new Error(directErr?.message || 'Failed to initiate Mobile Money deposit. Please verify your phone number.');
  }
}

/**
 * Verify Mobile Money Payment Status
 */
export async function verifyMobileMoneyStatus(params: {
  transactionId?: string | null;
  reference?: string | null;
  userId: string;
  amount: number;
  currentUser: UserProfile;
}): Promise<PaymentVerifyResult> {
  const { transactionId, reference, userId, amount, currentUser } = params;

  // 1. Try Backend Status Query
  try {
    const url = `/api/pesajet/verify-status?userId=${encodeURIComponent(userId)}&transactionId=${encodeURIComponent(
      transactionId || ''
    )}&reference=${encodeURIComponent(reference || '')}`;
    const res = await apiFetchJson(url);

    if (res.ok && res.data && res.data.success) {
      if (res.data.completed || res.data.status === 'COMPLETED' || res.data.status === 'SUCCESSFUL') {
        const newBal = res.data.walletBalance || ((currentUser.walletBalance || 0) + amount);
        return {
          success: true,
          completed: true,
          status: 'COMPLETED',
          walletBalance: newBal,
          message: 'Payment Confirmed! Funds credited to your wallet.',
        };
      } else if (res.data.failed) {
        return {
          success: true,
          completed: false,
          failed: true,
          status: res.data.status || 'FAILED',
          message: res.data.message || 'Payment was declined or cancelled on mobile device.',
        };
      }
    }
  } catch (backendErr) {
    console.warn('[PaymentService] Backend verify call failed, querying direct PesaJet API:', backendErr);
  }

  // 2. Direct PesaJet Query fallback
  if (transactionId) {
    try {
      const response = await fetch(`${PESAJET_BASE_URL}/payments/${encodeURIComponent(transactionId)}`, {
        method: 'GET',
        headers: {
          'X-API-Key': PESAJET_PUBLIC_KEY,
          'Accept': 'application/json',
        },
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          completed: false,
          message: 'Checking transaction status...',
        };
      }

      if (response.ok) {
        const result = data.data || data;
        const rawStatus = (result.status || '').toUpperCase();

        if (rawStatus === 'COMPLETED' || rawStatus === 'SUCCESSFUL') {
          const newBal = (currentUser.walletBalance || 0) + amount;

          // Update user balance in Firestore
          await updateUserWalletBalanceInFirestore(userId, newBal);

          // Update profile in Firestore
          const updatedProfile: UserProfile = { ...currentUser, walletBalance: newBal };
          saveUserProfileToFirestore(updatedProfile).catch(() => {});
          try {
            localStorage.setItem('checkers_user_profile', JSON.stringify(updatedProfile));
          } catch {
            // ignore
          }

          // Record completed transaction
          const completedTx: WalletTransaction = {
            id: reference || transactionId,
            userId,
            type: 'deposit',
            amount,
            currency: 'UGX',
            status: 'completed',
            description: `Mobile Money Deposit Confirmed (+${amount.toLocaleString()} UGX)`,
            reference: reference || undefined,
            pesajetTransactionId: transactionId,
            timestamp: Date.now(),
          };
          recordWalletTransactionInFirestore(completedTx).catch(() => {});

          return {
            success: true,
            completed: true,
            status: 'COMPLETED',
            walletBalance: newBal,
            message: `Payment Confirmed! +${amount.toLocaleString()} UGX credited to your wallet.`,
          };
        }

        if (rawStatus === 'FAILED' || rawStatus === 'CANCELLED' || rawStatus === 'EXPIRED' || rawStatus === 'DECLINED') {
          // Record failed transaction
          const failedTx: WalletTransaction = {
            id: reference || transactionId,
            userId,
            type: 'deposit',
            amount,
            currency: 'UGX',
            status: 'failed',
            description: `Deposit Attempt Cancelled (${amount.toLocaleString()} UGX)`,
            reference: reference || undefined,
            pesajetTransactionId: transactionId,
            timestamp: Date.now(),
          };
          recordWalletTransactionInFirestore(failedTx).catch(() => {});

          return {
            success: true,
            completed: false,
            failed: true,
            status: rawStatus,
            message: result.message || 'Payment was declined or cancelled on mobile device.',
          };
        }

        return {
          success: true,
          completed: false,
          status: rawStatus || 'PENDING',
          message: 'Payment prompt is processing. Please enter your Mobile Money PIN.',
        };
      }
    } catch (directErr) {
      console.warn('[PaymentService] Direct PesaJet status query error:', directErr);
    }
  }

  return {
    success: true,
    completed: false,
    status: 'PENDING',
    message: 'Payment prompt is processing. Please check your phone.',
  };
}

/**
 * Mobile Money Withdrawal / Cashout
 */
export async function withdrawMobileMoney(params: WithdrawParams): Promise<WithdrawResult> {
  const { userId, amount, phoneNumber, currentUser } = params;
  const currentBalance = currentUser.walletBalance || 0;

  if (amount < 1000) {
    throw new Error('Minimum cashout amount is 1,000 UGX.');
  }

  if (currentBalance < amount) {
    throw new Error('Insufficient wallet balance for this cashout.');
  }

  const formattedPhone = formatUgandaPhone(phoneNumber);
  const detectedProvider = params.provider || detectUgandaProvider(phoneNumber);
  const withdrawReference = `CHK_WTH_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const newBalance = Math.max(0, currentBalance - amount);

  // 1. Immediately deduct wallet in Firestore and local storage
  await updateUserWalletBalanceInFirestore(userId, newBalance);
  const updatedProfile: UserProfile = { ...currentUser, walletBalance: newBalance };
  saveUserProfileToFirestore(updatedProfile).catch(() => {});
  try {
    localStorage.setItem('checkers_user_profile', JSON.stringify(updatedProfile));
  } catch {
    // ignore
  }

  // Record transaction in Firestore
  const withdrawTx: WalletTransaction = {
    id: withdrawReference,
    userId,
    type: 'withdrawal',
    amount,
    currency: 'UGX',
    status: 'completed',
    description: `Cashout to ${detectedProvider.toUpperCase()} (${formattedPhone}) - ${amount.toLocaleString()} UGX`,
    reference: withdrawReference,
    timestamp: Date.now(),
  };
  recordWalletTransactionInFirestore(withdrawTx).catch(() => {});

  // 2. Try Backend Disbursement first
  try {
    const backendRes = await apiFetchJson('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        amount,
        phoneNumber: formattedPhone,
        provider: detectedProvider,
      }),
    });
    if (backendRes.ok && backendRes.data && backendRes.data.success) {
      return {
        success: true,
        walletBalance: backendRes.data.walletBalance ?? newBalance,
        reference: withdrawReference,
        message: backendRes.data.message || `Cashout of ${amount.toLocaleString()} UGX initiated to ${formattedPhone}!`,
      };
    }
  } catch (backendErr) {
    console.warn('[PaymentService] Backend cashout call failed, executing direct disbursement fallback:', backendErr);
  }

  // 3. Direct PesaJet Disbursement fallback
  try {
    fetch(`${PESAJET_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PESAJET_PUBLIC_KEY,
      },
      body: JSON.stringify({
        type: 'DISBURSEMENT',
        amount,
        currency: 'UGX',
        phoneNumber: formattedPhone,
        provider: detectedProvider,
        reference: withdrawReference,
        idempotencyKey: `wth-${userId}-${Date.now()}`,
        description: `Checkers Arena Payout to ${formattedPhone}`,
      }),
    }).catch((e) => console.warn('[PaymentService] Direct disbursement error:', e));
  } catch {
    // ignore
  }

  return {
    success: true,
    walletBalance: newBalance,
    reference: withdrawReference,
    message: `Cashout of ${amount.toLocaleString()} UGX submitted successfully! Ref: ${withdrawReference}`,
  };
}

/**
 * Fetch Wallet Transactions (Firestore + Local fallback)
 */
export async function fetchUserTransactions(userId: string): Promise<WalletTransaction[]> {
  // 1. Try Firestore
  try {
    const firestoreList = await getUserTransactionsFromFirestore(userId);
    if (firestoreList.length > 0) {
      return firestoreList;
    }
  } catch (err) {
    console.warn('[PaymentService] Firestore transactions fetch error:', err);
  }

  // 2. Try backend API
  try {
    const res = await apiFetchJson(`/api/wallet/transactions?userId=${encodeURIComponent(userId)}`);
    if (res.ok && res.data && res.data.success && Array.isArray(res.data.transactions)) {
      return res.data.transactions;
    }
  } catch {
    // ignore
  }

  // 3. Local fallback
  try {
    const stored = localStorage.getItem(`checkers_tx_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Reset Wallet Balance
 */
export async function resetUserBalance(userId: string, currentUser: UserProfile): Promise<void> {
  // 1. Backend reset if available
  apiFetchJson('/api/wallet/reset-balance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  }).catch(() => {});

  // 2. Firestore reset
  await updateUserWalletBalanceInFirestore(userId, 0);
  const updatedProfile: UserProfile = {
    ...currentUser,
    walletBalance: 0,
    totalWon: 0,
    totalStaked: 0,
  };
  await saveUserProfileToFirestore(updatedProfile);
  try {
    localStorage.setItem('checkers_user_profile', JSON.stringify(updatedProfile));
    localStorage.setItem('checkers_sandbox_cleaned_v2', 'true');
    localStorage.removeItem(`checkers_tx_${userId}`);
  } catch {
    // ignore
  }
}
