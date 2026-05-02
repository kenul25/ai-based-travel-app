import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        }
      } catch (error) {
        console.log('No valid session found');
        await AsyncStorage.removeItem('userToken');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('userToken', res.data.token);
      const profileRes = await api.get('/auth/me');
      const fullUser = profileRes.data.user || res.data.user;
      setUser(fullUser);
      routeBasedOnRole(fullUser.role);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const res = await api.post('/auth/register', userData);
      await AsyncStorage.setItem('userToken', res.data.token);
      const profileRes = await api.get('/auth/me');
      const fullUser = profileRes.data.user || res.data.user;
      setUser(fullUser);
      routeBasedOnRole(fullUser.role);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    setUser(null);
    router.replace('/auth/login');
  };

  const deleteAccount = async () => {
    try {
      await api.delete('/auth/me');
      await AsyncStorage.removeItem('userToken');
      setUser(null);
      router.replace('/auth/login');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Could not delete account',
      };
    }
  };

  const routeBasedOnRole = (role) => {
    if (role === 'traveler') {
      router.replace('/traveler/home'); // TODO: Create this layout
    } else if (role === 'driver') {
      router.replace('/driver/home'); // TODO: Create this layout
    } else {
      router.replace('/admin/home'); 
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
