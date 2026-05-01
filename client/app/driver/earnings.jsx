import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'refunded', label: 'Refunded' },
];

const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function DriverEarningsScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [paidTotal, setPaidTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchEarnings = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const res = await api.get('/payments/driver');
      setPayments(res.data.payments || []);
      setPaidTotal(res.data.paidTotal || 0);
    } catch (error) {
      console.log('Error fetching earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEarnings({ showLoader: true });
    }, [fetchEarnings])
  );

  const stats = useMemo(() => {
    const pendingTotal = payments
      .filter((payment) => payment.status === 'pending')
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const refundedTotal = payments
      .filter((payment) => payment.status === 'refunded')
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const paidCount = payments.filter((payment) => payment.status === 'paid').length;

    return { pendingTotal, refundedTotal, paidCount };
  }, [payments]);

  const visiblePayments = useMemo(() => {
    if (activeFilter === 'all') return payments;
    return payments.filter((payment) => payment.status === activeFilter);
  }, [activeFilter, payments]);

  const renderStatusPill = (status) => {
    const stylesByStatus = {
      paid: { bg: '#EDFBF4', text: '#145C32' },
      pending: { bg: '#FFF8EC', text: '#92600A' },
      refunded: { bg: '#FFF0F0', text: '#991B1B' },
      failed: { bg: '#FFF0F0', text: '#991B1B' },
    };
    const statusStyle = stylesByStatus[status] || stylesByStatus.pending;

    return (
      <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
        <Text style={[styles.statusPillText, { color: statusStyle.text }]}>{status}</Text>
      </View>
    );
  };

  const renderBottomTabs = () => (
    <View style={styles.bottomTabBar}>
      <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/home')}>
        <Ionicons name="home-outline" size={24} color="#94A3B8" />
        <Text style={styles.tabText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/vehicles')}>
        <Ionicons name="car-outline" size={24} color="#94A3B8" />
        <Text style={styles.tabText}>Vehicles</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItemActive}>
        <Ionicons name="wallet" size={24} color="#0C6EFD" />
        <Text style={styles.tabTextActive}>Earnings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem}>
        <Ionicons name="person-outline" size={24} color="#94A3B8" />
        <Text style={styles.tabText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>Driver wallet</Text>
          <Text style={styles.headerTitle}>Earnings</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => fetchEarnings({ showLoader: true })}>
          <Ionicons name="refresh" size={18} color="#0C6EFD" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0C6EFD" />
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEarnings(); }} tintColor="#0C6EFD" />}
        >
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroLabel}>Available earnings</Text>
              <Text style={styles.heroAmount}>{formatMoney(paidTotal)}</Text>
              <Text style={styles.heroMeta}>{stats.paidCount} paid trips</Text>
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="wallet-outline" size={26} color="#0C6EFD" />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statValueSmall}>{formatMoney(stats.pendingTotal)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Refunded</Text>
              <Text style={styles.statValueSmall}>{formatMoney(stats.refundedTotal)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Records</Text>
              <Text style={styles.statValue}>{payments.length}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <Text style={styles.sectionCount}>{visiblePayments.length}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter.key;
              return (
                <TouchableOpacity key={filter.key} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setActiveFilter(filter.key)}>
                  <Text style={isActive ? styles.filterChipTextActive : styles.filterChipText}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {visiblePayments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={34} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No earnings yet</Text>
              <Text style={styles.emptyText}>Paid traveler bookings will appear here as earnings records.</Text>
            </View>
          ) : (
            visiblePayments.map((payment) => (
              <View key={payment._id} style={styles.paymentCard}>
                <View style={styles.paymentTopRow}>
                  <View style={styles.paymentIcon}>
                    <Ionicons name={payment.method === 'cash' ? 'cash-outline' : 'card-outline'} size={18} color="#0C6EFD" />
                  </View>
                  <View style={styles.paymentBody}>
                    <Text style={styles.paymentTitle}>{payment.trip?.destinationArea || 'Trip payment'}</Text>
                    <Text style={styles.paymentMeta}>{payment.traveler?.name || 'Traveler'} - {formatDate(payment.createdAt)}</Text>
                  </View>
                  {renderStatusPill(payment.status)}
                </View>

                <View style={styles.paymentBottomRow}>
                  <View>
                    <Text style={styles.receiptLabel}>Receipt</Text>
                    <Text style={styles.receiptNumber}>{payment.receiptNumber || 'Pending receipt'}</Text>
                  </View>
                  <View style={styles.amountGroup}>
                    <Text style={styles.paymentAmount}>{formatMoney(payment.amount)}</Text>
                    <Text style={styles.methodText}>{String(payment.method || '').replace('_', ' ')}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {renderBottomTabs()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#94A3B8', fontSize: 11, fontFamily: 'Inter', textAlign: 'center' },
  headerTitle: { color: '#0F172A', fontSize: 18, fontFamily: 'Inter', fontWeight: '700', textAlign: 'center' },
  refreshButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  loadingText: { color: '#475569', fontSize: 13, fontFamily: 'Inter', marginTop: 10 },
  scrollContent: { padding: 16, paddingBottom: 96 },
  heroCard: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  heroLabel: { color: '#475569', fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
  heroAmount: { color: '#0F172A', fontSize: 25, fontFamily: 'monospace', fontWeight: '700', marginTop: 6 },
  heroMeta: { color: '#94A3B8', fontSize: 12, fontFamily: 'Inter', marginTop: 4 },
  heroIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#EBF3FF', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12 },
  statLabel: { color: '#94A3B8', fontSize: 11, fontFamily: 'Inter', marginBottom: 5 },
  statValue: { color: '#0F172A', fontSize: 18, fontFamily: 'Inter', fontWeight: '700' },
  statValueSmall: { color: '#0F172A', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontFamily: 'Inter', fontWeight: '700', marginRight: 8 },
  sectionCount: { overflow: 'hidden', backgroundColor: '#EBF3FF', color: '#0952C6', fontSize: 11, fontFamily: 'Inter', fontWeight: '700', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  filterRow: { flexGrow: 0, marginBottom: 14 },
  filterChip: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  filterChipActive: { borderColor: '#3D8EFF', backgroundColor: '#EBF3FF' },
  filterChipText: { color: '#475569', fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
  filterChipTextActive: { color: '#0952C6', fontSize: 12, fontFamily: 'Inter', fontWeight: '700' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 24 },
  emptyTitle: { color: '#0F172A', fontSize: 15, fontFamily: 'Inter', fontWeight: '700', marginTop: 10 },
  emptyText: { color: '#475569', fontSize: 12, fontFamily: 'Inter', textAlign: 'center', lineHeight: 18, marginTop: 5 },
  paymentCard: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12 },
  paymentTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  paymentIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#EBF3FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  paymentBody: { flex: 1, paddingRight: 8 },
  paymentTitle: { color: '#0F172A', fontSize: 14, fontFamily: 'Inter', fontWeight: '700' },
  paymentMeta: { color: '#64748B', fontSize: 11, fontFamily: 'Inter', marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusPillText: { fontSize: 10, fontFamily: 'Inter', fontWeight: '700', textTransform: 'capitalize' },
  paymentBottomRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  receiptLabel: { color: '#94A3B8', fontSize: 10, fontFamily: 'Inter' },
  receiptNumber: { color: '#475569', fontSize: 11, fontFamily: 'monospace', marginTop: 3 },
  amountGroup: { alignItems: 'flex-end', marginLeft: 10 },
  paymentAmount: { color: '#0C6EFD', fontSize: 14, fontFamily: 'monospace', fontWeight: '700' },
  methodText: { color: '#64748B', fontSize: 10, fontFamily: 'Inter', textTransform: 'capitalize', marginTop: 3 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabItemActive: { alignItems: 'center', justifyContent: 'center' },
  tabText: { color: '#94A3B8', fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: '#0C6EFD', fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '500' },
});
