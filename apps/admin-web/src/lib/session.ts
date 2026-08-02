/** 後台記憶體 session（不分頁共享；關閉分頁即清除） */
let accessToken: string | null = null;
let refreshToken: string | null = null;
let onCleared: (() => void) | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setSession(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
}

export function clearSession() {
  accessToken = null;
  refreshToken = null;
  onCleared?.();
}

export function setOnSessionCleared(cb: (() => void) | null) {
  onCleared = cb;
}

export function getRefreshToken() {
  return refreshToken;
}
