import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminTabBar from '../../components/admin/AdminTabBar';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';

const formatDate = (value) => {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function AdminReviewsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = useCallback(async ({ showLoader = false, refreshing: isRefresh = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      if (isRefresh) setRefreshing(true);
      setError('');
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (search.trim()) params.search = search.trim();
      const response = await api.get('/reviews/admin/all', { params });
      setReviews(response.data?.reviews || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load reviews.');
      setReviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search]);

  useFocusEffect(
    useCallback(() => {
      loadReviews({ showLoader: true });
    }, [loadReviews])
  );

  const toggleReview = async (review) => {
    try {
      await api.put(`/reviews/${review._id}/toggle-approve`, { isApproved: !review.isApproved });
      await loadReviews();
    } catch (requestError) {
      Alert.alert('Moderation failed', requestError.response?.data?.message || 'Could not update review visibility.');
    }
  };

  const deleteReview = (review) => {
    Alert.alert('Delete review?', 'This review will be permanently removed and the driver rating will be recalculated.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/reviews/${review._id}`);
            await loadReviews();
          } catch (requestError) {
            Alert.alert('Delete failed', requestError.response?.data?.message || 'Could not delete review.');
          }
        },
      },
    ]);
  };

  const renderStars = (rating) => (
    <View style={styles.starsInline}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Ionicons key={value} name={value <= Number(rating || 0) ? 'star' : 'star-outline'} size={13} color={theme.amber} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReviews({ refreshing: true })} tintColor={theme.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Admin dashboard</Text>
            <Text style={styles.title}>Reviews</Text>
          </View>
          <View style={styles.iconBox}>
            <Ionicons name="star-outline" size={18} color={theme.amber} />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryValue}>{reviews.length}</Text>
            <Text style={styles.summaryLabel}>reviews in view</Text>
          </View>
          <Text style={styles.summaryText}>Moderate traveler feedback and keep driver ratings trustworthy.</Text>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadReviews({ showLoader: true })}
          placeholder="Search traveler, driver, destination, comment"
          placeholderTextColor={theme.textMuted}
          style={styles.searchInput}
        />

        <View style={styles.filterRow}>
          {['all', 'approved', 'hidden'].map((item) => (
            <TouchableOpacity key={item} style={filter === item ? styles.filterActive : styles.filter} onPress={() => setFilter(item)}>
              <Text style={filter === item ? styles.filterTextActive : styles.filterText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        ) : reviews.length ? reviews.map((review) => (
          <View key={review._id} style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <View style={styles.reviewTitleBlock}>
                <Text style={styles.reviewTitle}>{review.trip?.destinationArea || 'Trip review'}</Text>
                <Text style={styles.reviewMeta}>{review.traveler?.name || 'Traveler'} reviewed {review.driver?.name || 'Driver'}</Text>
                <Text style={styles.reviewMeta}>{formatDate(review.createdAt)}</Text>
              </View>
              <View style={review.isApproved ? styles.visibleBadge : styles.hiddenBadge}>
                <Text style={review.isApproved ? styles.visibleText : styles.hiddenText}>{review.isApproved ? 'Visible' : 'Hidden'}</Text>
              </View>
            </View>

            <View style={styles.ratingRow}>
              {renderStars(review.rating)}
              <Text style={styles.ratingText}>{Number(review.rating || 0).toFixed(1)}</Text>
            </View>

            <Text style={styles.comment}>{review.comment || 'No written comment.'}</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity style={review.isApproved ? styles.hideButton : styles.approveButton} onPress={() => toggleReview(review)}>
                <Text style={review.isApproved ? styles.hideText : styles.approveText}>{review.isApproved ? 'Hide review' : 'Show review'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteReview(review)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={30} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No reviews found</Text>
            <Text style={styles.emptyText}>Completed trip reviews will appear here for moderation.</Text>
          </View>
        )}
      </KeyboardAwareScrollView>
      <AdminTabBar />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 58, paddingBottom: 94 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  eyebrow: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 24, fontWeight: '800', marginTop: 2 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.amberLight, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, padding: 14, marginBottom: 12 },
  summaryValue: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 2 },
  summaryText: { flex: 1, color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, textAlign: 'right' },
  searchInput: { height: 46, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, paddingHorizontal: 14, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filter: { flex: 1, height: 34, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterActive: { flex: 1, height: 34, borderWidth: 1, borderColor: theme.primaryMid, backgroundColor: theme.primaryLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  filterTextActive: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.error, backgroundColor: theme.errorLight, borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { flex: 1, color: theme.error, fontFamily: 'Inter', fontSize: 12 },
  loadingBox: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 8 },
  reviewCard: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  reviewTitleBlock: { flex: 1 },
  reviewTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 15, fontWeight: '800' },
  reviewMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 3 },
  visibleBadge: { backgroundColor: theme.successLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  visibleText: { color: theme.success, fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
  hiddenBadge: { backgroundColor: theme.errorLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  hiddenText: { color: theme.error, fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  starsInline: { flexDirection: 'row', gap: 2 },
  ratingText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  comment: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 10 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveButton: { flex: 1, backgroundColor: theme.success, borderRadius: 9, paddingVertical: 9, alignItems: 'center' },
  approveText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  hideButton: { flex: 1, borderWidth: 1, borderColor: theme.error, borderRadius: 9, paddingVertical: 9, alignItems: 'center' },
  hideText: { color: theme.error, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  deleteButton: { width: 86, borderWidth: 1, borderColor: theme.borderMed, borderRadius: 9, paddingVertical: 9, alignItems: 'center' },
  deleteText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  emptyState: { minHeight: 240, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 15, fontWeight: '800', marginTop: 8 },
  emptyText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
});
