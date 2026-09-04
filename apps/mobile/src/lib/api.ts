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

/** 雲端免費方案喚醒較慢；逾時後讓畫面可重試，避免一直轉圈 */
const DEFAULT_TIMEOUT_MS = 35_000;

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
  const controller = new AbortController();
  const userSignal = options.signal;
  const onAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else userSignal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } catch (e) {
    const aborted =
      (e instanceof Error && e.name === 'AbortError') ||
      controller.signal.aborted;
    if (aborted) {
      throw new ApiError(
        0,
        '連線逾時。雲端伺服器可能正在喚醒，請稍候約 1 分鐘後再下拉重試。',
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
    if (userSignal) userSignal.removeEventListener('abort', onAbort);
  }

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

export async function loginRequest(account: string, password: string) {
  const data = await api<Tokens>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ account, password }) },
    true,
  );
  await tokenStore.save(data.accessToken, data.refreshToken);
  return data;
}

export async function registerRequest(
  account: string,
  password: string,
  phone: string,
) {
  const data = await api<Tokens>(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ account, password, phone }),
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
