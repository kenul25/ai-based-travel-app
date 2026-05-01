import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';

export default function AddVehicleScreen() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [type, setType] = useState('Van'); // Car, Van, Bus, Tuk-Tuk
  const [imageUri, setImageUri] = useState(null);

  const vehicleTypes = ['Car', 'Van', 'Bus', 'Tuk-Tuk'];
  const isEditing = !!vehicleId;

  const fetchVehicle = useCallback(async () => {
    if (!vehicleId) return;

    try {
      setFetching(true);
      const res = await api.get(`/vehicles/${vehicleId}`);
      const vehicle = res.data.vehicle;
      setBrand(vehicle.brand || '');
      setModel(vehicle.model || '');
      setRegNumber(vehicle.regNumber || '');
      setCapacity(String(vehicle.capacity || ''));
      setPricePerDay(String(vehicle.pricePerDay || ''));
      setType(vehicle.type || 'Van');
      setImageUri(vehicle.images?.[0] || null);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load vehicle');
      router.back();
    } finally {
      setFetching(false);
    }
  }, [router, vehicleId]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submitVehicle = async () => {
    if (!brand || !model || !regNumber || !capacity || !pricePerDay) {
      Alert.alert('Error', 'Please fill in all vehicle specifications');
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('brand', brand);
      formData.append('model', model);
      formData.append('regNumber', regNumber);
      formData.append('capacity', capacity);
      formData.append('pricePerDay', pricePerDay);
      formData.append('type', type);
      
      if (imageUri && !imageUri.startsWith('http')) {
        let filename = imageUri.split('/').pop();
        let match = /\.(\w+)$/.exec(filename);
        let typeVal = match ? `image/${match[1]}` : `image`;
        
        formData.append('images', { uri: imageUri, name: filename, type: typeVal });
      }

      const request = isEditing
        ? api.put(`/vehicles/${vehicleId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        : api.post('/vehicles', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      await request;
      
      router.back();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} vehicle`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit vehicle' : 'Add new vehicle'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {fetching ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#0C6EFD" />
          <Text style={styles.loadingText}>Loading vehicle...</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Image Picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePickerEmpty}>
              <Ionicons name="camera" size={32} color="#94A3B8" />
              <Text style={styles.imagePickerText}>Upload vehicle photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Type Selector */}
        <Text style={styles.label}>Vehicle Type</Text>
        <View style={styles.typeGrid}>
          {vehicleTypes.map(t => (
            <TouchableOpacity 
              key={t}
              style={[styles.typePill, type === t ? styles.typePillActive : styles.typePillInactive]}
              onPress={() => setType(t)}
            >
              <Text style={type === t ? styles.typePillTextActive : styles.typePillTextInactive}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Text Inputs */}
        <Text style={styles.label}>Brand</Text>
        <TextInput 
          style={styles.input}
          placeholder="e.g. Toyota"
          value={brand}
          onChangeText={setBrand}
        />

        <Text style={styles.label}>Model</Text>
        <TextInput 
          style={styles.input}
          placeholder="e.g. Hiace"
          value={model}
          onChangeText={setModel}
        />

        <Text style={styles.label}>Registration Number</Text>
        <TextInput 
          style={styles.input}
          placeholder="e.g. WP CAA-1234"
          value={regNumber}
          onChangeText={setRegNumber}
          autoCapitalize="characters"
        />

        {/* Numeric Inputs */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Capacity (Persons)</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. 10"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Price / Day (LKR)</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. 8500"
              value={pricePerDay}
              onChangeText={setPricePerDay}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={submitVehicle} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>{isEditing ? 'Update vehicle' : 'Save vehicle'}</Text>}
        </TouchableOpacity>

      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter', fontWeight: '600', color: '#0F172A' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#475569', fontSize: 13, fontFamily: 'Inter', marginTop: 10 },
  
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  imagePicker: { height: 160, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 14, overflow: 'hidden', marginBottom: 6 },
  imagePickerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagePickerText: { fontSize: 13, fontFamily: 'Inter', color: '#94A3B8', marginTop: 8 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  label: { fontSize: 13, fontFamily: 'Inter', fontWeight: '500', color: '#0F172A', marginBottom: 6, marginTop: 16 },
  
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typePill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  typePillActive: { backgroundColor: '#EBF3FF', borderColor: '#3D8EFF' },
  typePillInactive: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  typePillTextActive: { color: '#0952C6', fontFamily: 'Inter', fontSize: 13, fontWeight: '500' },
  typePillTextInactive: { color: '#475569', fontFamily: 'Inter', fontSize: 13 },

  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 14, fontFamily: 'Inter', color: '#0F172A' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },

  submitBtn: { backgroundColor: '#0C6EFD', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter', fontWeight: '600' }
});
