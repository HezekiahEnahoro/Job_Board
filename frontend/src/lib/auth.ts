// lib/auth.ts
import { AUTH_EVENTS, emitAuthEvent } from './authEvents';
import Cookies from 'js-cookie'; // npm install js-cookie @types/js-cookie

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "token";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_pro: boolean;
  created_at: string;
}

// ── In-memory user cache ──────────────────────────────────────────────
// Avoids re-fetching /auth/me on every nav render.
// Cleared on logout.
let _cachedUser: User | null = null;

// ── Token helpers ─────────────────────────────────────────────────────

function storeToken(token: string) {
  if (typeof window === "undefined") return;

  // localStorage  — for API client / existing code
  localStorage.setItem(TOKEN_KEY, token);

  // Cookie — required for Next.js middleware (edge can't read localStorage)
  // This is what makes the "logged-in user → dashboard" redirect work.
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
// FIX: was calling login() internally, then AuthForm called login() again
// = 3 sequential API calls (signup → login → login).
// Now: signup returns the token directly. One call. Done.

export async function signup(
  email: string,
  password: string,
  fullName: string
): Promise<void> {
  const res = await fetch(`${API}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Signup failed" }));
    throw new Error(err.detail || "Signup failed");
  }

  const data = await res.json();

  // Backend should return { access_token, ... } on signup.
  // If yours currently returns just the user object, update it to also
  // return access_token — avoids the extra login round trip entirely.
  const token = data.access_token;

  if (token) {
    // Token returned directly — no need to call login() at all
    storeToken(token);
    _cachedUser = data.user ?? null;
    emitAuthEvent(AUTH_EVENTS.LOGIN);
  } else {
    // Fallback: backend doesn't return token on signup yet
    // Single login call (not double like before)
    await login(email, password);
  }
}

// ── login ─────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<{ access_token: string }> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error("Invalid email or password");
  }

  const data = await res.json();

  storeToken(data.access_token);
  _cachedUser = null; // will be fetched fresh on next getCurrentUser() call
  emitAuthEvent(AUTH_EVENTS.LOGIN);

  return data;
}

// ── logout ────────────────────────────────────────────────────────────

export function logout(): void {
  clearToken();
  _cachedUser = null;
  emitAuthEvent(AUTH_EVENTS.LOGOUT);
  // FIX: was using window.location.href which causes full reload.
  // Replaced with a custom event — let the component handle navigation.
  // If you need hard redirect, keep window.location.href = "/";
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

// ── getCurrentUser ────────────────────────────────────────────────────
// FIX: added in-memory cache so navbar/layout re-renders don't each
// fire a separate GET /auth/me request.

export async function getCurrentUser(forceRefresh = false): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  // Return cached user unless explicitly refreshed
  if (_cachedUser && !forceRefresh) return _cachedUser;

  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      // Remove no-cache headers — they were causing revalidation on
      // every single call and adding latency. Cache at the fetch layer.
      // next: { revalidate: 30 }, // Next.js fetch cache: refresh every 30s
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