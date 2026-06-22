import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, Zap, Compass, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useTheme } from '@/hooks/use-theme';
import Svg, { Path } from 'react-native-svg';
import tw from 'twrnc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <Path fill="none" d="M0 0h48v48H0z"/>
    </Svg>
  );
}

export default function LoginGuard() {
  const colors = useTheme();
  const auth = useAuthStore();
  const { promptAsync, loading: googleLoading, ready } = useGoogleAuth();

  const handleGoogleSignIn = async () => {
    if (!ready) {
      Alert.alert('Chờ một chút', 'Chức năng đăng nhập Google đang khởi tạo, vui lòng nhấn lại sau giây lát.');
      return;
    }
    try {
      await promptAsync();
    } catch (e) {
      console.error('Lỗi đăng nhập Google:', e);
      Alert.alert('Lỗi', 'Không thể kết nối với dịch vụ Google. Vui lòng thử lại.');
    }
  };

  const handleDeveloperBypass = async () => {
    if (__DEV__) {
      Alert.alert(
        'Developer Mode Bypass',
        'Bypass đăng nhập Google để tiến hành kiểm thử nhanh các trang giao diện khác?',
        [
          { text: 'Hủy bỏ', style: 'cancel' },
          {
            text: 'Tiến hành',
            onPress: async () => {
              const success = await auth.loginGoogle(
                'developer.demo@gmail.com',
                'Mại Cao',
                'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
              );
              if (success) {
                Alert.alert('Thành công', 'Đăng nhập Developer Test hoàn tất.');
              } else {
                Alert.alert('Thất bại', 'Lỗi liên kết cơ sở dữ liệu ở local.');
              }
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* SaaS Decorative Blobs */}
      <View style={[styles.blob1, { backgroundColor: colors.primary, opacity: 0.15 }]} />
      <View style={[styles.blob2, { backgroundColor: '#3b82f6', opacity: 0.1 }]} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <TouchableOpacity
            onLongPress={handleDeveloperBypass}
            delayLongPress={1500}
            activeOpacity={0.9}
            style={[styles.logoIcon, { backgroundColor: colors.primaryLight }]}
          >
            <Sparkles color={colors.primary} size={32} />
          </TouchableOpacity>
          <Text style={[styles.brandText, { color: colors.text }]}>ABC BUS LINES</Text>
          <Text style={[styles.brandSub, { color: colors.textSecondary }]}>
            Trải nghiệm hành trình số hiện đại & thông minh
          </Text>
        </View>

        {/* SaaS Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Chào mừng bạn đến với ABC
          </Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Đăng nhập để đặt vé xe nhanh chóng, theo dõi lộ trình và tích điểm thưởng hấp dẫn.
          </Text>

          {/* Nút Đăng nhập Google chuẩn SaaS */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            style={[
              styles.googleButton,
              { borderColor: colors.border, backgroundColor: colors.card },
              googleLoading && { opacity: 0.7 }
            ]}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <GoogleIcon size={20} />
                <Text style={[styles.googleButtonText, { color: colors.text }]}>
                  Tiếp tục với Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.termText, { color: colors.textSecondary }]}>
            Bằng cách tiếp tục, bạn đồng ý với Điều khoản sử dụng & Chính sách bảo mật của chúng tôi.
          </Text>

          {/* Badges tin cậy */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.badgeRow}>
            <View style={styles.badgeItem}>
              <View style={[styles.badgeIcon, { backgroundColor: colors.primaryLight }]}>
                <ShieldCheck color={colors.primary} size={18} />
              </View>
              <Text style={[styles.badgeText, { color: colors.text }]}>Bảo mật cao</Text>
            </View>
            
            <View style={styles.badgeItem}>
              <View style={[styles.badgeIcon, { backgroundColor: colors.primaryLight }]}>
                <Zap color={colors.primary} size={18} />
              </View>
              <Text style={[styles.badgeText, { color: colors.text }]}>Chính xác</Text>
            </View>
            
            <View style={styles.badgeItem}>
              <View style={[styles.badgeIcon, { backgroundColor: colors.primaryLight }]}>
                <Compass color={colors.primary} size={18} />
              </View>
              <Text style={[styles.badgeText, { color: colors.text }]}>Tối ưu UX</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  blob1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  blob2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  brandSub: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
  },
  termText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  badgeItem: {
    alignItems: 'center',
    flex: 1,
  },
  badgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
