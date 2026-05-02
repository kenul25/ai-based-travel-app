import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const categories = ['All', 'Beach', 'Culture', 'Nature', 'Adventure', 'Wildlife', 'Food', 'Wellness', 'City', 'History'];

export default function DestinationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [destinations, setDestinations] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDestinations = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category !== 'All') params.category = category;
      const response = await api.get('/destinations', { params });
      setDestinations(response.data?.destinations || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load destinations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, search]);

  useFocusEffect(
    useCallback(() => {
      fetchDestinations({ showLoader: true });
    }, [fetchDestinations])
  );

  const renderDestination = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/traveler/destination/${item._id}`)} activeOpacity={0.86}>
      {item.image ? <Image source={{ uri: item.image }} style={styles.cardImage} /> : <View style={styles.cardImageFallback}><Ionicons name="image-outline" size={30} color={theme.textMuted} /></View>}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.isFeatured ? <Ionicons name="star" size={15} color={theme.amber} /> : null}
        </View>
        <Text style={styles.cardLocation}>{item.location || 'Sri Lanka'}</Text>
        <Text style={styles.cardSummary} numberOfLines={2}>{item.shortDescription || item.description}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.chipRow}>
            {(item.categories || []).slice(0, 2).map((chip) => <Text key={chip} style={styles.chip}>{chip}</Text>)}
          </View>
          <View style={styles.openPill}>
            <Text style={styles.openText}>Explore</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Explore</Text>
          <Text style={styles.title}>Destinations</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => fetchDestinations({ showLoader: true })} placeholder="Search places" placeholderTextColor={theme.textMuted} style={styles.searchInput} />
        <TouchableOpacity style={styles.searchButton} onPress={() => fetchDestinations({ showLoader: true })}>
          <Ionicons name="search" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterWrap}>
        <FlatList
          data={categories}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity style={category === item ? styles.filterActive : styles.filter} onPress={() => setCategory(item)}>
              <Text style={category === item ? styles.filterTextActive : styles.filterText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchDestinations({ showLoader: true })}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loadingText}>Loading destinations...</Text>
        </View>
      ) : (
        <FlatList
          data={destinations}
          keyExtractor={(item) => item._id}
          renderItem={renderDestination}
          contentContainerStyle={destinations.length ? styles.listContent : styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDestinations(); }} tintColor={theme.primary} />}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={34} color={theme.primary} />
              <Text style={styles.emptyTitle}>No destinations found</Text>
              <Text style={styles.emptyText}>Try a different search or category.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: theme.borderLight, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  eyebrow: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 24, fontWeight: '800' },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  searchInput: { flex: 1, height: 44, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 10, paddingHorizontal: 12, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13 },
  searchButton: { width: 44, height: 44, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  filterWrap: { height: 54, justifyContent: 'center' },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filter: { height: 34, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterActive: { height: 34, borderWidth: 1, borderColor: theme.primaryMid, backgroundColor: theme.primaryLight, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  errorBox: { marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#FECACA', backgroundColor: theme.errorLight, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center' },
  errorText: { flex: 1, color: theme.error, fontFamily: 'Inter', fontSize: 12 },
  retryText: { color: theme.error, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 13, marginTop: 10 },
  listContent: { padding: 16, paddingBottom: 30 },
  emptyContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  cardImage: { width: '100%', height: 178, backgroundColor: theme.bgMuted },
  cardImageFallback: { width: '100%', height: 178, backgroundColor: theme.bgMuted, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { flex: 1, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 18, fontWeight: '800' },
  cardLocation: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 12, marginTop: 3 },
  cardSummary: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 13, lineHeight: 19, marginTop: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 13 },
  chipRow: { flex: 1, flexDirection: 'row', gap: 6 },
  chip: { color: theme.primaryDark, backgroundColor: theme.primaryLight, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  openPill: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, borderRadius: 10, backgroundColor: theme.primary },
  openText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  emptyState: { alignItems: 'center' },
  emptyTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 17, fontWeight: '800', marginTop: 12 },
  emptyText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 13, marginTop: 4 },
});
