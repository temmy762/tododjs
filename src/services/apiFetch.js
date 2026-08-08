import API_URL from '../config/api.js';

const AUTH_REFRESH_URL = `${API_URL}/auth/refresh`;

let isRefreshing = false;
let refreshPromise = null;

/**
 * Wrapper around fetch that auto-refreshes JWT on 401 responses.
 * Usage: import { apiFetch } from './apiFetch'; then use like fetch().
 */
// Device identity is persisted in BOTH localStorage and a long-lived cookie,
// and recovered from whichever survives.
//
// It used to live in localStorage alone. That gets wiped by ordinary browser
// cleanup ("clear site data", privacy/cleaner tools, storage eviction), and a
// wipe means the SAME computer comes back with a brand-new id, burns a second
// device slot, and the customer is locked out of an account they pay for —
// which is exactly what happened to one customer for five days. Cookies and
// localStorage are cleared by different actions, so keeping the id in both
// makes accidental loss far less likely.
const DEVICE_ID_KEY = 'deviceId';
const DEVICE_ID_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years

function readDeviceIdCookie() {
  const m = document.cookie.match(/(?:^|;\s*)deviceId=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function writeDeviceIdCookie(id) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${DEVICE_ID_KEY}=${encodeURIComponent(id)}; Max-Age=${DEVICE_ID_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

export function getDeviceId() {
  let id = null;
  try { id = localStorage.getItem(DEVICE_ID_KEY); } catch { /* storage blocked */ }
  if (!id) id = readDeviceIdCookie();          // localStorage wiped — recover from cookie
  if (!id) id = 'dev_' + crypto.randomUUID();  // genuinely new device

  // Always re-assert both copies so a half-cleared browser self-heals.
  try { localStorage.setItem(DEVICE_ID_KEY, id); } catch { /* storage blocked */ }
  writeDeviceIdCookie(id);
  return id;
}

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  // Inject auth + device headers on every request
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'x-device-id': getDeviceId(),
    };
  }

  let response = await fetch(url, options);

  // If 401 and we have a token, try refreshing
  if (response.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the original request with the new token
      const newToken = localStorage.getItem('token');
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      };
      response = await fetch(url, options);
    }
  }

  return response;
}

async function tryRefreshToken() {
  // Deduplicate concurrent refresh attempts
  if (isRefreshing) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(AUTH_REFRESH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        // Token is truly expired/invalid — force logout
        localStorage.removeItem('token');
        return false;
      }

      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        return true;
      }

      localStorage.removeItem('token');
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Schedule a proactive token refresh. Call once after login/app mount.
 * Refreshes the token every 6 hours to keep the session alive.
 */
let refreshInterval = null;

export function startTokenRefreshScheduler() {
  stopTokenRefreshScheduler();
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  refreshInterval = setInterval(() => {
    const token = localStorage.getItem('token');
    if (token) {
      tryRefreshToken();
    } else {
      stopTokenRefreshScheduler();
    }
  }, SIX_HOURS);
}

export function stopTokenRefreshScheduler() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}
