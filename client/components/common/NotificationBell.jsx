import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function NotificationBell({ size = 36, iconSize = 20, style }) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, size), [theme, size]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get('/notifications/summary');
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } catch (_error) {
      setUnreadCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={() => router.push('/notifications')}
      activeOpacity={0.75}
      accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
    >
      <Ionicons name={unreadCount ? 'notifications' : 'notifications-outline'} size={iconSize} color={theme.textPrimary} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const createStyles = (theme, size) => StyleSheet.create({
  button: {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.error,
    borderWidth: 2,
    borderColor: theme.bgPrimary,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});
