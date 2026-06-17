import { COLORS } from '../constants/colors';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

// EAS project id is required by getExpoPushTokenAsync() on standalone/EAS
// builds (it throws "No projectId found" without it). `eas init` writes this
// into app.json's extra.eas.projectId; we read it at runtime and pass it
// through. In Expo Go / dev it can be absent, so we only pass it when present.
const projectId =
  Constants?.expoConfig?.extra?.eas?.projectId ??
  Constants?.easConfig?.projectId ??
  undefined;

const pushTokenOptions = projectId ? { projectId } : undefined;

// Default foreground-handling: show alert + play sound even when the app is
// in the foreground. Without this, Expo silently swallows pushes that
// arrive while the user is actively using the app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register the device for push notifications and ship the resulting Expo
// push token to the backend (POST /api/user/push-token). Returns the token
// string, or null if the user denied permission or runs on a simulator.
export async function registerForPushNotificationsAsync() {
  // Push only works on real devices. Simulators / emulators silently
  // return no token — guarding here keeps the dev experience quiet.
  if (!Device.isDevice) return null;

  try {
    // Android needs an explicit notification channel for the foreground/
    // banner UX to look right. iOS does this implicitly.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: COLORS.primary,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const tokenResp = await Notifications.getExpoPushTokenAsync(pushTokenOptions);
    const token = tokenResp?.data;
    if (!token) return null;

    // Send to backend — best-effort. AuthContext calls this right after
    // sign-in and the response interceptor adds the auth header.
    try {
      await api.post('/user/push-token', { token });
    } catch (err) {
      // Common case: user not authenticated yet (we're called before login
      // completes). The retry on next sign-in will register the token.
      if (err?.response?.status !== 401) {
        console.warn('[push] register failed:', err.message);
      }
    }
    return token;
  } catch (err) {
    console.warn('[push] registration failed:', err.message);
    return null;
  }
}

// Tell the backend to forget this device — called on logout so logging in
// as a different user on the same device doesn't leak notifications.
export async function unregisterPushToken() {
  try {
    if (!Device.isDevice) return;
    const tokenResp = await Notifications.getExpoPushTokenAsync(pushTokenOptions).catch(() => null);
    const token = tokenResp?.data;
    if (!token) return;
    await api.delete('/user/push-token', { data: { token } });
  } catch {
    // Silent — failure here is non-blocking.
  }
}

// Wire deep-linking from tapped push notifications to in-app navigation.
// Returns a Subscription that should be removed on unmount.
export function onNotificationTap(handler) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data = response?.notification?.request?.content?.data || {};
      handler(data);
    } catch {
      // ignore — malformed payload
    }
  });
}
