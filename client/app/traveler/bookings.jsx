import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const tabs = [
  { label: 'Home', icon: 'home-outline', route: '/traveler/home' },
  { label: 'Trip', icon: 'map-outline', route: '/traveler/trips' },
  { label: 'Bookings', icon: 'cart', route: '/traveler/bookings' },
  { label: 'Payments', icon: 'card-outline', route: '/traveler/payments' },
  { label: 'Profile', icon: 'person-outline', route: '/traveler/profile' },
];

const statusStyles = {
  pending: { bg: '#FFF8EC', text: '#92600A' },
  accepted: { bg: '#EDFBF4', text: '#145C32' },
  rejected: { bg: '#FFF0F0', text: '#991B1B' },
  completed: { bg: '#F1F5F9', text: '#475569' },
  cancelled: { bg: '#FFF0F0', text: '#991B1B' },
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

export default function TravelerBookingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reviewsByBooking, setReviewsByBooking] = useState({});

  const fetchBookings = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      setError('');
      const [bookingRes, reviewRes] = await Promise.all([
        api.get('/bookings/my-bookings'),
        api.get('/reviews/my'),
      ]);
      setBookings(bookingRes.data.bookings || []);
      const reviewMap = {};
      (reviewRes.data?.reviews || []).forEach((review) => {
        const bookingId = review.booking?._id || review.booking;
        if (bookingId) reviewMap[bookingId] = review;
      });
      setReviewsByBooking(reviewMap);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings({ showLoader: true });
    }, [fetchBookings])
  );

  const renderTab = (tab) => {
    const isActive = tab.label === 'Bookings';
    return (
      <TouchableOpacity
        key={tab.label}
        style={styles.tabItem}
        onPress={() => {
          if (!isActive) router.push(tab.route);
        }}
      >
        <Ionicons name={tab.icon} size={23} color={isActive ? theme.primary : theme.textMuted} />
        <Text style={isActive ? styles.tabTextActive : styles.tabText}>{tab.label}</Text>
        {isActive && <View style={styles.tabDot} />}
      </TouchableOpacity>
    );
  };

  const renderBooking = ({ item }) => {
    const status = item.status || 'pending';
    const statusStyle = statusStyles[status] || statusStyles.pending;
    const vehicleName = [item.vehicle?.brand, item.vehicle?.model].filter(Boolean).join(' ') || item.vehicle?.type || 'Vehicle';
    const tripTitle = item.trip?.destinationArea || 'Trip booking';
    const existingReview = reviewsByBooking[item._id];

    return (
      <View style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.tripTitle}>{tripTitle}</Text>
            <Text style={styles.dateText}>{formatDate(item.startDate)} - {formatDate(item.endDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="car-outline" size={17} color={theme.textMuted} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>{vehicleName}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={17} color={theme.textMuted} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Driver</Text>
              <Text style={styles.detailValue}>{item.driver?.name || 'Assigned driver'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amountText}>{formatMoney(item.totalAmount)}</Text>
          <View style={styles.footerActions}>
            {['accepted', 'completed'].includes(item.status) && item.paymentStatus !== 'paid' ? (
              <TouchableOpacity style={styles.payNowBtn} onPress={() => router.push('/traveler/payments')}>
                <Text style={styles.payNowText}>Pay now</Text>
              </TouchableOpacity>
            ) : (
              <Text style={item.paymentStatus === 'paid' ? styles.paidText : styles.unpaidText}>{item.paymentStatus || 'unpaid'}</Text>
            )}
            {item.trip?._id ? (
              <TouchableOpacity style={styles.openTripBtn} onPress={() => router.push(`/traveler/itinerary/${item.trip._id}`)}>
                <Text style={styles.openTripText}>View trip</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {item.status === 'completed' ? (
          <TouchableOpacity style={styles.reviewButton} onPress={() => router.push(`/traveler/review/${item._id}`)}>
            <Ionicons name={existingReview ? 'create-outline' : 'star-outline'} size={17} color="#92600A" />
            <Text style={styles.reviewButtonText}>{existingReview ? 'Edit your review' : 'Rate and review this trip'}</Text>
            <Ionicons name="chevron-forward" size={16} color="#92600A" />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="calendar-outline" size={28} color={theme.primary} />
        </View>
        <Text style={styles.emptyTitle}>No bookings yet</Text>
        <Text style={styles.emptyText}>Book a vehicle from an itinerary and your driver requests will appear here.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/traveler/trips')}>
          <Ionicons name="map-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Open trips</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Vehicles</Text>
          <Text style={styles.title}>Bookings</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/traveler/trips')}>
          <Ionicons name="map-outline" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchBookings({ showLoader: true })}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0C6EFD" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBooking}
          contentContainerStyle={bookings.length ? styles.listContent : styles.emptyListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} tintColor="#0C6EFD" />}
        />
      )}

      <View style={styles.bottomTabBar}>{tabs.map(renderTab)}</View>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.borderLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgPrimary },
  eyebrow: { fontSize: 12, color: theme.textMuted, fontFamily: 'Inter' },
  title: { fontSize: 24, fontFamily: 'Inter', fontWeight: '700', color: theme.textPrimary },
  headerButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 92 },
  emptyListContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 92 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  loadingText: { marginTop: 12, fontSize: 13, fontFamily: 'Inter', color: theme.textSecondary },
  errorBox: { margin: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF0F0', padding: 12, flexDirection: 'row', alignItems: 'center' },
  errorText: { flex: 1, marginHorizontal: 8, color: '#991B1B', fontSize: 12, fontFamily: 'Inter' },
  retryText: { color: '#DC2626', fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
  bookingCard: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  tripTitle: { color: theme.textPrimary, fontSize: 17, fontFamily: 'Inter', fontWeight: '700', marginRight: 12 },
  dateText: { color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter', marginTop: 4 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 10, fontFamily: 'Inter', fontWeight: '700', textTransform: 'capitalize' },
  detailGrid: { gap: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSurface, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 10, padding: 10 },
  detailTextGroup: { marginLeft: 10, flex: 1 },
  detailLabel: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter' },
  detailValue: { color: theme.textPrimary, fontSize: 13, fontFamily: 'Inter', fontWeight: '600', marginTop: 2 },
  cardFooter: { borderTopWidth: 1, borderTopColor: theme.borderLight, marginTop: 12, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountText: { color: theme.primary, fontSize: 14, fontFamily: 'monospace', fontWeight: '700' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payNowBtn: { backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  payNowText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter', fontWeight: '700' },
  paidText: { color: '#145C32', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', textTransform: 'capitalize' },
  unpaidText: { color: '#92600A', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', textTransform: 'capitalize' },
  openTripBtn: { flexDirection: 'row', alignItems: 'center' },
  openTripText: { color: theme.primary, fontSize: 12, fontFamily: 'Inter', fontWeight: '700', marginRight: 2 },
  reviewButton: { minHeight: 42, marginTop: 12, borderRadius: 10, backgroundColor: theme.amberLight, borderWidth: 1, borderColor: theme.amber, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  reviewButtonText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { color: theme.textPrimary, fontSize: 17, fontFamily: 'Inter', fontWeight: '700' },
  emptyText: { color: theme.textSecondary, fontSize: 13, fontFamily: 'Inter', textAlign: 'center', lineHeight: 20, marginTop: 6, marginBottom: 18 },
  primaryButton: { height: 48, borderRadius: 12, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter', fontWeight: '600', marginLeft: 8 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 62, backgroundColor: theme.bgPrimary, borderTopWidth: 1, borderTopColor: theme.borderLight, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center', position: 'relative', minWidth: 54 },
  tabText: { color: theme.textMuted, fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: theme.primary, fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '500' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, position: 'absolute', bottom: -8 },
});
