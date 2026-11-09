import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, apiFetch, getToken, setToken, type User } from './api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('medlink_user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: User | null): void {
  if (user) {
    localStorage.setItem('medlink_user', JSON.stringify(user));
    localStorage.setItem('medlink_user_id', String(user.id));
    localStorage.setItem('medlink_user_role', user.role);
  } else {
    localStorage.removeItem('medlink_user');
    localStorage.removeItem('medlink_user_id');
    localStorage.removeItem('medlink_user_role');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    const cached = loadStoredUser();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      setUser(cached);
      setLoading(false);
      return;
    }
    apiFetch('/auth/me/')
      .then((data: User) => {
        setUser(data);
        storeUser(data);
      })
      .catch((err: { status?: number }) => {
        if (err && err.status === 401) {
          setToken(null);
          setTokenState(null);
          setUser(null);
          storeUser(null);
        } else {
          setUser(cached);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      const stored = getToken();
      if (!stored) return;
      apiFetch('/auth/me/')
        .then((data: User) => {
          setUser(data);
          storeUser(data);
        })
        .catch((err: { status?: number }) => {
          if (err && err.status === 401) {
            setToken(null);
            setTokenState(null);
            setUser(null);
            storeUser(null);
          }
        });
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  async function login(username: string, password: string) {
    const data = (await api.login(username, password)) as {
      token: string;
      user: User;
    };
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    storeUser(data.user);
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setUser(null);
    storeUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
