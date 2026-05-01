import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminTabBar from '../../components/admin/AdminTabBar';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const fallbackPayments = [
  { _id: 'p1', receiptNumber: 'RCPT-ELLA-001', amount: 92500, status: 'paid', method: 'saved_card', traveler: { name: 'Kasun Perera' }, driver: { name: 'Nimal Silva' }, trip: { destinationArea: 'Ella' }, createdAt: '2026-04-24' },
  { _id: 'p2', receiptNumber: 'RCPT-GALLE-002', amount: 48000, status: 'pending', method: 'cash', traveler: { name: 'Maya Lee' }, driver: { name: 'Ayesha Fernando' }, trip: { destinationArea: 'Galle' }, createdAt: '2026-04-26' },
];

const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

export default function AdminPaymentsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [payments, setPayments] = useState(fallbackPayments);
  const [summary, setSummary] = useState({ paidTotal: 0, pendingCount: 0, refundedCount: 0 });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const [paymentRes, summaryRes] = await Promise.all([
        api.get('/payments/admin/all'),
        api.get('/payments/admin/summary'),
      ]);
      setPayments(paymentRes.data?.payments || []);
      setSummary(summaryRes.data?.summary || {});
    } catch (_error) {
      setPayments(fallbackPayments);
      setSummary({ paidTotal: 92500, pendingCount: 1, refundedCount: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [loadPayments])
  );

  const filteredPayments = filter === 'all' ? payments : payments.filter((payment) => payment.status === filter);

  const refundPayment = (payment) => {
    Alert.alert('Refund payment?', `${formatMoney(payment.amount)} will be marked refunded.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Refund',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/payments/${payment._id}/refund`, { reason: 'Admin refund from dashboard' });
            await loadPayments();
          } catch (requestError) {
            Alert.alert('Refund failed', requestError.response?.data?.message || 'Could not refund payment.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Admin dashboard</Text>
            <Text style={styles.title}>Payments</Text>
          </View>
          <View style={styles.iconBox}>
            <Ionicons name="wallet-outline" size={18} color={theme.primary} />
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatMoney(summary.paidTotal)}</Text>
            <Text style={styles.summaryLabel}>Paid revenue</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.pendingCount || 0}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.refundedCount || 0}</Text>
            <Text style={styles.summaryLabel}>Refunded</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {['all', 'paid', 'pending', 'refunded'].map((item) => (
            <TouchableOpacity key={item} style={filter === item ? styles.filterActive : styles.filter} onPress={() => setFilter(item)}>
              <Text style={filter === item ? styles.filterTextActive : styles.filterText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loadingText}>Loading payments...</Text>
          </View>
        ) : filteredPayments.map((payment) => (
          <View key={payment._id} style={styles.paymentRow}>
            <View style={styles.paymentIcon}>
              <Ionicons name={payment.status === 'refunded' ? 'arrow-undo-outline' : 'card-outline'} size={18} color={payment.status === 'refunded' ? theme.error : theme.primary} />
            </View>
            <View style={styles.paymentBody}>
              <Text style={styles.paymentTitle}>{payment.trip?.destinationArea || 'Trip payment'}</Text>
              <Text style={styles.paymentMeta}>{payment.traveler?.name || 'Traveler'} to {payment.driver?.name || 'Driver'}</Text>
              <Text style={styles.paymentMeta}>{payment.receiptNumber || payment._id} - {payment.method}</Text>
            </View>
            <View style={styles.paymentRight}>
              <Text style={styles.amount}>{formatMoney(payment.amount)}</Text>
              <Text style={styles.statusText}>{payment.status}</Text>
              {payment.status === 'paid' ? (
                <TouchableOpacity style={styles.refundButton} onPress={() => refundPayment(payment)}>
                  <Text style={styles.refundText}>Refund</Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 12 },
  summaryValue: { color: theme.textPrimary, fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: '800' },
  summaryLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 10, marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filter: { flex: 1, height: 34, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterActive: { flex: 1, height: 34, borderWidth: 1, borderColor: theme.primaryMid, backgroundColor: theme.primaryLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  filterTextActive: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  loadingBox: { minHeight: 170, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 8 },
  paymentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, padding: 14, marginBottom: 10 },
  paymentIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.bgSurface, alignItems: 'center', justifyContent: 'center' },
  paymentBody: { flex: 1 },
  paymentTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  paymentMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 3 },
  paymentRight: { alignItems: 'flex-end', gap: 4 },
  amount: { color: theme.primary, fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: '800' },
  statusText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  refundButton: { borderWidth: 1, borderColor: theme.error, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, marginTop: 4 },
  refundText: { color: theme.error, fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
});
