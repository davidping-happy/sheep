import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * 裝置端敏感資料儲存 (§四.1 STORAGE)。
 * - 真機／模擬器：iOS Keychain / Android Keystore
 * - 網頁預覽（expo web）：SecureStore 不可用，改用記憶體（僅開發用）
 */
const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

const memory: Record<string, string | null> = {
  [ACCESS]: null,
  [REFRESH]: null,
};

async function canUseSecureStore() {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export const tokenStore = {
  async save(accessToken: string, refreshToken: string) {
    if (await canUseSecureStore()) {
      await SecureStore.setItemAsync(ACCESS, accessToken);
      await SecureStore.setItemAsync(REFRESH, refreshToken);
      return;
    }
    memory[ACCESS] = accessToken;
    memory[REFRESH] = refreshToken;
  },
  async getAccess() {
    if (await canUseSecureStore()) {
      return SecureStore.getItemAsync(ACCESS);
    }
    return memory[ACCESS];
  },
  async getRefresh() {
    if (await canUseSecureStore()) {
      return SecureStore.getItemAsync(REFRESH);
    }
    return memory[REFRESH];
  },
  async clear() {
    if (await canUseSecureStore()) {
      await SecureStore.deleteItemAsync(ACCESS);
      await SecureStore.deleteItemAsync(REFRESH);
      return;
    }
    memory[ACCESS] = null;
    memory[REFRESH] = null;
  },
};
