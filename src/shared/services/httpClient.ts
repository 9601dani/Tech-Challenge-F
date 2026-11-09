import type { AuthResponse } from "../../modules/auth/types/auth.types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const SESSION_KEY = "shopcart.session";

interface ApiErrorBody {
  status?: number;
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function getSession(): AuthResponse | null {
  const value = sessionStorage.getItem(SESSION_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthResponse;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveSession(session: AuthResponse): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("shopcart:session-changed"));
}

function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("shopcart:logout"));
}

let refreshRequest: Promise<AuthResponse> | null = null;

async function refreshSession(): Promise<AuthResponse> {
  const currentSession = getSession();
  if (!currentSession?.refreshToken) throw new ApiError("La sesión expiró", 401, "SESSION_EXPIRED");

  if (!refreshRequest) {
    refreshRequest = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
    }).then(async (response) => {
      const body = (await response.json().catch(() => null)) as AuthResponse & ApiErrorBody | null;
      if (!response.ok) {
        throw new ApiError(body?.message ?? "No se pudo renovar la sesión", response.status, body?.code);
      }
      const nextSession = body as AuthResponse;
      saveSession(nextSession);
      return nextSession;
    }).finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

export async function httpRequest<T>(
  path: string,
  options: RequestInit = {},
  alreadyRetried = false,
): Promise<T> {
  const isAuthRequest = path === "/auth/login" || path === "/auth/register" || path === "/auth/refresh";
  const session = getSession();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  if (!isAuthRequest && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = (await response.json().catch(() => null)) as T & ApiErrorBody | null;

  if (response.status === 401 && !isAuthRequest && !alreadyRetried) {
    try {
      await refreshSession();
      return httpRequest<T>(path, options, true).catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
        }
        throw error;
      });
    } catch (refreshError) {
      clearSession();
      throw refreshError;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? "No se pudo completar la solicitud",
      response.status,
      body?.code,
    );
  }

  return body as T;
}
