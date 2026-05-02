import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function Input({ label, icon, isPassword, error, valid, ...props }) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const animatedValue = useRef(new Animated.Value(props.value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || props.value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, props.value]);

  const labelTop = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [14, -8],
  });

  const labelSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 11],
  });

  const borderColor = error ? theme.error : isFocused ? theme.primary : theme.borderLight;
  const bgColor = isFocused ? theme.bgPrimary : theme.bgSurface;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { borderColor, backgroundColor: bgColor }]}>
        {icon && <Ionicons name={icon} size={18} color={theme.textMuted} style={styles.leftIcon} />}
        
        <View style={styles.inputContainer}>
          <Animated.Text
            style={[
              styles.label,
              { 
                top: labelTop, 
                fontSize: labelSize, 
                color: isFocused ? theme.primary : theme.textMuted,
                backgroundColor: isFocused || props.value ? theme.bgPrimary : 'transparent',
                paddingHorizontal: (isFocused || props.value) ? 4 : 0
              }
            ]}
          >
            {label}
          </Animated.Text>

          <TextInput
            {...props}
            style={[styles.input, { color: theme.textPrimary }]}
            onFocus={(event) => {
              setIsFocused(true);
              props.onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              props.onBlur?.(event);
            }}
            secureTextEntry={isPassword && !showPassword}
            placeholderTextColor="transparent"
          />
        </View>

        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.rightIcon}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}

        {valid && !isPassword && (
          <Ionicons name="checkmark-circle" size={18} color={theme.success} style={styles.rightIcon} />
        )}
      </View>
      {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  container: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  leftIcon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 10,
  },
  inputContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 0,
    fontWeight: '500',
    zIndex: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingTop: 10, // Push text down a bit to clear float label space visually
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  }
});
