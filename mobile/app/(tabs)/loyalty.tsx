import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gift, Ticket, Clock, LogOut, ChevronRight, Star, Crown, Zap, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { apiClient } from '@/constants/api';
import { useAuthStore } from '@/hooks/useAuthStore';
import VIPCard from '@/components/loyalty/VIPCard';
import RedeemTab from '@/components/loyalty/RedeemTab';
import MyVouchersTab from '@/components/loyalty/MyVouchersTab';
import HistoryTab from '@/components/loyalty/HistoryTab';
import SpinTab from '@/components/loyalty/SpinTab';
import tw from 'twrnc';
import { useTranslation } from '@/hooks/useTranslation';

WebBrowser.maybeCompleteAuthSession();

import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useTheme } from '@/hooks/use-theme';
import SaaSButton from '@/components/ui/SaaSButton';

export default function LoyaltyScreen() {
  const colors = useTheme();
  const auth = useAuthStore();
  const user = auth.user;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'redeem' | 'my_vouchers' | 'history' | 'spin'>('redeem');
  const [points, setPoints] = useState(0);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { t, locale } = useTranslation();

  // Sử dụng hook dùng chung đã được fix cors & oauth flow
  const { promptAsync, loading: googleLoading, ready } = useGoogleAuth();

  const handleGoogleSignIn = async () => {
    if (!ready) {
      Alert.alert(locale === 'vi' ? 'Lỗi' : 'Error', locale === 'vi' ? 'Chức năng đăng nhập Google chưa sẵn sàng, vui lòng thử lại.' : 'Google Login is not ready yet, please try again.');
      return;
    }
    try {
      await promptAsync();
    } catch (e) {
      console.error('Lỗi đăng nhập Google:', e);
      Alert.alert(locale === 'vi' ? 'Lỗi' : 'Error', locale === 'vi' ? 'Không thể mở đăng nhập Google. Vui lòng thử lại.' : 'Could not open Google Login. Please try again.');
    }
  };

  const fetchLoyaltyData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/loyalty?userId=${user.id}`);
      setPoints(res.data.points || 0);
      setVouchers(res.data.redeemableVouchers || []);
      setMyVouchers(res.data.myVouchers || []);
      setHistoryLogs(res.data.history || []);
    } catch (error) {
      console.error('Lỗi tải dữ liệu loyalty:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchLoyaltyData();
    }
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      locale === 'vi' ? 'Xác nhận' : 'Confirm',
      locale === 'vi' ? 'Bạn có chắc chắn muốn đăng xuất?' : 'Are you sure you want to sign out?',
      [
        { text: locale === 'vi' ? 'Hủy' : 'Cancel', style: 'cancel' },
        { text: locale === 'vi' ? 'Đăng xuất' : 'Sign out', onPress: () => auth.logout() },
      ]
    );
  };

  const handleRedeem = async (voucher: any) => {
    if (!user?.id) return;
    if (points < voucher.cost) {
      Alert.alert(
        locale === 'vi' ? 'Thất bại' : 'Failed',
        locale === 'vi' ? 'Bạn không có đủ điểm để đổi voucher này.' : 'You do not have enough points to redeem this voucher.'
      );
      return;
    }
    Alert.alert(
      locale === 'vi' ? 'Xác nhận' : 'Confirm',
      locale === 'vi' ? `Dùng ${voucher.cost} điểm đổi "${voucher.title}"?` : `Use ${voucher.cost} points to redeem "${voucher.title}"?`,
      [
        { text: locale === 'vi' ? 'Hủy' : 'Cancel', style: 'cancel' },
        {
          text: locale === 'vi' ? 'Đồng ý' : 'Agree',
          onPress: async () => {
            try {
              const res = await apiClient.post('/loyalty/redeem', { userId: user.id, voucherId: voucher.id });
              if (res.data) {
                Alert.alert(
                  locale === 'vi' ? 'Chúc mừng' : 'Congratulations',
                  locale === 'vi' ? `Đổi voucher "${voucher.title}" thành công!` : `Successfully redeemed "${voucher.title}"!`
                );
                setPoints(res.data.newPoints);
                await auth.refreshPoints();
                fetchLoyaltyData();
              }
            } catch (error: any) {
              Alert.alert(
                locale === 'vi' ? 'Thất bại' : 'Failed',
                error.response?.data?.message || (locale === 'vi' ? 'Có lỗi xảy ra.' : 'An error occurred.')
              );
            }
          },
        },
      ]
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHƯA ĐĂNG NHẬP — Màn hình Login VIP Premium
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!user) {
    return (
      <View style={tw`flex-1`}>
        {/* Nền Gradient VIP */}
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={tw`flex-1`}>
          <ScrollView
            contentContainerStyle={tw`flex-grow justify-center px-6 py-12`}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo & Branding */}
            <View style={tw`items-center mb-10`}>
              {/* Vòng tròn VIP */}
              <View style={[tw`w-24 h-24 rounded-full items-center justify-center mb-5`, styles.vipRing]}>
                <LinearGradient
                  colors={['#CF9E41', '#F6E3B8', '#9F7425']}
                  style={tw`w-20 h-20 rounded-full items-center justify-center`}
                >
                  <Crown color="#fff" size={36} />
                </LinearGradient>
              </View>

              <Text style={tw`text-white text-2xl font-black tracking-wider text-center`}>
                ABC LotusMiles VIP
              </Text>
              <Text style={tw`text-white/50 text-xs mt-2 text-center tracking-widest font-bold`}>
                {locale === 'vi' ? 'CHƯƠNG TRÌNH THÀNH VIÊN CAO CẤP' : 'PREMIUM MEMBERSHIP PROGRAM'}
              </Text>
            </View>

            {/* Benefits Cards */}
            <View style={tw`flex-row gap-3 mb-8`}>
              {[
                { icon: <Star size={18} color="#F59E0B" fill="#F59E0B" />, label: locale === 'vi' ? 'Tích điểm\nmỗi chuyến' : 'Earn points\nevery trip' },
                { icon: <Gift size={18} color="#a78bfa" />, label: locale === 'vi' ? 'Đổi quà\nhấp dẫn' : 'Redeem\ngifts' },
                { icon: <Zap size={18} color="#34d399" />, label: locale === 'vi' ? 'Ưu đãi\nriêng tư' : 'Exclusive\noffers' },
              ].map((b, i) => (
                <View
                  key={i}
                  style={[tw`flex-1 items-center py-3.5 px-2 rounded-2xl`, { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}
                >
                  <View style={tw`mb-1.5`}>{b.icon}</View>
                  <Text style={tw`text-white/70 text-[10px] font-bold text-center leading-4`}>{b.label}</Text>
                </View>
              ))}
            </View>

            {/* Khung Đăng nhập */}
            <View style={[tw`rounded-3xl overflow-hidden`, { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }]}>
              <View style={tw`px-6 pt-6 pb-7`}>
                <Text style={tw`text-white font-black text-base mb-1`}>{t('member_login')}</Text>
                <Text style={tw`text-white/55 text-xs mb-6 leading-5`}>
                  {t('google_login_desc')}
                </Text>

                {/* Nút Google */}
                <TouchableOpacity
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                  activeOpacity={0.85}
                  style={[tw`h-14 rounded-2xl flex-row items-center justify-center overflow-hidden`, styles.googleBtn]}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      {/* Google Logo */}
                      <View style={tw`w-7 h-7 bg-white rounded-full items-center justify-center mr-3`}>
                        <Image
                          source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                          style={tw`w-4 h-4`}
                          defaultSource={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                        />
                        <Text style={tw`text-[#4285F4] font-black text-sm absolute`}>G</Text>
                      </View>
                      <Text style={tw`text-white font-black text-sm tracking-wider`}>
                        {t('continue_google')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={tw`text-white/30 text-[10px] text-center mt-4 leading-4`}>
                  {locale === 'vi'
                    ? 'Bằng cách tiếp tục, bạn đồng ý với\nĐiều khoản dịch vụ của Nhà xe ABC'
                    : 'By continuing, you agree to the\nTerms of Service of ABC Bus'}
                </Text>
              </View>
            </View>

            {/* Dải tiers */}
            <View style={tw`mt-6`}>
              <Text style={tw`text-white/30 text-[9px] font-bold text-center tracking-widest mb-4`}>
                {t('membership_tiers')}
              </Text>
              <View style={tw`flex-row justify-between gap-2`}>
                {[
                  { label: 'BRONZE', color: '#a07050', minPts: '0' },
                  { label: 'SILVER', color: '#8e9eab', minPts: '500' },
                  { label: 'GOLD',   color: '#CF9E41', minPts: '2000' },
                ].map((t) => (
                  <View
                    key={t.label}
                    style={[tw`flex-1 items-center py-2.5 rounded-xl`, { backgroundColor: `${t.color}22`, borderWidth: 1, borderColor: `${t.color}55` }]}
                  >
                    <Text style={[tw`text-[10px] font-black tracking-wider`, { color: t.color }]}>{t.label}</Text>
                    <Text style={tw`text-white/40 text-[9px] mt-0.5`}>{t.minPts}+ pts</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ĐÃ ĐĂNG NHẬP — Màn hình VIP Dashboard
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
      {/* ── HEADER BẢN WEB ĐỒNG BỘ ── */}
      <View style={tw`px-4 pt-4 pb-2 flex-row justify-between items-center`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[24px] font-black text-slate-800 tracking-tight`}>{t('vip_member')}</Text>
          <Text style={tw`text-[12px] font-bold text-slate-400 mt-0.5`}>
            {t('loyalty_desc')}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`p-4 pb-[110px]`}>
        {/* VIP Card */}
        <View style={tw`mb-5`}>
          <VIPCard user={user} points={points} />
        </View>

        {/* Section Navigation Tabs */}
        <View style={[tw`flex-row rounded-2xl p-1 border mb-5`, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { key: 'redeem',      icon: <Gift size={14} color={activeTab === 'redeem' ? colors.primary : colors.textSecondary} />,       label: t('redeem_gift') },
            { key: 'spin',        icon: <Star size={14} color={activeTab === 'spin' ? colors.primary : colors.textSecondary} />,         label: t('spin_tab') },
            { key: 'my_vouchers', icon: <Ticket size={14} color={activeTab === 'my_vouchers' ? colors.primary : colors.textSecondary} />, label: t('my_vouchers') },
            { key: 'history',     icon: <Clock size={14} color={activeTab === 'history' ? colors.primary : colors.textSecondary} />,     label: t('redeem_history') },
          ].map((tab) => {
            const isTabActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={[
                  tw`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1`,
                  isTabActive && { backgroundColor: colors.primaryLight },
                ]}
              >
                {tab.icon}
                <Text style={[tw`text-[10px] font-black`, { color: isTabActive ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        {loading ? (
          <View style={tw`py-16 items-center`}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {activeTab === 'redeem' && <RedeemTab vouchers={vouchers} points={points} onRedeem={handleRedeem} />}
            {activeTab === 'spin' && <SpinTab points={points} onRefreshData={fetchLoyaltyData} colors={colors} />}
            {activeTab === 'my_vouchers' && <MyVouchersTab myVouchers={myVouchers} onNavigateToRedeem={() => setActiveTab('redeem')} />}
            {activeTab === 'history' && <HistoryTab historyLogs={historyLogs} />}
          </>
        )}

        {/* Đăng xuất chuẩn SaaSButton */}
        <SaaSButton
          title={locale === 'vi' ? 'ĐĂNG XUẤT' : 'SIGN OUT'}
          onPress={handleLogout}
          variant="outline"
          size="md"
          icon={<LogOut size={16} color="#ef4444" />}
          style={tw`mt-8 w-full border-red-200`}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  vipRing: {
    shadowColor: '#CF9E41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(207, 158, 65, 0.4)',
  },
  googleBtn: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});
