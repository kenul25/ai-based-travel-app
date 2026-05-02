import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';

const typeOrder = ['All', 'Car', 'Van', 'Bus', 'Tuk-Tuk'];

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

const getTripDays = (trip) => {
  if (!trip?.startDate || !trip?.endDate) return 1;
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
};

export default function BookVehicleScreen() {
  const { tripId } = useLocalSearchParams();
  const router = useRouter();
  const [trip, setTrip] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedType, setSelectedType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tripRes, vehiclesRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get('/vehicles', { params: { isAvailable: true } }),
      ]);

      const tripData = tripRes.data.trip;
      const vehicleData = vehiclesRes.data.vehicles || [];
      const passengerCount = Number(tripData.passengers || 1);
      const usableVehicles = vehicleData.filter((vehicle) => Number(vehicle.capacity || 0) >= passengerCount);

      setTrip(tripData);
      setVehicles(usableVehicles);
      setSelectedVehicle(usableVehicles[0] || null);
    } catch (error) {
      Alert.alert('Could not load vehicles', error.response?.data?.message || 'Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [router, tripId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tripDays = getTripDays(trip);
  const filteredVehicles = useMemo(() => {
    if (selectedType === 'All') return vehicles;
    return vehicles.filter((vehicle) => vehicle.type === selectedType);
  }, [selectedType, vehicles]);
  const totalAmount = selectedVehicle ? Number(selectedVehicle.pricePerDay || 0) * tripDays : 0;

  const confirmBooking = async () => {
    if (!selectedVehicle) {
      Alert.alert('Select a vehicle', 'Please choose a vehicle before sending the request.');
      return;
    }

    try {
      setBooking(true);
      await api.post('/bookings', {
        tripId,
        vehicleId: selectedVehicle._id,
      });
      Alert.alert('Request sent', 'Your booking request was sent to the driver.', [
        { text: 'View bookings', onPress: () => router.replace('/traveler/bookings') },
      ]);
    } catch (error) {
      Alert.alert('Booking failed', error.response?.data?.message || 'Please try another vehicle.');
    } finally {
      setBooking(false);
    }
  };

  if (loading || !trip) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0C6EFD" />
        <Text style={styles.loadingText}>Finding available vehicles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book vehicle</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.tripSummaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="map-outline" size={20} color="#0C6EFD" />
          </View>
          <View style={styles.summaryBody}>
            <Text style={styles.tripTitle}>{trip.destinationArea || 'AI Trip Plan'}</Text>
            <Text style={styles.tripMeta}>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</Text>
            <Text style={styles.tripMeta}>{tripDays} days - {trip.passengers || 1} people</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose vehicle type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {typeOrder.map((type) => {
            const isActive = selectedType === type;
            return (
              <TouchableOpacity key={type} style={[styles.typeChip, isActive && styles.typeChipActive]} onPress={() => setSelectedType(type)}>
                <Text style={isActive ? styles.typeChipTextActive : styles.typeChipText}>{type}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Available vehicles</Text>
        {filteredVehicles.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="car-outline" size={30} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No matching vehicles</Text>
            <Text style={styles.emptyText}>Try another vehicle type or reduce passenger count in your trip plan.</Text>
          </View>
        ) : (
          filteredVehicles.map((vehicle) => {
            const isSelected = selectedVehicle?._id === vehicle._id;
            return (
              <TouchableOpacity
                key={vehicle._id}
                style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                activeOpacity={0.86}
                onPress={() => setSelectedVehicle(vehicle)}
              >
                <ImageBackground
                  source={{ uri: vehicle.images?.[0] || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?width=900&q=80' }}
                  style={styles.vehicleImage}
                >
                  <View style={styles.imageOverlay} />
                  <View style={styles.vehicleTypeBadge}>
                    <Text style={styles.vehicleTypeText}>{vehicle.type}</Text>
                  </View>
                </ImageBackground>

                <View style={styles.vehicleBody}>
                  <View style={styles.vehicleTopRow}>
                    <View style={styles.vehicleTitleGroup}>
                      <Text style={styles.vehicleTitle}>{vehicle.brand} {vehicle.model}</Text>
                      <Text style={styles.vehicleSub}>{vehicle.regNumber}</Text>
                    </View>
                    <View style={isSelected ? styles.selectMarkActive : styles.selectMark}>
                      {isSelected && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                    </View>
                  </View>

                  <View style={styles.vehicleMetaRow}>
                    <View style={styles.metaPill}>
                      <Ionicons name="people-outline" size={14} color="#64748B" />
                      <Text style={styles.metaPillText}>{vehicle.capacity} seats</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Ionicons name="person-outline" size={14} color="#64748B" />
                      <Text style={styles.metaPillText}>{vehicle.driver?.name || 'Verified driver'}</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.metaPillText}>
                        {Number(vehicle.driver?.rating || 0).toFixed(1)} ({vehicle.driver?.totalRatings || 0})
                      </Text>
                    </View>
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.pricePerDay}>{formatMoney(vehicle.pricePerDay)} / day</Text>
                    <Text style={styles.totalPreview}>{formatMoney(Number(vehicle.pricePerDay || 0) * tripDays)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Estimated total</Text>
          <Text style={styles.totalAmount}>{formatMoney(totalAmount)}</Text>
        </View>
        <TouchableOpacity style={[styles.confirmButton, (!selectedVehicle || booking) && styles.confirmButtonDisabled]} disabled={!selectedVehicle || booking} onPress={confirmBooking}>
          {booking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmButtonText}>Send request</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#475569', fontSize: 13, fontFamily: 'Inter', marginTop: 12 },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#0F172A', fontSize: 17, fontFamily: 'Inter', fontWeight: '700' },
  headerSpacer: { width: 24 },
  scrollContent: { padding: 16, paddingBottom: 118 },
  tripSummaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, marginBottom: 18 },
  summaryIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#EBF3FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  summaryBody: { flex: 1 },
  tripTitle: { color: '#0F172A', fontSize: 16, fontFamily: 'Inter', fontWeight: '700' },
  tripMeta: { color: '#475569', fontSize: 12, fontFamily: 'Inter', marginTop: 3 },
  sectionTitle: { color: '#0F172A', fontSize: 15, fontFamily: 'Inter', fontWeight: '700', marginBottom: 10 },
  filterRow: { flexGrow: 0, marginBottom: 18 },
  typeChip: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  typeChipActive: { backgroundColor: '#EBF3FF', borderColor: '#3D8EFF' },
  typeChipText: { color: '#475569', fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
  typeChipTextActive: { color: '#0952C6', fontSize: 12, fontFamily: 'Inter', fontWeight: '700' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 24 },
  emptyTitle: { color: '#0F172A', fontSize: 15, fontFamily: 'Inter', fontWeight: '700', marginTop: 10 },
  emptyText: { color: '#475569', fontSize: 12, fontFamily: 'Inter', textAlign: 'center', lineHeight: 18, marginTop: 5 },
  vehicleCard: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  vehicleCardSelected: { borderColor: '#0C6EFD' },
  vehicleImage: { height: 132, backgroundColor: '#EBF3FF', padding: 10, alignItems: 'flex-end' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.14)' },
  vehicleTypeBadge: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  vehicleTypeText: { color: '#0F172A', fontSize: 11, fontFamily: 'Inter', fontWeight: '700' },
  vehicleBody: { padding: 14 },
  vehicleTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  vehicleTitleGroup: { flex: 1, paddingRight: 12 },
  vehicleTitle: { color: '#0F172A', fontSize: 16, fontFamily: 'Inter', fontWeight: '700' },
  vehicleSub: { color: '#64748B', fontSize: 12, fontFamily: 'monospace', marginTop: 3 },
  selectMark: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1' },
  selectMarkActive: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0C6EFD', alignItems: 'center', justifyContent: 'center' },
  vehicleMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  metaPillText: { color: '#475569', fontSize: 11, fontFamily: 'Inter', marginLeft: 5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12 },
  pricePerDay: { color: '#475569', fontSize: 12, fontFamily: 'Inter' },
  totalPreview: { color: '#0C6EFD', fontSize: 14, fontFamily: 'monospace', fontWeight: '700' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { color: '#94A3B8', fontSize: 11, fontFamily: 'Inter' },
  totalAmount: { color: '#0F172A', fontSize: 16, fontFamily: 'monospace', fontWeight: '700', marginTop: 2 },
  confirmButton: { minWidth: 148, height: 48, borderRadius: 12, backgroundColor: '#0C6EFD', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  confirmButtonDisabled: { opacity: 0.55 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter', fontWeight: '700' },
});
