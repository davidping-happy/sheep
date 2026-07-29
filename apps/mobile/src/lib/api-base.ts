import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * API 位址解析順序：
 * 1. App 內「伺服器連線設定」手動填入（打包後仍可改，不必重新建置 APK）
 * 2. 建置時的 EXPO_PUBLIC_API_BASE（eas.json / .env）
 * 3. app.json 的 extra.apiBase
 * 網頁：有設 EXPO_PUBLIC_API_BASE 時優先用（給 iPhone Safari 對外測試）；
 * 未設定時才用 localhost，避免本機預覽踩到區網 IP。
 */
const OVERRIDE_KEY = 'api_base_override';

let cached: string | null = null;
let memoryOverride: string | null = null;

function buildTimeBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE;
  if (fromEnv) return fromEnv;
  if (Platform.OS === 'web') return 'http://localhost:3000/api';
  return (
    (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
    'http://localhost:3000/api'
  );
}

/** 容錯：允許只貼網域，自動補上 https 與 /api */
export function normalizeApiBase(raw: string): string {
  let value = raw.trim().replace(/\s+/g, '').replace(/\/+$/, '');
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  if (!/\/api$/i.test(value)) value = `${value}/api`;
  return value;
}

async function secureStoreUsable() {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function readOverride(): Promise<string | null> {
  if (await secureStoreUsable()) {
    try {
      return await SecureStore.getItemAsync(OVERRIDE_KEY);
    } catch {
      return null;
    }
  }
  return memoryOverride;
}

export async function getApiBase(): Promise<string> {
  if (cached) return cached;
  const override = await readOverride();
  cached = override ?? buildTimeBase();
  return cached;
}

export async function setApiBase(raw: string): Promise<string> {
  const value = normalizeApiBase(raw);
  if (!value) throw new Error('請輸入伺服器網址');
  if (await secureStoreUsable()) {
    await SecureStore.setItemAsync(OVERRIDE_KEY, value);
  } else {
    memoryOverride = value;
  }
  cached = value;
  return value;
}

export async function resetApiBase(): Promise<string> {
  if (await secureStoreUsable()) {
    await SecureStore.deleteItemAsync(OVERRIDE_KEY);
  } else {
    memoryOverride = null;
  }
  cached = buildTimeBase();
  return cached;
}

export function getDefaultApiBase(): string {
  return buildTimeBase();
}

/** 連線測試：確認網址打得到 API */
export async function pingApiBase(base: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/livestream/latest`, {
      signal: controller.signal,
    });
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
