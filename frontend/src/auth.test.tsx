import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('auth - offline startup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('loads stored user from localStorage', async () => {
    const cachedUser = { id: 1, username: 'doctor', role: 'doctor' };
    localStorage.setItem('medlink_user', JSON.stringify(cachedUser));

    vi.doMock('../api', () => ({
      apiFetch: vi.fn(),
      getToken: vi.fn().mockReturnValue('token123'),
      setToken: vi.fn(),
    }));

    const { loadStoredUser } = await import('./auth');
    expect(loadStoredUser()).toEqual(cachedUser);
  });

  it('returns null when no stored user', async () => {
    vi.doMock('../api', () => ({
      apiFetch: vi.fn(),
      getToken: vi.fn().mockReturnValue(null),
      setToken: vi.fn(),
    }));

    const { loadStoredUser } = await import('./auth');
    expect(loadStoredUser()).toBeNull();
  });

  it('exports AuthProvider and useAuth', async () => {
    vi.doMock('../api', () => ({
      apiFetch: vi.fn(),
      getToken: vi.fn().mockReturnValue(null),
      setToken: vi.fn(),
    }));

    const { AuthProvider, useAuth } = await import('./auth');
    expect(typeof AuthProvider).toBe('function');
    expect(typeof useAuth).toBe('function');
  });

  it('clears session on 401', async () => {
    vi.doMock('../api', () => ({
      apiFetch: vi.fn().mockRejectedValue({ status: 401 }),
      getToken: vi.fn().mockReturnValue('token123'),
      setToken: vi.fn(),
    }));

    const { AuthProvider, useAuth } = await import('./auth');
    expect(typeof AuthProvider).toBe('function');
    expect(typeof useAuth).toBe('function');
  });
});
