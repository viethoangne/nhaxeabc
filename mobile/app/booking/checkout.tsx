import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2, Clock, AlertCircle, Copy, Check,
  ChevronLeft, Info, ExternalLink, ShieldCheck, XCircle, Sparkles
} from 'lucide-react-native';
import { apiClient } from '@/constants/api';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import { useTranslation } from '@/hooks/useTranslation';

export default function CheckoutScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  const from = (searchParams.from as string) || '';
  const to = (searchParams.to as string) || '';
  const date = (searchParams.date as string) || '';
  const seats = (searchParams.seats as string) || '';
  const returnSeats = (searchParams.returnSeats as string) || '';
  const returnDate = (searchParams.returnDate as string) || '';
  const name = (searchParams.name as string) || '';
  const email = (searchParams.email as string) || '';
  const totalPrice = Number(searchParams.totalPrice || '0');
  const paymentMethod = (searchParams.paymentMethod as 'MOMO' | 'VNPAY') || 'MOMO';
  const paymentUrl = (searchParams.paymentUrl as string) || '';   // deep-link / redirect URL từ API
  const orderCode = (searchParams.orderCode as string) || '';
  const qrExpiredAt = (searchParams.qrExpiredAt as string) || '';

  const { t } = useTranslation();

  const [isPaid, setIsPaid]             = useState(false);
  const [isExpired, setIsExpired]       = useState(false);
  const [isPaymentFailed, setIsPaymentFailed] = useState(false);
  const [copied, setCopied]             = useState(false);
  const [opening, setOpening]           = useState(false);

  // Animation values for Success Screen
  const successScale = useRef(new Animated.Value(0.3)).current;
  const successFade = useRef(new Animated.Value(0)).current;
  const successSlide = useRef(new Animated.Value(40)).current;

  // Animation values for Failure Screen
  const failScale = useRef(new Animated.Value(0.3)).current;
  const failFade = useRef(new Animated.Value(0)).current;
  const failSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (isPaid) {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, tension: 45, friction: 6, useNativeDriver: true }),
        Animated.timing(successFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(successSlide, { toValue: 0, tension: 35, friction: 7, useNativeDriver: true }),
      ]).start();
    }
  }, [isPaid]);

  useEffect(() => {
    if (isPaymentFailed) {
      Animated.parallel([
        Animated.spring(failScale, { toValue: 1, tension: 45, friction: 6, useNativeDriver: true }),
        Animated.timing(failFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(failSlide, { toValue: 0, tension: 35, friction: 7, useNativeDriver: true }),
      ]).start();
    }
  }, [isPaymentFailed]);

  // --- Countdown: tính từ qrExpiredAt nếu có, fallback theo phương thức ---
  const calcInitialCountdown = () => {
    if (qrExpiredAt) {
      const secs = Math.floor((new Date(qrExpiredAt).getTime() - Date.now()) / 1000);
      return secs > 0 ? secs : 0;
    }
    return paymentMethod === 'VNPAY' ? 1200 : 300; // VNPAY 20ph, MoMo 5ph (như backend)
  };
  const [countdown, setCountdown] = useState<number>(calcInitialCountdown);

  // 3. Deep link listener — nhận kết quả từ MoMo/VNPAY redirect về nhaxeabc://payment-result
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (!url.includes('payment-result')) return;
      // Parse params
      const queryStr = url.split('?')[1] || '';
      const params: Record<string, string> = {};
      queryStr.split('&').forEach(part => {
        const [k, v] = part.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
      const status = params['status'];
      if (status === 'success') {
        setIsPaid(true);
        setTimeout(() => router.push('/(tabs)/history'), 2000);
      } else {
        // cancel / failed — hiển thị thất bại
        setIsPaymentFailed(true);
      }
    };

    // Lắng nghe khi app đang mở
    const sub = Linking.addEventListener('url', handleDeepLink);
    // Lắng nghe khi app được mở từ dead state bởi deep link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });
    return () => sub.remove();
  }, []);

  // 3b. Nhận kết quả redirect từ web (khi chạy bản Web trên trình duyệt)
  useEffect(() => {
    if (searchParams.status === 'success') {
      setIsPaid(true);
      setTimeout(() => router.push('/(tabs)/history'), 2000);
    } else if (searchParams.status === 'cancel') {
      setIsPaymentFailed(true);
    }
  }, [searchParams.status]);

  // 1. Countdown mỗi giây — giống web
  useEffect(() => {
    if (isPaid || isExpired || isPaymentFailed) return;
    if (countdown <= 0) { setIsExpired(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isPaid, isExpired]);

  // 2. Polling trạng thái thanh toán 3 giây/lần — giống web
  useEffect(() => {
    if (!orderCode || isPaid || isExpired) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/payment/status/${orderCode}`);
        if (res.data.isPaid) {
          setIsPaid(true);
          clearInterval(interval);
          setTimeout(() => router.push('/(tabs)/history'), 2000);
        }
        if (res.data.isExpired) {
          setIsExpired(true);
          clearInterval(interval);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [orderCode, isPaid, isExpired]);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mở đúng app/website theo cổng thanh toán
  const handleOpenPayment = async () => {
    if (!paymentUrl || opening) return;
    setOpening(true);
    try {
      const canOpen = await Linking.canOpenURL(paymentUrl);
      if (canOpen) {
        await Linking.openURL(paymentUrl);
      } else {
        Alert.alert(
          t('checkoutPage.cannotOpen'),
          paymentMethod === 'MOMO'
            ? t('checkoutPage.installMomoMsg')
            : t('checkoutPage.cannotOpenBrowserMsg'),
        );
      }
    } catch {
      Alert.alert(t('checkoutPage.errorLabel'), t('checkoutPage.openLinkError'));
    } finally {
      setOpening(false);
    }
  };

  // --- Brand config ---
  const getBrand = () => {
    if (paymentMethod === 'VNPAY') return {
      title: t('checkoutPage.vnpayTitle'),
      gradientColors: ['#005ba9', '#003b73'] as [string, string],
      logoUrl: 'https://vnpay.vn/s1/statics.vnpay.vn/2023/6/0oxhzjmxbksr1686814746087.png',
      buttonText: t('checkoutPage.vnpayBtn'),
      instruction: t('checkoutPage.vnpayInstructionAlt'),
      note: t('checkoutPage.vnpayNote'),
    };
    return {
      title: t('checkoutPage.momoTitle'),
      gradientColors: ['#a50064', '#6a003f'] as [string, string],
      logoUrl: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',
      buttonText: t('checkoutPage.momoBtn'),
      instruction: t('checkoutPage.momoInstructionAlt'),
      note: t('checkoutPage.momoNote'),
    };
  };
  const brand = getBrand();

  // === PAID SUCCESS ===
  if (isPaid) {
    return (
      <View style={tw`flex-1 bg-[#0b0f19]`}>
        <LinearGradient
          colors={['#0f172a', '#0b0f19']}
          style={tw`flex-1 justify-center items-center p-6`}
        >
          <Animated.View style={[
            tw`items-center w-full max-w-sm bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80`,
            {
              opacity: successFade,
              transform: [
                { scale: successScale },
                { translateY: successSlide }
              ]
            }
          ]}>
            {/* Pulsing glow behind icon */}
            <View style={tw`relative items-center justify-center mb-6`}>
              <View style={[tw`absolute w-28 h-28 bg-emerald-500/10 rounded-full`]} />
              <View style={[
                tw`w-20 h-20 rounded-full items-center justify-center border-4 border-emerald-500/20`,
                { backgroundColor: 'rgba(16,185,129,0.08)' }
              ]}>
                <CheckCircle2 color="#10b981" size={44} strokeWidth={2.5} />
              </View>
              {/* Floating success elements */}
              <View style={[tw`absolute -top-1 -right-1`]}>
                <Sparkles color="#34d399" size={16} />
              </View>
            </View>

            <Text style={tw`text-[20px] font-black text-white uppercase tracking-wider text-center mb-1`}>
              {t('checkoutPage.successTitle')}
            </Text>
            <Text style={tw`text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4`}>
              {t('checkoutPage.orderCode')}: {orderCode}
            </Text>

            {/* Glowing Price badge */}
            <LinearGradient
              colors={['rgba(16,185,129,0.15)', 'rgba(52,211,153,0.05)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={tw`px-6 py-2.5 rounded-2xl border border-emerald-500/20 mb-6`}
            >
              <Text style={tw`text-[20px] font-black text-emerald-400 text-center tracking-wide`}>
                {totalPrice.toLocaleString('vi-VN')} đ
              </Text>
            </LinearGradient>

            {/* Elegant Ticket Details Card */}
            <View style={[
              tw`w-full p-4.5 rounded-2xl mb-6`,
              { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }
            ]}>
              <View style={tw`flex-row justify-between mb-3.5`}>
                <Text style={tw`text-slate-400 text-[11px] font-bold uppercase tracking-wider`}>{t('checkoutPage.journeyLabel')}</Text>
                <Text style={tw`text-white text-[12px] font-black`}>{from} ➔ {to}</Text>
              </View>
              
              <View style={tw`flex-row justify-between mb-3.5`}>
                <Text style={tw`text-slate-400 text-[11px] font-bold uppercase tracking-wider`}>{t('checkoutPage.departureDateLabel')}</Text>
                <Text style={tw`text-white text-[12px] font-black`}>{date}</Text>
              </View>

              {returnDate ? (
                <View style={tw`flex-row justify-between mb-3.5`}>
                  <Text style={tw`text-slate-400 text-[11px] font-bold uppercase tracking-wider`}>{t('checkoutPage.returnDateLabel')}</Text>
                  <Text style={tw`text-white text-[12px] font-black`}>{returnDate}</Text>
                </View>
              ) : null}

              <View style={tw`flex-row justify-between`}>
                <Text style={tw`text-slate-400 text-[11px] font-bold uppercase tracking-wider`}>{t('checkoutPage.seatsLabel')}</Text>
                <Text style={tw`text-emerald-400 text-[12px] font-black`}>
                  {seats}{returnSeats ? ` | ${t('checkoutPage.returnSeatsIndicator').replace('{seats}', returnSeats)}` : ''}
                </Text>
              </View>
            </View>

            {/* Verification & Email box */}
            <View style={tw`items-center px-4`}>
              <Text style={tw`text-[11.5px] text-slate-400 font-bold text-center leading-relaxed mb-4`}>
                {t('checkoutPage.emailSentDesc')}{'\n'}
                <Text style={tw`text-white font-black`}>{email}</Text>
              </Text>
            </View>

            <View style={tw`h-px w-full bg-slate-800/80 mb-5`} />

            {/* Spinner redirect hint */}
            <View style={tw`flex-row items-center justify-center gap-2.5`}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={tw`text-[9.5px] font-black text-slate-500 uppercase tracking-widest`}>
                {t('checkoutPage.redirectingHistory')}
              </Text>
            </View>

          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  // === PAYMENT FAILED / CANCELLED ===
  if (isPaymentFailed) {
    return (
      <View style={tw`flex-1 bg-[#0b0f19]`}>
        <LinearGradient
          colors={['#0f172a', '#0b0f19']}
          style={tw`flex-1 justify-center items-center p-6`}
        >
          <Animated.View style={[
            tw`items-center w-full max-w-sm bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80`,
            {
              opacity: failFade,
              transform: [
                { scale: failScale },
                { translateY: failSlide }
              ]
            }
          ]}>
            {/* Glowing red icon */}
            <View style={tw`relative items-center justify-center mb-6`}>
              <View style={[tw`absolute w-28 h-28 bg-rose-500/10 rounded-full`]} />
              <View style={[
                tw`w-20 h-20 rounded-full items-center justify-center border-4 border-rose-500/20`,
                { backgroundColor: 'rgba(239,68,68,0.08)' }
              ]}>
                <XCircle color="#f43f5e" size={44} strokeWidth={2.5} />
              </View>
            </View>

            <Text style={tw`text-[20px] font-black text-white uppercase tracking-wider text-center mb-1`}>
              {t('checkoutPage.failedTitle')}
            </Text>
            <Text style={tw`text-[11.5px] text-slate-400 font-bold text-center leading-relaxed mb-6 px-4`}>
              {t('checkoutPage.failedDesc')}{'\n'}
              {t('checkoutPage.transactionCodeLabel')}<Text style={tw`text-rose-400 font-black`}>{orderCode || 'N/A'}</Text>
            </Text>

            {/* Explanation details card */}
            <View style={[
              tw`w-full p-4.5 rounded-2xl mb-6`,
              { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }
            ]}>
              <View style={tw`flex-row items-start gap-2.5 mb-3`}>
                <View style={tw`w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5`} />
                <Text style={tw`flex-1 text-[11px] font-bold text-slate-300 leading-relaxed`}>
                  {t('checkoutPage.seatReleasedInfo')}
                </Text>
              </View>
              <View style={tw`flex-row items-start gap-2.5`}>
                <View style={tw`w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5`} />
                <Text style={tw`flex-1 text-[11px] font-bold text-slate-400 leading-relaxed`}>
                  {t('checkoutPage.noChargeInfo')}
                </Text>
              </View>
            </View>

            {/* Retrying Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.85}
              style={tw`w-full mb-3`}
            >
              <LinearGradient
                colors={['#EF5222', '#d946ef']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={tw`w-full py-3.5 rounded-2xl items-center justify-center`}
              >
                <Text style={tw`text-white text-[13px] font-black uppercase tracking-wider`}>
                  {t('checkoutPage.backToBook')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
              style={tw`py-2`}
            >
              <Text style={tw`text-slate-500 text-[11px] font-black uppercase tracking-widest`}>
                {t('checkoutPage.goHome')}
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8fafc]`}>

      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#F97316', '#EF5222', '#C2410C']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[tw`px-4 pt-5 pb-5`, {
          shadowColor: '#C2410C', shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.28, shadowRadius: 18, elevation: 10,
        }]}
      >
        <View style={tw`flex-row items-center gap-3.5 mb-3`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[tw`w-10 h-10 rounded-full justify-center items-center`,
            { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }]}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#ffffff" size={22} strokeWidth={3} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <Text style={tw`text-white/70 text-[10px] font-black uppercase tracking-widest mb-0.5`}>
              {t('checkoutPage.sysHeaderLabel')}
            </Text>
            <Text style={tw`text-white text-[18px] font-black tracking-wide`}>{brand.title}</Text>
          </View>
          <View style={[tw`px-2.5 py-1.5 rounded-full`,
          { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' }]}>
            <Text style={tw`text-emerald-300 text-[9px] font-black uppercase tracking-widest`}>SECURE</Text>
          </View>
        </View>

        {/* Mã đặt chỗ chip */}
        <View style={[tw`flex-row items-center gap-2 px-3.5 py-2 rounded-2xl`,
        { backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={tw`text-white/70 text-[10.5px] font-black uppercase tracking-widest`}>{t('checkoutPage.orderCodeChip')}</Text>
          <Text style={tw`text-white text-[13px] font-black flex-1`}>{orderCode}</Text>
          <TouchableOpacity onPress={copyToClipboard} activeOpacity={0.7}>
            {copied
              ? <Check color="#34d399" size={15} strokeWidth={3} />
              : <Copy color="rgba(255,255,255,0.7)" size={15} strokeWidth={2.5} />
            }
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={tw`p-4 pb-16`}>

        {/* ── PAYMENT PORTAL CARD ── */}
        <View style={[tw`rounded-3xl overflow-hidden mb-5 border border-slate-700`, { backgroundColor: '#1e293b' }]}>

          {/* Brand logo row */}
          <View style={tw`px-5 py-4 border-b border-slate-800 flex-row items-center gap-3`}>
            <Image source={{ uri: brand.logoUrl }} style={tw`h-7 w-24`} resizeMode="contain" />
            <View style={tw`flex-1 h-px bg-slate-700`} />
            <View style={[tw`px-2.5 py-1 rounded-full`,
            { backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' }]}>
              <Text style={tw`text-emerald-400 text-[9px] font-black uppercase tracking-widest`}>SECURE IPN</Text>
            </View>
          </View>

          {/* Payment action area */}
          <View style={tw`items-center py-10 px-6`}>

            {isExpired ? (
              /* ── EXPIRED ── */
              <View style={tw`items-center`}>
                <View style={tw`w-20 h-20 bg-red-950/30 rounded-full items-center justify-center mb-4 border border-red-800/40`}>
                  <AlertCircle color="#ef4444" size={42} />
                </View>
                <Text style={tw`text-[17px] font-black text-white text-center mb-1`}>{t('checkoutPage.expiredTitle')}</Text>
                <Text style={tw`text-[12px] text-slate-400 font-bold text-center leading-relaxed mb-6`}>
                  {t('checkoutPage.expiredDesc')}
                </Text>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={tw`bg-[#EF5222] px-8 py-3 rounded-2xl`}
                  activeOpacity={0.85}
                >
                  <Text style={tw`text-white text-[13px] font-black`}>← Quay lại chọn vé</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── WAITING FOR PAYMENT ── */
              <View style={tw`items-center w-full`}>

                {/* QR Code Container */}
                {paymentUrl ? (
                  <View style={tw`items-center mb-6`}>
                    <View style={[
                      tw`bg-white p-4 rounded-3xl items-center justify-center border border-slate-700`,
                      { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }
                    ]}>
                      <Image
                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentUrl)}` }}
                        style={tw`w-48 h-48`}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={tw`text-slate-400 text-[11px] text-center font-bold px-6 leading-5`}>
                      {t('checkoutPage.scanQrHint')}
                    </Text>
                  </View>
                ) : (
                  <View style={[tw`w-28 h-28 rounded-full items-center justify-center mb-6`,
                  { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' }]}>
                    <Image source={{ uri: brand.logoUrl }} style={tw`w-20 h-20`} resizeMode="contain" />
                  </View>
                )}

                {/* Waiting status */}
                <View style={[tw`flex-row items-center gap-2.5 px-5 py-2.5 rounded-full mb-6`,
                { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
                  <View style={tw`w-2 h-2 rounded-full bg-emerald-400`} />
                  <Text style={tw`text-[11px] font-black text-emerald-300 uppercase tracking-widest`}>
                    {t('checkoutPage.waitingPaymentStatus')}
                  </Text>
                </View>

                {/* Main CTA Button */}
                {paymentUrl ? (
                  <TouchableOpacity
                    onPress={handleOpenPayment}
                    disabled={opening}
                    activeOpacity={0.85}
                    style={tw`w-full`}
                  >
                    <LinearGradient
                      colors={brand.gradientColors}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[tw`w-full py-4 rounded-2xl flex-row items-center justify-center gap-3`,
                      { opacity: opening ? 0.7 : 1 }]}
                    >
                      {opening
                        ? <ActivityIndicator size="small" color="#ffffff" />
                        : <ExternalLink color="#ffffff" size={18} strokeWidth={2.5} />
                      }
                      <Text style={tw`text-white text-[14px] font-black uppercase tracking-wider`}>
                        {opening ? t('checkoutPage.openingBtn') : brand.buttonText}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <View style={tw`items-center py-4`}>
                    <ActivityIndicator size="large" color="#EF5222" />
                    <Text style={tw`text-slate-400 text-[12px] font-bold mt-3`}>{t('checkoutPage.initQr')}</Text>
                  </View>
                )}

                {/* Instruction box */}
                <View style={[tw`mt-5 w-full p-4 rounded-2xl`,
                { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }]}>
                  <View style={tw`flex-row items-start gap-2.5`}>
                    <Info color="rgba(255,255,255,0.7)" size={15} />
                    <Text style={tw`flex-1 text-[11.5px] font-bold text-white/80 leading-relaxed`}>
                      {brand.instruction}
                    </Text>
                  </View>
                  <View style={tw`h-px bg-white/10 my-3`} />
                  <View style={tw`flex-row items-center gap-1.5`}>
                    <ShieldCheck color="rgba(52,211,153,0.7)" size={13} />
                    <Text style={tw`text-[10px] font-bold text-emerald-400/70`}>{brand.note}</Text>
                  </View>
                </View>

                {/* Developer testing bypass tools */}
                {__DEV__ && (
                  <View style={[tw`mt-5 w-full p-4 rounded-2xl border border-amber-600/30 bg-amber-950/20`]}>
                    <Text style={tw`text-[11px] font-black text-amber-500 uppercase tracking-widest mb-3 text-center`}>
                      {t('checkoutPage.devToolsTitle')}
                    </Text>
                    <View style={tw`flex-row gap-3`}>
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            const res = await apiClient.get(`/payment/confirm-local/${orderCode}`);
                            if (res.data.success) {
                              Alert.alert(t('checkoutPage.devApproveSuccess'), t('checkoutPage.devApproveSuccessMsg'));
                            } else {
                              Alert.alert(t('checkoutPage.loginFailTitle'), res.data.message);
                            }
                          } catch (err: any) {
                            Alert.alert(t('checkoutPage.errorLabel'), err.message || t('checkoutPage.openLinkError'));
                          }
                        }}
                        style={[tw`flex-1 py-2.5 bg-emerald-600 rounded-xl items-center`]}
                      >
                        <Text style={tw`text-white text-[11px] font-black uppercase`}>{t('checkoutPage.devApproveBtn')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            const res = await apiClient.get(`/payment/failed-local/${orderCode}`);
                            if (res.data.success) {
                              Alert.alert(t('checkoutPage.devCancelSuccess'), t('checkoutPage.devCancelSuccessMsg'));
                              router.back();
                            } else {
                              Alert.alert(t('checkoutPage.loginFailTitle'), res.data.message);
                            }
                          } catch (err: any) {
                            Alert.alert(t('checkoutPage.errorLabel'), err.message || t('checkoutPage.openLinkError'));
                          }
                        }}
                        style={[tw`flex-1 py-2.5 bg-rose-600 rounded-xl items-center`]}
                      >
                        <Text style={tw`text-white text-[11px] font-black uppercase`}>{t('checkoutPage.devCancelBtn')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Footer hints */}
                <View style={[tw`mt-4 w-full flex-row items-center justify-between`]}>
                  <Text style={tw`text-[9px] font-black text-white/30 uppercase tracking-widest`}>ĐỪNG THOÁT MÀN HÌNH NÀY</Text>
                  <Text style={tw`text-[9px] font-black text-white/30 uppercase tracking-widest`}>TỰ ĐỘNG CẬP NHẬT</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── BILL SUMMARY ── */}
        <View style={tw`bg-white p-5 rounded-2xl border border-[#e2e8f0] mb-4`}>
          <View style={tw`flex-row items-center gap-2 mb-4 pb-3 border-b border-[#f1f5f9]`}>
            <View style={tw`w-8 h-8 bg-[#EF5222] rounded-lg items-center justify-center`}>
              <Text style={tw`text-white font-black italic text-xs`}>ABC</Text>
            </View>
            <View>
              <Text style={tw`text-[12px] font-black text-[#0f172a] uppercase tracking-wider`}>{t('checkoutPage.vendorTitle')}</Text>
              <Text style={tw`text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest`}>{t('checkoutPage.orderInfo')}</Text>
            </View>
          </View>

          <View style={tw`gap-3.5`}>
            {/* Provider */}
            <View>
              <Text style={tw`text-[10px] font-black text-[#94a3b8] uppercase tracking-widest`}>{t('checkoutPage.provider')}</Text>
              <Text style={tw`text-[13px] font-black text-[#0f172a] mt-0.5`}>{t('checkoutPage.providerName')}</Text>
            </View>

            {/* Order Code */}
            <View style={[tw`flex-row justify-between items-center pb-3 border-b`, { borderColor: '#f1f5f9' }]}>
              <Text style={tw`text-[10px] font-black text-[#94a3b8] uppercase tracking-widest`}>{t('checkoutPage.orderCode')}</Text>
              <View style={tw`flex-row items-center gap-2`}>
                <View style={tw`bg-[#f1f5f9] px-3 py-1.5 rounded-lg border border-[#e2e8f0]`}>
                  <Text style={tw`text-[13px] font-black text-[#EF5222]`}>{orderCode}</Text>
                </View>
                <TouchableOpacity onPress={copyToClipboard} activeOpacity={0.7}
                  style={tw`p-1.5 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]`}>
                  {copied
                    ? <Check color="#10b981" size={15} strokeWidth={3} />
                    : <Copy color="#64748b" size={15} strokeWidth={2.5} />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Route */}
            <View style={[tw`flex-row justify-between items-center pb-3 border-b`, { borderColor: '#f1f5f9' }]}>
              <Text style={tw`text-[10px] font-black text-[#94a3b8] uppercase tracking-widest`}>{t('checkoutPage.route')}</Text>
              <Text style={tw`text-[13px] font-black text-[#0f172a] uppercase`}>{from} ➔ {to}</Text>
            </View>

            {/* Seats */}
            <View style={[tw`flex-row justify-between items-start pb-3 border-b`, { borderColor: '#f1f5f9' }]}>
              <Text style={tw`text-[10px] font-black text-[#94a3b8] uppercase tracking-widest`}>{t('checkoutPage.seats')}</Text>
              <View style={tw`items-end`}>
                <Text style={tw`text-[13px] font-black text-[#EF5222]`}>{seats}</Text>
                {returnSeats ? <Text style={tw`text-[11px] font-bold text-[#64748b] mt-0.5`}>{t('checkoutPage.returnDateIndicator').replace('{date}', returnSeats)}</Text> : null}
              </View>
            </View>

            {/* Date */}
            <View style={[tw`flex-row justify-between items-start pb-3 border-b`, { borderColor: '#f1f5f9' }]}>
              <Text style={tw`text-[10px] font-black text-[#94a3b8] uppercase tracking-widest`}>{t('checkoutPage.date')}</Text>
              <View style={tw`items-end`}>
                <Text style={tw`text-[13px] font-bold text-[#0f172a]`}>{date}</Text>
                {returnDate ? <Text style={tw`text-[11px] font-bold text-[#64748b] mt-0.5`}>{t('checkoutPage.returnDateIndicator').replace('{date}', returnDate)}</Text> : null}
              </View>
            </View>

            {/* Total + Status */}
            <View style={[tw`flex-row items-center justify-between p-4 rounded-2xl`,
            { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' }]}>
              <View>
                <Text style={tw`text-[10px] font-black text-[#94a3b8] uppercase tracking-widest`}>{t('checkoutPage.total')}</Text>
                <Text style={tw`text-[22px] font-black text-[#0f172a] tracking-tight mt-0.5`}>
                  {totalPrice.toLocaleString('vi-VN')}đ
                </Text>
              </View>
              <View style={tw`h-10 w-px bg-[#e2e8f0]`} />
              <View style={tw`items-end`}>
                <Text style={tw`text-[10px] font-black text-[#94a3b8] uppercase tracking-widest`}>Trạng thái</Text>
                <View style={tw`flex-row items-center gap-1.5 mt-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full`}>
                  <View style={tw`w-1.5 h-1.5 rounded-full bg-amber-400`} />
                  <Text style={tw`text-[10px] font-black text-amber-600 uppercase tracking-widest`}>CHỜ THANH TOÁN</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── COUNTDOWN + CANCEL ── */}
        <View style={tw`items-center gap-3 pb-4`}>
          {!isExpired && (
            <View style={tw`flex-row items-center gap-2`}>
              <Clock color="#94a3b8" size={15} />
              <Text style={tw`text-[11.5px] text-[#64748b] font-black`}>{t('checkoutPage.autoCancel')}</Text>
              <Text style={tw`text-[14px] font-black text-red-500`}>
                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={tw`text-[11.5px] font-black text-[#EF5222] uppercase tracking-widest`}>{t('checkoutPage.cancelBtn')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
