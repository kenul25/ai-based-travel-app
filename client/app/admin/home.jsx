import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AdminTabBar from '../../components/admin/AdminTabBar';
import NotificationBell from '../../components/common/NotificationBell';
import api from '../../services/api';

const emptyStats = {
  totalUsers: 0,
  activeDrivers: 0,
  totalTrips: 0,
  revenue: 0,
  aiPlans: 0,
  pendingDrivers: 0,
  refundsPending: 0,
};

const formatCompactNumber = (value = 0) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
};

const formatCurrency = (value = 0) => `LKR ${formatCompactNumber(Number(value || 0))}`;

const getInitials = (name) => {
  if (!name) return 'AD';
  const parts = name.trim().split(' ');
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

const formatDate = (value) => {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function AdminHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [stats, setStats] = useState(emptyStats);
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [trips, setTrips] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadOverview = useCallback(async ({ refreshing = false } = {}) => {
    try {
      setErrorMessage('');
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [statsRes, usersRes, adminsRes, tripsRes, paymentsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/admins'),
        api.get('/admin/trips'),
        api.get('/payments/admin/all'),
      ]);

      setStats({ ...emptyStats, ...(statsRes.data?.stats || {}) });
      setUsers(usersRes.data?.users || []);
      setAdmins(adminsRes.data?.admins || []);
      setTrips(tripsRes.data?.trips || []);
      setPayments(paymentsRes.data?.payments || []);
    } catch (error) {
      setStats(emptyStats);
      setUsers([]);
      setAdmins([]);
      setTrips([]);
      setPayments([]);
      setErrorMessage(error.response?.data?.message || 'Unable to load live admin overview data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOverview();
    }, [loadOverview])
  );

  const pendingAccounts = useMemo(() => (
    users
      .filter((account) => account.role === 'driver' ? !account.isVerified || !account.isActive : !account.isActive)
      .slice(0, 3)
  ), [users]);

  const recentTrips = useMemo(() => trips.slice(0, 3), [trips]);
  const recentAdmins = useMemo(() => admins.slice(0, 3), [admins]);

  const recentActivity = useMemo(() => {
    const tripItems = trips.slice(0, 2).map((trip) => ({
      id: `trip-${trip._id}`,
      icon: 'sparkles-outline',
      text: `${trip.user?.name || 'Traveler'} generated a plan for ${trip.destinationArea || 'a trip'}`,
      time: formatDate(trip.createdAt),
      tone: 'amber',
      createdAt: trip.createdAt,
    }));

    const paymentItems = payments.slice(0, 2).map((payment) => ({
      id: `payment-${payment._id}`,
      icon: payment.status === 'refunded' ? 'arrow-undo-outline' : 'card-outline',
      text: `${payment.status || 'payment'} payment ${payment.receiptNumber || payment._id}`,
      time: formatDate(payment.createdAt),
      tone: payment.status === 'refunded' ? 'red' : 'blue',
      createdAt: payment.createdAt,
    }));

    const userItems = users.slice(0, 2).map((account) => ({
      id: `user-${account._id}`,
      icon: account.role === 'driver' ? 'car-sport-outline' : 'person-outline',
      text: `${account.name} joined as ${account.role}`,
      time: formatDate(account.createdAt),
      tone: account.isActive ? 'green' : 'red',
      createdAt: account.createdAt,
    }));

    return [...tripItems, ...paymentItems, ...userItems]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 4);
  }, [payments, trips, users]);

  const kpis = [
    {
      label: 'Total users',
      value: formatCompactNumber(stats.totalUsers),
      trend: `${users.filter((item) => item.isActive).length} active`,
      icon: 'people-outline',
      tone: 'blue',
    },
    {
      label: 'Active drivers',
      value: formatCompactNumber(stats.activeDrivers),
      trend: `${stats.pendingDrivers || 0} pending`,
      icon: 'car-sport-outline',
      tone: 'green',
    },
    {
      label: 'AI trips',
      value: formatCompactNumber(stats.aiPlans || stats.totalTrips),
      trend: `${stats.totalTrips || 0} total trips`,
      icon: 'sparkles-outline',
      tone: 'amber',
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats.revenue),
      trend: `${payments.filter((payment) => payment.status === 'refunded').length} refunds`,
      icon: 'wallet-outline',
      tone: 'blue',
    },
  ];

  const toneStyle = (tone) => {
    const map = {
      blue: { bg: theme.primaryLight, icon: theme.primary, text: theme.primaryDark },
      green: { bg: theme.successLight, icon: theme.success, text: theme.success },
      amber: { bg: theme.amberLight, icon: theme.amber, text: theme.amberDark },
      red: { bg: theme.errorLight, icon: theme.error, text: theme.error },
      slate: { bg: theme.bgMuted, icon: theme.textSecond, text: theme.textSecond },
    };
    return map[tone] || map.blue;
  };

  const quickActions = [
    { label: 'Users', icon: 'people-outline', route: '/admin/users', tone: 'blue' },
    { label: 'Trips', icon: 'map-outline', route: '/admin/trips', tone: 'green' },
    { label: 'Payments', icon: 'card-outline', route: '/admin/payments', tone: 'amber' },
    { label: 'Reviews', icon: 'star-outline', route: '/admin/reviews', tone: 'slate' },
  ];

  const renderEmpty = (title, body) => (
    <View style={styles.emptyState}>
      <Ionicons name="file-tray-outline" size={24} color={theme.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadOverview({ refreshing: true })}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.topTitleBlock}>
            <Text style={styles.eyebrow}>Admin panel</Text>
            <Text style={styles.title}>Overview</Text>
          </View>
          <View style={styles.headerIconRow}>
            <NotificationBell size={38} iconSize={19} style={styles.notificationButton} />
            <TouchableOpacity style={styles.avatarButton} onPress={() => router.push('/admin/profile')} accessibilityLabel="Open admin profile">
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroPanel}>
          <View>
            <Text style={styles.heroTitle}>Platform control center</Text>
            <Text style={styles.heroText}>Live users, AI trips, payments, and admin activity from the server.</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={() => loadOverview({ refreshing: true })}>
            <Ionicons name="refresh-outline" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingStrip}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loadingText}>Loading live overview...</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorStrip}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.kpiGrid}>
          {kpis.map((item) => {
            const tone = toneStyle(item.tone);
            return (
              <View key={item.label} style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
                    <Ionicons name={item.icon} size={18} color={tone.icon} />
                  </View>
                  <Text style={[styles.trendText, { color: tone.text }]}>{item.trend}</Text>
                </View>
                <Text style={styles.kpiValue}>{item.value}</Text>
                <Text style={styles.kpiLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <Text style={styles.sectionMeta}>Navigate</Text>
          </View>
          <View style={styles.quickActionRow}>
            {quickActions.map((action) => {
              const tone = toneStyle(action.tone);
              return (
                <TouchableOpacity key={action.label} style={styles.quickActionCard} activeOpacity={0.75} onPress={() => router.push(action.route)}>
                  <View style={[styles.quickActionIcon, { backgroundColor: tone.bg }]}>
                    <Ionicons name={action.icon} size={18} color={tone.icon} />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Needs attention</Text>
            <Text style={styles.sectionMeta}>{pendingAccounts.length} accounts</Text>
          </View>
          <View style={styles.listCard}>
            {pendingAccounts.length ? pendingAccounts.map((account, index) => (
              <View key={account._id} style={[styles.listRow, index === pendingAccounts.length - 1 && styles.lastRow]}>
                <View style={styles.initialsCircle}>
                  <Text style={styles.initialsText}>{getInitials(account.name)}</Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{account.name}</Text>
                  <Text style={styles.rowSub}>{account.role} - {account.isActive ? 'Verification pending' : 'Inactive account'}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{account.role === 'driver' && !account.isVerified ? 'Verify' : 'Review'}</Text>
                </View>
              </View>
            )) : renderEmpty('No pending accounts', 'Drivers and user access issues will appear here.')}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent AI trips</Text>
            <Text style={styles.sectionMeta}>{recentTrips.length} plans</Text>
          </View>
          <View style={styles.listCard}>
            {recentTrips.length ? recentTrips.map((trip, index) => (
              <View key={trip._id} style={[styles.listRow, index === recentTrips.length - 1 && styles.lastRow]}>
                <View style={[styles.iconBox, { backgroundColor: theme.amberLight }]}>
                  <Ionicons name="sparkles-outline" size={17} color={theme.amber} />
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.inlineRow}>
                    <Text style={styles.rowTitle}>{trip.destinationArea || 'AI Trip'}</Text>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                  </View>
                  <Text style={styles.rowSub}>{trip.user?.name || 'Traveler'} - {formatDate(trip.createdAt)}</Text>
                </View>
                <View style={styles.rightMeta}>
                  <Text style={styles.monoAmount}>{formatCurrency(trip.totalEstimatedCost || trip.budget)}</Text>
                  <Text style={styles.rowSub}>{trip.status || 'draft'}</Text>
                </View>
              </View>
            )) : renderEmpty('No trips yet', 'Generated AI trip plans will appear after travelers create them.')}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Admin accounts</Text>
            <Text style={styles.sectionMeta}>{recentAdmins.length} shown</Text>
          </View>
          <View style={styles.listCard}>
            {recentAdmins.length ? recentAdmins.map((admin, index) => (
              <View key={admin._id} style={[styles.listRow, index === recentAdmins.length - 1 && styles.lastRow]}>
                <View style={styles.initialsCircle}>
                  <Text style={styles.initialsText}>{getInitials(admin.name)}</Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{admin.name}</Text>
                  <Text style={styles.rowSub}>Created by: {admin.createdBy?.name || 'System'}</Text>
                </View>
                <View style={styles.adminMeta}>
                  <Text style={admin.role === 'superadmin' ? styles.superSmallText : styles.adminSmallText}>
                    {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                  </Text>
                  <View style={[styles.statusDot, { backgroundColor: admin.isActive ? theme.success : theme.textMuted }]} />
                </View>
              </View>
            )) : renderEmpty('No admins found', 'Created admin accounts will be listed here.')}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Text style={styles.sectionMeta}>Live records</Text>
          </View>
          <View style={styles.activityCard}>
            {recentActivity.length ? recentActivity.map((activity, index) => {
              const tone = toneStyle(activity.tone);
              return (
                <View key={activity.id} style={[styles.activityRow, index === recentActivity.length - 1 && styles.lastRow]}>
                  <View style={[styles.activityIcon, { backgroundColor: tone.bg }]}>
                    <Ionicons name={activity.icon} size={16} color={tone.icon} />
                  </View>
                  <Text style={styles.activityText}>{activity.text}</Text>
                  <Text style={styles.timeBadge}>{activity.time}</Text>
                </View>
              );
            }) : renderEmpty('No activity yet', 'User, trip, and payment activity will appear here.')}
          </View>
        </View>
      </ScrollView>
      <AdminTabBar />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { padding: 16, paddingTop: 58, paddingBottom: 94 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  topTitleBlock: { flex: 1, paddingRight: 12 },
  eyebrow: { fontSize: 11, color: theme.textMuted, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 24, lineHeight: 32, color: theme.textPrimary, fontFamily: 'Inter', fontWeight: '800', marginTop: 2 },
  headerIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notificationButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notificationDot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: theme.error, borderWidth: 1, borderColor: theme.bgSurface },
  avatarButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
  heroPanel: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 16, fontWeight: '800' },
  heroText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: 250 },
  refreshButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  loadingStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 12, marginBottom: 14 },
  loadingText: { fontFamily: 'Inter', fontSize: 12, color: theme.textSecond },
  errorStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.error, backgroundColor: theme.errorLight, borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { flex: 1, fontFamily: 'Inter', fontSize: 12, color: theme.error, lineHeight: 18 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  kpiCard: { width: '48.5%', minHeight: 128, backgroundColor: theme.bgSurface, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 12, padding: 14 },
  kpiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  trendText: { flex: 1, textAlign: 'right', fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  kpiValue: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 16 },
  kpiLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 4 },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 16, fontWeight: '800' },
  sectionMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11 },
  quickActionRow: { flexDirection: 'row', gap: 8 },
  quickActionCard: { flex: 1, minHeight: 82, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 10 },
  quickActionIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionLabel: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  listCard: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, overflow: 'hidden' },
  listRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight, gap: 10 },
  lastRow: { borderBottomWidth: 0 },
  initialsCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  rowContent: { flex: 1 },
  rowTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
  rowSub: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 3, textTransform: 'capitalize' },
  pendingBadge: { borderRadius: 999, backgroundColor: theme.amberLight, borderWidth: 1, borderColor: theme.amber, paddingHorizontal: 9, paddingVertical: 4 },
  pendingBadgeText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiBadge: { borderRadius: 999, backgroundColor: theme.amberLight, paddingHorizontal: 6, paddingVertical: 2 },
  aiBadgeText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 9, fontWeight: '800' },
  rightMeta: { alignItems: 'flex-end' },
  monoAmount: { color: theme.primary, fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: '800' },
  adminMeta: { alignItems: 'flex-end', gap: 6 },
  superSmallText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
  adminSmallText: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  activityCard: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, overflow: 'hidden' },
  activityRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderLight, gap: 10 },
  activityIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  timeBadge: { color: theme.textMuted, backgroundColor: theme.bgSurface, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, fontFamily: 'Inter', fontSize: 10 },
  emptyState: { minHeight: 126, alignItems: 'center', justifyContent: 'center', padding: 18 },
  emptyTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, fontWeight: '800', marginTop: 8 },
  emptyBody: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 3 },
});
