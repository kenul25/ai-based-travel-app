import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { themeOptions, useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const tabs = [
  { label: 'Home', icon: 'home-outline', route: '/traveler/home' },
  { label: 'Trip', icon: 'map-outline', route: '/traveler/trips' },
  { label: 'Bookings', icon: 'cart-outline', route: '/traveler/bookings' },
  { label: 'Payments', icon: 'card-outline', route: '/traveler/payments' },
  { label: 'Profile', icon: 'person', route: '/traveler/profile' },
];

const getInitials = (name) => {
  if (!name) return 'TR';
  const parts = name.trim().split(' ');
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

export default function TravelerProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, themePreference, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editingField, setEditingField] = useState('');
  const [draftValues, setDraftValues] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [notifications, setNotifications] = useState({
    bookingAlerts: true,
    tripReminders: true,
    promotions: false,
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setDraftValues({
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
    });
  }, [user]);

  const fields = [
    { key: 'name', label: 'Name', value: user?.name || 'Traveler', icon: 'person-outline' },
    { key: 'phone', label: 'Phone', value: user?.phone || 'Add phone number', icon: 'call-outline' },
    { key: 'email', label: 'Email', value: user?.email || 'traveler account', icon: 'mail-outline', verified: true },
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
        <Ionicons name={tab.icon} size={23} color={isActive ? theme.primary : theme.textMuted} />
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

  const renderSettingRow = ({ icon, label, value, onPress, danger, toggleKey }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!!toggleKey}>
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={16} color={danger ? theme.error : theme.primary} />
      </View>
      <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
      {toggleKey ? (
        <Switch
          value={notifications[toggleKey]}
          onValueChange={(value) => setNotifications((current) => ({ ...current, [toggleKey]: value }))}
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
          <Text style={styles.title}>{user?.name || 'Traveler'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="map-outline" size={12} color={theme.primaryDark} />
            <Text style={styles.roleBadgeText}>Traveler</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Destinations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Profile</Text>
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
          {renderSettingRow({ icon: 'alarm-outline', label: 'Trip reminders', toggleKey: 'tripReminders' })}
          {renderSettingRow({ icon: 'pricetag-outline', label: 'Promotions', toggleKey: 'promotions' })}
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          {renderSettingRow({ icon: 'card-outline', label: 'My saved cards', onPress: () => router.push('/traveler/payments') })}
          {renderSettingRow({ icon: 'receipt-outline', label: 'Payment history', onPress: () => router.push('/traveler/payments') })}
          {renderSettingRow({ icon: 'lock-closed-outline', label: 'Change password', value: showPasswordForm ? 'Open' : 'Secure', onPress: () => setShowPasswordForm((current) => !current) })}
          {renderPasswordForm()}
          {renderSettingRow({ icon: 'help-circle-outline', label: 'Help center' })}
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
  statLabel: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter', marginTop: 3 },
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
  tabItem: { alignItems: 'center', justifyContent: 'center', position: 'relative', minWidth: 54 },
  tabText: { color: theme.textMuted, fontSize: 10, fontFamily: 'Inter', marginTop: 4 },
  tabTextActive: { color: theme.primary, fontSize: 10, fontFamily: 'Inter', marginTop: 4, fontWeight: '600' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, position: 'absolute', bottom: -8 },
});
