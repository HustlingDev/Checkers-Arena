/**
 * Uganda Phone Number Formatting & Validation Utility
 * Uganda Country Code: +256
 * MTN Uganda Prefixes: 077, 078, 076
 * Airtel Uganda Prefixes: 070, 075, 074
 */

export interface UgandaPhoneValidation {
  isValid: boolean;
  formatted: string;
  normalized: string; // E.g. '256772123456'
  operator: 'MTN Mobile Money' | 'Airtel Money' | 'Uganda Telecom' | 'Uganda Mobile' | null;
  error?: string;
}

export function validateUgandaPhoneNumber(input: string): UgandaPhoneValidation {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      formatted: '',
      normalized: '',
      operator: null,
      error: 'Phone number is required.',
    };
  }

  // Remove spaces, hyphens, parentheses, and letters
  let clean = input.trim().replace(/[\s\-().]/g, '');

  // Strip leading plus
  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  }

  // Format local prefix 07... to 2567...
  if (clean.startsWith('07') && clean.length === 10) {
    clean = '256' + clean.substring(1);
  } else if (clean.startsWith('7') && clean.length === 9) {
    clean = '256' + clean;
  }

  // Check if starts with Uganda country code 256
  if (!clean.startsWith('256')) {
    return {
      isValid: false,
      formatted: input,
      normalized: clean,
      operator: null,
      error: 'Only Ugandan phone numbers (+256) are supported for Mobile Money.',
    };
  }

  // Must be exactly 12 digits (256 + 9 digits)
  if (clean.length !== 12 || !/^\d+$/.test(clean)) {
    return {
      isValid: false,
      formatted: input,
      normalized: clean,
      operator: null,
      error: 'Uganda phone numbers must have 9 digits after +256 (e.g., 0772 123456 or 0701 234567).',
    };
  }

  // Determine operator based on 2-digit prefix after 256
  const prefix = clean.substring(3, 5); // 77, 78, 76, 70, 75, 74, 71, 72, 79
  let operator: UgandaPhoneValidation['operator'] = 'Uganda Mobile';

  if (['77', '78', '76', '39'].includes(prefix)) {
    operator = 'MTN Mobile Money';
  } else if (['70', '75', '74'].includes(prefix)) {
    operator = 'Airtel Money';
  } else if (['71', '72'].includes(prefix)) {
    operator = 'Uganda Telecom';
  }

  const local9 = clean.substring(3); // e.g. 772123456
  const formatted = `+256 ${local9.substring(0, 3)} ${local9.substring(3, 6)} ${local9.substring(6)}`;

  return {
    isValid: true,
    formatted,
    normalized: clean,
    operator,
  };
}
