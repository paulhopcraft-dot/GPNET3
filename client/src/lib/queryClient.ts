import { QueryClient } from "@tanstack/react-query";

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
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
    try {
      const response = await fetch("/api/csrf-token", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      csrfToken = data.data.csrfToken;
      return csrfToken!;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  return fetchCsrfToken();
}

function clearCsrfToken(): void {
  csrfToken = null;
}

export async function initializeCsrf(): Promise<void> {
  try {
    await fetchCsrfToken();
  } catch {
    // Silent fail - app should still load, individual requests will retry
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

export function getAuthHeaders(_includeAuth: boolean = true): Record<string, string> {
  return {};
}

function requiresCsrf(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { includeAuth?: boolean; skipCsrf?: boolean },
): Promise<Response> {
  const includeAuth = options?.includeAuth ?? true;
  const skipCsrf = options?.skipCsrf ?? false;
  const authHeaders = getAuthHeaders(includeAuth);

  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...authHeaders,
  };

  if (requiresCsrf(method) && !skipCsrf) {
    try {
      const token = await getCsrfToken();
      headers["X-CSRF-Token"] = token;
    } catch {
      // Continue anyway - backend will reject if token required
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (error instanceof Error && isCsrfError(error) && !skipCsrf) {
      clearCsrfToken();

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
    }

    throw error;
  }
}

export async function fetchWithCsrf(
  url: string,
  options?: RequestInit & { skipCsrf?: boolean; skipAuth?: boolean },
): Promise<Response> {
  const { skipCsrf, skipAuth, ...fetchOptions } = options || {};
  const method = fetchOptions.method || "GET";

  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth) {
    const authHeaders = getAuthHeaders(true);
    if (authHeaders.Authorization) {
      headers.set("Authorization", authHeaders.Authorization);
    }
  }

  if (requiresCsrf(method) && !skipCsrf) {
    try {
      const token = await getCsrfToken();
      headers.set("X-CSRF-Token", token);
    } catch {
      // Continue anyway - backend will reject if token required
    }
  }

  const credentials = fetchOptions.credentials || "include";

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
    if (error instanceof Error && isCsrfError(error) && !skipCsrf) {
      clearCsrfToken();

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
    }

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

    // Build URL from queryKey with proper URL params
    const [endpoint, ...rest] = queryKey as readonly unknown[];

    let urlStr = (endpoint as string) ?? "";

    const searchParams = new URLSearchParams();

    for (const part of rest) {
      if (part == null) continue;
      if (typeof part === "object") {
        for (const [k, v] of Object.entries(part as Record<string, unknown>)) {
          if (v !== undefined && v !== null) {
            searchParams.append(k, String(v));
          }
        }
      } else {
        urlStr += `/${encodeURIComponent(String(part))}`;
      }
    }

    const finalUrl = searchParams.toString() ? `${urlStr}?${searchParams.toString()}` : urlStr;

    const res = await fetch(finalUrl as string, {
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
