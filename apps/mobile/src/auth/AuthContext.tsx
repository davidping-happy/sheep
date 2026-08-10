import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { tokenStore } from '../lib/secure-store';
import {
  loginRequest,
  logoutRequest,
  registerRequest,
} from '../lib/api';

interface AuthState {
  ready: boolean;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    tokenStore.getAccess().then((t) => {
      setSignedIn(!!t);
      setReady(true);
    });
    // refresh 失敗清 token 時同步登出，避免畫面以為已登入卻一直 Unauthorized
    return tokenStore.onChange(setSignedIn);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await loginRequest(email, password);
    setSignedIn(true);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      await registerRequest(email, password, displayName);
      setSignedIn(true);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await logoutRequest();
    setSignedIn(false);
  }, []);

  const value = useMemo(
    () => ({ ready, signedIn, signIn, signOut, register }),
    [ready, signedIn, signIn, signOut, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必須在 AuthProvider 內使用');
  return ctx;
}
