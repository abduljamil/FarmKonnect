import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, StatusBar, TouchableOpacity } from 'react-native';
import { ChevronUp } from 'lucide-react-native';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -100) {
          Animated.timing(translateY, {
            toValue: -height,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            navigation.replace('SignIn');
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 20,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <AnimatedBlobs />
      
      <Animated.View
        style={[styles.container, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale }] }]}>
          <Text style={styles.logoEmoji}>🌾</Text>
          <Text style={styles.title}>FarmKonnect</Text>
          <Text style={styles.subtitle}>Empowering Agriculture Digitally</Text>
        </Animated.View>

        <TouchableOpacity style={{ paddingBottom: 40 }} onPress={() => navigation.replace('SignIn')}>
          <Animated.View style={[styles.swipeIndicator, { opacity: fadeAnim }]}>  
            <View style={styles.chevronGroup}>
              <ChevronUp color="rgba(255,255,255,0.4)" fill="none" size={24} style={{ marginBottom: -10 }} />
              <ChevronUp color="rgba(255,255,255,0.7)" fill="none" size={28} style={{ marginBottom: -10 }} />
              <ChevronUp color="#16a34a" fill="none" size={32} />
            </View>
            <Text style={styles.swipeText}>Tap or Swipe up to begin</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1a12',
    overflow: 'hidden',
  },
  blobLeft: {
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    transform: [{ scale: 1.5 }],
  },
  blobRight: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    transform: [{ scale: 1.5 }],
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.15,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: 16,
    textShadowColor: 'rgba(22, 163, 74, 0.5)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#a3a3a3',
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  chevronGroup: {
    alignItems: 'center',
    marginBottom: 8,
  },
  swipeText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
