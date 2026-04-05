import API_URL from '../config/api.js';

const AUTH_REFRESH_URL = `${API_URL}/auth/refresh`;

let isRefreshing = false;
let refreshPromise = null;

/**
 * Wrapper around fetch that auto-refreshes JWT on 401 responses.
 * Usage: import { apiFetch } from './apiFetch'; then use like fetch().
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  // Inject auth header if we have a token
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
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
