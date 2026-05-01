import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: '1',
    title: 'Smart itineraries, instantly',
    body: 'Tell us your destination and budget — AI builds your day-by-day plan.',
    icon: 'analytics-outline'
  },
  {
    key: '2',
    title: 'Book trusted local drivers',
    body: 'Browse verified drivers, compare vehicles, and confirm with one tap.',
    icon: 'car-sport-outline'
  },
  {
    key: '3',
    title: 'Explore Sri Lanka and beyond',
    body: 'AI recommends places, routes, budgets, and day-by-day plans.',
    icon: 'map-outline'
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  // PanResponder logic for swiping
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          // Swipe Right (Previous)
          handlePrev();
        } else if (gestureState.dx < -50) {
          // Swipe Left (Next)
          handleNext();
        }
      },
    })
  ).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const currentSlide = slides[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]} {...panResponder.panHandlers}>
      {/* Dot Indicators */}
      <View style={styles.indicatorContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index
                ? { width: 32, backgroundColor: theme.primary }
                : { width: 6, backgroundColor: theme.bgMuted },
            ]}
          />
        ))}
      </View>

      {/* Illustration Area */}
      <View style={styles.illustrationContainer}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name={currentSlide.icon} size={80} color={theme.primary} />
        </View>
      </View>

      {/* Text Area */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{currentSlide.title}</Text>
        <Text style={[styles.body, { color: theme.textSecond }]}>{currentSlide.body}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {currentIndex === slides.length - 1 ? (
          <View style={styles.actionCenter}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/auth/register')}
            >
              <Text style={styles.buttonText}>Get started</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.loginLinkContainer}>
              <Text style={[styles.loginText, { color: theme.textSecond }]}>
                Already have an account? <Text style={{ color: theme.primary, fontWeight: '500' }}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionCenter}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleNext}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCurrentIndex(slides.length - 1)} style={styles.skipMargin}>
              <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 40, justifyContent: 'space-between' },
  indicatorContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  dot: { height: 6, borderRadius: 3, marginHorizontal: 4 },
  illustrationContainer: { height: 200, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  iconCircle: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
  textContainer: { alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  buttonContainer: { height: 100, justifyContent: 'center' },
  actionCenter: { width: '100%', alignItems: 'center' },
  primaryButton: { width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  loginLinkContainer: { padding: 8 },
  loginText: { fontSize: 13 },
  skipMargin: { padding: 8 },
  skipText: { fontSize: 15, fontWeight: '500' },
});
