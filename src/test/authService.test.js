import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../services/authService';

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('isAuthenticated returns false when no token', () => {
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true when token exists', () => {
    localStorage.setItem('token', 'test-token');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('getToken returns stored token', () => {
    localStorage.setItem('token', 'abc123');
    expect(authService.getToken()).toBe('abc123');
  });

  it('getToken returns null when no token', () => {
    expect(authService.getToken()).toBeNull();
  });

  it('getCurrentUser returns null when no token', async () => {
    const user = await authService.getCurrentUser();
    expect(user).toBeNull();
  });

  it('logout clears token from localStorage', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('rememberMe', 'true');

    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ success: true }) });

    await authService.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('rememberMe')).toBeNull();
  });
});
