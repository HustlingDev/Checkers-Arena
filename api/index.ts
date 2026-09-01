import express, { Request, Response, NextFunction } from 'express';
import { pesajetService } from '../server/pesajetService.js';
import { UserProfile, WalletTransaction } from '../src/types.js';

const app = express();
app.use(express.json());

// CORS & Preflight middleware for Vercel Serverless
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// In-Memory store fallback for Serverless environment
const transactionsList: WalletTransaction[] = [];
const usersMap = new Map<string, UserProfile>();

function recordTransaction(
  userId: string,
  type: 'deposit' | 'withdrawal' | 'stake_entry' | 'stake_win' | 'stake_refund',
  amount: number,
  description: string,
  meta?: any
): WalletTransaction {
  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    type,
    amount,
    currency: 'UGX',
    status: meta?.status || 'completed',
    description,
    reference: meta?.reference,
    pesajetTransactionId: meta?.pesajetTransactionId || meta?.transactionId,
    roomId: meta?.roomId,
    timestamp: Date.now(),
  };
  transactionsList.unshift(tx);
  return tx;
}

function adjustUserWallet(
  userId: string,
  amount: number,
  type: 'deposit' | 'withdrawal' | 'stake_entry' | 'stake_win' | 'stake_refund',
  description: string,
  meta?: any
): number {
  let user = usersMap.get(userId);
  if (!user) {
    user = {
      id: userId,
      username: 'Player',
      avatarId: 'avatar_1',
      wins: 0,
      losses: 0,
      draws: 0,
      rating: 1200,
      walletBalance: 0,
      totalWon: 0,
      totalStaked: 0,
      status: 'online',
      createdAt: Date.now(),
    };
    usersMap.set(userId, user);
  }

  user.walletBalance = Math.max(0, (user.walletBalance || 0) + amount);
  if (type === 'stake_win' && amount > 0) {
    user.totalWon = (user.totalWon || 0) + amount;
  }
  if (type === 'stake_entry' && amount < 0) {
    user.totalStaked = (user.totalStaked || 0) + Math.abs(amount);
  }

  recordTransaction(userId, type, amount, description, meta);
  return user.walletBalance;
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    mode: 'pesajet_live',
    timestamp: new Date().toISOString(),
  });
});

