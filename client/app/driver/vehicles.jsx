import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function ManageVehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [])
  );

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vehicles/my');
      setVehicles(res.data.vehicles || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (id, currentValue) => {
    try {
      // Optimistic UI update
      setVehicles(prev => prev.map(v => v._id === id ? { ...v, isAvailable: !currentValue } : v));
      await api.put(`/vehicles/${id}/toggle`);
    } catch (_e) {
      setVehicles(prev => prev.map(v => v._id === id ? { ...v, isAvailable: currentValue } : v));
      alert('Failed to update status');
    }
  };

  const deleteVehicle = (vehicle) => {
    Alert.alert(
      'Delete vehicle',
      `Delete ${vehicle.brand} ${vehicle.model} (${vehicle.regNumber})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/vehicles/${vehicle._id}`);
              setVehicles((current) => current.filter((item) => item._id !== vehicle._id));
            } catch (error) {
              Alert.alert('Delete failed', error.response?.data?.message || 'Could not delete this vehicle.');
            }
          },
        },
      ]
    );
  };

  const renderVehicleItem = ({ item }) => (
    <View style={styles.vehicleCard}>
      <ImageBackground 
        source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?width=800&q=80' }} 
        style={styles.imageRow}
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.regNumber}>{item.regNumber}</Text>
          <Switch 
            value={item.isAvailable}
            onValueChange={() => toggleAvailability(item._id, item.isAvailable)}
            trackColor={{ false: '#E2E8F0', true: '#0C6EFD' }}
            thumbColor={'#FFFFFF'}
          />
        </View>

        <Text style={styles.brandModel}>{item.brand} {item.model}</Text>

        <View style={styles.specsRow}>
          <View style={styles.specPill}>
            <Ionicons name="car" size={12} color="#94A3B8" />
            <Text style={styles.specPillText}>{item.type}</Text>
          </View>
          <View style={styles.specPill}>
            <Ionicons name="people" size={12} color="#94A3B8" />
            <Text style={styles.specPillText}>{item.capacity} places</Text>
          </View>
          <Text style={styles.priceText}>LKR {item.pricePerDay} / day</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push(`/driver/add-vehicle?vehicleId=${item._id}`)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteVehicle(item)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/driver/add-vehicle')}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.emptyRequests}>
          <ActivityIndicator color="#0C6EFD" />
          <Text style={styles.emptyText}>Loading vehicles...</Text>
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.emptyRequests}>
          <Ionicons name="car-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No vehicles listed</Text>
          <Text style={styles.emptyText}>Add your first vehicle to start receiving bookings.</Text>
        </View>
      ) : (
        <FlatList 
          data={vehicles}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={renderVehicleItem}
        />
      )}

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/home')}>
          <Ionicons name="home-outline" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItemActive}>
          <Ionicons name="car" size={24} color="#0C6EFD" />
          <Text style={styles.tabTextActive}>Vehicles</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/driver/earnings')}>
          <Ionicons name="wallet-outline" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="person-outline" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A' },
  addBtn: { backgroundColor: '#0C6EFD', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter', fontWeight: '600', marginLeft: 4 },

  emptyRequests: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#94A3B8', fontFamily: 'Inter', textAlign: 'center', marginTop: 8 },

  listContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 90 },
  vehicleCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  imageRow: { height: 140, backgroundColor: '#EBF3FF' },
  body: { padding: 14 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  regNumber: { fontSize: 16, fontFamily: 'monospace', color: '#0F172A', fontWeight: '600' },
  brandModel: { fontSize: 13, fontFamily: 'Inter', color: '#475569', marginBottom: 12 },
  
  specsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  specPill: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  specPillText: { fontSize: 11, fontFamily: 'Inter', color: '#475569' },
  priceText: { flex: 1, textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#0C6EFD', fontWeight: '600' },

  footerRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 12, gap: 10 },
  editBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  editBtnText: { color: '#475569', fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  deleteBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DC2626' },
  deleteBtnText: { color: '#DC2626', fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabItemActive: { alignItems: 'center', justifyContent: 'center' },
  tabText: { color: '#94A3B8', fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: '#0C6EFD', fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '500' }
});
