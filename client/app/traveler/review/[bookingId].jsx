import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../services/api';

const ratingLabels = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const API_ORIGIN = api.defaults.baseURL?.replace(/\/api$/, '') || '';
const resolvePhotoUrl = (photo) => {
  if (!photo) return '';
  if (photo.startsWith('http')) return photo;
  return `${API_ORIGIN}${photo}`;
};

export default function SubmitReviewScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [existingReview, setExistingReview] = useState(null);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [localPhotos, setLocalPhotos] = useState([]);
  const [error, setError] = useState('');

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [bookingResponse, reviewResponse] = await Promise.all([
        api.get('/bookings/my-bookings'),
        api.get('/reviews/my'),
      ]);
      const found = (bookingResponse.data?.bookings || []).find((item) => item._id === bookingId);
      const review = (reviewResponse.data?.reviews || []).find((item) => (item.booking?._id || item.booking) === bookingId);
      if (!found) {
        setError('Booking not found.');
      }
      setBooking(found || null);
      setExistingReview(review || null);
      if (review) {
        setRating(Number(review.rating || 0));
        setComment(review.comment || '');
        setSavedPhotos(review.photos || []);
        setLocalPhotos([]);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load booking details.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      loadBooking();
    }, [loadBooking])
  );

  const uploadLocalPhotos = async () => {
    if (!localPhotos.length) return [];

    const formData = new FormData();
    localPhotos.forEach((photo, index) => {
      const extension = photo.uri.split('.').pop() || 'jpg';
      formData.append('photos', {
        uri: photo.uri,
        name: `review-photo-${Date.now()}-${index}.${extension}`,
        type: photo.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      });
    });

    const response = await api.post('/reviews/upload-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.photos || [];
  };

  const submitReview = async () => {
    if (!rating) {
      Alert.alert('Choose a rating', 'Please select 1 to 5 stars before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const uploadedPhotos = await uploadLocalPhotos();
      const payload = {
        rating,
        comment,
        photos: [...savedPhotos, ...uploadedPhotos],
      };

      if (existingReview) {
        await api.put(`/reviews/${existingReview._id}`, payload);
      } else {
        await api.post('/reviews', {
          bookingId,
          ...payload,
        });
      }

      Alert.alert(existingReview ? 'Review updated' : 'Review submitted', 'Thank you for sharing your trip experience.', [
        { text: 'Done', onPress: () => router.replace('/traveler/bookings') },
      ]);
    } catch (requestError) {
      Alert.alert('Submit failed', requestError.response?.data?.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const pickPhotos = async () => {
    const remaining = 3 - savedPhotos.length - localPhotos.length;
    if (remaining <= 0) {
      Alert.alert('Photo limit reached', 'You can add up to 3 review photos.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to attach review photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });

    if (!result.canceled) {
      setLocalPhotos((current) => [...current, ...result.assets.slice(0, remaining)]);
    }
  };

  const removeSavedPhoto = (photo) => {
    setSavedPhotos((current) => current.filter((item) => item !== photo));
  };

  const removeLocalPhoto = (uri) => {
    setLocalPhotos((current) => current.filter((item) => item.uri !== uri));
  };

  const deleteReview = () => {
    if (!existingReview) return;
    Alert.alert('Delete review?', 'Your rating, comment, and photos will be removed from the driver profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmitting(true);
            await api.delete(`/reviews/${existingReview._id}`);
            Alert.alert('Review deleted', 'Your review has been removed.', [
              { text: 'Done', onPress: () => router.replace('/traveler/bookings') },
            ]);
          } catch (requestError) {
            Alert.alert('Delete failed', requestError.response?.data?.message || 'Could not delete review.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const renderStars = () => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((value) => {
        const selected = value <= rating;
        return (
          <TouchableOpacity key={value} style={styles.starButton} onPress={() => setRating(value)} activeOpacity={0.75}>
            <Ionicons name={selected ? 'star' : 'star-outline'} size={38} color={selected ? theme.amber : theme.borderMed} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{existingReview ? 'Edit review' : 'Write a review'}</Text>
          <View style={styles.backButtonGhost} />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loadingText}>Loading trip details...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="car-outline" size={20} color={theme.primary} />
              </View>
              <View style={styles.summaryBody}>
                <Text style={styles.tripTitle}>{booking?.trip?.destinationArea || 'Completed trip'}</Text>
                <Text style={styles.tripMeta}>{formatDate(booking?.startDate)} - {formatDate(booking?.endDate)}</Text>
                <Text style={styles.driverText}>Driver: {booking?.driver?.name || 'Assigned driver'}</Text>
              </View>
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>Completed</Text>
              </View>
            </View>

            <View style={styles.ratingPanel}>
              <Text style={styles.sectionTitle}>How was your ride?</Text>
              <Text style={styles.sectionText}>Rate the driver, vehicle experience, and trip support.</Text>
              {renderStars()}
              <Text style={styles.ratingLabel}>{rating ? ratingLabels[rating] : 'Tap a star'}</Text>
            </View>

            <View style={styles.commentPanel}>
              <View style={styles.commentHeader}>
                <Text style={styles.sectionTitle}>Review comment</Text>
                <Text style={styles.counterText}>{comment.length} / 300</Text>
              </View>
              <TextInput
                value={comment}
                onChangeText={(value) => setComment(value.slice(0, 300))}
                placeholder="Share what went well or what could be improved..."
                placeholderTextColor={theme.textMuted}
                multiline
                style={styles.commentInput}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.photoPanel}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Text style={styles.sectionText}>Add up to 3 photos from your trip experience.</Text>
              <View style={styles.photoSlots}>
                {savedPhotos.map((photo) => (
                  <View key={photo} style={styles.photoPreviewWrap}>
                    <Image source={{ uri: resolvePhotoUrl(photo) }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.removePhotoButton} onPress={() => removeSavedPhoto(photo)}>
                      <Ionicons name="close" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {localPhotos.map((photo) => (
                  <View key={photo.uri} style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.removePhotoButton} onPress={() => removeLocalPhoto(photo.uri)}>
                      <Ionicons name="close" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {savedPhotos.length + localPhotos.length < 3 ? (
                  <TouchableOpacity style={styles.photoSlot} onPress={pickPhotos}>
                    <Ionicons name="camera-outline" size={20} color={theme.textMuted} />
                    <Text style={styles.photoSlotText}>Add</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.visibilityCard}>
              <Ionicons name="eye-outline" size={18} color={theme.primary} />
              <Text style={styles.visibilityText}>Approved reviews are visible on the driver profile and help other travelers compare drivers before booking.</Text>
            </View>
          </>
        )}
      </ScrollView>

      {!loading && !error ? (
        <View style={styles.footer}>
          {existingReview ? (
            <TouchableOpacity style={styles.deleteButton} disabled={submitting} onPress={deleteReview}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.submitButton, (!rating || submitting) && styles.disabledButton]} disabled={!rating || submitting} onPress={submitReview}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{existingReview ? 'Save review' : 'Submit review'}</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { padding: 16, paddingTop: 50, paddingBottom: 112 },
  topBar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, alignItems: 'center', justifyContent: 'center' },
  backButtonGhost: { width: 38, height: 38 },
  topTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 17, fontWeight: '800' },
  loadingBox: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 8 },
  errorBox: { borderWidth: 1, borderColor: theme.error, backgroundColor: theme.errorLight, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorText: { flex: 1, color: theme.error, fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  summaryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, padding: 14, marginBottom: 16 },
  summaryIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  summaryBody: { flex: 1 },
  tripTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 15, fontWeight: '800' },
  tripMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 4 },
  driverText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 5 },
  completedBadge: { backgroundColor: theme.successLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  completedText: { color: theme.success, fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
  ratingPanel: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 15, fontWeight: '800' },
  sectionText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: 'center' },
  starRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ratingLabel: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 14, fontWeight: '800', marginTop: 10 },
  commentPanel: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, padding: 14, marginBottom: 14 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  counterText: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11 },
  commentInput: { minHeight: 120, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 12, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, lineHeight: 19 },
  photoPanel: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, padding: 14 },
  photoSlots: { flexDirection: 'row', gap: 10, marginTop: 12 },
  photoSlot: { width: 76, height: 76, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.borderMed, backgroundColor: theme.bgSurface, alignItems: 'center', justifyContent: 'center' },
  photoPreviewWrap: { width: 76, height: 76, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoPreview: { width: '100%', height: '100%' },
  removePhotoButton: { position: 'absolute', right: 5, top: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.error, alignItems: 'center', justifyContent: 'center' },
  photoSlotText: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 10, fontWeight: '700', marginTop: 3 },
  visibilityCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, padding: 12, marginTop: 14 },
  visibilityText: { flex: 1, color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 22, borderTopWidth: 1, borderTopColor: theme.borderLight, backgroundColor: theme.bgPrimary, flexDirection: 'row', gap: 10 },
  submitButton: { flex: 1, height: 50, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { width: 96, height: 50, borderRadius: 12, borderWidth: 1, borderColor: theme.error, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: theme.error, fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  disabledButton: { opacity: 0.55 },
  submitText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 15, fontWeight: '800' },
});
