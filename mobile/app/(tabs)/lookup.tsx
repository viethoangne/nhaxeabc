import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, TouchableOpacity, Text, View } from 'react-native';
import { useLocalSearchParams, Tabs, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '@/constants/api';
import LookupForm from '@/components/lookup/LookupForm';
import TicketDetails from '@/components/lookup/TicketDetails';
import CancelDrawer from '@/components/lookup/CancelDrawer';
import { useTheme } from '@/hooks/use-theme';
import tw from 'twrnc';

export default function LookupScreen() {
  const { t, locale } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ orderCode?: string; phone?: string }>();

  // Tìm kiếm
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  
  // Hủy vé
  const [isCancelDrawerOpen, setIsCancelDrawerOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const performLookup = async (codeVal: string, phoneVal: string) => {
    if (!codeVal.trim() || !phoneVal.trim()) {
      Alert.alert(locale === 'vi' ? 'Thông báo' : 'Notice', locale === 'vi' ? 'Vui lòng điền mã vé và số điện thoại' : 'Please enter both ticket code and phone number');
      return;
    }

    setLoading(true);
    setTicketInfo(null);

    const cleanCode = codeVal.replace('#', '').trim();

    try {
      const response = await apiClient.get('/lookup', {
        params: {
          orderCode: cleanCode,
          phone: phoneVal.trim(),
        },
      });

      setTicketInfo(response.data);
    } catch (error: any) {
      console.error('Lỗi tra cứu vé:', error);
      Alert.alert(locale === 'vi' ? 'Thất bại' : 'Failed', locale === 'vi' ? 'Không tìm thấy vé hợp lệ hoặc thông tin chưa chính xác' : 'Ticket not found or details are incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = () => {
    performLookup(orderCode, phone);
  };

  useEffect(() => {
    if (params.orderCode && params.phone) {
      setOrderCode(params.orderCode);
      setPhone(params.phone);
      performLookup(params.orderCode, params.phone);
    }
  }, [params.orderCode, params.phone]);

  const getRefundPolicy = () => {
    if (!ticketInfo) return { canCancel: false, refundPercent: 0 };
    
    const rawDepartureDate = ticketInfo.outboundDepartDateSnapshot || ticketInfo.date;
    if (!rawDepartureDate) return { canCancel: false, refundPercent: 0 };

    const departureTime = new Date(rawDepartureDate).getTime();
    const now = new Date().getTime();
    const timeDiffHours = (departureTime - now) / (1000 * 60 * 60);

    if (timeDiffHours >= 24) return { canCancel: true, refundPercent: 100 };
    if (timeDiffHours >= 12) return { canCancel: true, refundPercent: 50 };
    return { canCancel: false, refundPercent: 0 };
  };

  const refundPolicy = getRefundPolicy();

  const handleCancelTicket = async () => {
    if (!confirmEmail.trim() || !confirmPhone.trim()) {
      Alert.alert(locale === 'vi' ? 'Lỗi' : 'Error', locale === 'vi' ? 'Vui lòng điền đầy đủ Email và Số điện thoại' : 'Please fill in both Email and Phone Number');
      return;
    }

    if (confirmPhone.trim() !== ticketInfo.customerPhone) {
      Alert.alert(locale === 'vi' ? 'Lỗi' : 'Error', locale === 'vi' ? 'Số điện thoại xác nhận không khớp với thông tin vé' : 'Confirmation phone number does not match ticket details');
      return;
    }

    if (!isAgreed) {
      Alert.alert(locale === 'vi' ? 'Lỗi' : 'Error', locale === 'vi' ? 'Bạn phải đồng ý với quy định hủy vé' : 'You must agree to the ticket cancellation terms');
      return;
    }

    setCancelLoading(true);
    try {
      const response = await apiClient.post('/cancel-ticket', {
        orderCode: ticketInfo.orderCode,
        phone: confirmPhone.trim(),
        email: confirmEmail.trim(),
      });

      Alert.alert(locale === 'vi' ? 'Thành công' : 'Success', response.data?.message || (locale === 'vi' ? 'Yêu cầu hủy vé của bạn đã được thực hiện.' : 'Your ticket cancellation request has been processed.'));
      setTicketInfo({ ...ticketInfo, bookingStatus: 'CANCELLED' });
      setIsCancelDrawerOpen(false);
      setConfirmEmail('');
      setConfirmPhone('');
      setIsAgreed(false);
    } catch (error: any) {
      console.error('Lỗi khi hủy vé:', error);
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu hủy vé.';
      Alert.alert(locale === 'vi' ? 'Thất bại' : 'Failed', errorMsg);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8fafc]`}>
      <Tabs.Screen options={{ headerShown: false }} />

      {/* ===== HEADER ===== */}
      <LinearGradient
        colors={['#F97316', '#EF5222', '#C2410C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          tw`px-4 pt-5 pb-5`,
          {
            shadowColor: '#C2410C',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }
        ]}
      >
        <View style={tw`flex-row items-center gap-3.5`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              tw`w-10 h-10 rounded-full justify-center items-center`,
              {
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.3)',
              }
            ]}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#ffffff" size={22} strokeWidth={3} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <Text style={tw`text-white/70 text-[10px] font-black uppercase tracking-widest mb-0.5`}>
              {t('lookupPage.title').toUpperCase()}
            </Text>
            <Text style={tw`text-white text-[19px] font-black tracking-wide`}>
              {t('lookupPage.subtitle')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4 pb-26`}>
        {/* Khối Form Tìm Kiếm hoặc Thông tin vé chi tiết */}
        {!ticketInfo ? (
          <LookupForm
            orderCode={orderCode}
            setOrderCode={setOrderCode}
            phone={phone}
            setPhone={setPhone}
            loading={loading}
            onLookup={handleLookup}
          />
        ) : (
          <>
            {/* Nút quay lại tra cứu / Tìm vé khác */}
            <TouchableOpacity
              onPress={() => setTicketInfo(null)}
              activeOpacity={0.7}
              style={tw`flex-row items-center bg-white border border-slate-200 px-4 py-2.5 rounded-2xl mb-4 self-start`}
            >
              <ChevronLeft size={16} color="#64748b" style={tw`mr-1`} />
              <Text style={tw`text-[12.5px] font-black text-slate-500`}>{locale === 'vi' ? 'Tra cứu vé khác' : 'Lookup another ticket'}</Text>
            </TouchableOpacity>

            {/* Hiển Thị Thông Tin Vé Chi Tiết */}
            <TicketDetails
              ticketInfo={ticketInfo}
              refundPolicy={refundPolicy}
              onRequestCancel={() => setIsCancelDrawerOpen(true)}
            />
          </>
        )}
      </ScrollView>

      {/* BOTTOM SHEET/DRAWER: MODAL HỦY VÉ */}
      <CancelDrawer
        isOpen={isCancelDrawerOpen}
        onClose={() => setIsCancelDrawerOpen(false)}
        ticketInfo={ticketInfo}
        refundPolicy={refundPolicy}
        confirmEmail={confirmEmail}
        setConfirmEmail={setConfirmEmail}
        confirmPhone={confirmPhone}
        setConfirmPhone={setConfirmPhone}
        isAgreed={isAgreed}
        setIsAgreed={setIsAgreed}
        cancelLoading={cancelLoading}
        onCancelConfirm={handleCancelTicket}
      />
    </SafeAreaView>
  );
}
