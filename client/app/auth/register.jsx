import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/common/Input';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import PasswordStrengthMeter from '../../components/common/PasswordStrengthMeter';
import {
  normalizePhoneNumber,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validatePhoneNumber,
  validateRequiredName,
} from '../../utils/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [role, setRole] = useState('traveler');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', licenseNumber: ''
  });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (field, value) => {
    const nextValue = field === 'phone' ? normalizePhoneNumber(value) : value;
    setFormData(prev => ({ ...prev, [field]: nextValue }));
  };

  const markTouched = (field) => setTouched((current) => ({ ...current, [field]: true }));

  const fieldErrors = {
    name: validateRequiredName(formData.name, 'Full name'),
    email: validateEmail(formData.email),
    phone: validatePhoneNumber(formData.phone),
    password: validatePassword(formData.password),
    confirmPassword: validatePasswordMatch(formData.password, formData.confirmPassword),
  };

  const getFieldError = (field) => (touched[field] ? fieldErrors[field] : '');
  const isFormValid = Object.values(fieldErrors).every((message) => !message);

  const handleRegister = async () => {
    setTouched({ name: true, email: true, phone: true, password: true, confirmPassword: true });
    if (!isFormValid) {
      setError('Please fix the highlighted fields.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await register({ ...formData, role });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  const TopBar = () => (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>Create account</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <TopBar />
      <KeyboardAwareScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>

        {/* Role Selector */}
        <View style={styles.roleContainer}>
          <TouchableOpacity 
            style={[styles.roleCard, { 
              backgroundColor: role === 'traveler' ? theme.primaryLight : theme.bgPrimary,
              borderColor: role === 'traveler' ? theme.primaryMid : theme.borderLight
            }]}
            onPress={() => setRole('traveler')}
          >
            <View style={[styles.roleIconBox, { backgroundColor: role === 'traveler' ? theme.primary : theme.bgMuted }]}>
              <Ionicons name="map-outline" size={18} color={role === 'traveler' ? '#FFF' : theme.textPrimary} />
            </View>
            <Text style={[styles.roleTitle, { color: theme.textPrimary }]}>Traveler</Text>
            <Text style={[styles.roleDesc, { color: theme.textMuted }]}>Plan trips & book vehicles</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleCard, { 
              backgroundColor: role === 'driver' ? theme.primaryLight : theme.bgPrimary,
              borderColor: role === 'driver' ? theme.primaryMid : theme.borderLight
            }]}
            onPress={() => setRole('driver')}
          >
            <View style={[styles.roleIconBox, { backgroundColor: role === 'driver' ? theme.primary : theme.bgMuted }]}>
              <Ionicons name="car-outline" size={18} color={role === 'driver' ? '#FFF' : theme.textPrimary} />
            </View>
            <Text style={[styles.roleTitle, { color: theme.textPrimary }]}>Driver</Text>
            <Text style={[styles.roleDesc, { color: theme.textMuted }]}>Offer rides & earn</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Input 
            icon="person-outline" label="Full name" 
            value={formData.name} onChangeText={(v) => handleChange('name', v)} 
            onBlur={() => markTouched('name')}
            error={getFieldError('name')}
            valid={touched.name && !fieldErrors.name}
          />
          <Input 
            icon="mail-outline" label="Email Address" 
            value={formData.email} onChangeText={(v) => handleChange('email', v)} 
            keyboardType="email-address" autoCapitalize="none"
            onBlur={() => markTouched('email')}
            error={getFieldError('email')}
            valid={touched.email && !fieldErrors.email}
          />
          <Input 
            icon="call-outline" label="Phone number" 
            value={formData.phone} onChangeText={(v) => handleChange('phone', v)} 
            keyboardType="number-pad"
            maxLength={10}
            onBlur={() => markTouched('phone')}
            error={getFieldError('phone')}
            valid={touched.phone && !fieldErrors.phone}
          />

          {role === 'driver' && (
            <Input 
              icon="card-outline" label="License number" 
              value={formData.licenseNumber} onChangeText={(v) => handleChange('licenseNumber', v)} 
            />
          )}

          <Input 
            icon="lock-closed-outline" label="Password" 
            value={formData.password} onChangeText={(v) => handleChange('password', v)} 
            isPassword
            onBlur={() => markTouched('password')}
            error={getFieldError('password')}
          />
          <PasswordStrengthMeter password={formData.password} />
          <Input 
            icon="lock-closed-outline" label="Confirm password" 
            value={formData.confirmPassword} onChangeText={(v) => handleChange('confirmPassword', v)} 
            isPassword
            onBlur={() => markTouched('confirmPassword')}
            error={getFieldError('confirmPassword')}
          />

          {error && <Text style={{ color: theme.error, marginTop: 8, fontSize: 13, textAlign: 'center' }}>{error}</Text>}

          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: theme.primary, marginTop: 16 }]}
            onPress={handleRegister}
            disabled={loading || !isFormValid}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create account'}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <TouchableOpacity style={styles.footer} onPress={() => router.push('/auth/login')}>
          <Text style={[styles.footerText, { color: theme.textSecond }]}>
            Already have an account? <Text style={{ color: theme.primary, fontWeight: '500' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>

      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  backButton: { padding: 4 },
  topBarTitle: { fontSize: 17, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  roleContainer: { flexDirection: 'row', gap: 14, marginVertical: 24 },
  roleCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'flex-start' },
  roleIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  roleTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  roleDesc: { fontSize: 11 },
  formContainer: { width: '100%' },
  primaryButton: { width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 13 }
});
