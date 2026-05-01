import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function TravelerProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.name?.[0] || 'T'}</Text>
      </View>
      <Text style={styles.title}>{user?.name || 'Traveler'}</Text>
      <Text style={styles.subtitle}>{user?.email || 'traveler account'}</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, paddingTop: 70, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EBF3FF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { fontSize: 28, fontFamily: 'Inter', fontWeight: '700', color: '#0952C6' },
  title: { fontSize: 22, fontFamily: 'Inter', fontWeight: '700', color: '#0F172A' },
  subtitle: { marginTop: 6, fontSize: 13, fontFamily: 'Inter', color: '#475569' },
  logoutButton: { marginTop: 24, height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  logoutText: { color: '#DC2626', fontSize: 14, fontFamily: 'Inter', fontWeight: '600' },
});
