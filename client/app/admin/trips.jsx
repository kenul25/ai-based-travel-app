import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminTabBar from '../../components/admin/AdminTabBar';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const fallbackTrips = [
  { _id: 't1', destinationArea: 'Ella', status: 'draft', passengers: 2, totalEstimatedCost: 92500, startDate: '2026-07-14', endDate: '2026-07-17', user: { name: 'Kasun Perera' }, aiRecommendedPlaces: [{ name: 'Nine Arch Bridge' }, { name: 'Little Adam Peak' }] },
  { _id: 't2', destinationArea: 'South Coast', status: 'confirmed', passengers: 4, totalEstimatedCost: 148000, startDate: '2026-08-02', endDate: '2026-08-05', user: { name: 'Maya Lee' }, aiRecommendedPlaces: [{ name: 'Mirissa' }] },
];

const statuses = ['all', 'draft', 'confirmed', 'completed', 'cancelled'];

const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Not set';
const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

export default function AdminTripsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [trips, setTrips] = useState(fallbackTrips);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (status !== 'all') params.status = status;
      if (search.trim()) params.search = search.trim();
      const response = await api.get('/admin/trips', { params });
      setTrips(response.data?.trips || []);
    } catch (_error) {
      setTrips(fallbackTrips);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Admin dashboard</Text>
            <Text style={styles.title}>Trips</Text>
          </View>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles-outline" size={14} color={theme.amber} />
            <Text style={styles.aiBadgeText}>Groq plans</Text>
          </View>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadTrips}
          placeholder="Search destination area"
          placeholderTextColor={theme.textMuted}
          style={styles.searchInput}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {statuses.map((item) => (
            <TouchableOpacity key={item} style={status === item ? styles.filterActive : styles.filter} onPress={() => setStatus(item)}>
              <Text style={status === item ? styles.filterTextActive : styles.filterText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.kpiBand}>
          <View>
            <Text style={styles.kpiValue}>{trips.length}</Text>
            <Text style={styles.kpiLabel}>AI trip plans</Text>
          </View>
          <Text style={styles.kpiNote}>Admins can audit saved AI places and itinerary costs without editing destination records.</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loadingText}>Loading trips...</Text>
          </View>
        ) : trips.map((trip) => (
          <View key={trip._id} style={styles.tripRow}>
            <View style={styles.tripIcon}>
              <Ionicons name="map-outline" size={18} color={theme.primary} />
            </View>
            <View style={styles.tripBody}>
              <View style={styles.tripTop}>
                <Text style={styles.tripTitle}>{trip.destinationArea || 'AI Trip'}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{trip.status || 'draft'}</Text>
                </View>
              </View>
              <Text style={styles.tripMeta}>{trip.user?.name || 'Traveler'} - {formatDate(trip.startDate)} to {formatDate(trip.endDate)}</Text>
              <Text style={styles.tripMeta}>{trip.passengers || 1} people - {trip.aiRecommendedPlaces?.length || 0} AI places</Text>
            </View>
            <Text style={styles.amount}>{formatMoney(trip.totalEstimatedCost || trip.budget)}</Text>
          </View>
        ))}
      </ScrollView>
      <AdminTabBar />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { padding: 16, paddingTop: 58, paddingBottom: 94 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  eyebrow: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 24, fontWeight: '800', marginTop: 2 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.amberLight, borderWidth: 1, borderColor: theme.amber, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  aiBadgeText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  searchInput: { height: 46, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, paddingHorizontal: 14, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, marginBottom: 12 },
  filterRow: { gap: 8, paddingBottom: 12 },
  filter: { height: 34, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterActive: { height: 34, borderWidth: 1, borderColor: theme.primaryMid, backgroundColor: theme.primaryLight, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  filterTextActive: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  kpiBand: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 14, marginBottom: 12 },
  kpiValue: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 24, fontWeight: '800' },
  kpiLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 2 },
  kpiNote: { flex: 1, textAlign: 'right', color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  loadingBox: { minHeight: 170, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 8 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, padding: 14, marginBottom: 10 },
  tripIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tripBody: { flex: 1 },
  tripTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tripTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  tripMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 3 },
  statusBadge: { backgroundColor: theme.bgMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  amount: { color: theme.primary, fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: '800' },
});
