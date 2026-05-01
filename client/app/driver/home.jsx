import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function DriverDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
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
        <View style={styles.greetingRow}>
          <TouchableOpacity onPress={logout} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.greetingSub}>Hello,</Text>
            <Text style={styles.greetingTitle}>{user?.name?.split(' ')[0] || 'Driver'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.onlineToggle} onPress={() => setIsOnline(!isOnline)}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#16A34A' : '#94A3B8' }]} />
          <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </TouchableOpacity>
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
            <Ionicons name={isOnline ? 'checkmark-circle-outline' : 'pause-circle-outline'} size={18} color={isOnline ? '#16A34A' : '#94A3B8'} />
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
          <Ionicons name="home" size={24} color="#0C6EFD" />
          <Text style={styles.tabTextActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/vehicles')}>
          <Ionicons name="car-outline" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>Vehicles</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/earnings')}>
          <Ionicons name="wallet-outline" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/profile')}>
          <Ionicons name="person-outline" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { height: 80, paddingTop: 30, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EBF3FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#0952C6', fontFamily: 'Inter', fontWeight: '600', fontSize: 13 },
  greetingSub: { fontSize: 11, color: '#94A3B8', fontFamily: 'Inter' },
  greetingTitle: { fontSize: 16, color: '#0F172A', fontFamily: 'Inter', fontWeight: '600' },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  onlineText: { fontSize: 12, fontFamily: 'Inter', fontWeight: '500', color: '#0F172A' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginHorizontal: 4 },
  statLabel: { fontSize: 11, fontFamily: 'Inter', color: '#94A3B8', marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: 'Inter', color: '#0F172A', fontWeight: '600' },
  statValueSmall: { fontSize: 13, fontFamily: 'monospace', color: '#0F172A', fontWeight: '700' },
  activeTripBanner: { backgroundColor: '#EDFBF4', borderWidth: 1, borderColor: '#16A34A', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginHorizontal: 4 },
  activeTripLeft: { flex: 1, paddingRight: 8 },
  activeTripIndicatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A', marginRight: 6 },
  activeTripTitle: { color: '#145C32', fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  activeTripRoute: { color: '#0F172A', fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  activeTripMeta: { color: '#475569', fontSize: 11, fontFamily: 'Inter', marginTop: 3 },
  completeBtn: { backgroundColor: '#16A34A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  completeBtnText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter', fontWeight: '600' },
  offlineNotice: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 18, marginHorizontal: 4 },
  offlineNoticeText: { flex: 1, color: '#475569', fontSize: 12, fontFamily: 'Inter', marginLeft: 8 },
  requestsHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A', marginRight: 8 },
  countBadge: { backgroundColor: '#EBF3FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { color: '#0952C6', fontSize: 11, fontFamily: 'Inter', fontWeight: '600' },
  queueTabs: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 14, marginHorizontal: 4 },
  queueTab: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  queueTabActive: { backgroundColor: '#0C6EFD' },
  queueTabText: { color: '#475569', fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
  queueTabTextActive: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter', fontWeight: '700' },
  queueTabCount: { color: '#94A3B8', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', marginLeft: 5 },
  queueTabCountActive: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', marginLeft: 5 },
  requestCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 16, marginBottom: 12, marginHorizontal: 4 },
  travelerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  travelerAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  travelerName: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A', marginRight: 8 },
  tripRouteMuted: { fontSize: 11, fontFamily: 'Inter', color: '#94A3B8', flexShrink: 1 },
  tripDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailColumn: { flex: 1, marginRight: 10 },
  detailLabel: { fontSize: 11, color: '#94A3B8', fontFamily: 'Inter', marginBottom: 2 },
  detailValue: { fontSize: 13, color: '#0F172A', fontFamily: 'Inter', fontWeight: '500' },
  amountText: { fontSize: 15, fontFamily: 'monospace', color: '#0C6EFD', fontWeight: '600', marginBottom: 14 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#DC2626', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectText: { color: '#DC2626', fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  acceptBtn: { flex: 1, backgroundColor: '#0C6EFD', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  acceptText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  fullCompleteBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  fullCompleteText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', fontWeight: '700' },
  completedPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDFBF4', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  completedPillText: { color: '#145C32', fontSize: 12, fontFamily: 'Inter', fontWeight: '700', marginLeft: 5 },
  emptyRequests: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#94A3B8', fontFamily: 'Inter', marginTop: 10 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabItemActive: { alignItems: 'center', justifyContent: 'center' },
  tabText: { color: '#94A3B8', fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: '#0C6EFD', fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '500' },
});
