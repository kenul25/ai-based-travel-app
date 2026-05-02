import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../services/api';

export default function DestinationDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDestination = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/destinations/${id}`);
      setDestination(response.data?.destination || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load destination.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchDestination();
    }, [fetchDestination])
  );

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={styles.centerText}>Loading destination...</Text>
      </View>
    );
  }

  if (error || !destination) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={34} color={theme.error} />
        <Text style={styles.errorTitle}>Destination unavailable</Text>
        <Text style={styles.centerText}>{error || 'This destination could not be found.'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={fetchDestination}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroWrap}>
          {destination.image ? <Image source={{ uri: destination.image }} style={styles.heroImage} /> : <View style={styles.heroFallback}><Ionicons name="image-outline" size={38} color={theme.textMuted} /></View>}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>{destination.location || 'Sri Lanka'}</Text>
              <Text style={styles.title}>{destination.name}</Text>
            </View>
            {destination.isFeatured ? (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={14} color={theme.amber} />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.categoryRow}>
            {(destination.categories || []).map((category) => <Text key={category} style={styles.category}>{category}</Text>)}
          </View>

          {destination.shortDescription ? <Text style={styles.summary}>{destination.shortDescription}</Text> : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this destination</Text>
            <Text style={styles.description}>{destination.description}</Text>
          </View>

          <TouchableOpacity style={styles.planButton} onPress={() => router.push({ pathname: '/traveler/plan-trip', params: { destination: destination.name } })}>
            <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
            <Text style={styles.planButtonText}>Plan a trip here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { paddingBottom: 30 },
  heroWrap: { height: 286, backgroundColor: theme.bgMuted },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgMuted },
  backButton: { position: 'absolute', top: 56, left: 16, width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.68)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleBlock: { flex: 1 },
  eyebrow: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 28, lineHeight: 34, fontWeight: '800', marginTop: 3 },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.amberLight, borderWidth: 1, borderColor: theme.amber, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  featuredText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  category: { color: theme.primaryDark, backgroundColor: theme.primaryLight, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  summary: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 15, lineHeight: 22, marginTop: 16 },
  section: { borderTopWidth: 1, borderTopColor: theme.borderLight, marginTop: 20, paddingTop: 18 },
  sectionTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 17, fontWeight: '800', marginBottom: 8 },
  description: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 14, lineHeight: 23 },
  planButton: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, borderRadius: 12, marginTop: 24 },
  planButtonText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgPrimary, padding: 24 },
  centerText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  errorTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 18, fontWeight: '800', marginTop: 12 },
  primaryButton: { minHeight: 42, borderRadius: 10, backgroundColor: theme.primary, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryButtonText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
});
