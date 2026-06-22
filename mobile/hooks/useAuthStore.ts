import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiClient } from '@/constants/api';

// expo-secure-store chỉ hoạt động trên native (iOS/Android).
// Trên web/browser, dùng localStorage thay thế.
const storage = {
  async setItemAsync(key: string, value: string) {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
  async deleteItemAsync(key: string) {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch {}
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points?: number;
  picture?: string;
  totalTrips?: number;
  tier?: 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, name: string) => Promise<boolean>;
  loginGoogle: (email: string, name?: string, picture?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshPoints: () => Promise<void>;
  unreadNotificationsCount: number;
  fetchUnreadCount: () => Promise<void>;
  setUnreadNotificationsCount: (count: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Khởi động bằng true để kiểm tra token từ bộ nhớ trước
  unreadNotificationsCount: 0,
  setUnreadNotificationsCount: (count: number) => set({ unreadNotificationsCount: count }),

  login: async (phone: string, name: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/auth/login-demo', { phone, name });
      const { token, user: rawUser } = response.data;

      // Lấy điểm loyalty thực tế
      let points = 0;
      let totalTrips = 0;
      try {
        const loyaltyRes = await apiClient.get(`/loyalty?userId=${rawUser.id}`);
        points = loyaltyRes.data.points || 0;
        totalTrips = loyaltyRes.data.totalTrips || 0;
      } catch (err) {
        console.warn('Lỗi lấy điểm loyalty:', err);
      }

      // Xác định Hạng thẻ dựa trên điểm
      let tier: 'BRONZE' | 'SILVER' | 'GOLD' = 'BRONZE';
      if (points >= 2000 || totalTrips >= 10) tier = 'GOLD';
      else if (points >= 500 || totalTrips >= 4) tier = 'SILVER';

      const user = {
        ...rawUser,
        points,
        totalTrips,
        tier,
      };

      await storage.setItemAsync('user_token', token);
      await storage.setItemAsync('user_data', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      set({ isLoading: false });
      return false;
    }
  },

  loginGoogle: async (email: string, name?: string, picture?: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/auth/google-login', { email, name, picture });
      const { token, user: rawUser } = response.data;

      // Lấy điểm loyalty thực tế
      let points = 0;
      let totalTrips = 0;
      try {
        const loyaltyRes = await apiClient.get(`/loyalty?userId=${rawUser.id}`);
        points = loyaltyRes.data.points || 0;
        totalTrips = loyaltyRes.data.totalTrips || 0;
      } catch (err) {
        console.warn('Lỗi lấy điểm loyalty:', err);
      }

      // Xác định Hạng thẻ dựa trên điểm
      let tier: 'BRONZE' | 'SILVER' | 'GOLD' = 'BRONZE';
      if (points >= 2000 || totalTrips >= 10) tier = 'GOLD';
      else if (points >= 500 || totalTrips >= 4) tier = 'SILVER';

      const user = {
        ...rawUser,
        points,
        totalTrips,
        tier,
      };

      await storage.setItemAsync('user_token', token);
      await storage.setItemAsync('user_data', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      console.error('Lỗi đăng nhập Google:', error);
      set({ isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await storage.deleteItemAsync('user_token');
    await storage.deleteItemAsync('user_data');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await storage.getItemAsync('user_token');
      const userDataStr = await storage.getItemAsync('user_data');
      if (token && userDataStr) {
        set({
          token,
          user: JSON.parse(userDataStr),
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Lỗi kiểm tra auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshPoints: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const res = await apiClient.get(`/loyalty?userId=${user.id}`);
      const points = res.data.points || 0;
      const totalTrips = res.data.totalTrips || 0;

      let tier: 'BRONZE' | 'SILVER' | 'GOLD' = 'BRONZE';
      if (points >= 2000 || totalTrips >= 10) tier = 'GOLD';
      else if (points >= 500 || totalTrips >= 4) tier = 'SILVER';

      const updatedUser = { ...user, points, totalTrips, tier };
      await storage.setItemAsync('user_data', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (error) {
      console.error('Lỗi tải lại điểm:', error);
    }
  },

  fetchUnreadCount: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const response = await apiClient.get(`/notification/${user.id}`);
      const unreadCount = (response.data || []).filter((n: any) => !n.isRead).length;
      set({ unreadNotificationsCount: unreadCount });
    } catch (error) {
      console.warn('Lỗi lấy số thông báo chưa đọc:', error);
    }
  },
}));
