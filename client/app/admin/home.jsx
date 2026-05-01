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
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AdminTabBar from '../../components/admin/AdminTabBar';
import api from '../../services/api';

const fallbackStats = {
  totalUsers: 1284,
  activeDrivers: 86,
  totalTrips: 342,
  revenue: 4285000,
  aiPlans: 214,
  pendingDrivers: 9,
  refundsPending: 3,
  groqFailures: 2,
};

const quickActions = [
  { label: 'Users', icon: 'people-outline', tone: 'blue' },
  { label: 'Drivers', icon: 'shield-checkmark-outline', tone: 'green' },
  { label: 'Admins', icon: 'person-add-outline', tone: 'amber' },
  { label: 'Reports', icon: 'bar-chart-outline', tone: 'slate' },
];

const reviewQueue = [
  { id: 'DRV-1042', name: 'Nimal Perera', meta: 'Van - License pending', status: 'Verify' },
  { id: 'DRV-1038', name: 'Ayesha Fernando', meta: 'Car - Documents updated', status: 'Review' },
  { id: 'USR-8821', name: 'Kasun Silva', meta: 'Traveler account flagged', status: 'Check' },
];

const aiTripPlans = [
  { id: 'TRP-2401', traveler: 'Tharindu Jay', destination: 'Ella', status: 'Draft', cost: 92500 },
  { id: 'TRP-2398', traveler: 'Maya Lee', destination: 'South Coast', status: 'Confirmed', cost: 148000 },
  { id: 'TRP-2395', traveler: 'Ishara D.', destination: 'Kandy', status: 'Completed', cost: 68200 },
];

const adminAccounts = [
  { name: 'Super Admin', role: 'Super Admin', active: true, createdBy: 'System seed' },
  { name: 'Operations Admin', role: 'Admin', active: true, createdBy: 'Super Admin' },
  { name: 'Support Admin', role: 'Admin', active: false, createdBy: 'Operations Admin' },
];

const activityItems = [
  { icon: 'sparkles-outline', text: 'Groq generated a 4-day plan for Ella', time: '12 min ago', tone: 'amber' },
  { icon: 'card-outline', text: 'Payment refund requested for TRP-2391', time: '31 min ago', tone: 'red' },
  { icon: 'checkmark-circle-outline', text: 'Driver account verified by admin', time: '1 hr ago', tone: 'green' },
  { icon: 'person-add-outline', text: 'New admin account created', time: 'Yesterday', tone: 'blue' },
];

const formatCompactNumber = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
};

const formatCurrency = (value) => `LKR ${formatCompactNumber(value)}`;

