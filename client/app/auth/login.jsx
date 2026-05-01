import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/common/Input';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.bgPrimary }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="compass" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>WanderWay</Text>
          <Text style={[styles.subtitle, { color: theme.textSecond }]}>Welcome back</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <Input 
            icon="mail-outline"
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input 
            icon="lock-closed-outline"
            label="Password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          {error && <Text style={[styles.mainError, { color: theme.error }]}>{error}</Text>}

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
          >
            <Text style={styles.buttonText}>Sign in</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            <Text style={[styles.orText, { color: theme.textMuted, backgroundColor: theme.bgPrimary }]}>or</Text>
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
          </View>

          <TouchableOpacity style={[styles.googleButton, { borderColor: theme.borderLight, backgroundColor: theme.bgPrimary }]}>
            <Ionicons name="logo-google" size={20} color={theme.textPrimary} style={styles.googleIcon} />
            <Text style={[styles.googleButtonText, { color: theme.textPrimary }]}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Section */}
        <TouchableOpacity style={styles.footer} onPress={() => router.push('/auth/register')}>
          <Text style={[styles.footerText, { color: theme.textSecond }]}>
            New here? <Text style={{ color: theme.primary, fontWeight: '500' }}>Create an account</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { fontSize: 14, marginTop: 4 },
  formContainer: { width: '100%' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { fontSize: 13, fontWeight: '500' },
  primaryButton: { width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginVertical: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1 },
  orText: { paddingHorizontal: 8, fontSize: 12 },
  googleButton: { width: '100%', height: 48, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  googleIcon: { marginRight: 12 },
  googleButtonText: { fontSize: 14, fontWeight: '500' },
  footer: { marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 13 },
  mainError: { marginBottom: 16, textAlign: 'center', fontSize: 13 }
});
