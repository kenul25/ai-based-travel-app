import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AdminTabBar from '../../components/admin/AdminTabBar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import PasswordStrengthMeter from '../../components/common/PasswordStrengthMeter';
import {
  normalizePhoneNumber,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validatePhoneNumber,
  validateRequiredName,
} from '../../utils/validation';

const fallbackUsers = [
  { _id: 'u1', name: 'Kasun Perera', email: 'kasun@example.com', role: 'traveler', isActive: true, createdAt: '2026-04-18' },
  { _id: 'u2', name: 'Nimal Silva', email: 'nimal@example.com', role: 'driver', isActive: true, isVerified: false, licenseNumber: 'B2210487', createdAt: '2026-04-21' },
  { _id: 'u3', name: 'Ayesha Fernando', email: 'ayesha@example.com', role: 'driver', isActive: false, isVerified: true, licenseNumber: 'B8874120', createdAt: '2026-04-22' },
];

const fallbackAdmins = [
  { _id: 'a1', name: 'Super Admin', email: 'superadmin@wanderway.com', role: 'superadmin', isActive: true, createdBy: { name: 'System seed' } },
  { _id: 'a2', name: 'Operations Admin', email: 'ops@wanderway.com', role: 'admin', isActive: true, createdBy: { name: 'Super Admin' } },
];

