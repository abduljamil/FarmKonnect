import { COLORS } from '../../constants/colors';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const BRAND_EMOJI = '🌾';

/**
 * Floating action button for Kisan AI. Clean circular button — no pulsing ring
 * or green glow, so it never leaves a halo on the UI. Tap → KisanScreen.
 * Auto-hides on scroll via the `animatedStyle` passed by the host screen.
 *
 * Drop into any screen INSIDE the SafeAreaView, after the ScrollView.
 */
export default function KisanFAB({ bottom = 90, animatedStyle }) {
  const navigation = useNavigation();

  return (
    <Animated.View style={[styles.wrap, { bottom }, animatedStyle]} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('KisanScreen')}
        style={styles.button}
      >
        <Text style={styles.emoji}>{BRAND_EMOJI}</Text>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 18 },
  button: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle neutral drop shadow — deliberately NOT a green glow.
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  emoji: { fontSize: 26, lineHeight: 30 },
  aiBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#a855f7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },
  aiBadgeText: {
    color: COLORS.white,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
