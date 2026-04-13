import React from 'react';
import './src/i18n'; // Import i18n
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </SocketProvider>
    </AuthProvider>
  );
}
