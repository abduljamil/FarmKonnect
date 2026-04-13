import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function AnimatedBlobs() {
  // Use React Native's built-in Animated API to avoid heavy dependencies and keep it lightweight on mobile loads
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animValue, duration) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true, // Crucial step: Pushes animation calculation to native thread (prevents JS thread lag)
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Smooth, slow drifting effect
    createAnimation(anim1, 15000).start();
    createAnimation(anim2, 18000).start();
  }, [anim1, anim2]);

  // Blob 1 Interpolations (Top Left)
  const transY1 = anim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });
  const transX1 = anim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });
  const scale1 = anim1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.5, 1.7, 1.5],
  });

  // Blob 2 Interpolations (Bottom Right)
  const transY2 = anim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60],
  });
  const transX2 = anim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -40],
  });
  const scale2 = anim2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.5, 1.8, 1.5],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View 
        style={[
          styles.blobLeft, 
          { transform: [{ translateX: transX1 }, { translateY: transY1 }, { scale: scale1 }] }
        ]} 
      />
      <Animated.View 
        style={[
          styles.blobRight, 
          { transform: [{ translateX: transX2 }, { translateY: transY2 }, { scale: scale2 }] }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blobLeft: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  },
  blobRight: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  },
});