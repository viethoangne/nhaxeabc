// Theme management hook
'use client';

import { useEffect, useState } from 'react';
import { Theme } from '@/types';

export function useTheme(): {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  mounted: boolean;
} {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>({
    mode: 'light',
    primaryColor: '#f97316', // orange-500
  });

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem('theme');
    const isDark =
      saved === 'dark' ||
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const newTheme: Theme = {
      mode: isDark ? 'dark' : 'light',
      primaryColor: '#f97316',
    };

    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const nextMode = theme.mode === 'light' ? 'dark' : 'light';
    const newTheme: Theme = {
      ...theme,
      mode: nextMode,
    };

    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', nextMode === 'dark');
    localStorage.setItem('theme', nextMode);
  };

  return {
    theme,
    toggleTheme,
    isDark: theme.mode === 'dark',
    mounted,
  };
}