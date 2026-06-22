import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Info, User as UserIcon, Phone, Mail, Award, CheckCircle2, Ticket, CreditCard, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react-native';
import { apiClient } from '@/constants/api';
import { useAuthStore } from '@/hooks/useAuthStore';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import { useTranslation } from '@/hooks/useTranslation';

interface PromoCode {
  id: string;
  code: string;
  title: string;
  type: 'percent' | 'fixed';
  value: number;
  maxAmount?: number;
  isUsed?: boolean;
}

interface RedeemablePromo extends PromoCode {
  cost: number;
}

export default function SelectSeatsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { user } = useAuthStore();
  const { t, locale } = useTranslation();

  const price = Number(searchParams.price || '0');
  const tickets = Number(searchParams.tickets || '1');
  const from = (searchParams.from as string) || '';
  const to = (searchParams.to as string) || '';
  const date = (searchParams.date as string) || '';
  const returnDate = (searchParams.returnDate as string) || '';
  const departDateTime = (searchParams.departDateTime as string) || '';
  const arrivalDateTime = (searchParams.arrivalDateTime as string) || '';
  const returnDepartDateTime = (searchParams.returnDepartDateTime as string) || '';
  const returnArrivalDateTime = (searchParams.returnArrivalDateTime as string) || '';
  const tripType = (searchParams.tripType as 'oneway' | 'round') || 'oneway';
  const outboundTripId = Number(searchParams.outboundTripId || '0');
  const returnTripId = Number(searchParams.returnTripId || '0');
  const outboundPrice = Number(searchParams.price || '0');
  const returnPrice = Number(searchParams.returnPrice || outboundPrice);
  const busType = (searchParams.busType as string) || '';
  const returnBusType = (searchParams.returnBusType as string) || '';

  const formatTime = (dtStr: string) => {
    if (!dtStr) return '';
    try {
      const d = new Date(dtStr);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch { return ''; }
  };

  const formatDateShort = (dtStr: string) => {
    if (!dtStr) return '';
    try {
      const d = new Date(dtStr);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    } catch { return ''; }
  };

  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);

  const [outboundBookedSeats, setOutboundBookedSeats] = useState<string[]>([]);
  const [returnBookedSeats, setReturnBookedSeats] = useState<string[]>([]);
  const [outboundLockedSeats, setOutboundLockedSeats] = useState<string[]>([]);
  const [returnLockedSeats, setReturnLockedSeats] = useState<string[]>([]);
  const [isSeatsLoaded, setIsSeatsLoaded] = useState(false);

  const [bookingStep, setBookingStep] = useState<'outbound' | 'return'>('outbound');
  const [outboundSeats, setOutboundSeats] = useState<string[]>([]);
  const [returnSeats, setReturnSeats] = useState<string[]>([]);

  const [aiSuggestedOutboundSeat, setAiSuggestedOutboundSeat] = useState<string | null>(null);
  const [aiSuggestedReturnSeat, setAiSuggestedReturnSeat] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'MOMO' | 'BANK' | 'VNPAY'>('MOMO');
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoTab, setPromoTab] = useState<'my_vouchers' | 'redeem'>('my_vouchers');
  const [promoInput, setPromoInput] = useState('');

  const [userPoints, setUserPoints] = useState(0);
  const [myVouchers, setMyVouchers] = useState<PromoCode[]>([]);
  const [redeemableVouchers, setRedeemableVouchers] = useState<RedeemablePromo[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  useEffect(() => {
    if (user) {
      setCustomerInfo({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      // Fetch loyalty points and vouchers
      apiClient.get(`/loyalty?userId=${user.id}`)
        .then(res => {
          setUserPoints(res.data.points || 0);
          setMyVouchers(res.data.myVouchers || []);
          setRedeemableVouchers(res.data.redeemableVouchers || []);
        })
        .catch(err => console.error("Lỗi lấy dữ liệu Loyalty:", err));
    }
  }, [user]);

  useEffect(() => {
    const loadAllSeats = async () => {
      const fetchSeats = async (tripId: number, setBooked: any, setLocked: any) => {
        if (!tripId) return;
        try {
          const res = await apiClient.get(`/payment/booked-seats/${tripId}`);
          if (res.data && !Array.isArray(res.data)) {
            setBooked(res.data.bookedSeats || []);
            setLocked(res.data.lockedSeats || []);
          } else {
            setBooked(res.data || []);
            setLocked([]);
          }
        } catch (error) {
          console.error(`Lỗi lấy ghế chuyến ${tripId}:`, error);
        }
      };

      await fetchSeats(outboundTripId, setOutboundBookedSeats, setOutboundLockedSeats);
      if (tripType === 'round' && returnTripId) {
        await fetchSeats(returnTripId, setReturnBookedSeats, setReturnLockedSeats);
      }
      setIsSeatsLoaded(true);
    };

    loadAllSeats();
  }, [outboundTripId, returnTripId, tripType]);

  const currentBookedSeats = bookingStep === 'outbound' ? outboundBookedSeats : returnBookedSeats;
  const currentLockedSeats = bookingStep === 'outbound' ? outboundLockedSeats : returnLockedSeats;
  const currentSelectedSeats = bookingStep === 'outbound' ? outboundSeats : returnSeats;

  const getSeatStatus = (id: string) => {
    if (currentBookedSeats.includes(id)) return 'sold';
    if (currentLockedSeats.includes(id)) return 'locked';
    return 'available';
  };

  const generateFloor = (startNum: number, prefix: string) =>
    Array.from({ length: 5 }, (_, i) => ({ id: `${prefix}${startNum + i}`, status: getSeatStatus(`${prefix}${startNum + i}`) }));

  const seatsTầngDưới = useMemo(() => [...generateFloor(1, 'A'), { id: 'A6', status: getSeatStatus('A6') }, ...generateFloor(1, 'B')], [currentBookedSeats, currentLockedSeats]);
  const seatsTầngTrên = useMemo(() => [...generateFloor(7, 'A'), { id: 'A12', status: getSeatStatus('A12') }, ...generateFloor(6, 'B')], [currentBookedSeats, currentLockedSeats]);

  const toggleSeat = (id: string, status: string) => {
    if (status === 'sold' || status === 'locked') return;
    const setSeats = bookingStep === 'outbound' ? setOutboundSeats : setReturnSeats;
    const currentSeats = bookingStep === 'outbound' ? outboundSeats : returnSeats;

    if (currentSeats.includes(id)) {
      setSeats(currentSeats.filter(s => s !== id));
    } else {
      if (currentSeats.length >= tickets) {
        Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errMaxSeatsLimit').replace('{count}', tickets.toString()));
        return;
      }
      setSeats([...currentSeats, id]);
    }
  };

  // AI suggestion logic
  useEffect(() => {
    const currentSeatsLength = bookingStep === 'outbound' ? outboundSeats.length : returnSeats.length;
    const currentAiSuggestedSeat = bookingStep === 'outbound' ? aiSuggestedOutboundSeat : aiSuggestedReturnSeat;

    if (isSeatsLoaded && currentSeatsLength === 0 && !currentAiSuggestedSeat) {
      const mockPreferences = {
        preferredSeatFloor: 'Tầng dưới',
        preferredSeatPosition: 'window',
      };

      const preferredFloorSeats = mockPreferences.preferredSeatFloor === 'Tầng dưới' ? seatsTầngDưới : seatsTầngTrên;
      const otherFloorSeats = mockPreferences.preferredSeatFloor === 'Tầng dưới' ? seatsTầngTrên : seatsTầngDưới;

      const availablePreferredFloor = preferredFloorSeats.filter(s => s.status === 'available');
      const availableOtherFloor = otherFloorSeats.filter(s => s.status === 'available');

      if (availablePreferredFloor.length === 0 && availableOtherFloor.length === 0) return;

      let bestSeat = null;
      const findSeatByPosition = (seatsList: any[]) => {
        if (mockPreferences.preferredSeatPosition === 'window') {
          return seatsList.find(seat => parseInt(seat.id.replace(/[A-B]/g, '')) % 2 !== 0);
        }
        return null;
      };

      bestSeat = findSeatByPosition(availablePreferredFloor) || availablePreferredFloor[0] ||
                 findSeatByPosition(availableOtherFloor) || availableOtherFloor[0];

      if (bestSeat) {
        if (bookingStep === 'outbound') {
          setOutboundSeats([bestSeat.id]);
          setAiSuggestedOutboundSeat(bestSeat.id);
        } else {
          setReturnSeats([bestSeat.id]);
          setAiSuggestedReturnSeat(bestSeat.id);
        }
      }
    }
  }, [isSeatsLoaded, bookingStep, seatsTầngDưới, seatsTầngTrên]);

  // Expiration countdown for OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const isSubmittingRef = useRef(false);

  const normalizeVietnamPhone = (phone: string) => {
    let value = phone.trim().replace(/[\s.-]/g, '');
    if (value.startsWith('+84')) value = '0' + value.slice(3);
    else if (value.startsWith('84')) value = '0' + value.slice(2);
    return value;
  };

  const isValidVietnamMobile = (phone: string) => {
    return /^(03|05|07|08|09)\d{8}$/.test(normalizeVietnamPhone(phone));
  };

  const isBookableBeforeDeparture = (departureDate: Date) => {
    const MIN_BOOKING_MS = 3 * 60 * 60 * 1000;
    return departureDate.getTime() - Date.now() >= MIN_BOOKING_MS;
  };

  const departureDateObj = useMemo(
    () => departDateTime ? new Date(departDateTime) : date ? new Date(`${date}T00:00:00`) : new Date(),
    [departDateTime, date]
  );
  const isWithinBookingWindow = isBookableBeforeDeparture(departureDateObj);
  const normalizedPhone = normalizeVietnamPhone(customerInfo.phone);

  const handleSendOtp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerInfo.email || !emailRegex.test(customerInfo.email.trim())) {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errEmailInvalid'));
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/otp/send-otp', { email: customerInfo.email.trim() });
      setIsOtpSent(true);
      setCountdown(60);
      Alert.alert(t('selectSeatsPage.success'), t('selectSeatsPage.otpSentSuccess'));
    } catch (error) {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.otpSentFail'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errOtpLength'));
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/otp/verify', {
        email: customerInfo.email.trim(),
        otp: otp.trim(),
      });
      setIsOtpVerified(true);
      setIsOtpSent(false);
      Alert.alert(t('selectSeatsPage.success'), t('selectSeatsPage.otpVerifySuccess'));
    } catch (error: any) {
      Alert.alert(t('selectSeatsPage.error'), error.response?.data?.message || t('selectSeatsPage.otpVerifyFail'));
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (promo: RedeemablePromo) => {
    if (!user) return;
    try {
      const res = await apiClient.post('/loyalty/redeem', {
        userId: user.id,
        voucherId: promo.id,
      });
      if (res.data) {
        setUserPoints(res.data.newPoints);
        setMyVouchers((prev) => [res.data.newVoucher, ...prev]);
        Alert.alert(t('selectSeatsPage.success'), t('selectSeatsPage.redeemSuccess').replace('{title}', promo.title));
      }
    } catch (error: any) {
      Alert.alert(t('selectSeatsPage.error'), error.response?.data?.message || t('selectSeatsPage.redeemFail'));
    }
  };

  const handleApplyPromoManual = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const found = myVouchers.find(v => v.code === code);
    if (found) {
      if (found.isUsed) {
        Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.voucherUsed'));
        return;
      }
      setAppliedPromo(found);
      setIsPromoModalOpen(false);
      setPromoInput('');
    } else {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.voucherNotFound'));
    }
  };

  const handleSelectVoucher = (voucher: PromoCode) => {
    setAppliedPromo(voucher);
    setIsPromoModalOpen(false);
  };

  const outboundTotal = outboundSeats.length * outboundPrice;
  const returnTotal = returnSeats.length * returnPrice;
  const baseTotalAmount = outboundTotal + returnTotal;
  let discountAmount = 0;
  if (appliedPromo && baseTotalAmount > 0) {
    if (appliedPromo.type === 'percent') {
      discountAmount = Math.min((baseTotalAmount * appliedPromo.value) / 100, appliedPromo.maxAmount || Infinity);
    } else {
      discountAmount = Math.min(appliedPromo.value, baseTotalAmount);
    }
  }
  const finalAmount = Math.max(0, baseTotalAmount - discountAmount);

  const handleConfirmBooking = async () => {
    // Bước 1: Khứ hồi — chuyển sang bước chọn ghế về
    if (tripType === 'round' && bookingStep === 'outbound') {
      if (outboundSeats.length < tickets) {
        Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errSelectOutbound').replace('{count}', tickets.toString()));
        return;
      }
      if (!returnTripId) {
        Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errNoReturnTrip'));
        return;
      }
      setBookingStep('return');
      return;
    }

    // Bước 2: Validate ghế đã chọn
    const currentSeats = bookingStep === 'outbound' ? outboundSeats : returnSeats;
    if (currentSeats.length < tickets) {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errSelectRequired').replace('{count}', tickets.toString()));
      return;
    }

    // Kiểm tra cửa sổ đặt vé (trước giờ khởi hành >= 3h)
    if (!isWithinBookingWindow) {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errTimeLimit'));
      return;
    }

    // Validate thông tin liên hệ
    const finalName = user?.name || customerInfo.name.trim();
    const finalEmail = user?.email || customerInfo.email.trim();

    if (!finalName || finalName.trim().split(/\s+/).length < 2) {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errNameRequired'));
      return;
    }

    if (!finalEmail) {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errEmailRequired'));
      return;
    }

    if (phoneError || !customerInfo.phone || !isValidVietnamMobile(customerInfo.phone)) {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errPhoneRequired'));
      return;
    }

    if (!user && !isOtpVerified) {
      Alert.alert(t('selectSeatsPage.error'), t('selectSeatsPage.errOtpRequired'));
      return;
    }

    // Chống double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setLoading(true);
    try {
      const payload = {
        tripType,
        tickets,
        from,
        to,
        date,
        returnDate: tripType === 'round' ? returnDate : undefined,
        outboundTripId,
        returnTripId: tripType === 'round' ? returnTripId : undefined,
        outboundSeats,
        returnSeats: tripType === 'round' ? returnSeats : undefined,
        customerName: finalName,
        customerPhone: normalizedPhone,
        customerEmail: finalEmail,
        price: finalAmount,
        appliedPromoCode: appliedPromo?.code || null,
        userId: user?.id || null,
        paymentMethod: paymentMethod,
        // Deep link cho mobile: backend sẽ redirect về app hoặc localhost web
        mobileReturnUrl: Platform.OS === 'web'
          ? 'http://localhost:8081/booking/checkout?status=success'
          : Linking.createURL('payment-result', { queryParams: { status: 'success' } }),
        mobileReturnCancelUrl: Platform.OS === 'web'
          ? 'http://localhost:8081/booking/checkout?status=cancel'
          : Linking.createURL('payment-result', { queryParams: { status: 'cancel' } }),
      };

      const res = await apiClient.post('/payment/create-link', payload);

      // Chuyển sang màn hình checkout
      router.push({
        pathname: '/booking/checkout',
        params: {
          tripType,
          tickets: tickets.toString(),
          from,
          to,
          date,
          seats: outboundSeats.join(','),
          name: finalName,
          phone: normalizedPhone,
          email: finalEmail,
          totalPrice: finalAmount.toString(),
          paymentMethod,
          paymentUrl: res.data.checkoutUrl || res.data.payUrl || '',
          orderCode: res.data.orderCode?.toString() || '',
          ...(tripType === 'round' && {
            returnTripId: returnTripId.toString(),
            returnSeats: returnSeats.join(','),
            returnDate,
          }),
        },
      });
    } catch (error: any) {
      Alert.alert(t('selectSeatsPage.error'), error.response?.data?.message || t('selectSeatsPage.errCreateLink'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const currentAiSuggestedSeat = bookingStep === 'outbound' ? aiSuggestedOutboundSeat : aiSuggestedReturnSeat;

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8fafc]`}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header Search Info Summary */}
      <LinearGradient 
        colors={['#F97316', '#EF5222', '#DC2626']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          tw`px-4 pt-5 pb-5`, 
          { 
            shadowColor: '#EF5222',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 18,
            elevation: 10,
            borderBottomWidth: 0
          }
        ]}
      >
        {/* Back Button & Title Row */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View style={tw`flex-row items-center gap-3.5`}>
            <TouchableOpacity 
              onPress={() => {
                if (tripType === 'round' && bookingStep === 'return') {
                  setBookingStep('outbound');
                } else {
                  router.back();
                }
              }}
              style={[tw`w-9.5 h-9.5 rounded-full justify-center items-center`, { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}
              activeOpacity={0.7}
            >
              <ChevronLeft color="#ffffff" size={21} strokeWidth={3} />
            </TouchableOpacity>
            <View>
              <Text style={tw`text-white text-[17px] font-black tracking-wide`}>
                {tripType === 'round' 
                  ? (bookingStep === 'outbound' ? t('selectSeatsPage.outboundTitle') : t('selectSeatsPage.returnTitle')) 
                  : t('selectSeatsPage.onewayTitle')}
              </Text>
              <Text style={tw`text-white/75 text-[11px] font-bold mt-0.5`}>
                {from} ➔ {to}  ·  {t('selectSeatsPage.ticketsUnit').replace('{n}', tickets.toString())}
              </Text>
            </View>
          </View>

          {/* Step indicator khứ hồi */}
          {tripType === 'round' && (
            <View style={tw`flex-row items-center gap-1 bg-black/20 px-3 py-2 rounded-xl border border-white/10`}>
              <View style={tw`items-center`}>
                <View style={[tw`w-5 h-5 rounded-full items-center justify-center`, { backgroundColor: bookingStep === 'outbound' ? '#ffffff' : 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[tw`text-[10px] font-black`, { color: bookingStep === 'outbound' ? '#EF5222' : 'rgba(255,255,255,0.5)' }]}>1</Text>
                </View>
                <Text style={[tw`text-[8.5px] font-bold mt-0.5`, { color: bookingStep === 'outbound' ? '#ffffff' : 'rgba(255,255,255,0.4)' }]}>
                  {locale === 'vi' ? 'Đi' : 'Out'}
                </Text>
              </View>
              <View style={tw`w-6 h-[1.5px] bg-white/25 mx-1`} />
              <View style={tw`items-center`}>
                <View style={[tw`w-5 h-5 rounded-full items-center justify-center`, { backgroundColor: bookingStep === 'return' ? '#ffffff' : 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[tw`text-[10px] font-black`, { color: bookingStep === 'return' ? '#EF5222' : 'rgba(255,255,255,0.5)' }]}>2</Text>
                </View>
                <Text style={[tw`text-[8.5px] font-bold mt-0.5`, { color: bookingStep === 'return' ? '#ffffff' : 'rgba(255,255,255,0.4)' }]}>
                  {locale === 'vi' ? 'Về' : 'Ret'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Trip Info Card - glass card inside the gradient */}
        {(() => {
          const curDepart = bookingStep === 'outbound' ? departDateTime : returnDepartDateTime;
          const curArrival = bookingStep === 'outbound' ? arrivalDateTime : returnArrivalDateTime;
          const curBusType = bookingStep === 'outbound' ? busType : returnBusType;
          const curPrice = bookingStep === 'outbound' ? outboundPrice : returnPrice;
          const depTime = formatTime(curDepart);
          const arrTime = formatTime(curArrival);
          const depDate = formatDateShort(curDepart);
          return (
            <View style={[tw`rounded-2xl px-4 py-3.5 border`, { backgroundColor: 'rgba(0,0,0,0.18)', borderColor: 'rgba(255,255,255,0.15)' }]}>
              {/* Time route row */}
              <View style={tw`flex-row items-center justify-between mb-2.5`}>
                <View style={tw`items-center`}>
                  <Text style={tw`text-white text-[22px] font-black tracking-tight`}>{depTime || '--:--'}</Text>
                  <Text style={tw`text-white/65 text-[10.5px] font-bold`}>{from}</Text>
                </View>
                <View style={tw`flex-1 mx-3 items-center`}>
                  <View style={tw`w-full flex-row items-center`}>
                    <View style={tw`flex-1 h-[1.5px] bg-white/25`} />
                    <View style={tw`mx-2 bg-white/20 px-2.5 py-1 rounded-full`}>
                      <Text style={tw`text-white/80 text-[9px] font-black`}>{curBusType || t('SearchTrip.smartSystem')}</Text>
                    </View>
                    <View style={tw`flex-1 h-[1.5px] bg-white/25`} />
                  </View>
                  <Text style={tw`text-white/55 text-[9.5px] font-bold mt-1.5`}>{depDate}</Text>
                </View>
                <View style={tw`items-center`}>
                  <Text style={tw`text-white text-[22px] font-black tracking-tight`}>{arrTime || '--:--'}</Text>
                  <Text style={tw`text-white/65 text-[10.5px] font-bold`}>{to}</Text>
                </View>
              </View>

              {/* Price & seats row */}
              <View style={[tw`flex-row items-center justify-between pt-2.5 border-t`, { borderTopColor: 'rgba(255,255,255,0.12)' }]}>
                <View style={tw`flex-row items-center gap-2`}>
                  <View style={tw`bg-white/15 px-2.5 py-1 rounded-full border border-white/15`}>
                    <Text style={tw`text-white text-[10px] font-black`}>🎫 {t('selectSeatsPage.ticketsUnit').replace('{n}', tickets.toString())}</Text>
                  </View>
                  {curBusType ? (
                    <View style={tw`bg-white/15 px-2.5 py-1 rounded-full border border-white/15`}>
                      <Text style={tw`text-white text-[10px] font-black`}>🚌 {curBusType}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={tw`text-white text-[15px] font-black`}>
                  {curPrice > 0 ? curPrice.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') + 'đ' : ''}
                </Text>
              </View>
            </View>
          );
        })()}
      </LinearGradient>

      <ScrollView contentContainerStyle={tw`p-4.5 pb-28`}>
        {/* Contact Information */}
        <View style={tw`bg-white p-5 rounded-2xl border border-[#e2e8f0] mb-5`}>
          <View style={tw`flex-row items-center gap-2.5 mb-4 border-b border-[#f1f5f9] pb-3`}>
            <UserIcon color="#EF5222" size={20} />
            <Text style={tw`text-[14.5px] font-black text-[#0f172a] uppercase tracking-wider`}>{t('selectSeatsPage.contactHeader')}</Text>
          </View>

          {/* Full Name */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-[12px] font-black text-[#64748b] mb-1.5`}>{t('selectSeatsPage.fullNameLabel')}</Text>
            <TextInput
              value={customerInfo.name}
              onChangeText={(name) => {
                setCustomerInfo({ ...customerInfo, name });
                if (name.trim().length > 0) {
                  const words = name.trim().split(/\s+/);
                  setNameError(words.length < 2 ? t('selectSeatsPage.fullNameErr') : '');
                } else {
                  setNameError('');
                }
              }}
              placeholder={t('selectSeatsPage.fullNamePlaceholder')}
              editable={!user}
              style={[tw`border rounded-xl px-4.5 py-3.5 text-[14.5px] font-bold bg-white text-[#0f172a]`,
                nameError && !user ? tw`border-red-400 bg-red-50` : tw`border-[#cbd5e1]`,
                user && tw`bg-[#f1f5f9] text-[#64748b]`]}
            />
            {nameError && !user && (
              <Text style={tw`text-[11px] text-red-500 font-bold mt-1`}>⚠ {nameError}</Text>
            )}
          </View>

          {/* Phone */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-[12px] font-black text-[#64748b] mb-1.5`}>{t('selectSeatsPage.phoneLabel')}</Text>
            <TextInput
              value={customerInfo.phone}
              onChangeText={(val) => {
                const phone = val.replace(/\D/g, '');
                setCustomerInfo({ ...customerInfo, phone });
                if (phone.length > 0 && !isValidVietnamMobile(phone)) {
                  setPhoneError(t('selectSeatsPage.phoneErr'));
                } else {
                  setPhoneError('');
                }
              }}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder={t('selectSeatsPage.phonePlaceholder')}
              style={[tw`border rounded-xl px-4.5 py-3.5 text-[14.5px] font-bold text-[#0f172a]`,
                phoneError ? tw`border-red-400 bg-red-50` : tw`border-[#cbd5e1]`]}
            />
            {phoneError ? (
              <Text style={tw`text-[11px] text-red-500 font-bold mt-1`}>⚠ {phoneError}</Text>
            ) : null}
          </View>

          {/* Email */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-[12px] font-black text-[#64748b] mb-1.5`}>{t('selectSeatsPage.emailLabel')}</Text>
            <View style={tw`flex-row gap-2.5`}>
              <TextInput
                value={customerInfo.email}
                onChangeText={(email) => {
                  setCustomerInfo({ ...customerInfo, email });
                  setIsOtpVerified(false);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder={t('selectSeatsPage.emailPlaceholder')}
                editable={!user && !isOtpVerified}
                style={[tw`flex-1 border border-[#cbd5e1] rounded-xl px-4.5 py-3.5 text-[14.5px] font-bold text-[#0f172a]`, (user || isOtpVerified) && tw`bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]`]}
              />
              {!user && !isOtpVerified && (
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={countdown > 0}
                  style={tw`bg-[#EF5222] px-4.5 justify-center rounded-xl`}
                >
                  <Text style={tw`text-white text-[11.5px] font-black uppercase`}>
                    {countdown > 0 ? `${countdown}s` : t('selectSeatsPage.sendOtp')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* OTP Input */}
          {!user && isOtpSent && !isOtpVerified && (
            <View style={tw`bg-[#fff7ed] border border-[#ffedd5] p-4 rounded-xl mt-2`}>
              <Text style={tw`text-[11.5px] font-black text-[#ea580c] mb-2.5`}>
                {t('selectSeatsPage.otpPrompt')}
              </Text>
              <View style={tw`flex-row gap-2.5`}>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder={t('selectSeatsPage.otpPlaceholder')}
                  style={tw`flex-1 border border-[#cbd5e1] rounded-xl px-4 py-3 text-[14.5px] bg-white text-center font-black`}
                />
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  style={tw`bg-[#ea580c] px-4.5 justify-center rounded-xl`}
                >
                  <Text style={tw`text-white text-[12px] font-black`}>{t('selectSeatsPage.verifyBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Seat Layout Section */}
        <View style={tw`bg-white p-5 rounded-2xl border border-[#e2e8f0] mb-5`}>
          <View style={tw`flex-row justify-between items-center mb-4 border-b border-[#f1f5f9] pb-3.5`}>
            <View style={tw`flex-row items-center gap-2.5`}>
              <View style={tw`w-9 h-9 rounded-xl bg-[#ffebe5] items-center justify-center`}>
                <Ticket color="#EF5222" size={20} />
              </View>
              <View>
                <Text style={tw`text-[15px] font-black text-[#0f172a] tracking-wide`}>
                  {t('selectSeatsPage.selectSeatsHeader')}
                </Text>
                <Text style={tw`text-[11px] font-bold text-[#64748b] mt-0.5`}>
                  {bookingStep === 'outbound' ? t('selectSeatsPage.outboundIndicator') : t('selectSeatsPage.returnIndicator')} · {t('selectSeatsPage.maxSeatsLimit').replace('{count}', tickets.toString())}
                </Text>
              </View>
            </View>
            <View style={tw`bg-[#EF5222] px-3 py-1.5 rounded-full`}>
              <Text style={tw`text-white text-[10px] font-black tracking-wider`}>{t('selectSeatsPage.vipSchema')}</Text>
            </View>
          </View>

          {/* AI Banner suggestion */}
          {currentAiSuggestedSeat && (
            <View style={[tw`border border-[#ffdcd1] p-4 rounded-2xl mb-5 flex-row items-start gap-3`, { backgroundColor: '#fff7ed' }]}>
              <View style={tw`w-9 h-9 rounded-xl bg-[#ffebe5] items-center justify-center shrink-0`}>
                <Sparkles color="#EF5222" size={18} />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-[13.5px] font-black text-[#EF5222] mb-1`}>{t('selectSeatsPage.aiRecommendTitle')}</Text>
                <Text style={tw`text-[12px] text-[#7c2d12] font-bold leading-relaxed`}>
                  {t('selectSeatsPage.aiRecommendDesc').split('{seat}')[0]}
                  <Text style={tw`font-black text-[#EF5222]`}>{currentAiSuggestedSeat}</Text>
                  {t('selectSeatsPage.aiRecommendDesc').split('{seat}')[1]}
                </Text>
              </View>
            </View>
          )}

          {/* Seat Status Legend */}
          <View style={[tw`flex-row items-center justify-around mb-6 py-3 px-4 rounded-2xl`, { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' }]}>
            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-6 h-6 bg-white border-2 border-[#cbd5e1] rounded-lg`} />
              <Text style={tw`text-[12px] text-[#64748b] font-black`}>{t('selectSeatsPage.seatEmpty')}</Text>
            </View>
            <View style={tw`w-px h-5 bg-[#e2e8f0]`} />
            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-6 h-6 bg-[#ffebe5] border-2 border-[#EF5222] rounded-lg`} />
              <Text style={tw`text-[12px] text-[#EF5222] font-black`}>{t('selectSeatsPage.seatSelected')}</Text>
            </View>
            <View style={tw`w-px h-5 bg-[#e2e8f0]`} />
            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-6 h-6 bg-[#e2e8f0] border-2 border-[#cbd5e1] rounded-lg`} />
              <Text style={tw`text-[12px] text-[#94a3b8] font-black`}>{t('selectSeatsPage.seatSold')}</Text>
            </View>
          </View>

          {/* Floors representation */}
          <View style={tw`flex-row justify-around gap-2`}>
            {/* Lower Floor */}
            <View style={tw`flex-1`}>
              <View style={[tw`flex-row items-center justify-center gap-1.5 mb-4 py-1.5 rounded-full`, { backgroundColor: '#f1f5f9' }]}>
                <Text style={tw`text-center text-[11px] font-black text-[#475569] uppercase tracking-wider`}>{t('selectSeatsPage.lowerFloor')}</Text>
              </View>
              <View style={tw`flex-row flex-wrap gap-2 justify-center`}>
                {seatsTầngDưới.map((seat) => {
                   const isSel = currentSelectedSeats.includes(seat.id);
                   const isSold = seat.status === 'sold';
                   const isLocked = seat.status === 'locked';
                   return (
                     <TouchableOpacity
                       key={seat.id}
                       disabled={isSold || isLocked}
                       onPress={() => toggleSeat(seat.id, seat.status)}
                       style={[
                         tw`w-12 h-12 border-2 rounded-xl items-center justify-center bg-white border-[#cbd5e1]`,
                         { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
                         isSel && { borderColor: '#EF5222', backgroundColor: '#ffebe5', shadowColor: '#EF5222', shadowOpacity: 0.2 },
                         isSold && { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9' },
                         isLocked && { borderColor: '#e2e8f0', backgroundColor: '#f8fafc', opacity: 0.6 },
                       ]}
                     >
                       <Text style={[
                         tw`text-[12px] font-black text-[#475569]`,
                         isSel && { color: '#EF5222' },
                         (isSold || isLocked) && { color: '#cbd5e1' },
                       ]}>
                         {seat.id}
                       </Text>
                       {isSold && <Text style={tw`text-[7px] font-black text-[#94a3b8] mt-0.5`}>{t('selectSeatsPage.soldLabel')}</Text>}
                     </TouchableOpacity>
                   );
                })}
              </View>
            </View>

            {/* Vertical divider */}
            <View style={[tw`w-px self-stretch my-2`, { backgroundColor: '#f1f5f9' }]} />

            {/* Upper Floor */}
            <View style={tw`flex-1`}>
              <View style={[tw`flex-row items-center justify-center gap-1.5 mb-4 py-1.5 rounded-full`, { backgroundColor: '#f1f5f9' }]}>
                <Text style={tw`text-center text-[11px] font-black text-[#475569] uppercase tracking-wider`}>{t('selectSeatsPage.upperFloor')}</Text>
              </View>
              <View style={tw`flex-row flex-wrap gap-2 justify-center`}>
                {seatsTầngTrên.map((seat) => {
                   const isSel = currentSelectedSeats.includes(seat.id);
                   const isSold = seat.status === 'sold';
                   const isLocked = seat.status === 'locked';
                   return (
                     <TouchableOpacity
                       key={seat.id}
                       disabled={isSold || isLocked}
                       onPress={() => toggleSeat(seat.id, seat.status)}
                       style={[
                         tw`w-12 h-12 border-2 rounded-xl items-center justify-center bg-white border-[#cbd5e1]`,
                         { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
                         isSel && { borderColor: '#EF5222', backgroundColor: '#ffebe5', shadowColor: '#EF5222', shadowOpacity: 0.2 },
                         isSold && { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9' },
                         isLocked && { borderColor: '#e2e8f0', backgroundColor: '#f8fafc', opacity: 0.6 },
                       ]}
                     >
                       <Text style={[
                         tw`text-[12px] font-black text-[#475569]`,
                         isSel && { color: '#EF5222' },
                         (isSold || isLocked) && { color: '#cbd5e1' },
                       ]}>
                         {seat.id}
                       </Text>
                       {isSold && <Text style={tw`text-[7px] font-black text-[#94a3b8] mt-0.5`}>{t('selectSeatsPage.soldLabel')}</Text>}
                     </TouchableOpacity>
                   );
                })}
              </View>
            </View>
          </View>
        </View>


        {/* Payment Methods */}
        <View style={tw`bg-white p-5 rounded-2xl border border-[#e2e8f0] mb-5`}>
          <View style={tw`flex-row items-center gap-2 mb-4 border-b border-[#f1f5f9] pb-3`}>
            <CreditCard color="#EF5222" size={20} />
            <Text style={tw`text-[14.5px] font-black text-[#0f172a] uppercase tracking-wider`}>{t('selectSeatsPage.paymentMethodHeader')}</Text>
          </View>

          {[
            { id: 'MOMO', label: t('selectSeatsPage.momoLabel'), desc: t('selectSeatsPage.momoDesc') },
            { id: 'BANK', label: t('selectSeatsPage.bankLabel'), desc: t('selectSeatsPage.bankDesc') },
            { id: 'VNPAY', label: t('selectSeatsPage.vnpayLabel'), desc: t('selectSeatsPage.vnpayDesc') },
          ].map((item) => {
            const isSel = paymentMethod === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setPaymentMethod(item.id as any)}
                style={[tw`flex-row items-center gap-3 p-3.5 border border-[#cbd5e1] rounded-2xl mb-3 bg-white`, isSel && tw`border-[#EF5222] bg-[#ffebe5]/20`]}
              >
                <View style={[tw`w-4 h-4 rounded-full border-2 border-[#cbd5e1] items-center justify-center`, isSel && tw`border-[#EF5222]`]}>
                  {isSel && <View style={tw`w-2.5 h-2.5 rounded-full bg-[#EF5222]`} />}
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[13.5px] font-black text-[#0f172a]`}>{item.label}</Text>
                  <Text style={tw`text-[11px] font-medium text-[#64748b] mt-0.5`}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Sticky Bar — Grab style */}
      <View style={[tw`absolute bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0]`, { elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 }]}>
        {/* Voucher row */}
        {user && (
          <TouchableOpacity
            onPress={() => setIsPromoModalOpen(true)}
            style={[tw`flex-row items-center justify-between px-5 py-2.5 border-b`, { borderColor: '#f1f5f9' }]}
          >
            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-6 h-6 rounded-full bg-[#ffebe5] items-center justify-center`}>
                <Award color="#EF5222" size={13} />
              </View>
              <Text style={tw`text-[11.5px] font-black text-[#0f172a]`}>
                {appliedPromo ? t('selectSeatsPage.appliedVoucher').replace('{code}', appliedPromo.code) : t('selectSeatsPage.addVoucher')}
              </Text>
              {appliedPromo && (
                <View style={tw`bg-[#dcfce7] px-2 py-0.5 rounded-full`}>
                  <Text style={tw`text-[9.5px] font-black text-[#15803d]`}>-{discountAmount.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}đ</Text>
                </View>
              )}
            </View>
            <ChevronRight color="#EF5222" size={14} strokeWidth={3} />
          </TouchableOpacity>
        )}

        {/* Price + CTA row */}
        <View style={tw`flex-row items-center justify-between px-5 py-3`}>
          <View>
            <Text style={tw`text-[9.5px] font-black text-[#94a3b8] uppercase tracking-widest`}>{t('selectSeatsPage.totalPayment')}</Text>
            <Text style={tw`text-[22px] font-black text-[#EF5222] leading-tight`}>
              {finalAmount.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}đ
            </Text>
            {appliedPromo && (
              <Text style={tw`text-[10px] text-[#22c55e] font-black`}>{t('selectSeatsPage.savedAmount').replace('{amount}', discountAmount.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US'))}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleConfirmBooking}
            disabled={loading}
            activeOpacity={0.85}
            style={[tw`flex-row items-center gap-1.5 px-5 py-3 rounded-xl`, { backgroundColor: '#EF5222' }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={tw`text-white text-[13px] font-black`}>
                  {tripType === 'round' && bookingStep === 'outbound' ? t('selectSeatsPage.nextReturn') : t('selectSeatsPage.bookBtn')}
                </Text>
                {!(tripType === 'round' && bookingStep === 'outbound') && (
                  <ChevronRight color="#ffffff" size={14} strokeWidth={3} />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Voucher Picker Modal */}
      <Modal
        visible={isPromoModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPromoModalOpen(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl p-5 max-h-[85%]`}>
            <View style={tw`flex-row justify-between items-center border-b border-[#f1f5f9] pb-3 mb-4`}>
              <Text style={tw`text-[15px] font-black text-[#0f172a] uppercase tracking-wider`}>{t('selectSeatsPage.modalHeader')}</Text>
              <TouchableOpacity onPress={() => setIsPromoModalOpen(false)}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={tw`flex-row bg-[#f1f5f9] p-1 rounded-xl mb-4`}>
              <TouchableOpacity
                onPress={() => setPromoTab('my_vouchers')}
                style={[tw`flex-1 py-2.5 items-center rounded-lg`, promoTab === 'my_vouchers' && tw`bg-white shadow-sm`]}
              >
                <Text style={tw`text-xs font-bold text-[#475569]`}>{t('selectSeatsPage.tabMyVouchers')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPromoTab('redeem')}
                style={[tw`flex-1 py-2.5 items-center rounded-lg`, promoTab === 'redeem' && tw`bg-white shadow-sm`]}
              >
                <Text style={tw`text-xs font-bold text-[#475569]`}>{t('selectSeatsPage.tabRedeem')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={tw`mb-4`}>
              {promoTab === 'my_vouchers' ? (
                myVouchers.length === 0 ? (
                  <View style={tw`py-12 items-center`}>
                     <Info color="#cbd5e1" size={32} style={tw`mb-2`} />
                     <Text style={tw`text-xs text-[#94a3b8]`}>{t('selectSeatsPage.emptyMyVouchers')}</Text>
                  </View>
                ) : (
                  myVouchers.map((voucher) => (
                    <TouchableOpacity
                      key={voucher.id}
                      onPress={() => handleSelectVoucher(voucher)}
                      style={tw`border border-[#cbd5e1] rounded-2xl p-4 mb-3 flex-row items-center justify-between`}
                    >
                      <View>
                        <Text style={tw`text-[13px] font-black text-[#0f172a]`}>{voucher.title}</Text>
                        <Text style={tw`text-[11px] text-[#64748b] mt-1`}>Mã: {voucher.code}</Text>
                      </View>
                      <Text style={tw`text-xs font-black text-[#EF5222]`}>
                        {voucher.type === 'percent' ? t('loyalty.discountPercent').replace('{value}', voucher.value.toString()) : t('loyalty.discountAmount').replace('{value}', voucher.value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US'))}
                      </Text>
                    </TouchableOpacity>
                  ))
                )
              ) : (
                redeemableVouchers.length === 0 ? (
                  <View style={tw`py-12 items-center`}>
                    <Info color="#cbd5e1" size={32} style={tw`mb-2`} />
                    <Text style={tw`text-xs text-[#94a3b8]`}>{t('selectSeatsPage.emptyRedeemable')}</Text>
                  </View>
                ) : (
                  redeemableVouchers.map((voucher) => (
                    <View
                      key={voucher.id}
                      style={tw`border border-[#cbd5e1] rounded-2xl p-4 mb-3 flex-row items-center justify-between`}
                    >
                      <View style={tw`flex-1 mr-3`}>
                        <Text style={tw`text-[13px] font-black text-[#0f172a]`}>{voucher.title}</Text>
                        <Text style={tw`text-[11px] text-[#EF5222] font-bold mt-1`}>{t('selectSeatsPage.pointsNeeded').replace('{points}', voucher.cost.toString())}</Text>
                      </View>
                      <TouchableOpacity
                        disabled={userPoints < voucher.cost}
                        onPress={() => handleRedeem(voucher)}
                        style={[tw`bg-[#EF5222] px-3.5 py-2 rounded-lg`, userPoints < voucher.cost && tw`bg-[#cbd5e1]`]}
                      >
                        <Text style={tw`text-white text-[10px] font-black`}>{t('selectSeatsPage.redeemBtn')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )
              )}
            </ScrollView>

            {/* Input Promo Code */}
            <View style={tw`flex-row gap-2 border-t border-[#f1f5f9] pt-4`}>
              <TextInput
                value={promoInput}
                onChangeText={setPromoInput}
                autoCapitalize="characters"
                placeholder={t('selectSeatsPage.manualPromoPlaceholder')}
                style={tw`flex-1 border border-[#cbd5e1] rounded-xl px-4 py-2.5 text-xs text-[#0f172a]`}
              />
              <TouchableOpacity
                onPress={handleApplyPromoManual}
                style={tw`bg-[#EF5222] px-4.5 justify-center rounded-xl`}
              >
                <Text style={tw`text-white text-xs font-bold`}>{t('selectSeatsPage.applyBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
