import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import NotificationBell from '../../components/common/NotificationBell';

export default function DriverDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isOnline, setIsOnline] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueFilter, setQueueFilter] = useState('pending');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings/requests');
      setBookings(res.data.bookings || []);
    } catch (error) {
      console.log('Error fetching requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateBookingStatus = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/status`, { status });
      setBookings((current) => current.map((booking) => (booking._id === id ? { ...booking, status } : booking)));
    } catch (_e) {
      alert('Failed to update status');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'D';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return parts[0][0] + parts[1][0];
    return parts[0][0];
  };

  const formatDate = (value) => {
    if (!value) return 'Not set';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

  const pendingBookings = bookings.filter((booking) => booking.status === 'pending');
  const acceptedBookings = bookings.filter((booking) => booking.status === 'accepted');
  const completedBookings = bookings.filter((booking) => booking.status === 'completed');
  const visibleBookings = bookings.filter((booking) => booking.status === queueFilter);
  const activeTrip = acceptedBookings[0];
  const bookedValue = bookings
    .filter((booking) => ['accepted', 'completed'].includes(booking.status))
    .reduce((total, booking) => total + Number(booking.totalAmount || 0), 0);
  const activeRoute = activeTrip
    ? `${activeTrip.trip?.startingPoint || 'Pickup'} to ${activeTrip.trip?.destinationArea || 'Destination'}`
    : '';

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingSub}>Hello,</Text>
          <Text style={styles.greetingTitle}>{user?.name?.split(' ')[0] || 'Driver'}</Text>
        </View>

        <View style={styles.topRight}>
          <NotificationBell style={styles.notificationBtn} />
          <TouchableOpacity onPress={() => router.push('/driver/profile')} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} tintColor="#0C6EFD" />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total trips</Text>
            <Text style={styles.statValue}>{completedBookings.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Booked value</Text>
            <Text style={styles.statValueSmall}>{formatMoney(bookedValue)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{pendingBookings.length}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.onlineToggle} onPress={() => setIsOnline(!isOnline)}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.success : theme.textMuted }]} />
          <Text style={styles.onlineText}>{isOnline ? 'Online and accepting requests' : 'Offline'}</Text>
        </TouchableOpacity>

        {isOnline && activeTrip ? (
          <View style={styles.activeTripBanner}>
            <View style={styles.activeTripLeft}>
              <View style={styles.activeTripIndicatorRow}>
                <View style={styles.pulsingDot} />
                <Text style={styles.activeTripTitle}>Active trip</Text>
              </View>
              <Text style={styles.activeTripRoute}>{activeRoute}</Text>
              <Text style={styles.activeTripMeta}>
                {formatDate(activeTrip.startDate)} - {formatDate(activeTrip.endDate)} - {activeTrip.vehicle?.type || 'Vehicle'}
              </Text>
            </View>
            <TouchableOpacity style={styles.completeBtn} onPress={() => updateBookingStatus(activeTrip._id, 'completed')}>
              <Text style={styles.completeBtnText}>Complete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.offlineNotice}>
            <Ionicons name={isOnline ? 'checkmark-circle-outline' : 'pause-circle-outline'} size={18} color={isOnline ? theme.success : theme.textMuted} />
            <Text style={styles.offlineNoticeText}>{isOnline ? 'You are available for new booking requests.' : 'You are offline. Switch online to receive requests.'}</Text>
          </View>
        )}

        <View style={styles.requestsHeaderRow}>
          <Text style={styles.sectionTitle}>Booking center</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{visibleBookings.length}</Text>
          </View>
        </View>

        <View style={styles.queueTabs}>
          {[
            { key: 'pending', label: 'Requests', count: pendingBookings.length },
            { key: 'accepted', label: 'Accepted', count: acceptedBookings.length },
            { key: 'completed', label: 'Done', count: completedBookings.length },
          ].map((tab) => {
            const isActive = queueFilter === tab.key;
            return (
              <TouchableOpacity key={tab.key} style={[styles.queueTab, isActive && styles.queueTabActive]} onPress={() => setQueueFilter(tab.key)}>
                <Text style={isActive ? styles.queueTabTextActive : styles.queueTabText}>{tab.label}</Text>
                <Text style={isActive ? styles.queueTabCountActive : styles.queueTabCount}>{tab.count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.emptyRequests}>
            <ActivityIndicator color="#0C6EFD" />
            <Text style={styles.emptyText}>Loading requests...</Text>
          </View>
        ) : visibleBookings.length === 0 ? (
          <View style={styles.emptyRequests}>
            <Ionicons name="car-outline" size={32} color="#CBD5E1" />
            <Text style={styles.emptyText}>No {queueFilter} bookings right now.</Text>
          </View>
        ) : (
          visibleBookings.map((booking) => (
            <View key={booking._id} style={styles.requestCard}>
              <View style={styles.travelerRow}>
                <View style={styles.travelerAvatar}>
                  <Ionicons name="person" size={14} color="#94A3B8" />
                </View>
                <Text style={styles.travelerName}>{booking.traveler?.name || 'Traveler'}</Text>
                <Text style={styles.tripRouteMuted}>{booking.trip?.destinationArea || 'Trip request'}</Text>
              </View>

              <View style={styles.tripDetailsRow}>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Dates</Text>
                  <Text style={styles.detailValue}>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</Text>
                </View>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Vehicle</Text>
                  <Text style={styles.detailValue}>{booking.vehicle?.type || 'Vehicle'}</Text>
                </View>
              </View>

              <Text style={styles.amountText}>{formatMoney(booking.totalAmount)}</Text>

              {booking.status === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => updateBookingStatus(booking._id, 'rejected')}>
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => updateBookingStatus(booking._id, 'accepted')}>
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}

              {booking.status === 'accepted' && (
                <TouchableOpacity style={styles.fullCompleteBtn} onPress={() => updateBookingStatus(booking._id, 'completed')}>
                  <Text style={styles.fullCompleteText}>Mark trip completed</Text>
                </TouchableOpacity>
              )}

              {booking.status === 'completed' && (
                <View style={styles.completedPill}>
                  <Ionicons name="checkmark-circle" size={15} color="#145C32" />
                  <Text style={styles.completedPillText}>Completed trip</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItemActive}>
          <Ionicons name="home" size={24} color={theme.primary} />
          <Text style={styles.tabTextActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/vehicles')}>
          <Ionicons name="car-outline" size={24} color={theme.textMuted} />
          <Text style={styles.tabText}>Vehicles</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/earnings')}>
          <Ionicons name="wallet-outline" size={24} color={theme.textMuted} />
          <Text style={styles.tabText}>Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/profile')}>
          <Ionicons name="person-outline" size={24} color={theme.textMuted} />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  topBar: { height: 80, paddingTop: 30, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.borderLight, backgroundColor: theme.bgPrimary },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  notificationBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: theme.primaryDark, fontFamily: 'Inter', fontWeight: '600', fontSize: 13 },
  greetingSub: { fontSize: 11, color: theme.textMuted, fontFamily: 'Inter' },
  greetingTitle: { fontSize: 16, color: theme.textPrimary, fontFamily: 'Inter', fontWeight: '600' },
  onlineToggle: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSurface, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 14, marginHorizontal: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  onlineText: { fontSize: 12, fontFamily: 'Inter', fontWeight: '500', color: theme.textPrimary },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: theme.bgSurface, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 12, padding: 12, marginHorizontal: 4 },
  statLabel: { fontSize: 11, fontFamily: 'Inter', color: theme.textMuted, marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: 'Inter', color: theme.textPrimary, fontWeight: '600' },
  statValueSmall: { fontSize: 13, fontFamily: 'monospace', color: theme.textPrimary, fontWeight: '700' },
  activeTripBanner: { backgroundColor: theme.successLight, borderWidth: 1, borderColor: theme.success, borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginHorizontal: 4 },
  activeTripLeft: { flex: 1, paddingRight: 8 },
  activeTripIndicatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.success, marginRight: 6 },
  activeTripTitle: { color: theme.success, fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  activeTripRoute: { color: theme.textPrimary, fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  activeTripMeta: { color: theme.textSecondary, fontSize: 11, fontFamily: 'Inter', marginTop: 3 },
  completeBtn: { backgroundColor: theme.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  completeBtnText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter', fontWeight: '600' },
  offlineNotice: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 18, marginHorizontal: 4 },
  offlineNoticeText: { flex: 1, color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter', marginLeft: 8 },
  requestsHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter', fontWeight: '600', color: theme.textPrimary, marginRight: 8 },
  countBadge: { backgroundColor: theme.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { color: theme.primaryDark, fontSize: 11, fontFamily: 'Inter', fontWeight: '600' },
  queueTabs: { flexDirection: 'row', backgroundColor: theme.bgSurface, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 12, padding: 4, marginBottom: 14, marginHorizontal: 4 },
  queueTab: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  queueTabActive: { backgroundColor: theme.primary },
  queueTabText: { color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
  queueTabTextActive: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter', fontWeight: '700' },
  queueTabCount: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter', fontWeight: '700', marginLeft: 5 },
  queueTabCountActive: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', marginLeft: 5 },
  requestCard: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, padding: 16, marginBottom: 12, marginHorizontal: 4 },
  travelerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  travelerAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.bgMuted, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  travelerName: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600', color: theme.textPrimary, marginRight: 8 },
  tripRouteMuted: { fontSize: 11, fontFamily: 'Inter', color: theme.textMuted, flexShrink: 1 },
  tripDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailColumn: { flex: 1, marginRight: 10 },
  detailLabel: { fontSize: 11, color: theme.textMuted, fontFamily: 'Inter', marginBottom: 2 },
  detailValue: { fontSize: 13, color: theme.textPrimary, fontFamily: 'Inter', fontWeight: '500' },
  amountText: { fontSize: 15, fontFamily: 'monospace', color: theme.primary, fontWeight: '600', marginBottom: 14 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#DC2626', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectText: { color: '#DC2626', fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  acceptBtn: { flex: 1, backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  acceptText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  fullCompleteBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  fullCompleteText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', fontWeight: '700' },
  completedPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: theme.successLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  completedPillText: { color: '#145C32', fontSize: 12, fontFamily: 'Inter', fontWeight: '700', marginLeft: 5 },
  emptyRequests: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: theme.textMuted, fontFamily: 'Inter', marginTop: 10 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: theme.bgPrimary, borderTopWidth: 1, borderTopColor: theme.borderLight, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabItemActive: { alignItems: 'center', justifyContent: 'center' },
  tabText: { color: theme.textMuted, fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: theme.primary, fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '500' },
});
