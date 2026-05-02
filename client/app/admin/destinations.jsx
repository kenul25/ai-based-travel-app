import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AdminTabBar from '../../components/admin/AdminTabBar';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function AdminDestinationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [destinations, setDestinations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadDestinations = useCallback(async () => {
    try {
      setLoading(true);
      const params = { includeInactive: true };
      if (search.trim()) params.search = search.trim();
      const response = await api.get('/destinations', { params });
      setDestinations(response.data?.destinations || []);
    } catch (error) {
      Alert.alert('Destinations unavailable', error.response?.data?.message || 'Could not load destinations.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      loadDestinations();
    }, [loadDestinations])
  );

  const deleteDestination = (destination) => {
    Alert.alert('Delete destination?', `Remove ${destination.name} from the catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/destinations/${destination._id}`);
            setDestinations((current) => current.filter((item) => item._id !== destination._id));
          } catch (error) {
            Alert.alert('Delete failed', error.response?.data?.message || 'Could not delete destination.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Admin dashboard</Text>
            <Text style={styles.title}>Destinations</Text>
            <Text style={styles.subtitle}>Manage the destination catalog shown to travelers.</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/admin/add-destination')}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{destinations.length}</Text>
            <Text style={styles.metricLabel}>Total places</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{destinations.filter((item) => item.isFeatured).length}</Text>
            <Text style={styles.metricLabel}>Featured</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{destinations.filter((item) => item.isActive !== false).length}</Text>
            <Text style={styles.metricLabel}>Active</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadDestinations}
            placeholder="Search destinations"
            placeholderTextColor={theme.textMuted}
            style={styles.searchInput}
          />
          <TouchableOpacity style={styles.searchButton} onPress={loadDestinations}>
            <Ionicons name="search" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loadingText}>Loading destinations...</Text>
          </View>
        ) : destinations.length ? destinations.map((destination) => (
          <View key={destination._id} style={styles.destinationRow}>
            {destination.image ? (
              <Image source={{ uri: destination.image }} style={styles.rowImage} />
            ) : (
              <View style={styles.rowImageFallback}>
                <Ionicons name="image-outline" size={20} color={theme.textMuted} />
              </View>
            )}
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle}>{destination.name}</Text>
                {destination.isFeatured ? <Ionicons name="star" size={14} color={theme.amber} /> : null}
              </View>
              <Text style={styles.rowMeta}>{destination.location || 'No location'} - {destination.isActive ? 'Active' : 'Hidden'}</Text>
              <Text style={styles.rowSummary} numberOfLines={2}>{destination.shortDescription || destination.description}</Text>
              <View style={styles.rowCategories}>
                {(destination.categories || []).slice(0, 3).map((category) => <Text key={category} style={styles.rowCategory}>{category}</Text>)}
              </View>
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push({ pathname: '/admin/add-destination', params: { destinationId: destination._id } })}>
                <Ionicons name="create-outline" size={17} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButtonDanger} onPress={() => deleteDestination(destination)}>
                <Ionicons name="trash-outline" size={17} color={theme.error} />
              </TouchableOpacity>
            </View>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={28} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>No destinations yet</Text>
            <Text style={styles.emptyText}>Create the first place in your catalog.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/admin/add-destination')}>
              <Text style={styles.emptyButtonText}>Add new destination</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <AdminTabBar />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { padding: 16, paddingTop: 58, paddingBottom: 94 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  headerText: { flex: 1 },
  eyebrow: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 24, fontWeight: '800', marginTop: 2 },
  subtitle: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 4 },
  addButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.primary, borderRadius: 11, paddingHorizontal: 13, justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricCard: { flex: 1, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 12 },
  metricValue: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 20, fontWeight: '800' },
  metricLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 10, marginTop: 3 },
  listHeader: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, height: 44, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 10, paddingHorizontal: 12, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13 },
  searchButton: { width: 44, height: 44, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  loadingBox: { minHeight: 150, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 8 },
  destinationRow: { flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 12, padding: 10, marginBottom: 10 },
  rowImage: { width: 76, height: 86, borderRadius: 9, backgroundColor: theme.bgMuted },
  rowImageFallback: { width: 76, height: 86, borderRadius: 9, backgroundColor: theme.bgMuted, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowTitle: { flex: 1, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  rowMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 2 },
  rowSummary: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 11, lineHeight: 16, marginTop: 5 },
  rowCategories: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  rowCategory: { color: theme.primaryDark, backgroundColor: theme.primaryLight, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
  rowActions: { justifyContent: 'space-between' },
  iconButton: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: theme.primaryMid, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconButtonDanger: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: '#FECACA', backgroundColor: theme.errorLight, alignItems: 'center', justifyContent: 'center' },
  emptyState: { minHeight: 260, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 18 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 17, fontWeight: '800' },
  emptyText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 4, marginBottom: 16 },
  emptyButton: { height: 42, borderRadius: 10, backgroundColor: theme.primary, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  emptyButtonText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
});
