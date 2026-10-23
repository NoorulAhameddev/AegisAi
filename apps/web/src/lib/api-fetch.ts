/**
 * Centralized API fetch wrapper
 *
 * All frontend API calls should use this instead of raw fetch().
 * Automatically includes:
 * - credentials: 'include' (for auth cookies)
 * - CSRF token (for mutating requests)
 * - Content-Type header
 * - Error handling with standardized response format
 */

const API_PREFIX = "/api";

interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getCsrfToken(): Promise<string | null> {
  try {
    const match = document.cookie.match(/csrf-token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResponse<T>> {
  const url = path.startsWith("/") ? path : `${API_PREFIX}${path}`;
  const method = options.method || "GET";
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Include CSRF token for mutating requests
  if (isMutating) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true, data: data?.data ?? data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// Convenience methods
export const api = {
  get: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
