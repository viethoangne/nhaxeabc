import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, LogOut, Award, Ticket, ShieldCheck, Zap, Compass, Info, ChevronRight } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useTranslation } from '@/hooks/useTranslation';
import tw from 'twrnc';

// ─── Google Icon SVG ───────────────────────────────────────────────────────────
function GoogleIcon({ size = 20 }: { size?: number }) {
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

// ─── Google Sign-In Button Component ──────────────────────────────────────────
function GoogleSignInButton() {
  const { promptAsync, loading, ready } = useGoogleAuth();
  const { t } = useTranslation();

  const handlePress = async () => {
    if (!ready) {
      Alert.alert(t('account.errorTitle'), t('account.googleNotReady'));
      return;
    }
    await promptAsync();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      style={[
        tw`w-full h-12 bg-white rounded-xl flex-row items-center justify-center border border-[#e2e8f0]`,
        { elevation: 1 },
        loading && tw`opacity-60`,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#4285F4" size="small" />
      ) : (
        <>
          <GoogleIcon size={20} />
          <Text style={tw`ml-3 text-sm font-bold text-[#1e293b]`}>
            {t('continue_google')}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function AccountScreen() {
  const router = useRouter();
  const auth = useAuthStore();
  const { t } = useTranslation();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !name.trim()) {
      Alert.alert(t('account.errorTitle'), t('account.fillRequiredFields'));
      return;
    }

    if (!/^[0-9]{9,11}$/.test(phone.trim())) {
      Alert.alert(t('account.errorTitle'), t('account.invalidPhone'));
      return;
    }

    setLoading(true);
    const success = await auth.login(phone.trim(), name.trim());
    setLoading(false);

    if (success) {
      Alert.alert(t('account.loginSuccessTitle'), t('account.welcomeBack').replace('{name}', name));
    } else {
      Alert.alert(t('account.loginFailTitle'), t('account.loginFailed'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('account.logoutConfirmTitle'), t('account.logoutConfirmMsg'), [
      { text: t('account.logoutCancel'), style: 'cancel' },
      {
        text: t('account.logoutAgree'),
        onPress: async () => {
          await auth.logout();
          Alert.alert(t('account.logoutSuccessTitle'), t('account.logoutSuccessMsg'));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8fafc]`}>
      <ScrollView contentContainerStyle={tw`p-4 pb-10`} showsVerticalScrollIndicator={false}>

        {/* NẾU CHƯA ĐĂNG NHẬP */}
        {!auth.isAuthenticated ? (
          <View style={[tw`bg-white rounded-3xl p-5 items-center border border-[#e2e8f0] mt-5`, { elevation: 3 }]}>
            <View style={tw`w-[68px] h-[68px] rounded-full bg-[#ffebe5] justify-center items-center mb-4`}>
              <User color="#EF5222" size={40} />
            </View>
            <Text style={tw`text-lg font-black text-[#0f172a]`}>{t('account.loginTitle')}</Text>
            <Text style={tw`text-xs text-[#64748b] text-center mt-1 mb-5 leading-5`}>
              {t('account.loginSubtitle')}
            </Text>

            <View style={tw`w-full mb-3.5`}>
              <Text style={tw`text-[9px] font-bold text-[#94a3b8] mb-1.5 tracking-wider`}>{t('account.fullNameLabel')}</Text>
              <TextInput
                style={tw`h-11 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 text-sm font-bold text-[#334155]`}
                placeholder={t('account.fullNamePlaceholder')}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={tw`w-full mb-3.5`}>
              <Text style={tw`text-[9px] font-bold text-[#94a3b8] mb-1.5 tracking-wider`}>{t('account.phoneLabel')}</Text>
              <TextInput
                style={tw`h-11 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 text-sm font-bold text-[#334155]`}
                placeholder={t('account.phonePlaceholder')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[tw`w-full h-11 bg-[#EF5222] rounded-xl justify-center items-center mt-2.5`, { elevation: 2 }]}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={tw`text-white text-sm font-bold`}>{t('account.loginBtn')}</Text>
              )}
            </TouchableOpacity>

            {/* ── Divider ── */}
            <View style={tw`flex-row items-center w-full my-4`}>
              <View style={tw`flex-1 h-px bg-[#e2e8f0]`} />
              <Text style={tw`text-[10px] font-bold text-[#94a3b8] mx-3 tracking-widest`}>{t('account.orDivider')}</Text>
              <View style={tw`flex-1 h-px bg-[#e2e8f0]`} />
            </View>

            {/* ── Nút Google Sign-In ── */}
            <GoogleSignInButton />

            {/* ── Badges tin cậy ── */}
            <View style={tw`flex-row justify-around w-full mt-6 border-t border-[#f1f5f9] pt-4`}>
              <View style={tw`items-center`}>
                <ShieldCheck color="#22c55e" size={20} />
                <Text style={tw`text-[10px] font-bold text-[#64748b] mt-1`}>{t('account.badgeSecurity')}</Text>
              </View>
              <View style={tw`items-center`}>
                <Zap color="#EF5222" size={20} />
                <Text style={tw`text-[10px] font-bold text-[#64748b] mt-1`}>{t('account.badgeFast')}</Text>
              </View>
              <View style={tw`items-center`}>
                <Compass color="#3b82f6" size={20} />
                <Text style={tw`text-[10px] font-bold text-[#64748b] mt-1`}>{t('account.badgeConvenient')}</Text>
              </View>
            </View>
          </View>
        ) : (
          /* ── NẾU ĐÃ ĐĂNG NHẬP ── */
          <View style={tw`flex-1`}>
            {/* Header thông tin cá nhân */}
            <View style={tw`bg-white rounded-3xl p-6 items-center border border-[#e2e8f0] mb-5`}>
              <View style={tw`w-[72px] h-[72px] rounded-full bg-[#EF5222] justify-center items-center mb-3`}>
                <Text style={tw`text-white text-3xl font-black`}>
                  {auth.user?.name ? auth.user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={tw`text-lg font-black text-[#0f172a]`}>{auth.user?.name}</Text>
              <Text style={tw`text-xs text-[#64748b] mt-0.5`}>
                {auth.user?.phone || auth.user?.email}
              </Text>
              <View style={tw`flex-row items-center bg-[#fef3c7] px-3 py-1 rounded-xl mt-2.5 border border-[#fde047]`}>
                <Award size={12} color="#854d0e" />
                <Text style={tw`text-[10px] font-bold text-[#854d0e] ml-1`}>
                  {t('account.tierMember').replace('{tier}', auth.user?.tier || 'BRONZE')}
                </Text>
              </View>
            </View>

            {/* Thao tác nhanh */}
            <View style={tw`bg-white rounded-2xl p-4 border border-[#e2e8f0] mb-4`}>
              <Text style={tw`text-[9px] font-bold text-[#94a3b8] mb-3 tracking-wider`}>{t('account.quickActionsTitle')}</Text>

              <TouchableOpacity
                onPress={() => router.push('/history')}
                style={tw`flex-row justify-between items-center py-3 border-b border-[#f1f5f9]`}
              >
                <View style={tw`flex-row items-center`}>
                  <Ticket size={18} color="#EF5222" />
                  <Text style={tw`text-xs font-bold text-[#1e293b] ml-2.5`}>{t('account.bookingHistoryMenu')}</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/loyalty')}
                style={tw`flex-row justify-between items-center py-3`}
              >
                <View style={tw`flex-row items-center`}>
                  <Award size={18} color="#F59E0B" />
                  <Text style={tw`text-xs font-bold text-[#1e293b] ml-2.5`}>{t('account.loyaltyMenu')}</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Thông tin hỗ trợ */}
            <View style={tw`bg-white rounded-2xl p-4 border border-[#e2e8f0] mb-4`}>
              <Text style={tw`text-[9px] font-bold text-[#94a3b8] mb-3 tracking-wider`}>{t('account.supportTitle')}</Text>
              <View style={tw`flex-row items-center py-2`}>
                <Info size={16} color="#64748b" style={tw`mr-2.5`} />
                <Text style={tw`text-xs font-medium text-[#475569]`}>{t('account.hotlineText')}</Text>
              </View>
              <View style={tw`flex-row items-center py-2 mt-2 border-t border-[#f1f5f9] pt-3`}>
                <Info size={16} color="#64748b" style={tw`mr-2.5`} />
                <Text style={tw`text-xs font-medium text-[#475569]`}>{t('account.appVersion').replace('{version}', '1.0.0 (Expo SDK 56)')}</Text>
              </View>
            </View>

            {/* Nút Đăng xuất */}
            <TouchableOpacity
              onPress={handleLogout}
              style={tw`flex-row bg-[#fee2e2] border border-[#fecaca] h-11 rounded-xl justify-center items-center mt-2.5`}
            >
              <LogOut color="#ef4444" size={18} style={tw`mr-2`} />
              <Text style={tw`text-red-500 text-xs font-bold`}>{t('account.logoutBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
