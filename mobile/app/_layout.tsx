import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/hooks/useAuthStore';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import tw from 'twrnc';
import { registerForPushNotificationsAsync, sendTokenToBackend } from '@/utils/notificationHelper';

export default function RootLayout() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          sendTokenToBackend(user.id, token);
        }
      });
    }
  }, [isAuthenticated, user?.id]);

  // Luồng kiểm tra Router Guard tự động
  useEffect(() => {
    if (isLoading) return;

    // Kiểm tra xem user đang ở màn hình login không yêu cầu đăng nhập hay không
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'oauthredirect';

    if (!isAuthenticated && !inAuthGroup) {
      // Chưa đăng nhập -> Bắt buộc quay về trang /login
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Đã đăng nhập nhưng đang ở login -> Đẩy vào trang chủ
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  // Hiển thị màn hình Loading khi app đang kiểm tra token cũ trong bộ nhớ
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <View style={tw`flex-1 justify-center items-center bg-[#f8fafc]`}>
          <ActivityIndicator size="large" color="#EF5222" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Các màn hình xác thực và điều hướng gốc */}
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="contact" />
        <Stack.Screen name="about" />
        
        <Stack.Screen 
          name="booking/search" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="booking/search-trip" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="booking/select-seats" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="booking/checkout" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="tracking/[orderId]" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
