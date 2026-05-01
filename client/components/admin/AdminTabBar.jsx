import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const tabs = [
  { label: 'Overview', icon: 'home-outline', activeIcon: 'home', route: '/admin/home' },
  { label: 'Users', icon: 'people-outline', activeIcon: 'people', route: '/admin/users' },
  { label: 'Trips', icon: 'map-outline', activeIcon: 'map', route: '/admin/trips' },
  { label: 'Payments', icon: 'card-outline', activeIcon: 'card', route: '/admin/payments' },
  { label: 'Reviews', icon: 'star-outline', activeIcon: 'star', route: '/admin/reviews' },
];

export default function AdminTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tabItem}
            onPress={() => {
              if (!isActive) router.replace(tab.route);
            }}
            activeOpacity={0.75}
          >
            <Ionicons name={isActive ? tab.activeIcon : tab.icon} size={21} color={isActive ? theme.primary : theme.textMuted} />
            <Text style={isActive ? styles.activeLabel : styles.label} numberOfLines={1}>{tab.label}</Text>
            {isActive ? <View style={styles.activeDot} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 66,
    backgroundColor: theme.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: { flex: 1, minWidth: 0, height: 58, alignItems: 'center', justifyContent: 'center' },
  label: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 10, marginTop: 4 },
  activeLabel: { color: theme.primary, fontFamily: 'Inter', fontSize: 10, marginTop: 4, fontWeight: '700' },
  activeDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary },
});