export default function AdminHomeScreen() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [stats, setStats] = useState(fallbackStats);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Admin';

  const loadStats = useCallback(async ({ refreshing = false } = {}) => {
    try {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const response = await api.get('/admin/stats');
      setStats((current) => ({ ...current, ...(response.data?.stats || response.data || {}) }));
    } catch (_error) {
      setStats(fallbackStats);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const kpis = [
    {
      label: 'Total users',
      value: formatCompactNumber(stats.totalUsers || 0),
      trend: '+12% this month',
      icon: 'people-outline',
      tone: 'blue',
    },
    {
      label: 'Active drivers',
      value: formatCompactNumber(stats.activeDrivers || 0),
      trend: `${stats.pendingDrivers || 0} pending`,
      icon: 'car-sport-outline',
      tone: 'green',
    },
    {
      label: 'AI trips',
      value: formatCompactNumber(stats.aiPlans || stats.totalTrips || 0),
      trend: `${stats.groqFailures || 0} failed runs`,
      icon: 'sparkles-outline',
      tone: 'amber',
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats.revenue || 0),
      trend: `${stats.refundsPending || 0} refunds`,
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
      slate: { bg: theme.bgMuted, icon: theme.textSecondary, text: theme.textSecondary },
    };
    return map[tone] || map.blue;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadStats({ refreshing: true })}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.eyebrow}>Admin panel</Text>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Monitor users, drivers, AI plans, revenue, and admin access.</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={[styles.roleBadge, isSuperAdmin ? styles.superRoleBadge : styles.adminRoleBadge]}>
              <Text style={[styles.roleBadgeText, isSuperAdmin ? styles.superRoleText : styles.adminRoleText]}>{roleLabel}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={logout} accessibilityLabel="Sign out">
              <Ionicons name="log-out-outline" size={18} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingStrip}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loadingText}>Refreshing platform metrics...</Text>
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
            <Text style={styles.sectionMeta}>Control center</Text>
          </View>
          <View style={styles.quickActionRow}>
            {quickActions.map((action) => {
              const tone = toneStyle(action.tone);
              return (
                <TouchableOpacity key={action.label} style={styles.quickActionCard} activeOpacity={0.75}>
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
            <Text style={styles.sectionTitle}>Operations queue</Text>
            <Text style={styles.sectionMeta}>{reviewQueue.length} items</Text>
          </View>
          <View style={styles.listCard}>
            {reviewQueue.map((item, index) => (
              <View key={item.id} style={[styles.listRow, index === reviewQueue.length - 1 && styles.lastRow]}>
                <View style={styles.initialsCircle}>
                  <Text style={styles.initialsText}>{item.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowSub}>{item.id} - {item.meta}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI trip history</Text>
            <Text style={styles.sectionMeta}>Groq plans</Text>
          </View>
          <View style={styles.listCard}>
            {aiTripPlans.map((trip, index) => (
              <View key={trip.id} style={[styles.listRow, index === aiTripPlans.length - 1 && styles.lastRow]}>
                <View style={[styles.iconBox, { backgroundColor: theme.amberLight }]}>
                  <Ionicons name="sparkles-outline" size={17} color={theme.amber} />
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.inlineRow}>
                    <Text style={styles.rowTitle}>{trip.destination}</Text>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                  </View>
                  <Text style={styles.rowSub}>{trip.traveler} - {trip.id}</Text>
                </View>
                <View style={styles.rightMeta}>
                  <Text style={styles.monoAmount}>LKR {formatCompactNumber(trip.cost)}</Text>
                  <Text style={styles.rowSub}>{trip.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Admin governance</Text>
            <Text style={styles.sectionMeta}>{adminAccounts.length} accounts</Text>
          </View>
          <View style={styles.listCard}>
            {adminAccounts.map((admin, index) => (
              <View key={`${admin.name}-${admin.role}`} style={[styles.listRow, index === adminAccounts.length - 1 && styles.lastRow]}>
                <View style={styles.initialsCircle}>
                  <Text style={styles.initialsText}>{admin.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{admin.name}</Text>
                  <Text style={styles.rowSub}>Created by: {admin.createdBy}</Text>
                </View>
                <View style={styles.adminMeta}>
                  <Text style={admin.role === 'Super Admin' ? styles.superSmallText : styles.adminSmallText}>{admin.role}</Text>
                  <View style={[styles.statusDot, { backgroundColor: admin.active ? theme.success : theme.textMuted }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Text style={styles.sectionMeta}>Live audit trail</Text>
          </View>
          <View style={styles.activityCard}>
            {activityItems.map((activity, index) => {
              const tone = toneStyle(activity.tone);
              return (
                <View key={`${activity.text}-${activity.time}`} style={[styles.activityRow, index === activityItems.length - 1 && styles.lastRow]}>
                  <View style={[styles.activityIcon, { backgroundColor: tone.bg }]}>
                    <Ionicons name={activity.icon} size={16} color={tone.icon} />
                  </View>
                  <Text style={styles.activityText}>{activity.text}</Text>
                  <Text style={styles.timeBadge}>{activity.time}</Text>
                </View>
              );
            })}
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  headerTextBlock: { flex: 1, paddingRight: 12 },
  eyebrow: { fontSize: 11, color: theme.textMuted, fontFamily: 'Inter', fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 24, lineHeight: 32, color: theme.textPrimary, fontFamily: 'Inter', fontWeight: '700', marginTop: 2 },
  subtitle: { fontSize: 13, lineHeight: 20, color: theme.textSecond, fontFamily: 'Inter', marginTop: 4 },
  headerActions: { alignItems: 'flex-end', gap: 10 },
  roleBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  superRoleBadge: { backgroundColor: theme.amberLight, borderColor: theme.amber },
  adminRoleBadge: { backgroundColor: theme.primaryLight, borderColor: theme.primaryMid },
  roleBadgeText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  superRoleText: { color: theme.amberDark },
  adminRoleText: { color: theme.primaryDark },
  logoutButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  loadingStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 12, marginBottom: 14 },
  loadingText: { fontFamily: 'Inter', fontSize: 12, color: theme.textSecond },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  kpiCard: { width: '48.5%', minHeight: 128, backgroundColor: theme.bgSurface, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 12, padding: 14 },
  kpiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  trendText: { flex: 1, textAlign: 'right', fontFamily: 'Inter', fontSize: 10, fontWeight: '600' },
  kpiValue: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 22, lineHeight: 28, fontWeight: '700', marginTop: 16 },
  kpiLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 4 },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },
  sectionMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11 },
  quickActionRow: { flexDirection: 'row', gap: 8 },
  quickActionCard: { flex: 1, minHeight: 82, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 10 },
  quickActionIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionLabel: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  listCard: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, overflow: 'hidden' },
  listRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight, gap: 10 },
  lastRow: { borderBottomWidth: 0 },
  initialsCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  rowContent: { flex: 1 },
  rowTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  rowSub: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 3 },
  pendingBadge: { borderRadius: 999, backgroundColor: theme.amberLight, borderWidth: 1, borderColor: theme.amber, paddingHorizontal: 9, paddingVertical: 4 },
  pendingBadgeText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiBadge: { borderRadius: 999, backgroundColor: theme.amberLight, paddingHorizontal: 6, paddingVertical: 2 },
  aiBadgeText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 9, fontWeight: '800' },
  rightMeta: { alignItems: 'flex-end' },
  monoAmount: { color: theme.primary, fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: '700' },
  adminMeta: { alignItems: 'flex-end', gap: 6 },
  superSmallText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  adminSmallText: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  activityCard: { backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, overflow: 'hidden' },
  activityRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderLight, gap: 10 },
  activityIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  timeBadge: { color: theme.textMuted, backgroundColor: theme.bgSurface, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, fontFamily: 'Inter', fontSize: 10 },
});