const initialForm = {
  _id: null,
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'admin',
};

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [users, setUsers] = useState(fallbackUsers);
  const [admins, setAdmins] = useState(fallbackAdmins);
  const [selectedRole, setSelectedRole] = useState('traveler');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, adminRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/admins'),
      ]);
      setUsers(userRes.data?.users || []);
      setAdmins(adminRes.data?.admins || []);
    } catch (_error) {
      setUsers(fallbackUsers);
      setAdmins(fallbackAdmins);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const managedUsers = useMemo(() => {
    const source = selectedRole === 'admins' ? admins : users.filter((item) => item.role === selectedRole);
    return source.filter((item) => {
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && item.isActive)
        || (statusFilter === 'inactive' && !item.isActive);
      const text = `${item.name} ${item.email} ${item.phone || ''}`.toLowerCase();
      return matchesStatus && text.includes(search.trim().toLowerCase());
    });
  }, [admins, users, selectedRole, statusFilter, search]);

  const setField = (key, value) => {
    const nextValue = key === 'phone' ? normalizePhoneNumber(value) : value;
    setForm((current) => ({ ...current, [key]: nextValue }));
    setTouched((current) => ({ ...current, [key]: true }));
  };

  const passwordRequired = !form._id || !!form.password || !!form.confirmPassword;
  const modalErrors = {
    name: validateRequiredName(form.name, 'Full name'),
    email: validateEmail(form.email),
    phone: validatePhoneNumber(form.phone),
    password: passwordRequired ? validatePassword(form.password) : '',
    confirmPassword: passwordRequired ? validatePasswordMatch(form.password, form.confirmPassword) : '',
  };

  const getModalError = (field) => (touched[field] ? modalErrors[field] : '');

  const openCreateAdmin = () => {
    setForm(initialForm);
    setTouched({});
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalVisible(true);
  };

  const openEditAdmin = (admin) => {
    setForm({
      _id: admin._id,
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      password: '',
      confirmPassword: '',
      role: admin.role || 'admin',
    });
    setTouched({});
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalVisible(true);
  };

  const submitAdmin = async () => {
    setError('');
    setTouched({ name: true, email: true, phone: true, password: true, confirmPassword: true });
    const firstError = Object.values(modalErrors).find(Boolean);
    if (firstError) {
      setError(firstError);
      return;
    }
    if (form.role === 'superadmin' && !isSuperAdmin) {
      setError('Only a super admin can create or assign a super admin role.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
      };
      if (form.password) payload.password = form.password;

      if (form._id) {
        await api.put(`/admin/admins/${form._id}`, payload);
      } else {
        await api.post('/admin/admins', payload);
      }
      setModalVisible(false);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save admin account.');
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (target) => {
    const nextActive = !target.isActive;
    try {
      if (target.role === 'admin' || target.role === 'superadmin') {
        await api.put(`/admin/admins/${target._id}/deactivate`, { isActive: nextActive });
      } else {
        await api.put(`/admin/users/${target._id}/deactivate`, { isActive: nextActive });
      }
      await loadData();
    } catch (requestError) {
      Alert.alert('Update failed', requestError.response?.data?.message || 'Could not update account status.');
    }
  };

  const verifyDriver = async (target) => {
    try {
      await api.put(`/admin/users/${target._id}/verify`);
      await loadData();
    } catch (requestError) {
      Alert.alert('Verify failed', requestError.response?.data?.message || 'Could not verify driver.');
    }
  };

  const deleteAccount = async (target) => {
    const isAdminAccount = target.role === 'admin' || target.role === 'superadmin';
    Alert.alert(
      'Delete account?',
      `${target.name} will permanently lose access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isAdminAccount) {
                await api.delete(`/admin/admins/${target._id}`);
              } else {
                await api.delete(`/admin/users/${target._id}`);
              }
              await loadData();
            } catch (requestError) {
              Alert.alert('Delete failed', requestError.response?.data?.message || 'Could not delete account.');
            }
          },
        },
      ]
    );
  };

  const renderRoleFilter = (key, label, icon) => {
    const active = selectedRole === key;
    return (
      <TouchableOpacity key={key} style={active ? styles.filterPillActive : styles.filterPill} onPress={() => setSelectedRole(key)}>
        <Ionicons name={icon} size={15} color={active ? theme.primaryDark : theme.textSecond} />
        <Text style={active ? styles.filterTextActive : styles.filterText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderStatusFilter = (key, label) => (
    <TouchableOpacity key={key} style={statusFilter === key ? styles.statusFilterActive : styles.statusFilter} onPress={() => setStatusFilter(key)}>
      <Text style={statusFilter === key ? styles.statusFilterTextActive : styles.statusFilterText}>{label}</Text>
    </TouchableOpacity>
  );

  const renderModalInput = ({
    icon,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    autoCapitalize,
    secureTextEntry,
    showToggle,
    isVisible,
    onToggle,
    error,
    valid,
  }) => (
    <View style={styles.inputGroup}>
      <View style={[styles.inputWrap, error && styles.inputWrapError]}>
        <Ionicons name={icon} size={18} color={error ? theme.error : theme.textMuted} style={styles.inputIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={keyboardType === 'number-pad' ? 10 : undefined}
          secureTextEntry={secureTextEntry && !isVisible}
          style={[styles.modalInput, showToggle && styles.modalInputWithAction]}
        />
        {showToggle ? (
          <TouchableOpacity style={styles.eyeButton} onPress={onToggle} accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}>
            <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={19} color={theme.textMuted} />
          </TouchableOpacity>
        ) : valid ? (
          <Ionicons name="checkmark-circle" size={18} color={theme.success} style={styles.validIcon} />
        ) : null}
      </View>
      {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
    </View>
  );

  const renderAccount = (account) => {
    const isAdminAccount = account.role === 'admin' || account.role === 'superadmin';
    const canDelete = !isAdminAccount || isSuperAdmin;
    return (
      <View key={account._id} style={styles.accountRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(account.name || 'AD').slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.accountBody}>
          <View style={styles.nameRow}>
            <Text style={styles.accountName}>{account.name}</Text>
            <View style={account.role === 'superadmin' ? styles.superBadge : styles.roleBadge}>
              <Text style={account.role === 'superadmin' ? styles.superBadgeText : styles.roleBadgeText}>
                {account.role === 'superadmin' ? 'Super Admin' : account.role}
              </Text>
            </View>
          </View>
          <Text style={styles.accountEmail}>{account.email}</Text>
          {account.role === 'driver' ? (
            <Text style={styles.accountMeta}>
              {account.isVerified ? 'Verified driver' : 'Pending verification'} - License {account.licenseNumber || 'not set'}
            </Text>
          ) : null}
          {isAdminAccount ? <Text style={styles.accountMeta}>Created by: {account.createdBy?.name || 'System'}</Text> : null}
          <View style={styles.actionRow}>
            {account.role === 'driver' && !account.isVerified ? (
              <TouchableOpacity style={styles.primarySmallButton} onPress={() => verifyDriver(account)}>
                <Text style={styles.primarySmallText}>Verify</Text>
              </TouchableOpacity>
            ) : null}
            {isAdminAccount ? (
              <TouchableOpacity style={styles.outlineSmallButton} onPress={() => openEditAdmin(account)}>
                <Text style={styles.outlineSmallText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.outlineSmallButton} onPress={() => toggleUser(account)}>
              <Text style={styles.outlineSmallText}>{account.isActive ? 'Deactivate' : 'Activate'}</Text>
            </TouchableOpacity>
            {canDelete ? (
              <TouchableOpacity style={styles.dangerSmallButton} onPress={() => deleteAccount(account)}>
                <Text style={styles.dangerSmallText}>Delete</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: account.isActive ? theme.success : theme.textMuted }]} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Admin dashboard</Text>
            <Text style={styles.title}>Users</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openCreateAdmin}>
            <Ionicons name="person-add-outline" size={17} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New admin</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, or phone"
          placeholderTextColor={theme.textMuted}
          style={styles.searchInput}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {renderRoleFilter('traveler', 'Travelers', 'person-outline')}
          {renderRoleFilter('driver', 'Drivers', 'car-sport-outline')}
          {renderRoleFilter('admins', 'Admins', 'shield-outline')}
        </ScrollView>

        <View style={styles.statusFilterRow}>
          {renderStatusFilter('all', 'All')}
          {renderStatusFilter('active', 'Active')}
          {renderStatusFilter('inactive', 'Inactive')}
        </View>

        <View style={styles.summaryBand}>
          <View>
            <Text style={styles.summaryValue}>{managedUsers.length}</Text>
            <Text style={styles.summaryLabel}>{selectedRole === 'admins' ? 'admin accounts' : `${selectedRole} accounts`}</Text>
          </View>
          <Text style={styles.summaryNote}>Manage access without changing traveler trip history.</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loadingText}>Loading accounts...</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {managedUsers.length ? managedUsers.map(renderAccount) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={28} color={theme.textMuted} />
                <Text style={styles.emptyTitle}>No accounts found</Text>
                <Text style={styles.emptyText}>Try another role, status, or search term.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{form._id ? 'Edit admin' : 'Add new admin'}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {renderModalInput({
              icon: 'person-outline',
              value: form.name,
              onChangeText: (value) => setField('name', value),
              placeholder: 'Full name',
              error: getModalError('name'),
              valid: touched.name && !modalErrors.name,
            })}
            {renderModalInput({
              icon: 'mail-outline',
              value: form.email,
              onChangeText: (value) => setField('email', value),
              placeholder: 'Email Address',
              autoCapitalize: 'none',
              keyboardType: 'email-address',
              error: getModalError('email'),
              valid: touched.email && !modalErrors.email,
            })}
            {renderModalInput({
              icon: 'call-outline',
              value: form.phone,
              onChangeText: (value) => setField('phone', value),
              placeholder: 'Phone number',
              keyboardType: 'number-pad',
              error: getModalError('phone'),
              valid: touched.phone && !modalErrors.phone,
            })}

            <View style={styles.roleSelector}>
              {['admin', 'superadmin'].map((role) => {
                const disabled = role === 'superadmin' && !isSuperAdmin;
                const selected = form.role === role;
                return (
                  <TouchableOpacity
                    key={role}
                    disabled={disabled}
                    style={[selected ? styles.roleOptionActive : styles.roleOption, disabled && styles.disabledOption]}
                    onPress={() => setField('role', role)}
                  >
                    <Text style={selected ? styles.roleOptionTextActive : styles.roleOptionText}>
                      {role === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {renderModalInput({
              icon: 'lock-closed-outline',
              value: form.password,
              onChangeText: (value) => setField('password', value),
              placeholder: form._id ? 'New password optional' : 'Password',
              secureTextEntry: true,
              showToggle: true,
              isVisible: showPassword,
              onToggle: () => setShowPassword((current) => !current),
              error: getModalError('password'),
            })}
            <PasswordStrengthMeter password={form.password} />
            {renderModalInput({
              icon: 'lock-closed-outline',
              value: form.confirmPassword,
              onChangeText: (value) => setField('confirmPassword', value),
              placeholder: 'Confirm password',
              secureTextEntry: true,
              showToggle: true,
              isVisible: showConfirmPassword,
              onToggle: () => setShowConfirmPassword((current) => !current),
              error: getModalError('confirmPassword'),
            })}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.saveButton} onPress={submitAdmin} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{form._id ? 'Save admin' : 'Create admin account'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdminTabBar />
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  scrollContent: { padding: 16, paddingTop: 58, paddingBottom: 94 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  eyebrow: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 24, fontWeight: '800', marginTop: 2 },
  addButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 12 },
  addButtonText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  searchInput: { height: 46, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, paddingHorizontal: 14, color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, marginBottom: 12 },
  filterRow: { gap: 8, paddingBottom: 10 },
  filterPill: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 999, paddingHorizontal: 12 },
  filterPillActive: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.primaryMid, backgroundColor: theme.primaryLight, borderRadius: 999, paddingHorizontal: 12 },
  filterText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  statusFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusFilter: { flex: 1, height: 34, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgPrimary },
  statusFilterActive: { flex: 1, height: 34, borderWidth: 1, borderColor: theme.primaryMid, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primaryLight },
  statusFilterText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  statusFilterTextActive: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  summaryBand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, padding: 14, marginBottom: 12 },
  summaryValue: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 2 },
  summaryNote: { flex: 1, color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, textAlign: 'right' },
  loadingBox: { minHeight: 180, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 8 },
  listCard: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgPrimary, borderRadius: 14, overflow: 'hidden' },
  accountRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  accountBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  accountName: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  accountEmail: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 3 },
  accountMeta: { color: theme.textMuted, fontFamily: 'Inter', fontSize: 11, marginTop: 3 },
  roleBadge: { backgroundColor: theme.primaryLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  superBadge: { backgroundColor: theme.amberLight, borderWidth: 1, borderColor: theme.amber, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  superBadgeText: { color: theme.amberDark, fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  primarySmallButton: { minHeight: 30, justifyContent: 'center', backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 10 },
  primarySmallText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  outlineSmallButton: { minHeight: 30, justifyContent: 'center', borderWidth: 1, borderColor: theme.borderMed, borderRadius: 8, paddingHorizontal: 10 },
  outlineSmallText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  dangerSmallButton: { minHeight: 30, justifyContent: 'center', borderWidth: 1, borderColor: theme.error, borderRadius: 8, paddingHorizontal: 10 },
  dangerSmallText: { color: theme.error, fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  statusDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  emptyState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 15, fontWeight: '800', marginTop: 8 },
  emptyText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, marginTop: 3, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.bgPrimary, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 26 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { color: theme.textPrimary, fontFamily: 'Inter', fontSize: 18, fontWeight: '800' },
  closeButton: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: theme.borderLight, alignItems: 'center', justifyContent: 'center' },
  inputGroup: { marginBottom: 10 },
  inputWrap: { height: 50, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgSurface, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  inputWrapError: { borderColor: theme.error },
  inputIcon: { marginLeft: 14, marginRight: 10 },
  modalInput: { flex: 1, height: '100%', color: theme.textPrimary, fontFamily: 'Inter', fontSize: 13, paddingRight: 14 },
  modalInputWithAction: { paddingRight: 4 },
  eyeButton: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  validIcon: { marginRight: 12 },
  inputErrorText: { color: theme.error, fontFamily: 'Inter', fontSize: 11, marginTop: 5, marginLeft: 4 },
  roleSelector: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  roleOption: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.borderLight, borderRadius: 10 },
  roleOptionActive: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.primaryMid, backgroundColor: theme.primaryLight, borderRadius: 10 },
  disabledOption: { opacity: 0.45 },
  roleOptionText: { color: theme.textSecond, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  roleOptionTextActive: { color: theme.primaryDark, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  errorText: { color: theme.error, fontFamily: 'Inter', fontSize: 12, marginBottom: 10 },
  saveButton: { height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, borderRadius: 12 },
  saveButtonText: { color: '#FFFFFF', fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
});
