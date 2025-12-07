// Auth event system
export const AUTH_EVENTS = {
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
} as const;

export function emitAuthEvent(event: typeof AUTH_EVENTS[keyof typeof AUTH_EVENTS]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event));
  }
}

export function onAuthEvent(
  event: typeof AUTH_EVENTS[keyof typeof AUTH_EVENTS],
  callback: () => void
) {
  if (typeof window === 'undefined') return () => {};
  
  window.addEventListener(event, callback);
  return () => window.removeEventListener(event, callback);
}