import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const categories = ['Beach', 'Culture', 'Nature', 'Adventure', 'Wildlife', 'Food', 'Wellness', 'City', 'History'];

const emptyForm = {
  name: '',
  location: '',
  shortDescription: '',
  description: '',
  categories: [],
  imageUri: null,
  isFeatured: false,
  isActive: true,
};

export default function AddDestinationScreen() {
  const router = useRouter();
  const { destinationId } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [form, setForm] = useState(emptyForm);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEditing = !!destinationId;

  const loadDestination = useCallback(async () => {
    if (!destinationId) return;

    try {
      setFetching(true);
      const response = await api.get(`/destinations/${destinationId}`);
      const destination = response.data?.destination;
      if (!destination) throw new Error('Destination not found');

      setForm({
        name: destination.name || '',
        location: destination.location || '',
        shortDescription: destination.shortDescription || '',
        description: destination.description || '',
        categories: destination.categories || [],
        imageUri: destination.image || null,
        isFeatured: !!destination.isFeatured,
        isActive: destination.isActive !== false,
      });
    } catch (error) {
      Alert.alert('Destination unavailable', error.response?.data?.message || 'Could not load this destination.');
      router.back();
    } finally {
      setFetching(false);
    }
  }, [destinationId, router]);

  useEffect(() => {
    loadDestination();
  }, [loadDestination]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleCategory = (category) => {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.75,
    });

    if (!result.canceled) updateForm('imageUri', result.assets[0].uri);
  };

  const submitDestination = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.categories.length) {
      Alert.alert('Missing details', 'Add a name, detailed description, and at least one category.');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('location', form.location.trim());
      formData.append('shortDescription', form.shortDescription.trim());
      formData.append('description', form.description.trim());
      formData.append('categories', form.categories.join(','));
      formData.append('isFeatured', String(form.isFeatured));
      formData.append('isActive', String(form.isActive));

      if (form.imageUri && !form.imageUri.startsWith('http')) {
        const filename = form.imageUri.split('/').pop() || 'destination.jpg';
        const match = /\.(\w+)$/.exec(filename);
        formData.append('image', {
          uri: form.imageUri,
          name: filename,
          type: match ? `image/${match[1]}` : 'image/jpeg',
        });
      }

      if (isEditing) {
        await api.put(`/destinations/${destinationId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/destinations', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      router.replace('/admin/destinations');
    } catch (error) {
      Alert.alert('Save failed', error.response?.data?.message || 'Could not save this destination.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Destination catalog</Text>
          <Text style={styles.title}>{isEditing ? 'Edit destination' : 'Add new destination'}</Text>
        </View>
      </View>

      {fetching ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.loadingText}>Loading destination...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {form.imageUri ? (
              <Image source={{ uri: form.imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imageEmpty}>
                <Ionicons name="camera-outline" size={32} color={theme.textMuted} />
                <Text style={styles.imageEmptyTitle}>Upload destination image</Text>
                <Text style={styles.imageEmptyText}>Saved in server/uploads/destinations</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic details</Text>
            <TextInput value={form.name} onChangeText={(value) => updateForm('name', value)} placeholder="Destination name" placeholderTextColor={theme.textMuted} style={styles.input} />
            <TextInput value={form.location} onChangeText={(value) => updateForm('location', value)} placeholder="Location or region" placeholderTextColor={theme.textMuted} style={styles.input} />
            <TextInput value={form.shortDescription} onChangeText={(value) => updateForm('shortDescription', value)} placeholder="Short summary for cards" placeholderTextColor={theme.textMuted} style={styles.input} maxLength={220} />
            <TextInput value={form.description} onChangeText={(value) => updateForm('description', value)} placeholder="Detailed destination description" placeholderTextColor={theme.textMuted} multiline style={styles.textArea} />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                const active = form.categories.includes(category);
                return (
                  <TouchableOpacity key={category} style={active ? styles.categoryActive : styles.category} onPress={() => toggleCategory(category)}>
                    <Text style={active ? styles.categoryTextActive : styles.categoryText}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextBlock}>
                <Text style={styles.toggleTitle}>Featured destination</Text>
                <Text style={styles.toggleHint}>Show this place on traveler home.</Text>
              </View>
              <Switch value={form.isFeatured} onValueChange={(value) => updateForm('isFeatured', value)} />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextBlock}>
                <Text style={styles.toggleTitle}>Active destination</Text>
                <Text style={styles.toggleHint}>Visible to travelers in Explore.</Text>
              </View>
              <Switch value={form.isActive} onValueChange={(value) => updateForm('isActive', value)} />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={submitDestination} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>{isEditing ? 'Update destination' : 'Save destination'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.borderLight, flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: theme.borderLight, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  eyebrow: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 22, fontWeight: '800', marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 34 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 8 },
  imagePicker: { height: 190, borderWidth: 1, borderColor: theme.borderLight, borderStyle: 'dashed', backgroundColor: theme.bgSurface, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  imageEmptyTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800', marginTop: 8 },
  imageEmptyText: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 4 },
  formSection: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 14, marginBottom: 14 },
  sectionTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  input: { height: 46, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 10, paddingHorizontal: 12, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, marginBottom: 9 },
  textArea: { minHeight: 130, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { minHeight: 36, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 9, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgPrimary },
  categoryActive: { minHeight: 36, borderWidth: 1, borderColor: theme.primaryMid, borderRadius: 9, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primaryLight },
  categoryText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  categoryTextActive: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  toggleRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  toggleTextBlock: { flex: 1 },
  toggleTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
  toggleHint: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 2 },
  saveButton: { height: 50, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
});
