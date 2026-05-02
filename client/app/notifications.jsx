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
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const typeIcons = {
  booking: 'calendar-outline',
  payment: 'card-outline',
  trip: 'map-outline',
  review: 'star-outline',
  system: 'information-circle-outline',
};

const formatTimeAgo = (value) => {
  if (!value) return '';
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotifications = useCallback(async ({ refreshing: isRefresh = false } = {}) => {
    try {
      setErrorMessage('');
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get('/notifications');
      setNotifications(res.data?.notifications || []);
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    } catch (_error) {
      setErrorMessage('Could not mark notifications as read.');
    }
  };

  const openNotification = async (notification) => {
    try {
      if (!notification.readAt) {
        await api.put(`/notifications/${notification._id}/read`);
        setUnreadCount((count) => Math.max(0, count - 1));
        setNotifications((current) => current.map((item) => (
          item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item
        )));
      }

      if (notification.actionRoute) {
        router.push(notification.actionRoute);
      }
    } catch (_error) {
      setErrorMessage('Could not open this notification.');
    }
  };

  const renderNotification = (notification) => {
    const isUnread = !notification.readAt;
    const iconName = typeIcons[notification.type] || typeIcons.system;

    return (
      <TouchableOpacity
        key={notification._id}
        style={[styles.notificationRow, isUnread && styles.notificationRowUnread]}
        onPress={() => openNotification(notification)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconCircle, notification.priority === 'high' && styles.iconCircleHigh]}>
          <Ionicons name={iconName} size={18} color={notification.priority === 'high' ? theme.error : theme.primary} />
        </View>
        <View style={styles.notificationBody}>
          <View style={styles.notificationTitleRow}>
            <Text style={styles.notificationTitle} numberOfLines={1}>{notification.title}</Text>
            {isUnread ? <View style={styles.unreadDot} /> : null}
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>{notification.message}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.typeText}>{notification.type || 'system'}</Text>
            <Text style={styles.timeText}>{formatTimeAgo(notification.createdAt)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</Text>
        </View>
        <TouchableOpacity style={styles.markReadButton} onPress={markAllRead} disabled={!unreadCount}>
          <Ionicons name="checkmark-done-outline" size={18} color={unreadCount ? theme.primary : theme.textMuted} />
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorStrip}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications({ refreshing: true })}
              tintColor={theme.primary}
            />
          }
        >
          {notifications.length ? (
            notifications.map(renderNotification)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={34} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>Booking, payment, trip, and admin updates will appear here.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: {
    minHeight: 92,
    paddingTop: 42,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: theme.borderLight, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgSurface },
  titleBlock: { flex: 1, paddingHorizontal: 12 },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 22, fontWeight: '800' },
  subtitle: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  markReadButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: theme.borderLight, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgSurface },
  errorStrip: { margin: 16, marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.error, backgroundColor: theme.errorLight, borderRadius: 12, padding: 12 },
  errorText: { flex: 1, color: theme.error, fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 12, marginTop: 10 },
  scrollContent: { padding: 16, paddingBottom: 34 },
  notificationRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.bgPrimary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  notificationRowUnread: { backgroundColor: theme.bgSurface, borderColor: theme.primaryMid },
  iconCircle: { width: 38, height: 38, borderRadius: 11, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconCircleHigh: { backgroundColor: theme.errorLight },
  notificationBody: { flex: 1 },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationTitle: { flex: 1, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.error },
  notificationMessage: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  typeText: { color: theme.primaryDark, backgroundColor: theme.primaryLight, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, fontFamily: 'Inter', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  timeText: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11 },
  emptyState: { minHeight: 360, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 15, fontWeight: '800', marginTop: 12 },
  emptyText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
});
