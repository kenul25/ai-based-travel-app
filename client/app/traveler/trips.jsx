import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const tabs = [
  { label: 'Home', icon: 'home-outline', route: '/traveler/home' },
  { label: 'Trip', icon: 'map', route: '/traveler/trips' },
  { label: 'Bookings', icon: 'cart-outline', route: '/traveler/bookings' },
  { label: 'Payments', icon: 'card-outline', route: '/traveler/payments' },
  { label: 'Profile', icon: 'person-outline', route: '/traveler/profile' },
];

const statusStyles = {
  draft: { bg: '#F1F5F9', text: '#475569' },
  planning: { bg: '#EBF3FF', text: '#0952C6' },
  confirmed: { bg: '#EDFBF4', text: '#145C32' },
  completed: { bg: '#F1F5F9', text: '#475569' },
  cancelled: { bg: '#FFF0F0', text: '#991B1B' },
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getTripTitle = (trip) => trip.destinationArea || 'AI Trip Plan';

const getDayCount = (trip) => {
  if (Array.isArray(trip.aiItinerary) && trip.aiItinerary.length > 0) {
    return trip.aiItinerary.length;
  }

  if (!trip.startDate || !trip.endDate) return 0;
  const diff = new Date(trip.endDate) - new Date(trip.startDate);
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
};

export default function TripsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchTrips = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      setError('');
      const res = await api.get('/trips/my');
      setTrips(res.data.trips || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load trips.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips({ showLoader: true });
    }, [fetchTrips])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const editTrip = (trip) => {
    router.push({ pathname: '/traveler/plan-trip', params: { tripId: trip._id } });
  };

  const removeTrip = (trip) => {
    Alert.alert(
      'Remove saved trip?',
      `This will remove ${getTripTitle(trip)} from your saved plans.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/trips/${trip._id}`);
              setTrips((current) => current.filter((item) => item._id !== trip._id));
            } catch (err) {
              Alert.alert('Remove failed', err.response?.data?.message || 'Could not remove this trip.');
            }
          },
        },
      ]
    );
  };

  const renderTab = (tab) => {
    const isActive = tab.label === 'Trip';
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

  const renderTrip = ({ item }) => {
    const status = item.status || 'draft';
    const statusStyle = statusStyles[status] || statusStyles.draft;
    const placeCount = item.aiRecommendedPlaces?.length || 0;
    const dayCount = getDayCount(item);

    return (
      <View
        style={styles.tripCard}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#92600A" />
            <Text style={styles.aiBadgeText}>AI Generated</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{status}</Text>
          </View>
        </View>

        <Text style={styles.tripTitle}>{getTripTitle(item)}</Text>
        <Text style={styles.tripSummary} numberOfLines={2}>
          {item.aiPlanSummary || 'Recommended places and day-by-day itinerary saved for this trip.'}
        </Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={15} color={theme.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.startDate)} - {formatDate(item.endDate)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={15} color={theme.textMuted} />
            <Text style={styles.metaText}>{item.passengers || 1} people</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={15} color={theme.textMuted} />
            <Text style={styles.metaText}>{placeCount} AI places</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color={theme.textMuted} />
            <Text style={styles.metaText}>{dayCount} days</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.costText}>LKR {item.totalEstimatedCost || item.budget || 0}</Text>
          <TouchableOpacity style={styles.openRow} onPress={() => router.push(`/traveler/itinerary/${item._id}`)}>
            <Text style={styles.openText}>Open plan</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editButton} onPress={() => editTrip(item)}>
            <Ionicons name="create-outline" size={16} color={theme.primary} />
            <Text style={styles.editButtonText}>Edit plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeButton} onPress={() => removeTrip(item)}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="map-outline" size={28} color={theme.primary} />
        </View>
        <Text style={styles.emptyTitle}>No trips yet</Text>
        <Text style={styles.emptyText}>Generate your first AI plan and it will be saved here automatically.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/traveler/plan-trip')}>
          <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Plan new trip</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>AI plans</Text>
          <Text style={styles.title}>Trips</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/traveler/plan-trip')}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchTrips({ showLoader: true })}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0C6EFD" />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item._id}
          renderItem={renderTrip}
          contentContainerStyle={trips.length ? styles.listContent : styles.emptyListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0C6EFD" />}
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
  tripCard: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText: { color: '#92600A', fontSize: 10, fontFamily: 'Inter', fontWeight: '600', marginLeft: 4 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter', fontWeight: '600', textTransform: 'capitalize' },
  tripTitle: { color: theme.textPrimary, fontSize: 17, fontFamily: 'Inter', fontWeight: '700', marginBottom: 5 },
  tripSummary: { color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter', lineHeight: 18, marginBottom: 12 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaItem: { width: '48%', flexDirection: 'row', alignItems: 'center' },
  metaText: { color: theme.textSecondary, fontSize: 11, fontFamily: 'Inter', marginLeft: 6, flexShrink: 1 },
  cardFooter: { borderTopWidth: 1, borderTopColor: theme.borderLight, marginTop: 12, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  costText: { color: theme.primary, fontSize: 13, fontFamily: 'monospace', fontWeight: '700' },
  openRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  openText: { color: theme.primary, fontSize: 12, fontFamily: 'Inter', fontWeight: '600', marginRight: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editButton: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: theme.primaryMid, backgroundColor: theme.primaryLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  editButtonText: { color: theme.primary, fontSize: 13, fontFamily: 'Inter', fontWeight: '600', marginLeft: 6 },
  removeButton: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF0F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  removeButtonText: { color: '#DC2626', fontSize: 13, fontFamily: 'Inter', fontWeight: '600', marginLeft: 6 },
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
