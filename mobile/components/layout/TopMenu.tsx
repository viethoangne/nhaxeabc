import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Platform,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Settings, Sun, Moon } from 'lucide-react-native';
import Svg, { Rect, Polygon, Path } from 'react-native-svg';
import tw from 'twrnc';
import { useTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/hooks/useThemeStore';
import { useTranslation } from '@/hooks/useTranslation';
import BouncyPressable from '@/components/ui/BouncyPressable';

const VietnamFlag = () => (
  <Svg viewBox="0 0 30 20" width={26} height={18} style={tw`rounded-sm`}>
    <Rect width={30} height={20} fill="#DA251D" />
    <Polygon
      points="15,4 16.18,7.63 20,7.63 16.91,9.88 18.09,13.5 15,11.25 11.91,13.5 13.09,9.88 10,7.63 13.82,7.63"
      fill="#FFFF00"
    />
  </Svg>
);

const UKFlag = () => (
  <Svg viewBox="0 0 30 20" width={26} height={18} style={tw`rounded-sm`}>
    <Rect width={30} height={20} fill="#012169" />
    <Path stroke="#FFF" strokeWidth="3" d="M0 0l30 20M30 0L0 20" />
    <Path stroke="#C8102E" strokeWidth="1" d="M0 0l30 20M30 0L0 20" />
    <Path stroke="#FFF" strokeWidth="5" d="M15 0v20M0 10h30" />
    <Path stroke="#C8102E" strokeWidth="3" d="M15 0v20M0 10h30" />
  </Svg>
);

export default function TopMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useTheme();
  const { theme, toggleTheme } = useThemeStore();
  const { t, locale, setLanguage } = useTranslation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-15)).current;
  const rotateAnim = useRef(new Animated.Value(theme === 'dark' ? 180 : 0)).current;

  // Track rotate transition
  useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: theme === 'dark' ? 180 : 0,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [theme]);

  const openMenu = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -15,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
    });
  };

  // Rotation style for Sun/Moon toggle
  const spin = rotateAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <>
      {/* Settings Trigger Button */}
      <BouncyPressable
        onPress={openMenu}
        style={[
          tw`p-2.5 rounded-full items-center justify-center border`,
          {
            backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : '#f1f5f9',
            borderColor: colors.border,
          },
        ]}
      >
        <Settings size={18} color={colors.text} strokeWidth={2.5} />
      </BouncyPressable>

      {/* Modal Dropdown */}
      <Modal
        transparent
        visible={isOpen}
        onRequestClose={closeMenu}
        animationType="none"
      >
        {/* Backdrop */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeMenu}
        >
          <View style={tw`flex-1 bg-black/20 dark:bg-black/40`} />
        </Pressable>

        {/* Floating Menu Container */}
        <Animated.View
          style={[
            tw`absolute right-5 w-64 rounded-3xl border p-4.5 shadow-2xl`,
            {
              top: Platform.OS === 'ios' ? 105 : 70,
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 8,
            },
          ]}
        >
          {/* Header */}
          <Text style={[tw`text-[11px] font-black uppercase tracking-widest mb-4 text-center`, { color: colors.textSecondary }]}>
            {t('settings_title')}
          </Text>

          {/* Vertical Action Stack */}
          <View style={tw`gap-3`}>
            {/* Theme settings row */}
            <Pressable
              onPress={toggleTheme}
              style={[
                tw`flex-row items-center justify-between p-3.5 rounded-2xl border`,
                {
                  backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={tw`flex-row items-center gap-3`}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  {theme === 'dark' ? (
                    <Moon size={18} color="#fcd34d" strokeWidth={2.5} />
                  ) : (
                    <Sun size={18} color="#ea580c" strokeWidth={2.5} />
                  )}
                </Animated.View>
                <Text style={[tw`text-[13px] font-bold`, { color: colors.text }]}>
                  {t('theme')}
                </Text>
              </View>
              <Text style={[tw`text-[11.5px] font-bold text-slate-400`]}>
                {theme === 'dark' ? t('theme_dark') : t('theme_light')}
              </Text>
            </Pressable>

            {/* Language settings row */}
            <Pressable
              onPress={() => {
                setLanguage(locale === 'vi' ? 'en' : 'vi');
              }}
              style={[
                tw`flex-row items-center justify-between p-3.5 rounded-2xl border`,
                {
                  backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={tw`flex-row items-center gap-3`}>
                <View style={tw`w-[26px] h-[18px] rounded-sm overflow-hidden justify-center items-center`}>
                  {locale === 'vi' ? <VietnamFlag /> : <UKFlag />}
                </View>
                <Text style={[tw`text-[13px] font-bold ml-1`, { color: colors.text }]}>
                  {t('language')}
                </Text>
              </View>
              <Text style={[tw`text-[11.5px] font-bold text-slate-400`]}>
                {locale === 'vi' ? t('lang_vi') : t('lang_en')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}
