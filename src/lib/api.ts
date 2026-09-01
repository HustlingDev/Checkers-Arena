// API Configuration & Base URL resolution for Web and Android Capacitor Native App

const CANDIDATE_API_URLS = [
  'https://checkersarena-beta.vercel.app',
  'https://ais-dev-6jl5ztzyfigu5rh4loi7rf-490075589647.europe-west2.run.app',
  'https://ais-pre-6jl5ztzyfigu5rh4loi7rf-490075589647.europe-west2.run.app',
];

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('checkers_api_base_url');
    if (customUrl) return customUrl.replace(/\/$/, '');

    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl) return envUrl.replace(/\/$/, '');

    const origin = window.location.origin;
    const isCapacitorNative =
      Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
      origin.includes('localhost') ||
      origin.startsWith('capacitor:') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('https://localhost');

    if (isCapacitorNative) {
      // Primary public API endpoint for mobile APK builds
      return 'https://checkersarena-beta.vercel.app';
    }
  }
  return '';
};

export const getFullApiUrl = (path: string, baseUrlOverride?: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = baseUrlOverride !== undefined ? baseUrlOverride : getApiBaseUrl();
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
};

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export const apiFetchJson = async <T = any>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const primaryBaseUrl = getApiBaseUrl();

  // Create list of endpoints to attempt: primary first, then candidates without duplicates
  const endpointsToTry: string[] = [primaryBaseUrl];
  for (const candidate of CANDIDATE_API_URLS) {
    if (!endpointsToTry.includes(candidate)) {
      endpointsToTry.push(candidate);
    }
  }
  if (!endpointsToTry.includes('')) {
    endpointsToTry.push('');
  }

  let lastErrorMsg = 'Network connection error. Check your internet connection.';

  for (let i = 0; i < endpointsToTry.length; i++) {
    const currentBase = endpointsToTry[i];
    const fullUrl = currentBase ? `${currentBase}${cleanPath}` : cleanPath;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const res = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(options?.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        // If we succeeded in reaching an endpoint, save it as preferred if it was a candidate
        if (res.ok && currentBase && currentBase !== primaryBaseUrl) {
          try {
            localStorage.setItem('checkers_api_base_url', currentBase);
          } catch {
            // ignore
          }
        }
        return { ok: res.ok, status: res.status, data: json };
      } catch {
        return {
          ok: false,
          status: res.status,
          data: {
            success: false,
            message: text && text.length < 200 ? text : `Server error (${res.status})`,
          } as any,
        };
      }
    } catch (networkErr: any) {
      console.warn(`apiFetchJson failed on ${fullUrl}:`, networkErr?.message || networkErr);
      if (networkErr?.name === 'AbortError') {
        lastErrorMsg = 'Request timed out. Please check your internet connection and try again.';
      } else {
        lastErrorMsg = networkErr?.message || 'Unable to connect to payment server.';
      }
      // Continue to next fallback endpoint
    }
  }

  return {
    ok: false,
    status: 0,
    data: {
      success: false,
      message:
        lastErrorMsg === 'Failed to fetch'
          ? 'Payment server is currently unreachable. Please check your internet connection or try again.'
          : lastErrorMsg,
    } as any,
  };
};
