'use client';
import { API_BASE } from '@/lib/api';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useSession, signIn } from 'next-auth/react';
import { formatPrice, formatDate, formatTime } from '@/utils/date';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';

function normalizeVietnamPhone(phone: string) {
  let value = phone.trim().replace(/[\s.-]/g, '');
  if (value.startsWith('+84')) value = '0' + value.slice(3);
  else if (value.startsWith('84')) value = '0' + value.slice(2);
  return value;
}

function isValidVietnamMobile(phone: string) {
  return /^(03|05|07|08|09)\d{8}$/.test(normalizeVietnamPhone(phone));
}

function isBookableBeforeDeparture(departureDate: Date) {
  const MIN_BOOKING_MS = 3 * 60 * 60 * 1000;
  return departureDate.getTime() - Date.now() >= MIN_BOOKING_MS;
}

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

export default function ChairPage() {
  const t = useTranslations('chairPage');
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const price = Number(searchParams.get('price') || '10000');
  const tickets = Number(searchParams.get('tickets') || '1');
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';
  const returnDate = searchParams.get('returnDate') || ''; 
  const departDateTime = searchParams.get('departDateTime') || '';
  const arrivalDateTime = searchParams.get('arrivalDateTime') || '';
  const returnDepartDateTime = searchParams.get('returnDepartDateTime') || ''; 
  const tripType = (searchParams.get('tripType') as 'oneway' | 'round') || 'oneway';
  const outboundTripId = Number(searchParams.get('outboundTripId') || '0');
  const returnTripId = Number(searchParams.get('returnTripId') || '0');
  const outboundPrice = Number(searchParams.get('price') || '0'); 
  const returnPrice = Number(searchParams.get('returnPrice') || outboundPrice); // Nếu ko có thì lấy bằng giá đi
  
  const [isMounted, setIsMounted] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [phoneError, setPhoneError] = useState(''); 
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const [nameError, setNameError] = useState(''); 
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
  
  // Thêm biến phụ trợ để lấy đúng ghế AI gợi ý theo từng bước
  const currentAiSuggestedSeat = bookingStep === 'outbound' ? aiSuggestedOutboundSeat : aiSuggestedReturnSeat;
  // ======================================================
  // --- THÊM STATE QUẢN LÝ PHƯƠNG THỨC THANH TOÁN ---
  // ======================================================
  const [paymentMethod, setPaymentMethod] = useState<'MOMO' | 'BANK' | 'VNPAY'>('MOMO');
  
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoTab, setPromoTab] = useState<'my_vouchers' | 'redeem'>('my_vouchers');
  const [promoInput, setPromoInput] = useState('');
  
  const [userPoints, setUserPoints] = useState(0); 
  const [myVouchers, setMyVouchers] = useState<PromoCode[]>([]);
  const [redeemableVouchers, setRedeemableVouchers] = useState<RedeemablePromo[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  const currentTripId = bookingStep === 'outbound' ? outboundTripId : returnTripId;
  const currentSelectedSeats = bookingStep === 'outbound' ? outboundSeats : returnSeats;
  const currentBookedSeats = bookingStep === 'outbound' ? outboundBookedSeats : returnBookedSeats;
  const currentLockedSeats = bookingStep === 'outbound' ? outboundLockedSeats : returnLockedSeats;
  
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isOtpVerified, setIsOtpVerified] = useState(false); 

  const [otpArray, setOtpArray] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setOtp(otpArray.join(''));
  }, [otpArray]);

  const handleOtpChange = (value: string, index: number) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newOtpArray = [...otpArray];
    newOtpArray[index] = cleanVal;
    setOtpArray(newOtpArray);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpArray[index] && index > 0) {
        const newOtpArray = [...otpArray];
        newOtpArray[index - 1] = '';
        setOtpArray(newOtpArray);
        otpInputRefs.current[index - 1]?.focus();
      } else {
        const newOtpArray = [...otpArray];
        newOtpArray[index] = '';
        setOtpArray(newOtpArray);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtpArray = [...otpArray];
    for (let i = 0; i < 6; i++) {
      newOtpArray[i] = pastedData[i] || '';
    }
    setOtpArray(newOtpArray);
    
    const focusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    setIsMounted(true);
    if (session?.user) {
      setCustomerInfo(prev => ({
        ...prev,
        name: session.user?.name || '',
        email: session.user?.email || '',
        phone: prev.phone,
      }));

      const userId = (session.user as any)?.id;
      if (userId) {
        axios.get(`${API_BASE}/loyalty?userId=${userId}`)
          .then(res => {
            setUserPoints(res.data.points);
            setMyVouchers(res.data.myVouchers);
            setRedeemableVouchers(res.data.redeemableVouchers);
          })
          .catch(err => console.error("Lỗi lấy dữ liệu Loyalty:", err));
      }
    }
  }, [session]);

  useEffect(() => {
    const loadAllSeats = async () => {
      // 🟢 NÂNG CẤP HÀM FETCH ĐỂ ĐỌC ĐƯỢC CẢ LOCKED SEATS TỪ API
      const fetchSeats = async (tripId: number, setBooked: any, setLocked: any) => {
        if (!tripId) return;
        try {
          const res = await axios.get(`${API_BASE}/payment/booked-seats/${tripId}`);
          
          // Tương thích với cấu trúc API mới (có cả booked và locked)
          if (res.data && !Array.isArray(res.data)) {
            setBooked(res.data.bookedSeats || []);
            setLocked(res.data.lockedSeats || []);
          } else {
            // Tương thích lùi nếu API cũ chỉ trả về mảng
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

  const handleRedeem = async (promo: RedeemablePromo) => {
    const userId = (session?.user as any)?.id;
    if (!userId) {
      toast.error(t('loginToRedeem'));
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/loyalty/redeem`, {
        userId: userId,
        voucherId: promo.id
      });

      if (response.data) {
        setUserPoints(response.data.newPoints);
        setMyVouchers((prev) => [response.data.newVoucher, ...prev]);
        toast.success(t('redeemSuccess', { title: promo.title }));
      }
    } catch (error: any) {
      console.error("Lỗi đổi điểm:", error);
      toast.error(error.response?.data?.message || t('redeemError'));
    }
  };

  const departureDateObj = useMemo(() => departDateTime ? new Date(departDateTime) : date ? new Date(`${date}T00:00:00`) : new Date(), [departDateTime, date]);
  const returnDepartureDateObj = useMemo(() => returnDepartDateTime ? new Date(returnDepartDateTime) : returnDate ? new Date(`${returnDate}T00:00:00`) : new Date(), [returnDepartDateTime, returnDate]);
  const isWithinBookingWindow = isBookableBeforeDeparture(departureDateObj);
  const normalizedPhone = normalizeVietnamPhone(customerInfo.phone);

  const getSeatStatus = (id: string) => {
    if (currentBookedSeats.includes(id)) return 'sold';
    if (currentLockedSeats.includes(id)) return 'locked';
    return 'available';
  };

  const generateFloor = (startNum: number, prefix: string) => Array.from({ length: 5 }, (_, i) => ({ id: `${prefix}${startNum + i}`, status: getSeatStatus(`${prefix}${startNum + i}`) }));
  const seatsTầngDưới = useMemo(() => [...generateFloor(1, 'A'), { id: 'A6', status: getSeatStatus('A6') }, ...generateFloor(1, 'B')], [currentBookedSeats, currentLockedSeats]);
  const seatsTầngTrên = useMemo(() => [...generateFloor(7, 'A'), { id: 'A12', status: getSeatStatus('A12') }, ...generateFloor(6, 'B')], [currentBookedSeats, currentLockedSeats]);

  const toggleSeat = (id: string, status: string) => {
    if (status === 'sold' || status === 'locked') return;
    const setSeats = bookingStep === 'outbound' ? setOutboundSeats : setReturnSeats;
    const currentSeats = bookingStep === 'outbound' ? outboundSeats : returnSeats;

    if (currentSeats.includes(id)) setSeats(currentSeats.filter(s => s !== id));
    else {
      if (currentSeats.length >= tickets) return toast.error(t('maxSeatsError', { count: tickets }));
      setSeats([...currentSeats, id]);
    }
  };

  useEffect(() => {
    // Độ dài số ghế đang chọn của bước hiện tại
    const currentSeatsLength = bookingStep === 'outbound' ? outboundSeats.length : returnSeats.length;

    // Chỉ chạy AI khi: Đã load xong ghế + Chưa user chọn ghế nào + AI chưa từng gợi ý cho chiều này
    if (isMounted && isSeatsLoaded && currentSeatsLength === 0 && !currentAiSuggestedSeat) {
      
      const mockPreferences = {
        preferredSeatFloor: 'Tầng dưới', 
        preferredSeatPosition: 'window'  
      };

      const autoSelectSeat = () => {
        // Biến seatsTầngDưới/Trên tự động loại bỏ ghế "sold" dựa trên currentBookedSeats của chuyến đi/về
        const preferredFloorSeats = mockPreferences.preferredSeatFloor === 'Tầng dưới' ? seatsTầngDưới : seatsTầngTrên;
        const otherFloorSeats = mockPreferences.preferredSeatFloor === 'Tầng dưới' ? seatsTầngTrên : seatsTầngDưới;
        
        const availablePreferredFloor = preferredFloorSeats.filter(s => s.status === 'available');
        const availableOtherFloor = otherFloorSeats.filter(s => s.status === 'available');
        
        if (availablePreferredFloor.length === 0 && availableOtherFloor.length === 0) return;

        let bestSeat = null;

        const findSeatByPosition = (seats: any[]) => {
          if (mockPreferences.preferredSeatPosition === 'window') {
            return seats.find(seat => parseInt(seat.id.replace(/[A-B]/g, '')) % 2 !== 0); 
          }
          return null; 
        };

        // Ưu tiên ghế cửa sổ tầng yêu thích -> ghế bất kỳ tầng yêu thích -> ghế tầng khác
        bestSeat = findSeatByPosition(availablePreferredFloor) || availablePreferredFloor[0] ||
                   findSeatByPosition(availableOtherFloor) || availableOtherFloor[0];

        if (bestSeat) {
          // Thay vì dùng hàm toggleSeat, ta set trực tiếp để tránh lỗi stale state (trạng thái cũ)
          if (bookingStep === 'outbound') {
             setOutboundSeats([bestSeat.id]);
             setAiSuggestedOutboundSeat(bestSeat.id);
          } else {
             setReturnSeats([bestSeat.id]);
             setAiSuggestedReturnSeat(bestSeat.id);
          }
        }
      };

      autoSelectSeat();
    }
  }, [isMounted, isSeatsLoaded, bookingStep, seatsTầngDưới, seatsTầngTrên, currentAiSuggestedSeat]); 
  // Dependency lắng nghe bookingStep để biết khi nào khách bấm sang Lượt Về

  const handleApplyPromoManual = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const found = myVouchers.find(v => v.code === code);
    if (found) {
      if (found.isUsed) {
        toast.error(t('usedPromoError'));
        return;
      }
      setAppliedPromo(found);
      setIsPromoModalOpen(false);
      setPromoInput('');
      toast.success(t('promoSuccess'));
    } else {
      toast.error(t('promoError'));
    }
  };

  const handleSelectVoucher = (voucher: PromoCode) => {
    setAppliedPromo(voucher);
    setIsPromoModalOpen(false);
  };

  const handleRemovePromo = () => setAppliedPromo(null);

  const availableVouchers = myVouchers.filter(v => v.id !== appliedPromo?.id);

  const outboundTotal = outboundSeats.length * outboundPrice;
  const returnTotal = returnSeats.length * returnPrice;
  const baseTotalAmount = outboundTotal + returnTotal; // Tính riêng biệt đi và về rồi cộng lại
  let discountAmount = 0;
  if (appliedPromo && baseTotalAmount > 0) {
    if (appliedPromo.type === 'percent') discountAmount = Math.min((baseTotalAmount * appliedPromo.value) / 100, appliedPromo.maxAmount || Infinity);
    else if (appliedPromo.type === 'fixed') discountAmount = Math.min(appliedPromo.value, baseTotalAmount);
  }
  const finalAmount = Math.max(0, baseTotalAmount - discountAmount);

  const handleSendOtp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerInfo.email || !emailRegex.test(customerInfo.email.trim())) {
      return toast.error(t('emailFormatError'));
    }
    
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/otp/send-otp`, { email: customerInfo.email.trim() });
      setOtpArray(['', '', '', '', '', '']);
      setIsOtpSent(true);
      setCountdown(60);
      toast.success(t('otpSent'));
    } catch (error) {
      toast.error(t('otpSendError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return toast.error(t('otpLengthError'));
    
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/otp/verify`, { 
        email: customerInfo.email.trim(),
        otp: otp 
      });
      
      setIsOtpVerified(true); 
      setIsOtpSent(false);    
      toast.success(t('otpSuccess'));
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('otpExpired'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (tripType === 'round' && bookingStep === 'outbound') {
      if (outboundSeats.length < tickets) return toast.error(t('outboundSeatsError', { count: tickets }));
      if (!returnTripId) return toast.error(t('returnTripError'));
      setBookingStep('return');
      return;
    }

    const currentSeats = bookingStep === 'outbound' ? outboundSeats : returnSeats;
    if (currentSeats.length < tickets) return toast.error(t('seatsError', { count: tickets }));
    if (!isWithinBookingWindow) return toast.error(t('bookingWindowError'));

    const finalName = session?.user?.name ? session.user.name : customerInfo.name.trim();
    const finalEmail = session?.user?.email ? session.user.email : customerInfo.email.trim();
    
    if (!finalName || !finalEmail) return toast.error(t('contactInfoError'));
    if (phoneError || !customerInfo.phone) return toast.error(t('phoneFormatError'));
  
    if (!session?.user && !isOtpVerified) {
      return toast.error(t('emailOtpError'));
    }

    // ======================================================
    // --- KHÔNG CÒN CHẶN NỮA VÌ ĐÃ CÓ VIETQR ---
    // ======================================================

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        tripType, tickets, from, to, date, 
        returnDate: tripType === 'round' ? returnDate : undefined,
        outboundTripId, returnTripId: tripType === 'round' ? returnTripId : undefined,
        outboundSeats, returnSeats: tripType === 'round' ? returnSeats : undefined,
        customerName: finalName, 
        customerPhone: normalizedPhone, 
        customerEmail: finalEmail, 
        price: finalAmount, 
        appliedPromoCode: appliedPromo?.code || null, 
        userId: (session?.user as any)?.id || null,
        paymentMethod: paymentMethod
      };

      const response = await axios.post(`${API_BASE}/payment/create-link`, payload);
      
      if (response.data?.isVietQR) {
        const query = new URLSearchParams({
          tripType, tickets: tickets.toString(), from, to, date,
          outboundTripId: outboundTripId.toString(),
          seats: outboundSeats.join(','),
          name: finalName, phone: normalizedPhone, email: finalEmail,
          totalPrice: finalAmount.toString(),
          paymentMethod: response.data?.isVnpay ? 'VNPAY' : 'VIETQR',
          paymentUrl: response.data.checkoutUrl,
          orderCode: response.data.orderCode
        });
        if (tripType === 'round' && returnTripId) {
          query.append('returnTripId', returnTripId.toString());
          query.append('returnSeats', returnSeats.join(','));
          query.append('returnDate', returnDate);
        }
        router.push(`/checkout?${query.toString()}`);
      } else if (response.data?.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else if (response.data?.payUrl) {
        window.location.href = response.data.payUrl;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('createTxError'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }

  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] font-sans antialiased text-slate-700 dark:text-slate-300 transition-colors duration-500">
      <div className="mx-auto max-w-7xl px-4 pt-2 pb-8 sm:py-8">
        <div className="hidden sm:block">
          <Breadcrumb items={[{ label: t('breadcrumbLookup'), href: `/search-trip${searchParams.toString() ? `?${searchParams.toString()}` : ''}` }, { label: t('breadcrumbSelect') }]} />
        </div>

        <div className="mb-4 mt-2 sm:mb-8 sm:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button onClick={() => bookingStep === 'return' ? setBookingStep('outbound') : router.back()} className="group flex w-fit items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-orange-600 transition-colors hover:text-orange-700">
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border-2 border-orange-600 transition-transform group-hover:-translate-x-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </div>
            {bookingStep === 'return' ? t('backToOutbound') : t('backToSearch')}
          </button>
          {tripType === 'round' && (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <span className={`px-2.5 py-1 rounded-full ${bookingStep === 'outbound' ? 'bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-bold' : 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400'}`}>{t('stepOutbound')}</span>
              <div className={`h-0.5 w-6 sm:w-8 ${bookingStep === 'return' ? 'bg-orange-500' : 'bg-slate-350 dark:bg-slate-800'}`} />
              <span className={`px-2.5 py-1 rounded-full ${bookingStep === 'return' ? 'bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{t('stepReturn')}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6 overflow-hidden">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
              <div className="mb-4 sm:mb-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <h2 className="text-lg font-bold uppercase text-slate-800 dark:text-white tracking-tight">{t('contactHeader')}</h2>
              </div>

              {!session?.user && (
                <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-gradient-to-r from-amber-50 to-orange-50/70 dark:from-amber-950/20 dark:to-orange-950/10 p-4 shadow-sm flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500 p-1.5 text-white flex-shrink-0 mt-0.5 animate-bounce">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">{t('loyaltyPrompt')}</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                      {t('loyaltyDesc')}
                    </p>
                    <button 
                      type="button"
                      onClick={() => signIn('google')}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#EF5222] to-[#F59E0B] hover:from-[#d84315] hover:to-[#e65100] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      {t('googleLogin')}
                      <svg className="h-3 w-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('fullName')} <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={customerInfo.name} 
                    readOnly={!!session?.user} 
                    onChange={e => {
                      const val = e.target.value;
                      setCustomerInfo({...customerInfo, name: val});
                      
                      if (val.trim().length > 0) {
                        const words = val.trim().split(/\s+/);
                        if (words.length < 2) {
                           setNameError(t('nameFormatError'));
                        } else {
                           setNameError('');
                        }
                      } else {
                        setNameError('');
                      }
                    }} 
                    className={`w-full rounded-xl border p-3.5 text-sm outline-none transition-all ${
                      session?.user 
                        ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30 text-orange-850 dark:text-orange-350 cursor-not-allowed' 
                        : nameError 
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                          : 'border-slate-300 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                    }`} 
                    placeholder={t('namePlaceholder')} 
                  />
                  {nameError && !session?.user && (
                    <p className="text-xs text-red-500 font-semibold animate-pulse">
                      * {nameError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t('phone')} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="tel" 
                    maxLength={10}
                    value={customerInfo.phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCustomerInfo({...customerInfo, phone: val});
                      
                      if (val.length > 0 && !isValidVietnamMobile(val)) {
                        setPhoneError(t('phoneFormatError'));
                      } else {
                        setPhoneError('');
                      }
                    }} 
                    className={`w-full rounded-xl border p-3.5 text-sm outline-none transition-all ${
                      phoneError 
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                        : 'border-slate-300 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                    }`} 
                    placeholder={t('phonePlaceholder')} 
                  />
                  {phoneError && (
                    <p className="text-xs text-red-500 font-semibold animate-pulse">
                      * {phoneError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Email <span className="text-red-500">*</span> 
                    {session?.user && <span className="text-orange-600 dark:text-orange-400 ml-2 font-normal">{t('usingAccountEmail')}</span>}
                    {isOtpVerified && <span className="text-green-600 dark:text-green-400 ml-2 font-bold">{t('verifiedStatus')}</span>}
                  </label>
                  
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      value={customerInfo.email} 
                      readOnly={!!session?.user || isOtpVerified} 
                      onChange={e => {
                        setCustomerInfo({...customerInfo, email: e.target.value});
                        setIsOtpVerified(false); 
                      }} 
                      className={`flex-1 rounded-xl border p-3.5 text-sm outline-none transition-all ${
                        (session?.user || isOtpVerified) 
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-950/35 text-green-800 dark:text-green-300 cursor-not-allowed' 
                          : 'border-slate-300 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500'
                      }`} 
                      placeholder="email@example.com" 
                    />

                    {!session?.user && !isOtpVerified && (
                      <motion.button 
                        whileHover={loading || countdown > 0 ? {} : { scale: 1.03 }}
                        whileTap={loading || countdown > 0 ? {} : { scale: 0.97 }}
                        type="button" 
                        onClick={handleSendOtp} 
                        disabled={loading || countdown > 0} 
                        className="px-6 bg-gradient-to-r from-[#EF5222] to-[#F59E0B] hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:from-slate-350 disabled:to-slate-400 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 shadow-md shadow-orange-500/10 active:scale-95 transition-all duration-300 flex items-center justify-center min-w-[120px] cursor-pointer"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2 justify-center">
                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('sending')}
                          </span>
                        ) : countdown > 0 ? (
                          `${countdown}s`
                        ) : (
                          t('verifyEmailBtn')
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>

                {!session?.user && isOtpSent && !isOtpVerified && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="space-y-4 md:col-span-2 bg-orange-50/40 dark:bg-orange-950/5 p-5 rounded-2xl border border-orange-100 dark:border-orange-950/20 shadow-sm"
                  >
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <label className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                        {t('otpEmailLabel')}
                      </label>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={countdown > 0}
                        className="text-[10px] font-black uppercase tracking-widest text-[#EF5222] hover:underline disabled:text-slate-400 cursor-pointer transition-all"
                      >
                        {countdown > 0 ? t('resendOtpAfter', { time: countdown }) : t('resendOtp')}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="flex gap-1 min-[360px]:gap-1.5 sm:gap-2 justify-center w-full sm:w-auto">
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpInputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={otpArray[idx]}
                            onChange={(e) => handleOtpChange(e.target.value, idx)}
                            onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                            onPaste={handleOtpPaste}
                            className={`w-9 h-9 min-[360px]:w-10 min-[360px]:h-10 min-[400px]:w-11 min-[400px]:h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl border-2 text-center text-base sm:text-xl font-black transition-all duration-300 outline-none
                              ${otpArray[idx] 
                                ? 'border-[#EF5222] bg-[#EF5222]/5 dark:bg-[#EF5222]/10 text-[#EF5222] shadow-sm shadow-[#EF5222]/10' 
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-[#EF5222]'
                              }
                              focus:ring-4 focus:ring-[#EF5222]/10 focus:scale-105 focus:shadow-md focus:shadow-[#EF5222]/5
                            `}
                          />
                        ))}
                      </div>

                      <motion.button 
                        whileHover={loading ? {} : { scale: 1.03 }}
                        whileTap={loading ? {} : { scale: 0.97 }}
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#EF5222] to-[#F59E0B] hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-orange-500/10 disabled:from-slate-350 disabled:to-slate-400 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 cursor-pointer flex items-center justify-center min-h-[48px]"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2 justify-center">
                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('verifying')}
                          </span>
                        ) : (
                          t('verify')
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={bookingStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <div className="mb-5 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                      <h2 className="text-lg font-bold uppercase text-slate-800 dark:text-white tracking-tight">{t('selectSeatsTitle', { type: tripType === 'round' ? (bookingStep === 'outbound' ? t('outboundLabel') : t('returnLabel')) : '' })}</h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/20 px-3 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                      <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span></span>
                      {t('cabinVipCount')}
                    </div>
                  </div>

                 {/* ========================================================= */}
                  {/* --- BANNER THÔNG BÁO AI HOẠT ĐỘNG CHO CẢ 2 CHIỀU --- */}
                  {currentAiSuggestedSeat && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="mb-8 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-950 dark:to-slate-900 border border-orange-200 dark:border-orange-900/30 p-4 flex items-start gap-3 shadow-sm"
                    >
                      <div className="text-2xl animate-bounce mt-0.5">✨</div>
                      <div>
                        <p className="text-sm font-bold text-orange-800 dark:text-orange-400">
                          {session?.user ? t('aiTitle') : t('aiTitleGuest')}
                        </p>
                        
                        <p className="text-xs text-orange-750 dark:text-slate-300 mt-1 leading-relaxed">
                          {session?.user 
                            ? t('aiDescPersonalized', { seat: currentAiSuggestedSeat }) 
                            : t('aiDescGuest', { seat: currentAiSuggestedSeat })}
                        </p>
                      </div>
                    </motion.div>
                  )}
                  {/* ========================================================= */}

                  <div className="flex flex-col items-center gap-12 md:flex-row md:justify-around">
                    {[{ label: t('outboundFloor'), data: seatsTầngDưới }, { label: t('returnFloor'), data: seatsTầngTrên }].map((floor, idx) => (
                      <div key={idx} className="w-[180px]">
                        <div className="mb-6 flex items-center justify-center gap-2">
                          <div className="h-px w-8 bg-slate-200 dark:bg-slate-800"></div>
                          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">{floor.label}</p>
                          <div className="h-px w-8 bg-slate-200 dark:bg-slate-800"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        {floor.data.map(seat => {
  // 🟢 Bắt buộc phải khai báo 4 biến này ở đây để ở dưới className có dữ liệu dùng
  const isSelected = currentSelectedSeats.includes(seat.id);
  const isSold = seat.status === 'sold';
  const isLocked = seat.status === 'locked';
  const isDisabled = isSold || isLocked;

  return (
    <motion.button 
      key={seat.id} 
      whileHover={!isDisabled ? { scale: 1.05, y: -2 } : {}} 
      whileTap={!isDisabled ? { scale: 0.95 } : {}} 
      disabled={isDisabled} 
      onClick={() => toggleSeat(seat.id, seat.status)} 
      className={`relative flex overflow-hidden h-10 w-full items-center justify-center rounded-lg border-2 text-xs font-bold shadow-sm transition-all ${
        isSold ? 'border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60' : 
        isLocked ? 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50' : 
        isSelected ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 ring-4 ring-orange-500/20' : 
        'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-350 hover:border-orange-300 dark:hover:border-orange-900 hover:text-orange-500'
      }`}
    >
      {/* Gạch chéo cho ghế khóa */}
      {isLocked && <div className="absolute w-full h-[2px] bg-slate-400 dark:bg-slate-600 -rotate-45"></div>}
      {seat.id}
    </motion.button>
  );
})}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-orange-500 h-full"></div>
                <h3 className="mb-5 text-base font-bold uppercase text-slate-800 dark:text-white tracking-tight">{t('yourTrip')}</h3>
                <div className="space-y-0 text-sm">
                  <div className={`relative pl-6 ${tripType === 'round' ? 'pb-6' : ''}`}>
                    {tripType === 'round' && <div className="absolute left-1.5 top-2 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-800"></div>}
                    <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-white dark:border-slate-900 bg-blue-500 ring-1 ring-slate-200 dark:ring-slate-800 z-10"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[13px]">{from} → {to}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5"><span className="font-semibold text-blue-600 dark:text-blue-400">{formatTime(departureDateObj)}</span> • {formatDate(departureDateObj, 'display')}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded bg-slate-100 dark:bg-slate-950 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{t('outboundQty', { selected: outboundSeats.length, total: tickets })}</span>
                        <p className="mt-1 text-xs font-bold text-orange-500">{outboundSeats.length > 0 ? outboundSeats.join(', ') : t('notSelected')}</p>
                      </div>
                    </div>
                  </div>

                  {tripType === 'round' && (
                    <div className="relative pl-6">
                      <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-white dark:border-slate-900 bg-orange-500 ring-1 ring-slate-200 dark:ring-slate-800 z-10"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[13px]">{to} → {from}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5"><span className="font-semibold text-orange-600 dark:text-orange-400">{formatTime(returnDepartureDateObj)}</span> • {formatDate(returnDepartureDateObj, 'display')}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block rounded bg-slate-100 dark:bg-slate-950 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{t('returnQty', { selected: returnSeats.length, total: tickets })}</span>
                          <p className="mt-1 text-xs font-bold text-orange-500">{returnSeats.length > 0 ? returnSeats.join(', ') : t('notSelected')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
                <h3 className="mb-4 text-base font-bold uppercase text-slate-800 dark:text-white tracking-tight">{t('paymentDetails')}</h3>
                
                {!isWithinBookingWindow && (
                  <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/10 p-3.5 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p className="leading-relaxed"><strong>{t('cannotBook')}:</strong> {t('cannotBookDesc')}</p>
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                      {t('offersAndPromos')}
                    </span>
                  </div>
                  
                  {appliedPromo ? (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/15 border border-green-200 dark:border-green-900/30 p-3 rounded-xl shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="text-sm font-bold text-green-700 dark:text-green-400">{appliedPromo.code}</span>
                        </div>
                        <p className="text-[11px] text-green-600 dark:text-green-500 font-medium ml-6">{appliedPromo.title}</p>
                      </div>
                      <button onClick={handleRemovePromo} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                        {t('removePromo')}
                      </button>
                    </div>
                  ) : (
                    sessionStatus === 'authenticated' ? (
                      <button 
                        onClick={() => setIsPromoModalOpen(true)}
                        className="w-full flex items-center justify-between bg-orange-50/50 dark:bg-orange-950/5 hover:bg-orange-50 dark:hover:bg-orange-950/15 border border-orange-200 dark:border-orange-900/30 border-dashed rounded-xl p-3 transition-colors text-orange-600 dark:text-orange-400"
                      >
                        <span className="text-sm font-bold">{t('selectPromoBtn')}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ) : (
                      <div className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t('loginToUsePromo')}
                      </div>
                    )
                  )}
                </div>

                <div className="space-y-3 text-sm mt-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('outboundMultiplier', { count: outboundSeats.length })}</span>
                    {/* ĐÃ SỬA THÀNH outboundTotal */}
                    <span className="font-bold text-slate-850 dark:text-slate-100">{formatPrice(outboundTotal)}</span>
                  </div>
                  {tripType === 'round' && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>{t('returnMultiplier', { count: returnSeats.length })}</span>
                      {/* ĐÃ SỬA THÀNH returnTotal */}
                      <span className="font-bold text-slate-850 dark:text-slate-100">{formatPrice(returnTotal)}</span>
                    </div>
                  )}
                  
                  {appliedPromo && baseTotalAmount > 0 && (
                    <div className="flex justify-between text-green-600 items-center border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                      <span className="font-semibold">{t('voucherDiscount')}</span>
                      <span className="font-bold">- {formatPrice(discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between mt-4 px-1">
                  <span className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 pb-1">{t('totalAmount')}</span>
                  <div className="text-right">
                    {appliedPromo && baseTotalAmount > 0 && (
                      <div className="text-xs text-slate-450 dark:text-slate-500 line-through mb-0.5">{formatPrice(baseTotalAmount)}</div>
                    )}
                    <span className="text-2xl font-black text-orange-600">{formatPrice(finalAmount)}</span>
                  </div>
                </div>

                {/* ====================================================== */}
                {/* --- CHỌN PHƯƠNG THỨC THANH TOÁN --- */}
                {/* ====================================================== */}
                <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-3">{t('paymentMethod')}</h4>
                  <div className="space-y-3">
                    
                    {/* Nút MoMo */}
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'MOMO' ? 'border-[#A50064] bg-pink-50/50 dark:bg-pink-950/15 ring-1 ring-[#A50064]' : 'border-slate-200 dark:border-slate-850 hover:border-pink-300 dark:hover:border-pink-950/30'}`}>
                      <input type="radio" name="paymentMethod" value="MOMO" checked={paymentMethod === 'MOMO'} onChange={() => setPaymentMethod('MOMO')} className="hidden" />
                      <div className="w-8 h-8 rounded-lg bg-[#A50064] flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-[10px]">MoMo</span>
                      </div>
                      <span className={`text-sm font-bold ${paymentMethod === 'MOMO' ? 'text-[#A50064] dark:text-pink-400' : 'text-slate-700 dark:text-slate-350'}`}>{t('momoWallet')}</span>
                      {paymentMethod === 'MOMO' && (
                         <svg className="w-5 h-5 text-[#A50064] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      )}
                    </label>

                    {/* Nút VNPAY */}
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'VNPAY' ? 'border-[#005BAA] bg-blue-50/50 dark:bg-blue-950/15 ring-1 ring-[#005BAA]' : 'border-slate-200 dark:border-slate-850 hover:border-blue-300 dark:hover:border-blue-950/30'}`}>
                      <input type="radio" name="paymentMethod" value="VNPAY" checked={paymentMethod === 'VNPAY'} onChange={() => setPaymentMethod('VNPAY')} className="hidden" />
                      <div className="w-8 h-8 rounded-lg bg-[#005BAA] flex items-center justify-center shadow-sm">
                        <span className="text-white font-black text-[9px] tracking-tighter">VNPAY</span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${paymentMethod === 'VNPAY' ? 'text-[#005BAA] dark:text-blue-400' : 'text-slate-700 dark:text-slate-350'}`}>{t('vnpayGateway')}</span>
                      </div>
                      {paymentMethod === 'VNPAY' && (
                         <svg className="w-5 h-5 text-[#005BAA] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      )}
                    </label>

                  </div>
                </div>
                {/* ====================================================== */}

                <motion.button
                  whileHover={isWithinBookingWindow ? { scale: 1.02 } : {}}
                  whileTap={isWithinBookingWindow ? { scale: 0.98 } : {}}
                  onClick={handleAction}
                  disabled={
                    loading || 
                    currentSelectedSeats.length === 0 || 
                    !customerInfo.name.trim() || 
                    !customerInfo.email.trim() || 
                    !!phoneError || 
                    !isWithinBookingWindow ||
                    (!session?.user && !isOtpVerified) 
                  }
                  className="mt-6 w-full flex justify-center items-center gap-2 rounded-xl bg-orange-500 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600 disabled:opacity-50 disabled:bg-slate-350 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : tripType === 'round' && bookingStep === 'outbound' ? t('nextStep') : t('payNow', { method: paymentMethod === 'MOMO' ? 'MOMO' : 'VNPAY' })}
                </motion.button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {isPromoModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-100 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
               <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                  {t('offersAndPromos')}
                </h3>
                <button onClick={() => setIsPromoModalOpen(false)} className="p-1.5 sm:p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder={t('promoPlaceholder')} 
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:text-white rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold uppercase outline-none focus:border-orange-500 focus:bg-white dark:focus:bg-slate-950 transition-colors"
                  />
                  <button 
                    onClick={handleApplyPromoManual}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                  >
                    {t('apply')}
                  </button>
                </div>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setPromoTab('my_vouchers')}
                  className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-colors relative ${promoTab === 'my_vouchers' ? 'text-orange-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'}`}
                >
                  {t('myVouchers')}
                  {promoTab === 'my_vouchers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></div>}
                </button>
                <button 
                  onClick={() => setPromoTab('redeem')}
                  className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-colors relative ${promoTab === 'redeem' ? 'text-orange-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'}`}
                >
                  {t('redeemPoints')}
                  {promoTab === 'redeem' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></div>}
                </button>
              </div>

              <div className="p-4 sm:p-5 pb-20 sm:pb-5 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/50">
                {promoTab === 'my_vouchers' && (
                  <div className="space-y-3">
                    {availableVouchers.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">{t('noVouchers')}</div>
                    ) : (
                      availableVouchers.map((voucher) => (
                        <div 
                          key={voucher.id} 
                          className={`bg-white dark:bg-slate-950 border rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm transition-all gap-2
                            ${voucher.isUsed ? 'border-gray-200 dark:border-slate-900 opacity-60 grayscale' : 'border-slate-200 dark:border-slate-850 hover:border-orange-300 dark:hover:border-orange-900/30'}
                          `}
                        >
                          <div className="flex gap-2.5 sm:gap-3 items-center min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate">{voucher.code}</p>
                              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{voucher.title}</p>
                              {voucher.isUsed && (
                                <span className="text-[9px] text-red-500 font-bold uppercase mt-1 inline-block bg-red-50 dark:bg-red-950/10 px-1.5 py-0.5 rounded">
                                  {t('used')}
                                </span>
                              )}
                            </div>
                          </div>
                          <button 
                            disabled={voucher.isUsed}
                            onClick={() => handleSelectVoucher(voucher)}
                            className={`text-[10px] sm:text-xs font-bold px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg border transition-colors flex-shrink-0
                              ${voucher.isUsed 
                                ? 'bg-gray-100 dark:bg-slate-900 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-slate-800 cursor-not-allowed' 
                                : 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/30 hover:bg-orange-500 hover:text-white'}
                            `}
                          >
                            {voucher.isUsed ? t('used') : t('useNow')}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {promoTab === 'redeem' && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-3 sm:p-4 text-white flex justify-between items-center shadow-md">
                      <div>
                        <p className="text-[10px] sm:text-xs font-medium opacity-90">{t('currentPoints')}</p>
                        <p className="text-xl sm:text-2xl font-black">{userPoints} <span className="text-xs sm:text-sm font-semibold opacity-80">{t('pointsUnit')}</span></p>
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      </div>
                    </div>
                    <p className="text-[10px] text-center text-slate-500 dark:text-slate-450 italic">{t('pointsTip')}</p>

                    <div className="space-y-3">
                      {redeemableVouchers.map(promo => {
                        const canAfford = userPoints >= promo.cost;
                        return (
                          <div key={promo.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm truncate">{promo.title}</p>
                              <p className="text-[10px] sm:text-xs font-semibold text-orange-500 mt-0.5 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                {promo.cost} {t('pointsUnit')}
                              </p>
                            </div>
                            <button 
                              disabled={!canAfford}
                              onClick={() => handleRedeem(promo)}
                              className={`text-[10px] sm:text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all flex-shrink-0 ${canAfford ? 'bg-slate-800 dark:bg-slate-950 text-white dark:text-slate-200 hover:bg-slate-900 dark:hover:bg-slate-900 shadow-md active:scale-95' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                            >
                              {t('redeemBtn')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}