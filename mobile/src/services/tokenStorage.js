import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Centralised session-token storage. The JWT is a credential, so on native
// platforms it lives in the OS keychain/keystore via expo-secure-store rather
// than in plaintext AsyncStorage (which is readable via `adb backup` or on a
// rooted/jailbroken device). The non-sensitive `user` profile object stays in
// AsyncStorage and is handled by the callers — only the token moves here.
//
// expo-secure-store is unavailable on web, so we transparently fall back to
// AsyncStorage there (Expo's web target has no secure enclave anyway).
const TOKEN_KEY = 'token';
const useSecureStore = Platform.OS !== 'web';

export async function getToken() {
  try {
    if (!useSecureStore) {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
    const secure = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secure) return secure;

    // One-time migration: builds before the SecureStore switch stored the JWT
    // in AsyncStorage. Move any legacy copy into the keychain and scrub the
    // insecure one so the token only exists in one place going forward.
    const legacy = await AsyncStorage.getItem(TOKEN_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(TOKEN_KEY, legacy);
      await AsyncStorage.removeItem(TOKEN_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setToken(token) {
  try {
    if (!token) {
      await clearToken();
      return;
    }
    if (useSecureStore) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      // Defensive: make sure no stale plaintext copy survives a migration.
      await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    /* non-fatal — caller still updates in-memory + React state */
  }
}

export async function clearToken() {
  if (useSecureStore) {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch { /* non-fatal */ }
  }
  try { await AsyncStorage.removeItem(TOKEN_KEY); } catch { /* non-fatal */ }
}
