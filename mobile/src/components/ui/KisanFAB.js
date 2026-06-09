import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const BRAND_EMOJI = '🌾';

/**
 * Floating action button for Kisan AI. Sits above tab bar, pulses gently to
 * draw attention. Tap → navigates to KisanScreen (registered in the protected
 * stack inside AppNavigator).
 *
 * Drop into any screen INSIDE the SafeAreaView, after the ScrollView, so it
 * floats above the scroll content.
 */
export default function KisanFAB({ bottom = 90 }) {
  const navigation = useNavigation();
  const pulse = useRef(new Animated.Value(0)).current;
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, [pulse]);

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.ring,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16a34a',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  emoji: { fontSize: 28, lineHeight: 32 },
  aiBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#a855f7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#0f1a12',
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
