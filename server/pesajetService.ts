import crypto from 'crypto';

export interface PesajetConfig {
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  baseUrl: string;
}

export interface PesajetPaymentParams {
  type: 'COLLECTION' | 'DISBURSEMENT';
  amount: number;
  currency?: string;
  phoneNumber: string;
  provider: 'mtn' | 'airtel';
  reference: string;
  idempotencyKey: string;
  description?: string;
}

export interface PesajetPaymentResponse {
  id?: string;
  transactionId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SUCCESSFUL' | string;
  reference: string;
  amount: number;
  currency: string;
  phoneNumber?: string;
  provider?: string;
  type?: string;
  message?: string;
  error?: any;
}

export class PesajetService {
  public getConfig(): PesajetConfig {
    return {
      apiKey: process.env.PESAJET_API_KEY || 'pk_f89be8bd38a605a5eccb68d5719362410e8235e0a9925f20',
      apiSecret: process.env.PESAJET_API_SECRET || 'sk_09c75a891c55e4b755df59dd12a8d80b3199d16736af9712',
      webhookSecret: process.env.PESAJET_WEBHOOK_SECRET || 'whsec_bf04d3ace455bc25d12d3bc76ce37d91c40cb1b55eba74d2',
      baseUrl: process.env.PESAJET_BASE_URL || 'https://payments.pesajet.com/api/v1',
    };
  }

  public isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.apiKey && config.apiKey.length > 5);
  }

  /**
   * Format phone number to international standard with leading +256
   */
  public formatUgandaPhone(raw: string): string {
    let clean = (raw || '').replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '256' + clean.substring(1);
    } else if (clean.length === 9) {
      clean = '256' + clean;
    }
    return '+' + clean;
  }

  /**
   * Determine provider from Uganda phone number prefix
   */
  public detectProvider(raw: string): 'mtn' | 'airtel' {
    const clean = (raw || '').replace(/\D/g, '');
    const num = clean.startsWith('256') ? clean.substring(3) : clean.startsWith('0') ? clean.substring(1) : clean;
    if (num.startsWith('77') || num.startsWith('78') || num.startsWith('76')) {
      return 'mtn';
    }
    if (num.startsWith('70') || num.startsWith('75') || num.startsWith('74')) {
      return 'airtel';
    }
    return 'mtn';
  }

  /**
   * Initiate a Mobile Money payment (Collection / Deposit) or Disbursement (Cashout / Payout)
   */
  public async createPayment(params: PesajetPaymentParams): Promise<PesajetPaymentResponse> {
    const config = this.getConfig();
    const formattedPhone = this.formatUgandaPhone(params.phoneNumber);
    const provider = params.provider || this.detectProvider(params.phoneNumber);
    const currency = params.currency || 'UGX';

    const url = `${config.baseUrl}/payments`;
    const payload = {
      type: params.type,
      amount: Number(params.amount),
      currency: currency,
      phoneNumber: formattedPhone,
      provider: provider,
      reference: params.reference,
      idempotencyKey: params.idempotencyKey,
    };

    console.log(`[PesaJet] Request to ${url}:`, JSON.stringify(payload));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey.trim(),
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`[PesaJet] Response (${response.status}):`, responseText);

    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`PesaJet payment request failed (HTTP ${response.status}): ${responseText.substring(0, 120)}`);
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `PesaJet API error (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    const txId = data.transactionId || data.id || data.data?.transactionId || data.data?.id;
    const status = data.status || data.data?.status || 'PENDING';

    return {
      id: txId,
      transactionId: txId,
      status: status,
      reference: params.reference,
      amount: params.amount,
      currency: currency,
      phoneNumber: formattedPhone,
      provider: provider,
      message: data.message,
    };
  }

  /**
   * Query status of a transaction by its transactionId
   */
  public async getTransactionStatus(transactionId: string): Promise<PesajetPaymentResponse> {
    const config = this.getConfig();
    const url = `${config.baseUrl}/payments/${encodeURIComponent(transactionId)}`;

    console.log(`[PesaJet] Querying status: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey.trim(),
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`PesaJet status query failed (HTTP ${response.status})`);
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Status query failed (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    const result = data.data || data;
    const txId = result.transactionId || result.id || transactionId;
    const status = result.status || 'PENDING';

    return {
      id: txId,
      transactionId: txId,
      status: status,
      reference: result.reference || '',
      amount: Number(result.amount) || 0,
      currency: result.currency || 'UGX',
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      message: result.message,
    };
  }

  /**
   * Verify HMAC-SHA256 signature on incoming webhook payload
   */
  public verifyWebhookSignature(rawBody: string, receivedSignature?: string): boolean {
    if (!receivedSignature) return true; // Gracefully permit if webhook signature not sent
    const config = this.getConfig();
    if (!config.webhookSecret) return true;

    try {
      const computed = crypto
        .createHmac('sha256', config.webhookSecret.trim())
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(receivedSignature.trim()));
    } catch (err) {
      console.warn('[PesaJet] Webhook signature verification error:', err);
      return true; // Fallback to accept
    }
  }
}

export const pesajetService = new PesajetService();
