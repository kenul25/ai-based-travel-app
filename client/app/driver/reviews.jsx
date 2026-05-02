import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const tabs = [
  { label: 'Home', icon: 'home-outline', route: '/driver/home' },
  { label: 'Vehicles', icon: 'car-outline', route: '/driver/vehicles' },
  { label: 'Earnings', icon: 'wallet-outline', route: '/driver/earnings' },
  { label: 'Profile', icon: 'person', route: '/driver/profile' },
];

const getInitials = (name) => {
  if (!name) return 'TR';
  const parts = name.trim().split(' ');
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

const formatDate = (value) => {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function DriverReviewsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const API_ORIGIN = api.defaults.baseURL?.replace(/\/api$/, '') || '';
  const driverId = user?._id || user?.id;

  const resolvePhotoUrl = (photo) => {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `${API_ORIGIN}${photo}`;
  };

  const loadReviews = useCallback(async ({ showLoader = false, isRefresh = false } = {}) => {
    if (!driverId) return;

    try {
      if (showLoader) setLoading(true);
      if (isRefresh) setRefreshing(true);
      setError('');
      const response = await api.get(`/reviews/driver/${driverId}`);
      setReviews(response.data?.reviews || []);
    } catch (requestError) {
      setReviews([]);
      setError(requestError.response?.data?.message || 'Could not load driver reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverId]);

  useFocusEffect(
    useCallback(() => {
      loadReviews({ showLoader: true });
    }, [loadReviews])
  );

  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : Number(user?.rating || 0);

  const breakdown = [5, 4, 3, 2, 1].map((value) => {
    const count = reviews.filter((review) => Number(review.rating) === value).length;
    const percentage = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
    return { value, count, percentage };
  });

  const renderStars = (rating, size = 14) => (
    <View style={styles.starsInline}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Ionicons key={value} name={value <= Math.round(Number(rating || 0)) ? 'star' : 'star-outline'} size={size} color={theme.amber} />
      ))}
    </View>
  );

  const renderTab = (tab) => {
    const isActive = tab.label === 'Profile';
    return (
      <TouchableOpacity
        key={tab.label}
        style={styles.tabItem}
        onPress={() => {
          if (!isActive) router.push(tab.route);
        }}
      >
        <Ionicons name={tab.icon} size={24} color={isActive ? theme.primary : theme.textMuted} />
        <Text style={isActive ? styles.tabTextActive : styles.tabText}>{tab.label}</Text>
        {isActive && <View style={styles.tabDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReviews({ isRefresh: true })} tintColor={theme.primary} />}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Driver tools</Text>
            <Text style={styles.title}>Reviews and rating</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>{Number(averageRating || 0).toFixed(1)}</Text>
            {renderStars(averageRating, 15)}
            <Text style={styles.scoreLabel}>{reviews.length || user?.totalRatings || 0} traveler reviews</Text>
          </View>
          <View style={styles.breakdownBlock}>
            {breakdown.map((item) => (
              <View key={item.value} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{item.value}</Text>
                <Ionicons name="star" size={10} color={theme.amber} />
                <View style={styles.breakdownTrack}>
                  <View style={[styles.breakdownFill, { width: `${item.percentage}%` }]} />
                </View>
                <Text style={styles.breakdownPercent}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.insightBand}>
          <Ionicons name="eye-outline" size={18} color={theme.primary} />
          <Text style={styles.insightText}>Only approved traveler reviews are shown here and used in your public driver rating.</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Traveler feedback</Text>
          <Text style={styles.sectionMeta}>{reviews.length} visible</Text>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.stateText}>Loading reviews...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={24} color={theme.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : reviews.length ? (
          reviews.map((review) => (
            <View key={review._id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerAvatar}>
                  <Text style={styles.reviewerAvatarText}>{getInitials(review.traveler?.name)}</Text>
                </View>
                <View style={styles.reviewBody}>
                  <Text style={styles.reviewerName}>{review.traveler?.name || 'Traveler'}</Text>
                  <Text style={styles.reviewTrip}>{review.trip?.destinationArea || 'Completed trip'} - {formatDate(review.createdAt)}</Text>
                </View>
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={12} color={theme.amber} />
                  <Text style={styles.ratingPillText}>{Number(review.rating || 0).toFixed(1)}</Text>
                </View>
              </View>

              <Text style={styles.reviewComment}>{review.comment || 'No written comment.'}</Text>

              {review.photos?.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewPhotoRow}>
                  {review.photos.map((photo) => (
                    <Image key={photo} source={{ uri: resolvePhotoUrl(photo) }} style={styles.reviewPhoto} />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ))
        ) : (
          <View style={styles.stateCard}>
            <Ionicons name="star-outline" size={30} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.stateText}>After completed trips, approved traveler reviews will appear here.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomTabBar}>{tabs.map(renderTab)}</View>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 96 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  eyebrow: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 22, fontWeight: '800', marginTop: 2 },
  summaryCard: { flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, padding: 14, marginBottom: 12 },
  scoreBlock: { width: 116, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: theme.borderLight, paddingRight: 14 },
  scoreValue: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 34, fontWeight: '800' },
  starsInline: { flexDirection: 'row', gap: 1, marginTop: 3 },
  scoreLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 10, lineHeight: 14, marginTop: 6, textAlign: 'center' },
  breakdownBlock: { flex: 1, gap: 7, justifyContent: 'center' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  breakdownLabel: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', width: 8 },
  breakdownTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: theme.bgMuted, overflow: 'hidden' },
  breakdownFill: { height: 7, borderRadius: 4, backgroundColor: theme.amber },
  breakdownPercent: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 10, width: 22, textAlign: 'right' },
  insightBand: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 12, padding: 12, marginBottom: 16 },
  insightText: { flex: 1, color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 16, fontWeight: '800' },
  sectionMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11 },
  reviewCard: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  reviewerAvatarText: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  reviewBody: { flex: 1 },
  reviewerName: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
  reviewTrip: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 2 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.amberLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  ratingPillText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  reviewComment: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 10 },
  reviewPhotoRow: { gap: 8, marginTop: 10 },
  reviewPhoto: { width: 62, height: 62, borderRadius: 9, backgroundColor: theme.bgMuted },
  stateCard: { minHeight: 220, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 20 },
  stateText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  errorText: { color: theme.error, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  emptyTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 15, fontWeight: '800', marginTop: 8 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 62, backgroundColor: theme.bgPrimary, borderTopWidth: 1, borderTopColor: theme.borderLight, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center', position: 'relative', minWidth: 64 },
  tabText: { color: theme.textMuted, fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: theme.primary, fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '600' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, position: 'absolute', bottom: -8 },
});
