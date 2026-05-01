import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme(); // 'light' or 'dark'
  const [themeMode, setThemeMode] = useState(systemColorScheme || 'light');

  useEffect(() => {
    setThemeMode(systemColorScheme || 'light');
  }, [systemColorScheme]);

  const lightTheme = {
    bgPrimary: '#FFFFFF',
    bgSurface: '#F8FAFC',
    bgMuted: '#F1F5F9',
    bgOverlay: 'rgba(0,0,0,0.04)',
    primary: '#0C6EFD',
    primaryLight: '#EBF3FF',
    primaryMid: '#3D8EFF',
    primaryDark: '#0952C6',
    amber: '#F59E0B',
    amberLight: '#FFF8EC',
    amberDark: '#92600A',
    success: '#16A34A',
    successLight: '#EDFBF4',
    error: '#DC2626',
    errorLight: '#FFF0F0',
    textPrimary: '#0F172A',
    textSecond: '#475569',
    textMuted: '#94A3B8',
    borderLight: '#E2E8F0',
    borderMed: '#CBD5E1',
  };

  const darkTheme = {
    bgPrimary: '#0F172A',
    bgSurface: '#1E293B',
    bgMuted: '#334155',
    bgOverlay: 'rgba(255,255,255,0.08)',
    primary: '#0C6EFD',
    primaryLight: 'rgba(12, 110, 253, 0.15)',
    primaryMid: '#3D8EFF',
    primaryDark: '#60A5FA',
    amber: '#F59E0B',
    amberLight: 'rgba(245, 158, 11, 0.15)',
    amberDark: '#FCD34D',
    success: '#16A34A',
    successLight: 'rgba(22, 163, 74, 0.15)',
    error: '#DC2626',
    errorLight: 'rgba(220, 38, 38, 0.15)',
    textPrimary: '#F8FAFC',
    textSecond: '#CBD5E1',
    textMuted: '#64748B',
    borderLight: '#334155',
    borderMed: '#475569',
  };

  const currentTheme = themeMode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, isDark: themeMode === 'dark', setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
