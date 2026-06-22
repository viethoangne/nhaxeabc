import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEY = 'app_language';

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

interface LanguageState {
  locale: 'vi' | 'en';
  isInitialized: boolean;
  initLanguage: () => Promise<void>;
  setLanguage: (lang: 'vi' | 'en') => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  locale: 'vi',
  isInitialized: false,
  initLanguage: async () => {
    if (get().isInitialized) return;
    const stored = await storage.getItem(STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') {
      set({ locale: stored, isInitialized: true });
    } else {
      set({ locale: 'vi', isInitialized: true });
    }
  },
  setLanguage: async (lang) => {
    set({ locale: lang });
    await storage.setItem(STORAGE_KEY, lang);
  }
}));
