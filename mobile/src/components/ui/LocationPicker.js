import { COLORS } from '../../constants/colors';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MapPin, Navigation, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

// Map-free location picker. The web version uses Leaflet (react-leaflet),
// which has no React Native equivalent without a custom dev build
// (react-native-maps requires native modules outside Expo Go). This picker
// gets the same data — a `{ address, latitude, longitude }` object — by:
//
//   1. Letting the user type a free-text address (default behavior), OR
//   2. Tapping "Use current location" → expo-location → reverse-geocode to
//      a human-readable address.
//
// Both flows produce identical payload shape to the web's MapLocationPicker,
// so the rest of the listing/transaction backend works unchanged.

export default function LocationPicker({ value, onChange, label = 'Location', placeholder = 'e.g. Multan, Punjab' }) {
  const { t } = useTranslation();
  const [resolving, setResolving] = useState(false);
  const text = value?.address || (typeof value === 'string' ? value : '');

  const handleUseCurrent = async () => {
    setResolving(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(t('mobile.alerts.permissionDenied'), t('mobile.alerts.locationPermission'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const first = geo?.[0];
        if (first) {
          address = [first.name, first.street, first.city, first.subregion, first.region, first.country]
            .filter(Boolean)
            .join(', ');
        }
      } catch { /* address fallback to coords */ }

      onChange?.({ address, latitude: lat, longitude: lng });
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('mobile.alerts.locationError'));
    } finally {
      setResolving(false);
    }
  };

  const handleClear = () => onChange?.({ address: '', latitude: null, longitude: null });

  const handleType = (v) => {
    // Preserve previously-set coords if the user only edits the text;
    // clear them if the address text changes substantially so we don't
    // ship stale lat/lng with a new address.
    if (value && value.address && v.startsWith(value.address.slice(0, 6))) {
      onChange?.({ ...value, address: v });
    } else {
      onChange?.({ address: v, latitude: null, longitude: null });
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <MapPin color={COLORS.primary} size={18} />
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleType}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textFaint}
        />
        {text ? (
          <TouchableOpacity onPress={handleClear}>
            <X color={COLORS.textFaint} size={18} />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity style={styles.useCurrentBtn} onPress={handleUseCurrent} disabled={resolving}>
        {resolving
          ? <ActivityIndicator color={COLORS.primary} />
          : (<><Navigation color={COLORS.primary} size={16} /><Text style={styles.useCurrentText}>Use my current location</Text></>)}
      </TouchableOpacity>
      {value?.latitude && value?.longitude ? (
        <Text style={styles.coordHint}>
          📍 {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.8)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, height: 50, color: COLORS.white, fontSize: 15 },
  useCurrentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(22, 163, 74, 0.1)', borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.3)' },
  useCurrentText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  coordHint: { color: COLORS.textFaint, fontSize: 11, marginTop: 6 },
});
