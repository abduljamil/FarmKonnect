import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { setOnConnectionChange } from '../../services/api';

// Persistent offline banner — mirrors web's components/ConnectionStatus.jsx.
// Renders nothing while online; shows a red strip when an API call fails
// with no response (network error). Uses the axios interceptor hook in
// services/api.js so we don't need @react-native-community/netinfo (which
// would require a native rebuild outside Expo Go).
export default function ConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnConnectionChange(setOnline);
    return () => setOnConnectionChange(null);
  }, []);

  if (online) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#dc2626',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
