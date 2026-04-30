// lib/auth.ts
import { AUTH_EVENTS, emitAuthEvent } from './authEvents';
import Cookies from 'js-cookie';

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "token";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_pro: boolean;
  created_at: string;
}

let _cachedUser: User | null = null;

// ── Retry helper ──────────────────────────────────────────────────────
// Handles Render cold starts — backend takes up to 30s to wake up.
// Retries on network errors only, not on 4xx/5xx responses.

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError &&
        (err.message.toLowerCase().includes("fetch") ||
          err.message.toLowerCase().includes("network") ||
          err.message.toLowerCase().includes("failed"));

      if (isNetworkError && attempt < retries) {
        const wait = attempt * 2000; // 2s then 4s
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Request failed after retries");
}

// ── Token helpers ─────────────────────────────────────────────────────

function storeToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  Cookies.set(TOKEN_KEY, token, {
    expires: 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  Cookies.remove(TOKEN_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

// ── signup ────────────────────────────────────────────────────────────

export async function signup(
  email: string,
  password: string,
  fullName: string
): Promise<void> {
  const res = await fetchWithRetry(`${API}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Signup failed" }));
    throw new Error(err.detail || "Signup failed");
  }

  const data = await res.json();
  const token = data.access_token;

  if (token) {
    storeToken(token);
    _cachedUser = data.user ?? null;
    emitAuthEvent(AUTH_EVENTS.LOGIN);
  } else {
    await login(email, password);
  }
}

// ── login ─────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<{ access_token: string }> {
  const res = await fetchWithRetry(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error("Invalid email or password");
  }

  const data = await res.json();
  storeToken(data.access_token);
  _cachedUser = null;
  emitAuthEvent(AUTH_EVENTS.LOGIN);

  return data;
}

// ── logout ────────────────────────────────────────────────────────────

export function logout(): void {
  clearToken();
  _cachedUser = null;
  emitAuthEvent(AUTH_EVENTS.LOGOUT);
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

// ── getCurrentUser ────────────────────────────────────────────────────

export async function getCurrentUser(forceRefresh = false): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  if (_cachedUser && !forceRefresh) return _cachedUser;

  try {
    const res = await fetchWithRetry(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) clearToken();
      return null;
    }

    _cachedUser = await res.json();
    return _cachedUser;
  } catch {
    return null;
  }
}