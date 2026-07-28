import { tokenStore } from './secure-store';
import { getApiBase } from './api-base';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Tokens = { accessToken: string; refreshToken: string };

/**
 * API 呼叫封裝：自動帶入 access token，401 時嘗試以 refresh token 換發。
 * skipAuth=true 時不帶 token（登入／註冊用）。
 */
export async function api<T>(
  path: string,
  options: RequestInit = {},
  skipAuth = false,
): Promise<T> {
  const accessToken = skipAuth ? null : await tokenStore.getAccess();
  const apiBase = await getApiBase();
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !skipAuth) {
    const refreshed = await tryRefresh();
    if (refreshed) return api<T>(path, options, false);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && data !== null && 'message' in data
        ? Array.isArray((data as { message: unknown }).message)
          ? ((data as { message: string[] }).message).join(', ')
          : String((data as { message: unknown }).message)
        : `API ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) return false;
  try {
    const data = await api<Tokens>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      true,
    );
    await tokenStore.save(data.accessToken, data.refreshToken);
    return true;
  } catch {
    await tokenStore.clear();
    return false;
  }
}

export async function loginRequest(email: string, password: string) {
  const data = await api<Tokens>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    true,
  );
  await tokenStore.save(data.accessToken, data.refreshToken);
  return data;
}

export async function registerRequest(
  email: string,
  password: string,
  displayName: string,
) {
  const data = await api<Tokens>(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    },
    true,
  );
  await tokenStore.save(data.accessToken, data.refreshToken);
  return data;
}

export async function logoutRequest() {
  const refreshToken = await tokenStore.getRefresh();
  if (refreshToken) {
    try {
      await api(
        '/auth/logout',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
        true,
      );
    } catch {
      // 即使撤銷失敗仍清本地
    }
  }
  await tokenStore.clear();
}

export { getApiBase };
