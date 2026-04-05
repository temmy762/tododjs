import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '../services/apiFetch';

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('adds Authorization header when token exists', async () => {
    localStorage.setItem('token', 'my-token');
    global.fetch = vi.fn().mockResolvedValue({ status: 200, json: () => ({ success: true }) });

    await apiFetch('/api/test');

    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
    }));
  });

  it('does not add Authorization header when no token', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200, json: () => ({ success: true }) });

    await apiFetch('/api/test');

    const [, calledOptions] = global.fetch.mock.calls[0];
    expect(calledOptions?.headers?.Authorization).toBeUndefined();
  });

  it('returns the fetch response on success', async () => {
    localStorage.setItem('token', 'my-token');
    const mockResponse = { status: 200, json: () => ({ success: true }) };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await apiFetch('/api/data');
    expect(result).toBe(mockResponse);
  });
});
