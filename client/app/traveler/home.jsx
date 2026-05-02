import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import NotificationBell from '../../components/common/NotificationBell';

const tabs = [
  { label: 'Home', icon: 'home', route: '/traveler/home' },
  { label: 'Trip', icon: 'map-outline', route: '/traveler/trips' },
  { label: 'Bookings', icon: 'cart-outline', route: '/traveler/bookings' },
  { label: 'Payments', icon: 'card-outline', route: '/traveler/payments' },
  { label: 'Profile', icon: 'person-outline', route: '/traveler/profile' },
];

export default function TravelerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchUpcomingTrip = async () => {
        try {
          setLoadingTrip(true);
          const res = await api.get('/trips/my');
          const trips = res.data.trips || [];
          const upcoming = trips.find((trip) => ['draft', 'planning', 'confirmed'].includes(trip.status)) || trips[0] || null;
          setUpcomingTrip(upcoming);
        } catch (_error) {
          setUpcomingTrip(null);
        } finally {
          setLoadingTrip(false);
        }
      };

      fetchUpcomingTrip();
    }, [])
  );

  const getInitials = (name) => {
    if (!name) return 'KP';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`;
    return parts[0][0];
  };

  const formatShortDate = (value) => {
    if (!value) return 'Not set';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getTripDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  };

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    if (!amount) return 'Not set';
    return `LKR ${amount.toLocaleString()}`;
  };

  const renderTab = (tab) => {
    const isActive = tab.label === 'Home';
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

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingSub}>Welcome Back,</Text>
          <Text style={styles.greetingTitle}>{user?.name?.split(' ')[0] || 'Kasun'}</Text>
        </View>
        <View style={styles.topRight}>
          <NotificationBell style={styles.notificationBtn} />
          <TouchableOpacity onPress={() => router.push('/traveler/profile')} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Your Upcoming Trip</Text>
          {loadingTrip ? (
            <View style={styles.tripLoadingCard}>
              <ActivityIndicator color="#0C6EFD" />
              <Text style={styles.tripLoadingText}>Loading trip...</Text>
            </View>
          ) : upcomingTrip ? (
            <View style={styles.tripCard}>
              <View style={styles.tripCardHeader}>
                <View style={styles.tripRouteIcon}>
                  <Ionicons name="navigate-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.tripHeaderText}>
                  <Text style={styles.tripEyebrow}>Upcoming trip</Text>
                  <Text style={styles.tripTitleDest}>{upcomingTrip.destinationArea || 'AI Trip Plan'}</Text>
                </View>
                <View style={styles.tripBadge}>
                  <Text style={styles.tripBadgeText}>{upcomingTrip.status || 'Planning'}</Text>
                </View>
              </View>

              <View style={styles.tripDateRow}>
                <View style={styles.tripDateBlock}>
                  <Text style={styles.tripDateLabel}>Start</Text>
                  <Text style={styles.tripDateValue}>{formatShortDate(upcomingTrip.startDate)}</Text>
                </View>
                <View style={styles.tripDateConnector}>
                  <View style={styles.tripDateDot} />
                  <View style={styles.tripDateLine} />
                  <View style={styles.tripDateDot} />
                </View>
                <View style={styles.tripDateBlock}>
                  <Text style={styles.tripDateLabel}>End</Text>
                  <Text style={styles.tripDateValue}>{formatShortDate(upcomingTrip.endDate)}</Text>
                </View>
              </View>

              <View style={styles.tripDetailsArea}>
                <View style={styles.tripStatsRow}>
                  <View style={styles.tripStatItem}>
                    <View style={styles.tripStatIcon}>
                      <Ionicons name="time-outline" size={15} color={theme.primary} />
                    </View>
                    <View>
                      <Text style={styles.tripStatValue}>{getTripDays(upcomingTrip.startDate, upcomingTrip.endDate) || '-'}</Text>
                      <Text style={styles.tripStatLabel}>Days</Text>
                    </View>
                  </View>
                  <View style={styles.tripStatDivider} />
                  <View style={styles.tripStatItem}>
                    <View style={styles.tripStatIcon}>
                      <Ionicons name="location-outline" size={15} color={theme.primary} />
                    </View>
                    <View>
                      <Text style={styles.tripStatValue}>{upcomingTrip.aiRecommendedPlaces?.length || 0}</Text>
                      <Text style={styles.tripStatLabel}>AI places</Text>
                    </View>
                  </View>
                  <View style={styles.tripStatDivider} />
                  <View style={styles.tripStatItem}>
                    <View style={styles.tripStatIcon}>
                      <Ionicons name="people-outline" size={15} color={theme.primary} />
                    </View>
                    <View>
                      <Text style={styles.tripStatValue}>{upcomingTrip.passengers || 1}</Text>
                      <Text style={styles.tripStatLabel}>People</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.tripBudgetRow}>
                  <View>
                    <Text style={styles.tripBudgetLabel}>Estimated budget</Text>
                    <Text style={styles.tripBudgetValue}>{formatMoney(upcomingTrip.totalEstimatedCost || upcomingTrip.budget)}</Text>
                  </View>
                  <View style={styles.tripPlacesPill}>
                    <Ionicons name="sparkles-outline" size={13} color={theme.amber} />
                    <Text style={styles.tripPlacesText}>{upcomingTrip.aiRecommendedPlaces?.length || 0} places</Text>
                  </View>
                </View>

                <View style={styles.tripActionArea}>
                  <TouchableOpacity style={styles.secondaryTripBtn} onPress={() => router.push('/traveler/bookings')}>
                    <Ionicons name="car-outline" size={16} color={theme.primary} />
                    <Text style={styles.secondaryTripText}>Vehicle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.viewPlanBtn} onPress={() => router.push(`/traveler/itinerary/${upcomingTrip._id}`)}>
                    <Text style={styles.viewPlanText}>View itinerary</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noTripCard}>
              <View style={styles.noTripIcon}>
                <Ionicons name="map-outline" size={24} color={theme.primary} />
              </View>
              <Text style={styles.noTripTitle}>No trip planned yet</Text>
              <Text style={styles.noTripText}>Create an AI itinerary and it will appear here.</Text>
              <TouchableOpacity style={styles.noTripButton} onPress={() => router.push('/traveler/plan-trip')}>
                <Text style={styles.noTripButtonText}>Plan trip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.aiBanner}>
          <View style={styles.aiBannerLeft}>
            <View style={styles.aiLabelBox}>
              <Text style={styles.aiLabelText}>AI planner</Text>
            </View>
            <Text style={styles.aiTitle}>Plan your next trip with AI</Text>
            <Text style={styles.aiSub}>Enter your destination and budget. AI recommends places and builds the plan.</Text>
          </View>
          <TouchableOpacity style={styles.generateBtn} onPress={() => router.push('/traveler/plan-trip')}>
            <Text style={styles.generateText}>Generate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/traveler/plan-trip')}>
            <Ionicons name="sparkles-outline" size={22} color={theme.primary} />
            <Text style={styles.actionTitle}>New AI trip</Text>
            <Text style={styles.actionText}>Recommend places and plan each day.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/traveler/trips')}>
            <Ionicons name="map-outline" size={22} color={theme.primary} />
            <Text style={styles.actionTitle}>My trips</Text>
            <Text style={styles.actionText}>Open saved plans and bookings.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomTabBar}>{tabs.map(renderTab)}</View>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  topBar: { height: 76, paddingTop: 20, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.bgPrimary, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  greetingSub: { fontFamily: 'Inter', fontSize: 12, color: theme.textMuted },
  greetingTitle: { fontFamily: 'Inter', fontSize: 17, color: theme.textPrimary, fontWeight: '600' },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  notificationBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: theme.primaryDark },
  scrollContent: { paddingBottom: 100, paddingTop: 16 },
  sectionContainer: { marginHorizontal: 16 },
  sectionTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: theme.textPrimary, marginBottom: 12 },
  tripLoadingCard: { minHeight: 150, borderRadius: 14, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, alignItems: 'center', justifyContent: 'center' },
  tripLoadingText: { color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter', marginTop: 8 },
  tripCard: { borderRadius: 16, borderWidth: 1, borderColor: theme.borderLight, overflow: 'hidden', backgroundColor: theme.bgPrimary },
  tripCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  tripRouteIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tripHeaderText: { flex: 1 },
  tripEyebrow: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  tripTitleDest: { color: theme.textPrimary, fontSize: 20, lineHeight: 26, fontFamily: 'Inter', fontWeight: '800' },
  tripBadge: { backgroundColor: theme.successLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tripBadgeText: { color: theme.success, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  tripDateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14 },
  tripDateBlock: { flex: 1, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 12 },
  tripDateLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  tripDateValue: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800', marginTop: 3 },
  tripDateConnector: { width: 42, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  tripDateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },
  tripDateLine: { flex: 1, height: 1, backgroundColor: theme.borderMed },
  tripDetailsArea: { padding: 14, backgroundColor: theme.bgPrimary },
  tripStatsRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 13, paddingHorizontal: 12, marginBottom: 12 },
  tripStatItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripStatIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tripStatValue: { color: theme.textPrimary, fontSize: 15, fontFamily: 'Inter', fontWeight: '800' },
  tripStatLabel: { color: theme.textMuted, fontSize: 10, fontFamily: 'Inter', marginTop: 1 },
  tripStatDivider: { width: 1, height: 34, backgroundColor: theme.borderLight, marginHorizontal: 8 },
  tripBudgetRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 13 },
  tripBudgetLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  tripBudgetValue: { color: theme.textPrimary, fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: '800', marginTop: 3 },
  tripPlacesPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.amberLight, borderWidth: 1, borderColor: theme.amber, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tripPlacesText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  tripActionArea: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secondaryTripBtn: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 11, paddingHorizontal: 13 },
  secondaryTripText: { color: theme.primary, fontSize: 12, fontFamily: 'Inter', fontWeight: '800' },
  viewPlanBtn: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: theme.primary, borderRadius: 11 },
  viewPlanText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', fontWeight: '800' },
  noTripCard: { borderRadius: 14, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, padding: 18, alignItems: 'center' },
  noTripIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  noTripTitle: { color: theme.textPrimary, fontSize: 15, fontFamily: 'Inter', fontWeight: '700' },
  noTripText: { color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter', marginTop: 4, marginBottom: 14 },
  noTripButton: { height: 38, paddingHorizontal: 18, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  noTripButtonText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  aiBanner: { margin: 16, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.primary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center' },
  aiBannerLeft: { flex: 1, paddingRight: 8 },
  aiLabelBox: { alignSelf: 'flex-start', backgroundColor: theme.primaryLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  aiLabelText: { color: theme.primaryDark, fontSize: 10, fontWeight: '500', fontFamily: 'Inter' },
  aiTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '600', fontFamily: 'Inter', marginTop: 6 },
  aiSub: { color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter', marginTop: 3, lineHeight: 17 },
  generateBtn: { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  generateText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  quickActions: { flexDirection: 'row', gap: 10, marginHorizontal: 16 },
  actionCard: { flex: 1, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 14 },
  actionTitle: { color: theme.textPrimary, fontSize: 14, fontFamily: 'Inter', fontWeight: '600', marginTop: 8 },
  actionText: { color: theme.textSecondary, fontSize: 11, fontFamily: 'Inter', marginTop: 4, lineHeight: 16 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 62, backgroundColor: theme.bgPrimary, borderTopWidth: 1, borderTopColor: theme.borderLight, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center', position: 'relative', minWidth: 54 },
  tabText: { color: theme.textMuted, fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: theme.primary, fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '500' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, position: 'absolute', bottom: -8 },
});
