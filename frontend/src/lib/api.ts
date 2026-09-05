// Thin fetch wrapper for the Placeonix API. Auth is a backend-set httpOnly
// cookie (see backend/src/controllers/authController.js) — this client never
// touches a token directly, it just always sends credentials so the browser
// attaches the cookie. Never store the token in localStorage/state here; that
// was the exact XSS exposure Phase 0 removed from the old portal.
const API_BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && error.name === "ApiError";
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers || {});
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...options,
    credentials: "include",
    headers,
  });

  let json: { success: boolean; message?: string; data?: T } | null = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response (e.g. a network-level error page) — fall through to the status check below
  }

  if (!res.ok) {
    throw new ApiError(
      json?.message || `Request failed (${res.status})`,
      res.status,
    );
  }
  return (json?.data ?? null) as T;
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),
};