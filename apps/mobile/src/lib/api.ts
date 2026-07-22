import Constants from 'expo-constants';
import { tokenStore } from './secure-store';

const API_BASE =
  (Constants.expoConfig?.extra?.apiBase as string) ??
  'http://localhost:3000/api';

/**
 * API 呼叫封裝：自動帶入 access token，401 時嘗試以 refresh token 換發。
 * 所有連線強制 HTTPS（正式環境，§四.2）。
 */
export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const accessToken = await tokenStore.getAccess();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return api<T>(path, options, false);
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) return false;
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await tokenStore.clear();
    return false;
  }
  const data = await res.json();
  await tokenStore.save(data.accessToken, data.refreshToken);
  return true;
}
