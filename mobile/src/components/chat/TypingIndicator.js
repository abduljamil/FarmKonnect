import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

const Dot = ({ delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0,  duration: 300, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{ transform: [{ translateY: anim }] }}
      className="w-2 h-2 bg-gray-400 rounded-full mx-1"
    />
  );
};

const TypingIndicator = () => (
  <View className="flex-row justify-start mb-3">
    <View className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-sm flex-row items-center">
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  </View>
);

export default TypingIndicator;