/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/hooks/useThemeStore';
import { useEffect } from 'react';

export function useTheme() {
  const { theme, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, []);

  return Colors[theme];
}
