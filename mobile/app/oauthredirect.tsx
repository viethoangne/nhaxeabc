import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useTheme } from '@/hooks/use-theme';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';

export default function OAuthRedirect() {
  const router = useRouter();
  const colors = useTheme();
  const { isAuthenticated, user } = useAuthStore();
  const [showCelebration, setShowCelebration] = useState(false);

  // Animation Refs
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Theo dõi trạng thái đăng nhập để kích hoạt hiệu ứng chúc mừng
  useEffect(() => {
    if (isAuthenticated && user) {
      setShowCelebration(true);
      
      // Chạy chuỗi hiệu ứng chúc mừng mượt mà
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Chuyển về trang chủ sau khi người dùng tận hưởng hiệu ứng
      const timer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, router, scaleAnim, fadeAnim, slideAnim]);

  // Nếu chưa đăng nhập thành công, hiển thị màn hình chờ xác thực dạng SaaS
  if (!showCelebration) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-[#f8fafc]`}>
        <ActivityIndicator size="large" color="#EF5222" />
        <Text style={[tw`text-[14.5px] font-black mt-4`, { color: colors.textSecondary }]}>
          Đang xác thực tài khoản Google...
        </Text>
      </View>
    );
  }

  // Khi đăng nhập thành công, hiển thị màn hình chúc mừng Premium
  return (
    <View style={tw`flex-1`}>
      {/* Background Gradient Sang Trọng */}
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={tw`flex-1 justify-center items-center px-6`}>
        {/* Glow effect đằng sau biểu tượng */}
        <Animated.View
          style={[
            styles.glowContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['#EF5222', '#F59E0B']}
            style={tw`w-24 h-24 rounded-full items-center justify-center`}
          >
            <Check color="#fff" size={44} strokeWidth={4} />
          </LinearGradient>

          {/* Biểu tượng lấp lánh trang trí xung quanh */}
          <View style={[tw`absolute`, { top: -10, right: -10 }]}>
            <Sparkles color="#F59E0B" size={24} fill="#F59E0B" />
          </View>
          <View style={[tw`absolute`, { bottom: -8, left: -8 }]}>
            <Sparkles color="#EF5222" size={20} fill="#EF5222" />
          </View>
        </Animated.View>

        {/* Nội dung lời chúc */}
        <Animated.View
          style={[
            tw`items-center mt-8`,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={tw`text-emerald-400 text-[13px] font-black uppercase tracking-widest mb-2`}>
            Thành công
          </Text>
          <Text style={tw`text-white text-2xl font-black text-center mb-3`}>
            Đăng nhập hoàn tất!
          </Text>
          <Text style={tw`text-slate-400 text-[14.5px] text-center leading-6 px-4`}>
            Chào mừng <Text style={tw`text-white font-black`}>{user?.name || 'Thành viên'}</Text> đã quay trở lại với ABC Bus Lines.
          </Text>
        </Animated.View>

        {/* Chấm tròn hiệu ứng loading nhỏ ở dưới */}
        <Animated.View style={[tw`mt-12 flex-row gap-1.5`, { opacity: fadeAnim }]}>
          <ActivityIndicator size="small" color="#EF5222" />
          <Text style={tw`text-slate-500 text-xs font-bold`}>Đang chuyển hướng...</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glowContainer: {
    position: 'relative',
    shadowColor: '#EF5222',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
});
