import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import tw from 'twrnc';

interface CancelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ticketInfo: any;
  refundPolicy: { canCancel: boolean; refundPercent: number };
  confirmEmail: string;
  setConfirmEmail: (val: string) => void;
  confirmPhone: string;
  setConfirmPhone: (val: string) => void;
  isAgreed: boolean;
  setIsAgreed: (val: boolean) => void;
  cancelLoading: boolean;
  onCancelConfirm: () => void;
}

export default function CancelDrawer({
  isOpen,
  onClose,
  ticketInfo,
  refundPolicy,
  confirmEmail,
  setConfirmEmail,
  confirmPhone,
  setConfirmPhone,
  isAgreed,
  setIsAgreed,
  cancelLoading,
  onCancelConfirm,
}: CancelDrawerProps) {
  const { t, locale } = useTranslation();
  if (!ticketInfo) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black/50 justify-end`}>
        <TouchableOpacity activeOpacity={1} style={tw`flex-1`} onPress={onClose} />
        <View style={[tw`bg-white rounded-t-3xl p-5`, { paddingBottom: Platform.OS === 'ios' ? 40 : 25 }]}>
          {/* Handle Bar */}
          <View style={tw`w-12 h-1.5 bg-[#cbd5e1] rounded-full self-center mb-4.5`} />

          <View style={tw`flex-row justify-between items-center mb-4.5`}>
            <Text style={tw`text-[17px] font-black text-[#1e293b]`}>{t('lookupPage.cancelModalTitle')}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={tw`p-1`}>
              <X color="#64748b" size={22} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Chi tiết hoàn tiền */}
          <View style={tw`bg-red-50 rounded-2xl p-4 border border-red-100 mb-4.5`}>
            <View style={tw`flex-row justify-between items-center my-1`}>
              <Text style={tw`text-[13px] text-red-900 font-bold`}>{t('lookupPage.refundPercent')}:</Text>
              <Text style={tw`text-[15.5px] font-black text-red-500`}>{refundPolicy.refundPercent}%</Text>
            </View>
            <View style={tw`flex-row justify-between items-center my-1.5`}>
              <Text style={tw`text-[13px] text-red-900 font-bold`}>{t('lookupPage.refundAmount')}:</Text>
              <Text style={tw`text-[20px] font-black text-red-500`}>
                {((ticketInfo.amount * refundPolicy.refundPercent) / 100).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          </View>

          {/* Điều khoản quy định */}
          <Text style={tw`text-[12.5px] font-black text-[#94a3b8] mb-1.5 tracking-wider`}>{t('lookupPage.termsTitle')}</Text>
          <View style={tw`bg-[#f8fafc] rounded-2xl p-4 border border-[#e2e8f0] mb-4`}>
            <Text style={tw`text-[12.5px] text-[#475569] font-bold leading-5`}>• {locale === 'vi' ? 'Trả vé trước 24h: Hoàn 100% tiền vé.' : 'Cancel before 24h: 100% refund.'}</Text>
            <Text style={tw`text-[12.5px] text-[#475569] font-bold leading-5 mt-1`}>• {locale === 'vi' ? 'Trả vé từ 12h đến 24h: Hoàn 50% tiền vé.' : 'Cancel 12h-24h before: 50% refund.'}</Text>
            <Text style={tw`text-[12.5px] text-[#475569] font-bold leading-5 mt-1`}>• {locale === 'vi' ? 'Dưới 12h: Không hoàn tiền hủy vé dưới mọi hình thức.' : 'Under 12h: No refund under any circumstances.'}</Text>
          </View>

          {/* Checkbox */}
          <TouchableOpacity
            onPress={() => setIsAgreed(!isAgreed)}
            activeOpacity={0.8}
            style={tw`flex-row items-center mb-4.5`}
          >
            <View style={[tw`w-6 h-6 border-2 border-[#cbd5e1] rounded-lg justify-center items-center mr-3`, isAgreed && tw`bg-red-500 border-red-500`]}>
              {isAgreed && <Text style={tw`text-white text-xs font-black`}>✓</Text>}
            </View>
            <Text style={tw`text-[13px] font-bold text-[#334155] flex-1`}>{t('lookupPage.termsAgree')}</Text>
          </TouchableOpacity>

          {/* Form Xác nhận bảo mật */}
          <View style={tw`mb-5 gap-3`}>
            <TextInput
              style={tw`h-13 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 text-[14px] font-bold text-[#334155]`}
              placeholder={locale === 'vi' ? 'Nhập email đã đăng ký mua vé...' : 'Enter email used for booking...'}
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={tw`h-13 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 text-[14px] font-bold text-[#334155]`}
              placeholder={locale === 'vi' ? 'Nhập số điện thoại để xác nhận...' : 'Enter phone number for confirmation...'}
              value={confirmPhone}
              onChangeText={setConfirmPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Nút bấm */}
          <View style={tw`flex-row gap-3`}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={tw`flex-1 h-13.5 bg-[#f1f5f9] rounded-2xl justify-center items-center`}>
              <Text style={tw`text-[#64748b] font-black text-[14px]`}>{t('lookupPage.backBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCancelConfirm}
              disabled={cancelLoading || !isAgreed || !confirmEmail.trim()}
              activeOpacity={0.85}
              style={[
                tw`flex-[1.5] h-13.5 bg-red-500 rounded-2xl justify-center items-center`,
                (!isAgreed || !confirmEmail.trim() || cancelLoading) && tw`bg-[#cbd5e1]`,
              ]}
            >
              {cancelLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={tw`text-white font-black text-[14px]`}>{t('lookupPage.confirmCancelBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
