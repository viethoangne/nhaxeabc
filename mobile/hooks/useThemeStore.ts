import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform, Appearance } from 'react-native';

const STORAGE_KEY = 'app_theme';

const storage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
    } else {
      try { await SecureStore.setItemAsync(key, value); } catch {}
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  }
};

interface ThemeState {
  theme: 'light' | 'dark';
  isInitialized: boolean;
  initTheme: () => Promise<void>;
  toggleTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  isInitialized: false,
  initTheme: async () => {
    if (get().isInitialized) return;
    const stored = await storage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      set({ theme: stored, isInitialized: true });
    } else {
      const systemScheme = Appearance.getColorScheme();
      set({ theme: systemScheme === 'dark' ? 'dark' : 'light', isInitialized: true });
    }
  },
  toggleTheme: async () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: nextTheme });
    await storage.setItem(STORAGE_KEY, nextTheme);
  }
}));
