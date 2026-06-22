import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { Search, Hash, Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BouncyPressable from '../ui/BouncyPressable';
import { useTheme } from '@/hooks/use-theme';
import tw from 'twrnc';

interface LookupFormProps {
  orderCode: string;
  setOrderCode: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  loading: boolean;
  onLookup: () => void;
}

export default function LookupForm({
  orderCode,
  setOrderCode,
  phone,
  setPhone,
  loading,
  onLookup,
}: LookupFormProps) {
  const colors = useTheme();
  const { t, locale } = useTranslation();

  return (
    <View style={[
      tw`rounded-3xl p-5 border`,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
      }
    ]}>
      <Text style={[tw`text-[17px] font-black`, { color: colors.text }]}>{t('lookupPage.title')}</Text>
      <Text style={[tw`text-[13px] font-bold mt-1.5 mb-5 leading-4.5`, { color: colors.textSecondary }]}>
        {locale === 'vi' ? 'Nhập mã vé và số điện thoại đã sử dụng để đặt vé để kiểm tra lịch trình, trạng thái thanh toán hoặc thực hiện yêu cầu hủy vé.' : 'Enter your ticket code and phone number used for booking to verify schedules, payment status, or request a refund.'}
      </Text>

      {/* Input Mã vé */}
      <View style={tw`mb-4`}>
        <Text style={[tw`text-[10px] font-black mb-1.5 tracking-wider uppercase`, { color: colors.textSecondary }]}>{t('lookupPage.orderCode')} (VD: #774588...)</Text>
        <View style={[
          tw`flex-row items-center border rounded-2xl px-4 py-1`,
          { backgroundColor: colors.background, borderColor: colors.border }
        ]}>
          <View style={[tw`w-9 h-9 rounded-xl items-center justify-center mr-3`, { backgroundColor: 'rgba(239, 82, 34, 0.08)' }]}>
            <Hash color={colors.primary} size={16} strokeWidth={2.5} />
          </View>
          <TextInput
            style={[tw`flex-1 h-12 text-[15px] font-black`, { color: colors.text }]}
            placeholder={t('lookupPage.orderCodePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={orderCode}
            onChangeText={setOrderCode}
            autoCapitalize="characters"
          />
        </View>
      </View>

      {/* Input Số điện thoại */}
      <View style={tw`mb-5`}>
        <Text style={[tw`text-[10px] font-black mb-1.5 tracking-wider uppercase`, { color: colors.textSecondary }]}>{t('lookupPage.phone')}</Text>
        <View style={[
          tw`flex-row items-center border rounded-2xl px-4 py-1`,
          { backgroundColor: colors.background, borderColor: colors.border }
        ]}>
          <View style={[tw`w-9 h-9 rounded-xl items-center justify-center mr-3`, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
            <Phone color="#2563EB" size={16} strokeWidth={2.5} />
          </View>
          <TextInput
            style={[tw`flex-1 h-12 text-[15px] font-black`, { color: colors.text }]}
            placeholder={t('lookupPage.phonePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Nút Tra cứu */}
      <BouncyPressable
        onPress={onLookup}
        disabled={loading}
        style={tw`w-full`}
      >
        <LinearGradient
          colors={['#F97316', '#EF5222']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            tw`flex-row items-center justify-center py-4 rounded-2xl gap-2`,
            {
              shadowColor: '#EF5222',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 6
            }
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Search color="#ffffff" size={18} strokeWidth={3} />
              <Text style={tw`text-white text-[15.5px] font-black uppercase tracking-wider`}>{loading ? t('lookupPage.checking') : t('lookupPage.checkBtn')}</Text>
            </>
          )}
        </LinearGradient>
      </BouncyPressable>
    </View>
  );
}
