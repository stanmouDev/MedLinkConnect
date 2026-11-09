export const API_BASE =
  (import.meta.env.VITE_API_BASE as string) ||
  (import.meta.env.PROD
    ? 'https://medlink-connect-api.onrender.com/api'
    : 'http://localhost:8000/api');

export type User = {
  id: number;
  username: string;
  role: string;
  hospital?: number;
};

export function getToken(): string | null {
  return localStorage.getItem('medlink_token');
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem('medlink_token', token);
  else localStorage.removeItem('medlink_token');
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function ensureOnline(): void {
  if (!navigator.onLine) {
    throw new Error('You are currently offline. This action requires an internet connection and will be queued when you reconnect.');
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (!navigator.onLine) {
    throw new Error('Offline. Please check your connection.');
  }
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Token ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = JSON.stringify(data);
    } catch {
      detail = await res.text();
    }
    const err = new Error(detail || `Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => apiFetch('/auth/me/'),
  list: (resource: string) => apiFetch(`/${resource}/`),
  get: (resource: string, id: string | number) =>
    apiFetch(`/${resource}/${id}/`),
  create: (resource: string, data: unknown) =>
    apiFetch(`/${resource}/`, { method: 'POST', body: JSON.stringify(data) }),
  update: (resource: string, id: string | number, data: unknown) =>
    apiFetch(`/${resource}/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  post: (resource: string, id: string | number | undefined, data: unknown) =>
    apiFetch(`/${resource}${id ? `/${id}/` : '/'}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  remove: (resource: string, id: string | number) =>
    apiFetch(`/${resource}/${id}/`, { method: 'DELETE' }),
};