// PesaJet Deposit Initiation API (Collection / Mobile Money Prompt)
app.post(['/api/pesajet/initiate-deposit', '/api/pesajet/initiate-order', '/api/payments/initiate-deposit'], async (req: Request, res: Response) => {
  try {
    const { userId, amount, currency, phoneNumber, provider, description } = req.body;
    const parsedAmount = Number(amount);

    if (!userId || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid deposit parameters or amount.' });
    }

    if (!phoneNumber || phoneNumber.trim().length < 9) {
      return res.status(400).json({ success: false, message: 'Please provide a valid MTN or Airtel Mobile Money phone number.' });
    }

    const reference = `CHK_DEP_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const idempotencyKey = `dep-${userId}-${Date.now()}`;
    const detectedProvider = (provider || pesajetService.detectProvider(phoneNumber)).toLowerCase() as 'mtn' | 'airtel';

    const result = await pesajetService.createPayment({
      type: 'COLLECTION',
      amount: parsedAmount,
      currency: currency || 'UGX',
      phoneNumber,
      provider: detectedProvider,
      reference,
      idempotencyKey,
      description: description || `Checkers Arena Deposit (${parsedAmount} UGX)`,
    });

    const txId = result.transactionId || result.id || reference;

    // Record pending transaction
    recordTransaction(
      userId,
      'deposit',
      parsedAmount,
      `Deposit via PesaJet Mobile Money (${parsedAmount} ${currency || 'UGX'}) - ${detectedProvider.toUpperCase()}`,
      {
        reference,
        pesajetTransactionId: txId,
        status: 'pending',
      }
    );

    return res.json({
      success: true,
      transactionId: txId,
      reference,
      amount: parsedAmount,
      currency: currency || 'UGX',
      provider: detectedProvider,
      status: result.status,
      message: `Prompt sent to ${phoneNumber}! Please enter your Mobile Money PIN on your phone to complete payment.`,
    });
  } catch (err: any) {
    console.error('Error initiating PesaJet deposit:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to initiate deposit' });
  }
});

// PesaJet Status Verification API
app.get(['/api/pesajet/verify-status', '/api/payments/verify-status'], async (req: Request, res: Response) => {
  try {
    const { transactionId, reference, userId } = req.query as {
      transactionId?: string;
      reference?: string;
      userId?: string;
    };

    if (!transactionId && !reference) {
      return res.status(400).json({ success: false, message: 'Missing transactionId or reference' });
    }

    let tx = transactionsList.find(
      (t) => (transactionId && t.pesajetTransactionId === transactionId) || (reference && t.reference === reference)
    );

    let statusResult = transactionId ? await pesajetService.getTransactionStatus(transactionId) : null;
    const rawStatus = (statusResult?.status || tx?.status || 'PENDING').toUpperCase();

    const isCompleted = rawStatus === 'COMPLETED' || rawStatus === 'SUCCESSFUL';
    const isFailed = rawStatus === 'FAILED' || rawStatus === 'CANCELLED' || rawStatus === 'REJECTED';

    if (isCompleted) {
      const targetUserId = userId || tx?.userId;
      const creditAmount = statusResult?.amount || tx?.amount || 5000;

      if (targetUserId && (!tx || tx.status !== 'completed')) {
        adjustUserWallet(
          targetUserId,
          creditAmount,
          'deposit',
          `PesaJet Mobile Money Deposit Approved (${creditAmount} UGX)`,
          { reference: reference || tx?.reference, pesajetTransactionId: transactionId || tx?.pesajetTransactionId }
        );
        if (tx) {
          tx.status = 'completed';
        }
      }

      const updatedUser = targetUserId ? usersMap.get(targetUserId) : null;

      return res.json({
        success: true,
        completed: true,
        status: 'COMPLETED',
        amount: creditAmount,
        walletBalance: updatedUser?.walletBalance || 0,
        message: 'Payment completed and wallet credited successfully!',
      });
    }

    if (isFailed) {
      if (tx) {
        tx.status = 'failed';
      }
      return res.json({
        success: true,
        completed: false,
        failed: true,
        status: 'FAILED',
        message: statusResult?.message || 'Payment was declined or cancelled on mobile device.',
      });
    }

    res.json({
      success: true,
      completed: false,
      status: rawStatus,
      message: 'Transaction is processing. Please approve on your mobile phone or wait a few moments.',
    });
  } catch (err: any) {
    console.error('Error verifying PesaJet status:', err);
    res.status(500).json({ success: false, message: err.message || 'Status check failed' });
  }
});

// PesaJet Webhook Receiver
app.all(['/api/pesajet/webhook', '/api/pesajet/ipn'], async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const txId = payload.transactionId || payload.id || payload.data?.transactionId || payload.data?.id;
    const ref = payload.reference || payload.data?.reference;
    const status = (payload.status || payload.data?.status || '').toUpperCase();
    const amount = Number(payload.amount || payload.data?.amount) || 0;

    if (txId && (status === 'COMPLETED' || status === 'SUCCESSFUL')) {
      const tx = transactionsList.find((t) => t.pesajetTransactionId === txId || t.reference === ref);
      if (tx && tx.status !== 'completed') {
        const creditAmount = amount || tx.amount;
        adjustUserWallet(
          tx.userId,
          creditAmount,
          'deposit',
          `PesaJet Webhook Deposit Verified (${creditAmount} UGX)`,
          { reference: ref || tx.reference, pesajetTransactionId: txId }
        );
        tx.status = 'completed';
      }
    }

    res.json({ status: 'success', message: 'Webhook processed successfully' });
  } catch (err: any) {
    res.status(200).json({ status: 'acknowledged', note: err.message });
  }
});

// PesaJet Webhook Helper / Info Endpoint
app.all(['/api/pesajet/webhook-config', '/api/pesajet/ipn-config'], async (req: Request, res: Response) => {
  const host = req.get('host') || 'checkersarena-beta.vercel.app';
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const webhookUrl = `https://${cleanHost}/api/pesajet/webhook`;

  res.json({
    success: true,
    merchantDomain: cleanHost,
    webhookDestinationUrl: webhookUrl,
    description: 'Provide this URL in your PesaJet merchant dashboard as the Webhook destination.',
  });
});

// Wallet Transactions History API
app.get('/api/wallet/transactions', (req: Request, res: Response) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Missing userId parameter' });
  }
  const userTxs = transactionsList.filter((t) => t.userId === userId).slice(0, 50);
  res.json({ success: true, transactions: userTxs });
});

