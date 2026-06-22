import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Đọc từ .env — biến phải có prefix EXPO_PUBLIC_ để Expo bundle vào app
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';
export const WEB_URL  = process.env.EXPO_PUBLIC_WEB_URL      ?? 'http://localhost:3000';

// Cross-platform storage: localStorage (web) hoặc SecureStore (native)
const storage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

// Thêm token vào header của tất cả request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItemAsync('user_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Lỗi khi lấy token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
