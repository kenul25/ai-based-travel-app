import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';

export default function ItineraryViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trips/${id}`);
      setTrip(res.data.trip);
    } catch (error) {
      console.error(error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading || !trip) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0C6EFD" />
        <Text style={{ marginTop: 12, fontFamily: 'Inter', color: '#475569' }}>Loading your plan...</Text>
      </View>
    );
  }

  const { aiItinerary, aiRecommendedPlaces } = trip;
  const currentDayData = aiItinerary?.find(d => d.day === activeDay) || aiItinerary?.[0];

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#92600A" />
            <Text style={styles.aiBadgeText}>AI Generated</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Title area */}
        <Text style={styles.tripTitle}>{trip.destinationArea || 'Custom Trip'}</Text>
        <Text style={styles.tripDates}>
          {new Date(trip.startDate).toDateString()} - {new Date(trip.endDate).toDateString()}
        </Text>

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{aiItinerary?.length || 1}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{aiRecommendedPlaces?.length || 0}</Text>
            <Text style={styles.statLabel}>AI Places</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>LKR {trip.totalEstimatedCost || trip.budget}</Text>
            <Text style={styles.statLabel}>Est. Cost</Text>
          </View>
        </View>

        {!!trip.aiPlanSummary && <Text style={styles.summaryText}>{trip.aiPlanSummary}</Text>}

        {!!aiRecommendedPlaces?.length && (
          <View style={styles.placesSection}>
            <Text style={styles.sectionTitle}>Recommended places</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {aiRecommendedPlaces.map((place, index) => (
                <View key={`${place.name}-${index}`} style={styles.placeCard}>
                  <View style={styles.placeCardTop}>
                    <Text style={styles.categoryPill}>{place.category || 'Place'}</Text>
                    <Ionicons name={place.coordinates?.lat ? 'map' : 'alert-circle-outline'} size={14} color="#94A3B8" />
                  </View>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeReason} numberOfLines={3}>{place.reason}</Text>
                  <View style={styles.placeFooter}>
                    <Text style={styles.placeFee}>LKR {place.estimatedEntryFee || 0}</Text>
                    {!!place.bestTimeToVisit && <Text style={styles.bestTime}>{place.bestTimeToVisit}</Text>}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Day Tab Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {aiItinerary?.map((dayObj) => {
            const isActive = activeDay === dayObj.day;
            return (
              <TouchableOpacity 
                key={dayObj.day}
                style={[styles.dayTab, isActive ? styles.dayTabActive : styles.dayTabInactive]}
                onPress={() => setActiveDay(dayObj.day)}
              >
                <Text style={isActive ? styles.dayTabTextActive : styles.dayTabTextInactive}>Day {dayObj.day}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Timeline Content */}
        {currentDayData && (
          <View style={styles.timelineArea}>
            <Text style={styles.dayHeaderTitle}>Day {currentDayData.day} - {currentDayData.title}</Text>
            
            {currentDayData.activities?.map((activity, index) => (
              <View key={index} style={styles.activityRow}>
                {/* Left Column (Timeline) */}
                <View style={styles.timelineLeftColumn}>
                  <Text style={styles.timeText}>{activity.time || '09:00'}</Text>
                  <View style={[styles.timelineDot, { backgroundColor: index % 2 === 0 ? '#0C6EFD' : '#F59E0B' }]} />
                  {index !== currentDayData.activities.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Right Column (Card) */}
                <View style={styles.activityCard}>
                  <Text style={styles.activityPlace}>{activity.placeName || activity.location}</Text>
                  <Text style={styles.activityDesc}>{activity.description}</Text>
                  <View style={styles.activityMetaRow}>
                    {!!activity.estimatedCost && <Text style={styles.activityCost}>LKR {activity.estimatedCost}</Text>}
                    {!!activity.duration && <Text style={styles.durationPill}>{activity.duration}</Text>}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bookVehicleBtn} onPress={() => router.push(`/traveler/book-vehicle/${trip._id}`)}>
          <Text style={styles.bookVehicleText}>Book a vehicle for this trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8EC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  aiBadgeText: { color: '#92600A', fontFamily: 'Inter', fontSize: 11, fontWeight: '600', marginLeft: 4 },
  
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  tripTitle: { fontSize: 24, fontFamily: 'Inter', fontWeight: '700', color: '#0F172A', marginTop: 10 },
  tripDates: { fontSize: 13, fontFamily: 'Inter', color: '#475569', marginTop: 4, marginBottom: 20 },
  
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 16, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A' },
  statLabel: { fontSize: 11, fontFamily: 'Inter', color: '#94A3B8', marginTop: 2 },
  summaryText: { fontSize: 13, fontFamily: 'Inter', color: '#475569', lineHeight: 20, marginBottom: 20 },
  placesSection: { marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A', marginBottom: 10 },
  placeCard: { width: 220, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginRight: 10 },
  placeCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryPill: { overflow: 'hidden', backgroundColor: '#EBF3FF', color: '#0952C6', fontSize: 10, fontFamily: 'Inter', fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  placeName: { fontSize: 14, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A', marginBottom: 5 },
  placeReason: { fontSize: 12, fontFamily: 'Inter', color: '#475569', lineHeight: 17, minHeight: 50 },
  placeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  placeFee: { fontSize: 11, fontFamily: 'monospace', color: '#F59E0B' },
  bestTime: { fontSize: 10, fontFamily: 'Inter', color: '#94A3B8' },
  
  tabScroll: { marginBottom: 20, flexGrow: 0 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  dayTabActive: { backgroundColor: '#EBF3FF', borderColor: '#3D8EFF' },
  dayTabInactive: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
  dayTabTextActive: { color: '#0952C6', fontFamily: 'Inter', fontSize: 12, fontWeight: '500' },
  dayTabTextInactive: { color: '#475569', fontFamily: 'Inter', fontSize: 12, fontWeight: '400' },

  timelineArea: { marginTop: 10 },
  dayHeaderTitle: { fontSize: 15, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  
  activityRow: { flexDirection: 'row', marginBottom: 16 },
  timelineLeftColumn: { width: 50, alignItems: 'center', position: 'relative' },
  timeText: { fontSize: 10, fontFamily: 'monospace', color: '#0C6EFD', textAlign: 'center', marginBottom: 4 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, zIndex: 2 },
  timelineLine: { position: 'absolute', top: 24, bottom: -16, left: 24.5, width: 1, backgroundColor: '#E2E8F0', zIndex: 1 },
  
  activityCard: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12 },
  activityPlace: { fontSize: 14, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  activityDesc: { fontSize: 12, fontFamily: 'Inter', color: '#475569', lineHeight: 18 },
  activityMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  activityCost: { fontSize: 11, fontFamily: 'monospace', color: '#F59E0B', marginRight: 8 },
  durationPill: { overflow: 'hidden', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: 10, fontFamily: 'Inter', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 16 },
  bookVehicleBtn: { backgroundColor: '#0C6EFD', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  bookVehicleText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter', fontWeight: '600' }
});
