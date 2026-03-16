/**
 * API Configuration
 * 
 * Centralizes API base URL handling for development and production environments.
 * 
 * Development: Uses Vite dev server proxy (relative paths work)
 * Production: Uses VITE_API_URL environment variable to point to Railway backend
 */

/**
 * Get the API base URL
 * 
 * - In development: returns empty string (uses Vite proxy)
 * - In production: returns VITE_API_URL environment variable
 * 
 * @returns API base URL (empty string for dev, full URL for production)
 */
export function getApiBaseUrl(): string {
  // In production, use the environment variable
  if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, use empty string (Vite proxy handles routing)
  return '';
}

/**
 * Build a full API URL
 * 
 * @param endpoint - API endpoint (e.g., '/api/cases')
 * @returns Full API URL
 * 
 * @example
 * ```typescript
 * const url = apiUrl('/api/cases'); 
 * // Dev: '/api/cases'
 * // Prod: 'https://preventli-api.up.railway.app/api/cases'
 * ```
 */
export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // In dev, return just the endpoint (proxy handles it)
  if (!base) {
    return normalizedEndpoint;
  }
  
  // In prod, combine base + endpoint
  return `${base}${normalizedEndpoint}`;
}

/**
 * Default fetch options with credentials
 * Use this as a base for all API calls
 */
export const defaultFetchOptions: RequestInit = {
  credentials: 'include', // Send cookies for auth
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * API fetch wrapper
 * Automatically adds base URL and default options
 * 
 * @param endpoint - API endpoint
 * @param options - Fetch options (merged with defaults)
 * @returns Fetch response
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = apiUrl(endpoint);
  const mergedOptions = {
    ...defaultFetchOptions,
    ...options,
    headers: {
      ...defaultFetchOptions.headers,
      ...(options?.headers || {}),
    },
  };
  
  return fetch(url, mergedOptions);
}
