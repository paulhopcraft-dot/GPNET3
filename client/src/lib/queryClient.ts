import { QueryClient } from "@tanstack/react-query";
import { getAuthToken } from "../contexts/AuthContext";

// ========================================
// CSRF Token Management
// ========================================

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Fetch CSRF token from backend
 * Returns cached token if available, otherwise fetches new one
 */
async function fetchCsrfToken(): Promise<string> {
  // If we're already fetching a token, return that promise to avoid race conditions
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
    try {
      const response = await fetch("/api/csrf-token", {
        credentials: "include", // Required for cookie-based CSRF
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      csrfToken = data.data.csrfToken;
      return csrfToken!;
    } catch (error) {
      console.error("CSRF token fetch error:", error);
      throw error;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

/**
 * Get current CSRF token, fetching if necessary
 */
async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  return fetchCsrfToken();
}

/**
 * Clear cached CSRF token (call this when receiving 403 CSRF errors)
 */
function clearCsrfToken(): void {
  csrfToken = null;
}

/**
 * Initialize CSRF token on app load
 * Call this from your app's root component (e.g., App.tsx)
 */
export async function initializeCsrf(): Promise<void> {
  try {
    await fetchCsrfToken();
    console.log("✅ CSRF token initialized");
  } catch (error) {
    console.error("⚠️ Failed to initialize CSRF token:", error);
    // Don't throw - app should still load, individual requests will retry
  }
}

// ========================================
// Helper Functions
// ========================================

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders(includeAuth: boolean = true): HeadersInit {
  const headers: HeadersInit = {};

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Check if HTTP method requires CSRF protection
 */
function requiresCsrf(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

/**
 * Check if error is a CSRF error
 */
function isCsrfError(error: Error): boolean {
  return (
    error.message.includes("403") &&
    (error.message.toLowerCase().includes("csrf") ||
      error.message.toLowerCase().includes("forbidden"))
  );
}

// ========================================
// Main API Request Functions
// ========================================

/**
 * Make an API request with automatic CSRF token handling
 * Includes retry logic for CSRF token refresh on 403 errors
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { includeAuth?: boolean; skipCsrf?: boolean },
): Promise<Response> {
  const includeAuth = options?.includeAuth ?? true;
  const skipCsrf = options?.skipCsrf ?? false;
  const authHeaders = getAuthHeaders(includeAuth);

  // Build headers
  const headers: HeadersInit = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...authHeaders,
  };

  // Add CSRF token for unsafe methods (unless explicitly skipped)
  if (requiresCsrf(method) && !skipCsrf) {
    try {
      const token = await getCsrfToken();
      headers["X-CSRF-Token"] = token;
    } catch (error) {
      console.error("Failed to get CSRF token:", error);
      // Continue anyway - backend will reject if token required
    }
  }

  // Make initial request
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Required for CSRF cookies
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // If it's a CSRF error, refresh token and retry once
    if (error instanceof Error && isCsrfError(error) && !skipCsrf) {
      console.warn("CSRF token invalid, refreshing and retrying...");
      clearCsrfToken();

      try {
        const newToken = await fetchCsrfToken();
        headers["X-CSRF-Token"] = newToken;

        const retryRes = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });

        await throwIfResNotOk(retryRes);
        return retryRes;
      } catch (retryError) {
        console.error("Retry after CSRF refresh failed:", retryError);
        throw retryError;
      }
    }

    // Not a CSRF error or already retried, rethrow
    throw error;
  }
}

/**
 * Standalone fetch wrapper with CSRF support
 * Use this for direct fetch calls in components
 */
export async function fetchWithCsrf(
  url: string,
  options?: RequestInit & { skipCsrf?: boolean },
): Promise<Response> {
  const { skipCsrf, ...fetchOptions } = options || {};
  const method = fetchOptions.method || "GET";

  // Build headers
  const headers = new Headers(fetchOptions.headers);

  // Add CSRF token for unsafe methods (unless explicitly skipped)
  if (requiresCsrf(method) && !skipCsrf) {
    try {
      const token = await getCsrfToken();
      headers.set("X-CSRF-Token", token);
    } catch (error) {
      console.error("Failed to get CSRF token:", error);
      // Continue anyway - backend will reject if token required
    }
  }

  // Ensure credentials are included for CSRF cookies
  const credentials = fetchOptions.credentials || "include";

  // Make initial request
  try {
    const res = await fetch(url, {
      ...fetchOptions,
      method,
      headers,
      credentials,
    });

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }

    return res;
  } catch (error) {
    // If it's a CSRF error, refresh token and retry once
    if (error instanceof Error && isCsrfError(error) && !skipCsrf) {
      console.warn("CSRF token invalid, refreshing and retrying...");
      clearCsrfToken();

      try {
        const newToken = await fetchCsrfToken();
        headers.set("X-CSRF-Token", newToken);

        const retryRes = await fetch(url, {
          ...fetchOptions,
          method,
          headers,
          credentials,
        });

        if (!retryRes.ok) {
          const text = (await retryRes.text()) || retryRes.statusText;
          throw new Error(`${retryRes.status}: ${text}`);
        }

        return retryRes;
      } catch (retryError) {
        console.error("Retry after CSRF refresh failed:", retryError);
        throw retryError;
      }
    }

    // Not a CSRF error or already retried, rethrow
    throw error;
  }
}

// ========================================
// React Query Integration
// ========================================

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn =
  <T>({ on401: unauthorizedBehavior }: { on401: UnauthorizedBehavior }) =>
  async ({ queryKey }: { queryKey: readonly unknown[] }): Promise<T | null> => {
    const authHeaders = getAuthHeaders(true);

    const res = await fetch(queryKey.join("/") as string, {
      headers: authHeaders,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
