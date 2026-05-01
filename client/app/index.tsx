import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Loading bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false, // width animation doesn't support native driver easily here without transforms
    }).start();

    // Navigate to onboarding after 2.5 seconds
    const timer = setTimeout(() => {
      router.replace('/auth/onboarding');
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            backgroundColor: theme.primaryLight,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Ionicons name="compass" size={40} color={theme.primary} />
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim, alignItems: 'center', marginTop: 24 }}>
        <Text style={[styles.appName, { color: theme.textPrimary }]}>WanderWay</Text>
        <Text style={[styles.tagline, { color: theme.textSecond }]}>AI plans it. You live it.</Text>
      </Animated.View>

      <View style={styles.loadingContainer}>
        <Animated.View
          style={[styles.loadingBar, { backgroundColor: theme.primary, width: progressWidth }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontFamily: 'Inter-SemiBold', // Fallback to basic text weight below if font not loaded
    fontSize: 28,
    fontWeight: '600',
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    marginTop: 8,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 50,
    width: width * 0.6,
    height: 4,
    backgroundColor: '#E2E8F0', // Will fix to theme in render if needed, but per spec light grey
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
  },
});
