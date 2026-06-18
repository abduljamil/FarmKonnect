import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import { navigationRef, navigateFromPush } from './src/navigation/navigationRef';
import i18n from './src/i18n';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import ConnectionStatus from './src/components/ui/ConnectionStatus';
import ErrorBoundary from './src/components/ui/ErrorBoundary';
import NotificationToast from './src/components/ui/NotificationToast';
import { onNotificationTap } from './src/services/pushNotifications';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';

export default function App() {
  // Wire push-notification taps → in-app navigation. When the user taps a
  // notification (e.g. "New order: ..."), we route them to the right screen
  // based on the `data.type` payload set in backend/services/pushService.js.
  const subRef = useRef(null);
  useEffect(() => {
    subRef.current = onNotificationTap((data) => navigateFromPush(data));
    return () => { try { subRef.current?.remove?.(); } catch {} };
  }, []);

  // Eagerly check for OTA updates on startup instead of waiting for next launch
  useEffect(() => {
    async function onFetchUpdateAsync() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log(`Error fetching latest Expo update: ${error}`);
      }
    }
    onFetchUpdateAsync();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <SocketProvider>
            <StatusBar style="auto" />
            <View style={{ flex: 1 }}>
              <ConnectionStatus />
              <AppNavigator navigationRef={navigationRef} />
              <NotificationToast />
            </View>
          </SocketProvider>
        </AuthProvider>
      </I18nextProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
