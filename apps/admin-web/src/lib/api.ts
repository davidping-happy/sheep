import { CLOUD_API_BASE, LOCAL_API_BASE } from './config';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setSession,
} from './session';

/**
 * 後台預設連雲端 API；本機改打本地後端時在 .env.local 設：
 * NEXT_PUBLIC_API_BASE=http://localhost:3000/api
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? CLOUD_API_BASE;

export { CLOUD_API_BASE, LOCAL_API_BASE };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseErrorMessage(data: unknown, status: number): string {
  const raw = (data as { message?: string | string[] } | null)?.message;
  const message = raw
    ? Array.isArray(raw)
      ? raw.join(', ')
      : raw
    : `API ${status}`;
  if (status === 401) {
    return message === 'Unauthorized'
      ? '登入已過期，請重新登入後再試'
      : message;
  }
  return message;
}

async function rawFetch(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<Response> {
  const { token, headers, ...rest } = options;
  // 優先用 session（refresh 後會更新），避免各頁面 state 仍是舊 access token
  const auth = getAccessToken() ?? token;
  return fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...headers,
    },
  });
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) {
      clearSession();
      return false;
    }
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    setSession(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

/**
 * 後台 API 呼叫：401 時自動用 refresh token 換發後重試一次。
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; skipAuthRetry?: boolean } = {},
): Promise<T> {
  const { skipAuthRetry, ...rest } = options;
  let res = await rawFetch(path, rest);
  if (res.status === 401 && !skipAuthRetry && !path.startsWith('/auth/')) {
    const ok = await tryRefresh();
    if (ok) res = await rawFetch(path, { ...rest, token: getAccessToken() ?? undefined });
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new ApiError(res.status, parseErrorMessage(data, res.status));
  }
  return data as T;
}