// Wallet Reset Balances API (Purge Sandbox & Mock balances)
app.post(['/api/wallet/reset-balance', '/api/wallet/reset'], (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });

  const user = usersMap.get(userId);
  if (user) {
    user.walletBalance = 0;
    user.totalWon = 0;
    user.totalStaked = 0;
    usersMap.set(userId, user);
  }

  // Clear sandbox transactions for this user
  for (let i = transactionsList.length - 1; i >= 0; i--) {
    if (transactionsList[i].userId === userId) {
      transactionsList.splice(i, 1);
    }
  }

  res.json({
    success: true,
    walletBalance: 0,
    totalWon: 0,
    totalStaked: 0,
    message: 'Sandbox balance successfully cleared and reset to 0 UGX.',
  });
});

// Wallet Withdrawal Request API (PesaJet Disbursement)
app.post('/api/wallet/withdraw', async (req: Request, res: Response) => {
  const { userId, amount, phoneNumber, provider } = req.body;
  const parsed = Number(amount);
  if (!userId || isNaN(parsed) || parsed < 500) {
    return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is 500 UGX.' });
  }

  if (!phoneNumber || phoneNumber.trim().length < 9) {
    return res.status(400).json({ success: false, message: 'Please enter a valid MTN or Airtel phone number for withdrawal.' });
  }

  const user = usersMap.get(userId);
  if (!user || (user.walletBalance || 0) < parsed) {
    return res.status(400).json({ success: false, message: 'Insufficient wallet balance for this withdrawal.' });
  }

  const detectedProvider = (provider || pesajetService.detectProvider(phoneNumber)).toLowerCase() as 'mtn' | 'airtel';
  const withdrawReference = `CHK_WTH_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const idempotencyKey = `wth-${userId}-${Date.now()}`;

  adjustUserWallet(
    userId,
    -parsed,
    'withdrawal',
    `Withdrawal to ${detectedProvider.toUpperCase()} (${phoneNumber}) - ${parsed.toLocaleString()} UGX`,
    { reference: withdrawReference }
  );

  try {
    const disburseResult = await pesajetService.createPayment({
      type: 'DISBURSEMENT',
      amount: parsed,
      currency: 'UGX',
      phoneNumber,
      provider: detectedProvider,
      reference: withdrawReference,
      idempotencyKey,
      description: `Checkers Arena Payout to ${phoneNumber}`,
    });

    res.json({
      success: true,
      walletBalance: user.walletBalance,
      transactionId: disburseResult.transactionId || withdrawReference,
      reference: withdrawReference,
      message: `Payout of ${parsed.toLocaleString()} UGX initiated to ${phoneNumber}! You will receive the funds shortly.`,
    });
  } catch (disburseErr: any) {
    res.json({
      success: true,
      walletBalance: user.walletBalance,
      reference: withdrawReference,
      message: `Withdrawal of ${parsed.toLocaleString()} UGX submitted for processing. Reference: ${withdrawReference}.`,
    });
  }
});

// Export Express app for Vercel Serverless
export default app;
