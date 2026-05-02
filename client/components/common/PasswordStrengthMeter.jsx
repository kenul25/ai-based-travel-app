import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getPasswordStrength } from '../../utils/validation';

export default function PasswordStrengthMeter({ password }) {
  const { theme } = useTheme();
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const color = theme[strength.colorKey] || theme.textMuted;

  if (!password) return null;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View
            key={step}
            style={[
              styles.segment,
              { backgroundColor: step <= strength.score ? color : theme.borderLight },
            ]}
          />
        ))}
      </View>
      <View style={styles.textRow}>
        <Text style={[styles.label, { color }]}>{strength.label}</Text>
        <Text style={[styles.message, { color: theme.textMuted }]}>{strength.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: -8, marginBottom: 12 },
  track: { flexDirection: 'row', gap: 5, marginBottom: 6 },
  segment: { flex: 1, height: 4, borderRadius: 99 },
  textRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  message: { flex: 1, textAlign: 'right', fontFamily: 'Inter', fontSize: 10 },
});
