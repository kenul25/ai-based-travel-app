import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const tabs = [
  { label: 'Home', icon: 'home', route: '/traveler/home' },
  { label: 'Trip', icon: 'map-outline', route: '/traveler/trips' },
  { label: 'Bookings', icon: 'cart-outline', route: '/traveler/bookings' },
  { label: 'Payments', icon: 'card-outline', route: '/traveler/payments' },
  { label: 'Profile', icon: 'person-outline', route: '/traveler/profile' },
];

export default function TravelerDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
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

  const formatDate = (value) => {
    if (!value) return 'Not set';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.avatarCircle}>
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
              <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1590005354167-6da97ce2311c?q=80&w=800' }}
                style={styles.tripImageArea}
              >
                <View style={styles.darkOverlay} />
                <View style={styles.tripBadge}>
                  <Text style={styles.tripBadgeText}>{upcomingTrip.status || 'Planning'}</Text>
                </View>
                <View style={styles.tripTextContainer}>
                  <Text style={styles.tripTitleDest}>{upcomingTrip.destinationArea || 'AI Trip Plan'}</Text>
                  <Text style={styles.tripDates}>{formatDate(upcomingTrip.startDate)} - {formatDate(upcomingTrip.endDate)}</Text>
                </View>
              </ImageBackground>
              <View style={styles.tripActionArea}>
                <View style={styles.driverInfoRow}>
                  <View style={styles.driverAvatar}>
                    <Ionicons name="sparkles" size={12} color={theme.textMuted} />
                  </View>
                  <Text style={styles.driverText}>{upcomingTrip.aiRecommendedPlaces?.length || 0} AI places - {upcomingTrip.passengers || 1} people</Text>
                </View>
                <TouchableOpacity style={styles.viewPlanBtn} onPress={() => router.push(`/traveler/itinerary/${upcomingTrip._id}`)}>
                  <Text style={styles.viewPlanText}>View plan</Text>
                </TouchableOpacity>
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
  tripImageArea: { height: 140, justifyContent: 'space-between', padding: 12 },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  tripBadge: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  tripBadgeText: { color: '#145C32', fontFamily: 'Inter', fontSize: 11, fontWeight: '500' },
  tripTextContainer: { zIndex: 1 },
  tripTitleDest: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Inter', fontWeight: '600' },
  tripDates: { color: '#F1F5F9', fontSize: 13, fontFamily: 'Inter', marginTop: 4 },
  tripActionArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: theme.bgPrimary },
  driverInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  driverAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.bgMuted, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  driverText: { color: theme.textSecondary, fontSize: 13, fontFamily: 'Inter', fontWeight: '500', flexShrink: 1 },
  viewPlanBtn: { backgroundColor: theme.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  viewPlanText: { color: theme.primary, fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
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
