import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { themeOptions, useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const tabs = [
  { label: 'Home', icon: 'home-outline', route: '/driver/home' },
  { label: 'Vehicles', icon: 'car-outline', route: '/driver/vehicles' },
  { label: 'Earnings', icon: 'wallet-outline', route: '/driver/earnings' },
  { label: 'Profile', icon: 'person', route: '/driver/profile' },
];

const getInitials = (name) => {
  if (!name) return 'DR';
  const parts = name.trim().split(' ');
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, themePreference, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editingField, setEditingField] = useState('');
  const [draftValues, setDraftValues] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    licenseNumber: user?.licenseNumber || '',
  });
  const [settings, setSettings] = useState({
    bookingAlerts: true,
    tripUpdates: true,
    availabilityReminders: false,
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const API_ORIGIN = api.defaults.baseURL?.replace(/\/api$/, '') || '';
  const resolvePhotoUrl = (photo) => {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `${API_ORIGIN}${photo}`;
  };

  useEffect(() => {
    setDraftValues({
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
      licenseNumber: user?.licenseNumber || '',
    });
  }, [user]);

  useEffect(() => {
    const fetchDriverReviews = async () => {
      const driverId = user?._id || user?.id;
      if (!driverId) return;

      try {
        setLoadingReviews(true);
        const response = await api.get(`/reviews/driver/${driverId}`);
        setReviews(response.data?.reviews || []);
      } catch (_error) {
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchDriverReviews();
  }, [user?._id, user?.id]);

  const fields = [
    { key: 'name', label: 'Name', value: user?.name || 'Driver', icon: 'person-outline' },
    { key: 'phone', label: 'Phone', value: user?.phone || 'Add phone number', icon: 'call-outline' },
    { key: 'email', label: 'Email', value: user?.email || 'driver account', icon: 'mail-outline', verified: true },
    { key: 'licenseNumber', label: 'License number', value: user?.licenseNumber || 'Pending profile update', icon: 'id-card-outline' },
  ];

  const renderTab = (tab) => {
    const isActive = tab.label === 'Profile';
    return (
      <TouchableOpacity
        key={tab.label}
        style={styles.tabItem}
        onPress={() => {
          if (!isActive) router.push(tab.route);
        }}
      >
        <Ionicons name={tab.icon} size={24} color={isActive ? theme.primary : theme.textMuted} />
        <Text style={isActive ? styles.tabTextActive : styles.tabText}>{tab.label}</Text>
        {isActive && <View style={styles.tabDot} />}
      </TouchableOpacity>
    );
  };

  const renderFieldRow = (field) => {
    const isEditing = editingField === field.key;
    return (
      <View key={field.key} style={styles.infoRow}>
        <View style={styles.rowIcon}>
          <Ionicons name={field.icon} size={16} color={theme.primary} />
        </View>
        <View style={styles.infoBody}>
          <Text style={styles.rowLabel}>{field.label}</Text>
          {isEditing ? (
            <TextInput
              style={styles.inlineInput}
              value={draftValues[field.key]}
              onChangeText={(value) => setDraftValues((current) => ({ ...current, [field.key]: value }))}
              autoFocus
            />
          ) : (
            <View style={styles.valueLine}>
              <Text style={styles.rowValue}>{draftValues[field.key] || field.value}</Text>
              {field.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={theme.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            if (isEditing) {
              setEditingField('');
              Alert.alert('Saved locally', 'Profile API update can be connected when the backend endpoint is ready.');
            } else {
              setEditingField(field.key);
            }
          }}
        >
          <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSettingRow = ({ icon, label, value, onPress, toggleKey, danger }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!!toggleKey}>
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={16} color={danger ? theme.error : theme.primary} />
      </View>
      <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
      {toggleKey ? (
        <Switch
          value={settings[toggleKey]}
          onValueChange={(value) => setSettings((current) => ({ ...current, [toggleKey]: value }))}
          trackColor={{ false: theme.borderMed, true: theme.primary }}
          thumbColor={theme.bgPrimary}
        />
      ) : (
        <>
          {!!value && <Text style={styles.settingValue}>{value}</Text>}
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </>
      )}
    </TouchableOpacity>
  );

  const renderStars = (rating, size = 13) => (
    <View style={styles.starsInline}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Ionicons key={value} name={value <= Number(rating || 0) ? 'star' : 'star-outline'} size={size} color={theme.amber} />
      ))}
    </View>
  );

  const ratingBreakdown = [5, 4, 3, 2, 1].map((value) => {
    const count = reviews.filter((review) => Number(review.rating) === value).length;
    const percentage = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
    return { value, count, percentage };
  });

  const changePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Missing details', 'Please fill all password fields.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Weak password', 'New password must be at least 6 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Password mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      Alert.alert('Password changed', 'Your account password has been updated.');
    } catch (error) {
      Alert.alert('Change failed', error.response?.data?.message || 'Could not update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const renderPasswordForm = () => {
    if (!showPasswordForm) return null;

    return (
      <View style={styles.passwordPanel}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Current password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          value={passwordForm.currentPassword}
          onChangeText={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
        />
        <TextInput
          style={styles.passwordInput}
          placeholder="New password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          value={passwordForm.newPassword}
          onChangeText={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
        />
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirm new password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          value={passwordForm.confirmPassword}
          onChangeText={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
        />
        <View style={styles.passwordActions}>
          <TouchableOpacity style={styles.cancelPasswordButton} onPress={() => setShowPasswordForm(false)}>
            <Text style={styles.cancelPasswordText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.savePasswordButton, changingPassword && styles.disabledButton]} disabled={changingPassword} onPress={changePassword}>
            <Text style={styles.savePasswordText}>{changingPassword ? 'Updating...' : 'Update password'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>{user?.name || 'Driver'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={12} color={theme.primaryDark} />
            <Text style={styles.roleBadgeText}>{user?.isVerified ? 'Verified Driver' : 'Driver verification pending'}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>156</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValueMono}>LKR 1.2M</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Number(user?.rating || 4.8).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Reviews and ratings</Text>
        <View style={styles.reviewOverviewCard}>
          <View style={styles.reviewScoreBlock}>
            <Text style={styles.reviewScore}>{Number(user?.rating || 0).toFixed(1)}</Text>
            {renderStars(Number(user?.rating || 0), 14)}
            <Text style={styles.reviewCount}>{user?.totalRatings || reviews.length} traveler reviews</Text>
          </View>
          <View style={styles.breakdownBlock}>
            {ratingBreakdown.map((item) => (
              <View key={item.value} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{item.value}</Text>
                <Ionicons name="star" size={10} color={theme.amber} />
                <View style={styles.breakdownTrack}>
                  <View style={[styles.breakdownFill, { width: `${item.percentage}%` }]} />
                </View>
                <Text style={styles.breakdownPercent}>{item.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.reviewListCard}>
          {loadingReviews ? (
            <View style={styles.reviewLoading}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.reviewLoadingText}>Loading reviews...</Text>
            </View>
          ) : reviews.length ? reviews.slice(0, 4).map((review) => (
            <View key={review._id} style={styles.reviewRow}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerAvatar}>
                  <Text style={styles.reviewerAvatarText}>{getInitials(review.traveler?.name)}</Text>
                </View>
                <View style={styles.reviewBody}>
                  <Text style={styles.reviewerName}>{review.traveler?.name || 'Traveler'}</Text>
                  <Text style={styles.reviewTrip}>{review.trip?.destinationArea || 'Completed trip'}</Text>
                </View>
                {renderStars(review.rating)}
              </View>
              <Text style={styles.reviewComment}>{review.comment || 'No written comment.'}</Text>
              {review.photos?.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewPhotoRow}>
                  {review.photos.map((photo) => (
                    <Image key={photo} source={{ uri: resolvePhotoUrl(photo) }} style={styles.reviewPhoto} />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          )) : (
            <View style={styles.emptyReviews}>
              <Ionicons name="star-outline" size={24} color={theme.textMuted} />
              <Text style={styles.emptyReviewTitle}>No reviews yet</Text>
              <Text style={styles.emptyReviewText}>Approved traveler reviews will appear here after completed trips.</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Driver profile</Text>
        <View style={styles.card}>{fields.map(renderFieldRow)}</View>

        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.themeCard}>
          {themeOptions.map((option) => {
            const isActive = themePreference === option.key;
            return (
              <TouchableOpacity key={option.key} style={[styles.themeOption, isActive && styles.themeOptionActive]} onPress={() => setThemeMode(option.key)}>
                <Ionicons name={option.icon} size={18} color={isActive ? theme.primary : theme.textMuted} />
                <Text style={isActive ? styles.themeOptionTextActive : styles.themeOptionText}>{option.label}</Text>
                {isActive && <Ionicons name="checkmark-circle" size={18} color={theme.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          {renderSettingRow({ icon: 'notifications-outline', label: 'Booking alerts', toggleKey: 'bookingAlerts' })}
          {renderSettingRow({ icon: 'navigate-outline', label: 'Trip updates', toggleKey: 'tripUpdates' })}
          {renderSettingRow({ icon: 'time-outline', label: 'Availability reminders', toggleKey: 'availabilityReminders' })}
        </View>

        <Text style={styles.sectionLabel}>Driver tools</Text>
        <View style={styles.card}>
          {renderSettingRow({ icon: 'car-outline', label: 'Vehicle management', onPress: () => router.push('/driver/vehicles') })}
          {renderSettingRow({ icon: 'wallet-outline', label: 'Earnings history', onPress: () => router.push('/driver/earnings') })}
          {renderSettingRow({ icon: 'star-outline', label: 'Reviews and rating', value: `${Number(user?.rating || 4.8).toFixed(1)} avg` })}
          {renderSettingRow({ icon: 'lock-closed-outline', label: 'Change password', value: showPasswordForm ? 'Open' : 'Secure', onPress: () => setShowPasswordForm((current) => !current) })}
          {renderPasswordForm()}
          {renderSettingRow({ icon: 'help-circle-outline', label: 'Contact support' })}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={theme.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomTabBar}>{tabs.map(renderTab)}</View>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 96 },
  profileHeader: { alignItems: 'center', marginBottom: 18 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { fontSize: 26, fontFamily: 'Inter', fontWeight: '700', color: theme.primaryDark },
  cameraButton: { position: 'absolute', right: 0, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primary, borderWidth: 2, borderColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.textPrimary, fontSize: 20, fontFamily: 'Inter', fontWeight: '700', marginTop: 12 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: theme.primaryLight, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  roleBadgeText: { color: theme.primaryDark, fontSize: 11, fontFamily: 'Inter', fontWeight: '700', marginLeft: 5 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { color: theme.textPrimary, fontSize: 20, fontFamily: 'Inter', fontWeight: '700' },
  statValueMono: { color: theme.textPrimary, fontSize: 13, fontFamily: 'monospace', fontWeight: '700', minHeight: 24, textAlignVertical: 'center' },
  statLabel: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter', marginTop: 3 },
  reviewOverviewCard: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewScoreBlock: { width: 104, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: theme.borderLight, paddingRight: 12 },
  reviewScore: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 30, fontWeight: '800' },
  reviewCount: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 10, marginTop: 5, textAlign: 'center' },
  breakdownBlock: { flex: 1, gap: 6 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  breakdownLabel: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', width: 8 },
  breakdownTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.bgMuted, overflow: 'hidden' },
  breakdownFill: { height: 6, borderRadius: 3, backgroundColor: theme.amber },
  breakdownPercent: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 10, width: 30, textAlign: 'right' },
  reviewListCard: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  reviewLoading: { minHeight: 130, alignItems: 'center', justifyContent: 'center' },
  reviewLoadingText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 8 },
  reviewRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  reviewerAvatarText: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  reviewBody: { flex: 1 },
  reviewerName: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
  reviewTrip: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 2 },
  starsInline: { flexDirection: 'row', gap: 1 },
  reviewComment: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 10 },
  reviewPhotoRow: { gap: 8, marginTop: 10 },
  reviewPhoto: { width: 58, height: 58, borderRadius: 9, backgroundColor: theme.bgMuted },
  emptyReviews: { minHeight: 150, alignItems: 'center', justifyContent: 'center', padding: 18 },
  emptyReviewTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800', marginTop: 8 },
  emptyReviewText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  sectionLabel: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter', fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  card: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  infoRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  rowIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dangerIcon: { backgroundColor: theme.errorLight },
  infoBody: { flex: 1 },
  rowLabel: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter', marginBottom: 3 },
  rowValue: { color: theme.textPrimary, fontSize: 13, fontFamily: 'Inter', fontWeight: '600', flexShrink: 1 },
  valueLine: { flexDirection: 'row', alignItems: 'center' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.successLight, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8 },
  verifiedText: { color: theme.success, fontSize: 10, fontFamily: 'Inter', fontWeight: '700', marginLeft: 3 },
  inlineInput: { color: theme.textPrimary, fontSize: 13, fontFamily: 'Inter', borderBottomWidth: 1, borderBottomColor: theme.primary, paddingVertical: 2 },
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  themeCard: { gap: 8, marginBottom: 16 },
  themeOption: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  themeOptionActive: { borderColor: theme.primaryMid, backgroundColor: theme.primaryLight },
  themeOptionText: { flex: 1, color: theme.textSecondary, fontSize: 13, fontFamily: 'Inter', fontWeight: '600', marginLeft: 10 },
  themeOptionTextActive: { flex: 1, color: theme.primaryDark, fontSize: 13, fontFamily: 'Inter', fontWeight: '700', marginLeft: 10 },
  settingRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  settingLabel: { flex: 1, color: theme.textPrimary, fontSize: 14, fontFamily: 'Inter' },
  settingValue: { color: theme.textMuted, fontSize: 12, fontFamily: 'Inter', marginRight: 6 },
  dangerText: { color: theme.error },
  passwordPanel: { padding: 12, backgroundColor: theme.bgSurface, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  passwordInput: { minHeight: 46, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 12, paddingHorizontal: 12, color: theme.textPrimary, fontSize: 13, fontFamily: 'Inter', marginBottom: 10 },
  passwordActions: { flexDirection: 'row', gap: 10 },
  cancelPasswordButton: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: theme.borderMed, alignItems: 'center', justifyContent: 'center' },
  cancelPasswordText: { color: theme.textSecondary, fontSize: 13, fontFamily: 'Inter', fontWeight: '700' },
  savePasswordButton: { flex: 1, minHeight: 42, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  savePasswordText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
  signOutButton: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  signOutText: { color: theme.error, fontSize: 14, fontFamily: 'Inter', fontWeight: '700', marginLeft: 8 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 62, backgroundColor: theme.bgPrimary, borderTopWidth: 1, borderTopColor: theme.borderLight, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center', position: 'relative', minWidth: 64 },
  tabText: { color: theme.textMuted, fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: theme.primary, fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '600' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, position: 'absolute', bottom: -8 },
});
