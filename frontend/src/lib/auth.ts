import { AUTH_EVENTS, emitAuthEvent } from './authEvents';

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_pro: boolean;
  created_at: string;
}

export async function signup(email: string, password: string, fullName: string): Promise<User> {
  const res = await fetch(`${API}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Signup failed" }));
    throw new Error(err.detail || "Signup failed");
  }
  
  const user = await res.json();
  
  // Auto-login after signup
  await login(email, password);
  
  return user;
}

export async function login(email: string, password: string): Promise<{ access_token: string }> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    throw new Error("Invalid email or password");
  }
  
  const data = await res.json();
  
  // Store token in localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem("token", data.access_token);
    
    // Emit login event to update navbar
    emitAuthEvent(AUTH_EVENTS.LOGIN);
  }
  
  return data;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    
    // Emit logout event
    emitAuthEvent(AUTH_EVENTS.LOGOUT);
    
    window.location.href = "/";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',  // ✅ FORCE FRESH DATA
        'Pragma': 'no-cache'           // ✅ FORCE FRESH DATA
      },
    });
    
    if (!res.ok) {
      // Don't auto-logout on error, just return null
      if (res.status === 401) {
        localStorage.removeItem("token");
      }
      return null;
    }
    
    const user = await res.json();
    
    // Debug log
    console.log('👤 Current user:', user);
    console.log('💎 Is Pro:', user.is_pro);
    
    return user;
  } catch (err) {
    console.error('❌ Error fetching user:', err);
    return null;
  }
}