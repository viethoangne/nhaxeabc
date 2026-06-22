/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#EF5222',        // Cam thương hiệu chính
    primaryLight: '#FFF5F2',   // Cam nhạt làm nền
    background: '#F8FAFC',     // Nền xám Slate nhạt
    card: '#FFFFFF',           // Nền card trắng tinh
    text: '#0F172A',           // Văn bản chính xanh đen
    textSecondary: '#64748B',  // Văn bản phụ xám Slate
    border: '#E2E8F0',         // Viền nhạt
    success: '#10B981',        // Xanh lá thành công
    warning: '#F59E0B',        // Vàng cảnh báo
    backgroundElement: '#F1F5F9', // Phần tử phụ
    backgroundSelected: '#E2E8F0',
  },
  dark: {
    primary: '#FF6B4A',        // Cam sáng hơn cho Dark Mode
    primaryLight: '#2C1B17',   // Cam đậm/tối làm nền highlight
    background: '#090D16',     // Nền tối hẳn phong cách SaaS
    card: '#131C2E',           // Nền card tối xanh dương sang trọng
    text: '#F8FAFC',           // Văn bản chính trắng Slate
    textSecondary: '#94A3B8',  // Văn bản phụ xám nhạt
    border: '#1E293B',         // Viền tối
    success: '#34D399',        // Xanh lá sáng
    warning: '#FBBF24',        // Vàng sáng
    backgroundElement: '#1E293B', // Phần tử phụ tối
    backgroundSelected: '#334155',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
