import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AdminTabBar from '../../components/admin/AdminTabBar';
import { useAuth } from '../../context/AuthContext';
import { themeOptions, useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import PasswordStrengthMeter from '../../components/common/PasswordStrengthMeter';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import {
  normalizePhoneNumber,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validatePhoneNumber,
  validateRequiredName,
} from '../../utils/validation';

const getInitials = (name) => {
  if (!name) return 'AD';
  const parts = name.trim().split(' ');
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

const formatMemberSince = (value) => {
  if (!value) return 'New';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'New';
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

export default function AdminProfileScreen() {
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuth();
  const { theme, themePreference, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editingField, setEditingField] = useState('');
  const [draftValues, setDraftValues] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [notifications, setNotifications] = useState({
    accountAlerts: true,
    paymentAlerts: true,
    aiPlanAlerts: true,
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Admin';

  useEffect(() => {
    setDraftValues({
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
    });
  }, [user]);

  const fields = [
    { key: 'name', label: 'Name', value: user?.name || roleLabel, icon: 'person-outline' },
    { key: 'phone', label: 'Phone', value: user?.phone || 'Add phone number', icon: 'call-outline' },
    { key: 'email', label: 'Email', value: user?.email || 'admin account', icon: 'mail-outline', verified: true },
  ];

  const saveLocalField = () => {
    const fieldError = validateProfileField(editingField);
    if (fieldError) {
      Alert.alert('Invalid field', fieldError);
      return;
    }
    setEditingField('');
    Alert.alert('Saved locally', 'Connect this to the admin profile update endpoint when backend profile editing is enabled.');
  };

  const validateProfileField = (key) => {
    if (key === 'name') return validateRequiredName(draftValues.name, 'Name');
    if (key === 'email') return validateEmail(draftValues.email);
    if (key === 'phone') return validatePhoneNumber(draftValues.phone);
    return '';
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
            <>
              <TextInput
                style={styles.inlineInput}
                value={draftValues[field.key]}
                keyboardType={field.key === 'phone' ? 'number-pad' : 'default'}
                maxLength={field.key === 'phone' ? 10 : undefined}
                onChangeText={(value) => setDraftValues((current) => ({
                  ...current,
                  [field.key]: field.key === 'phone' ? normalizePhoneNumber(value) : value,
                }))}
                autoFocus
              />
              {validateProfileField(field.key) ? <Text style={styles.validationText}>{validateProfileField(field.key)}</Text> : null}
            </>
          ) : (
            <View style={styles.valueLine}>
              <Text style={styles.rowValue}>{draftValues[field.key] || field.value}</Text>
              {field.verified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={theme.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={isEditing ? saveLocalField : () => setEditingField(field.key)}>
          <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSettingRow = ({ icon, label, value, onPress, toggleKey, danger, disabled }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!!toggleKey || disabled}>
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
    const passwordError = validatePassword(passwordForm.newPassword);
    if (passwordError) {
      Alert.alert('Weak password', passwordError);
      return;
    }
    const matchError = validatePasswordMatch(passwordForm.newPassword, passwordForm.confirmPassword);
    if (matchError) {
      Alert.alert('Password mismatch', matchError);
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

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete admin account?',
      'This will permanently delete your admin account and sign you out. The last active super admin account cannot be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAccount(true);
              const result = await deleteAccount();
              if (!result.success) {
                Alert.alert('Delete failed', result.message);
              }
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
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
        <PasswordStrengthMeter password={passwordForm.newPassword} />
        <TextInput
          style={styles.passwordInput}
          placeholder="New password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          value={passwordForm.newPassword}
          onChangeText={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
        />
        {passwordForm.confirmPassword && validatePasswordMatch(passwordForm.newPassword, passwordForm.confirmPassword) ? (
          <Text style={styles.validationText}>{validatePasswordMatch(passwordForm.newPassword, passwordForm.confirmPassword)}</Text>
        ) : null}
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
      <KeyboardAwareScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Admin profile</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={19} color={theme.textPrimary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>{user?.name || roleLabel}</Text>
          <View style={isSuperAdmin ? styles.superRoleBadge : styles.roleBadge}>
            <Ionicons name={isSuperAdmin ? 'shield-checkmark-outline' : 'shield-outline'} size={12} color={isSuperAdmin ? theme.amberDark : theme.primaryDark} />
            <Text style={isSuperAdmin ? styles.superRoleText : styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{roleLabel}</Text>
            <Text style={styles.statLabel}>Access</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.isActive === false ? 'Inactive' : 'Active'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatMemberSince(user?.createdAt)}</Text>
            <Text style={styles.statLabel}>Member since</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Profile</Text>
        <View style={styles.card}>{fields.map(renderFieldRow)}</View>

        <Text style={styles.sectionLabel}>Admin tools</Text>
        <View style={styles.card}>
          {renderSettingRow({ icon: 'people-outline', label: 'Manage users', value: 'Travelers, drivers, admins', onPress: () => router.push('/admin/users') })}
          {renderSettingRow({ icon: 'location-outline', label: 'Destinations', value: 'Catalog', onPress: () => router.push('/admin/destinations') })}
          {renderSettingRow({ icon: 'card-outline', label: 'Payment oversight', value: 'Refunds', onPress: () => router.push('/admin/payments') })}
          {renderSettingRow({ icon: 'star-outline', label: 'Review moderation', value: 'Queue', onPress: () => router.push('/admin/reviews') })}
        </View>

        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.themeCard}>
          {themeOptions.map((option) => {
            const isActive = themePreference === option.key;
            return (
              <TouchableOpacity key={option.key} style={[styles.themeOption, isActive && styles.themeOptionActive]} onPress={() => setThemeMode(option.key)}>
                <Ionicons name={option.icon} size={18} color={isActive ? theme.primary : theme.textMuted} />
                <Text style={isActive ? styles.themeOptionTextActive : styles.themeOptionText}>{option.label}</Text>
                {isActive ? <Ionicons name="checkmark-circle" size={18} color={theme.primary} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          {renderSettingRow({ icon: 'person-circle-outline', label: 'Account alerts', toggleKey: 'accountAlerts' })}
          {renderSettingRow({ icon: 'wallet-outline', label: 'Payment alerts', toggleKey: 'paymentAlerts' })}
          {renderSettingRow({ icon: 'sparkles-outline', label: 'AI plan alerts', toggleKey: 'aiPlanAlerts' })}
        </View>

        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.card}>
          {renderSettingRow({ icon: 'lock-closed-outline', label: 'Change password', value: showPasswordForm ? 'Open' : 'Secure', onPress: () => setShowPasswordForm((current) => !current) })}
          {renderPasswordForm()}
          {renderSettingRow({ icon: 'key-outline', label: 'Role permissions', value: isSuperAdmin ? 'Full control' : 'Limited delete access' })}
        </View>

        <Text style={styles.sectionLabel}>Danger zone</Text>
        <View style={styles.card}>
          {renderSettingRow({
            icon: 'trash-outline',
            label: 'Delete account',
            value: deletingAccount ? 'Deleting...' : 'Permanent',
            danger: true,
            disabled: deletingAccount,
            onPress: confirmDeleteAccount,
          })}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={theme.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <AdminTabBar />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 98 },
  topBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 17, fontWeight: '800' },
  notificationButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notificationDot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: theme.error, borderWidth: 1, borderColor: theme.bgSurface },
  profileHeader: { alignItems: 'center', marginBottom: 18 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { fontSize: 26, fontFamily: 'Inter', fontWeight: '800', color: theme.primaryDark },
  cameraButton: { position: 'absolute', right: 0, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primary, borderWidth: 2, borderColor: theme.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.textPrimary, fontSize: 20, fontFamily: 'Inter', fontWeight: '800', marginTop: 12 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: theme.primaryLight, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  roleBadgeText: { color: theme.primaryDark, fontSize: 11, fontFamily: 'Inter', fontWeight: '800', marginLeft: 5 },
  superRoleBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: theme.amberLight, borderWidth: 1, borderColor: theme.amber, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  superRoleText: { color: theme.amberDark, fontSize: 11, fontFamily: 'Inter', fontWeight: '800', marginLeft: 5 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { color: theme.textPrimary, fontSize: 13, fontFamily: 'Inter', fontWeight: '800', minHeight: 24, textAlign: 'center', textAlignVertical: 'center' },
  statLabel: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter', marginTop: 3 },
  sectionLabel: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter', fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  card: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  infoRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  rowIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dangerIcon: { backgroundColor: theme.errorLight },
  infoBody: { flex: 1 },
  rowLabel: { color: theme.textMuted, fontSize: 11, fontFamily: 'Inter', marginBottom: 3 },
  rowValue: { color: theme.textPrimary, fontSize: 13, fontFamily: 'Inter', fontWeight: '700', flexShrink: 1 },
  valueLine: { flexDirection: 'row', alignItems: 'center' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.successLight, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8 },
  verifiedText: { color: theme.success, fontSize: 10, fontFamily: 'Inter', fontWeight: '800', marginLeft: 3 },
  inlineInput: { color: theme.textPrimary, fontSize: 13, fontFamily: 'Inter', borderBottomWidth: 1, borderBottomColor: theme.primary, paddingVertical: 2 },
  validationText: { color: theme.error, fontSize: 11, fontFamily: 'Inter', marginTop: 5 },
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  settingRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  settingLabel: { flex: 1, color: theme.textPrimary, fontSize: 14, fontFamily: 'Inter' },
  settingValue: { color: theme.textMuted, fontSize: 12, fontFamily: 'Inter', marginRight: 6 },
  dangerText: { color: theme.error },
  themeCard: { gap: 8, marginBottom: 16 },
  themeOption: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  themeOptionActive: { borderColor: theme.primaryMid, backgroundColor: theme.primaryLight },
  themeOptionText: { flex: 1, color: theme.textSecond, fontSize: 13, fontFamily: 'Inter', fontWeight: '700', marginLeft: 10 },
  themeOptionTextActive: { flex: 1, color: theme.primaryDark, fontSize: 13, fontFamily: 'Inter', fontWeight: '800', marginLeft: 10 },
  passwordPanel: { padding: 12, backgroundColor: theme.bgSurface, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  passwordInput: { minHeight: 46, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 12, paddingHorizontal: 12, color: theme.textPrimary, fontSize: 13, fontFamily: 'Inter', marginBottom: 10 },
  passwordActions: { flexDirection: 'row', gap: 10 },
  cancelPasswordButton: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: theme.borderMed, alignItems: 'center', justifyContent: 'center' },
  cancelPasswordText: { color: theme.textSecond, fontSize: 13, fontFamily: 'Inter', fontWeight: '800' },
  savePasswordButton: { flex: 1, minHeight: 42, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  savePasswordText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
  signOutButton: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  signOutText: { color: theme.error, fontSize: 14, fontFamily: 'Inter', fontWeight: '800', marginLeft: 8 },
});
