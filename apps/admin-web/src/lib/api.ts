import { CLOUD_API_BASE, LOCAL_API_BASE } from './config';

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

/**
 * 後台 API 呼叫封裝。
 * access token 建議存於記憶體/HttpOnly cookie（勿存 localStorage 以降低 XSS 風險）。
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.message
      ? Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message
      : `API ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}
