import * as SecureStore from 'expo-secure-store';

/**
 * 裝置端敏感資料儲存 (§四.1 STORAGE)。
 * 使用 iOS Keychain / Android Keystore（expo-secure-store 封裝），
 * 不將 token 寫入一般儲存或 log。
 */
const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

export const tokenStore = {
  async save(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync(ACCESS, accessToken);
    await SecureStore.setItemAsync(REFRESH, refreshToken);
  },
  getAccess: () => SecureStore.getItemAsync(ACCESS),
  getRefresh: () => SecureStore.getItemAsync(REFRESH),
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
