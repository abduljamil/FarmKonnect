import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/i18n'; // Import i18n
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <SocketProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </SocketProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}
