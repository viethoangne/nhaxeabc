'use client';
import { API_BASE } from '@/lib/api';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { formatPrice, formatDate, formatTime } from '@/utils/date';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

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
  const [paymentMethod, setPaymentMethod] = useState<'MOMO' | 'BANK'>('MOMO');
  
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
      alert("Vui lòng đăng nhập để đổi quà!");
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
        alert(`Chúc mừng! Bạn đã đổi thành công mã: ${promo.title}`);
      }
    } catch (error: any) {
      console.error("Lỗi đổi điểm:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi đổi điểm. Vui lòng thử lại!");
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
      if (currentSeats.length >= tickets) return alert(`Bạn chỉ được chọn tối đa ${tickets} ghế mỗi chiều.`);
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
        alert('Mã ưu đãi này đã được sử dụng!');
        return;
      }
      setAppliedPromo(found);
      setIsPromoModalOpen(false);
      setPromoInput('');
    } else {
      alert('Mã không hợp lệ hoặc bạn không sở hữu mã này!');
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
      return alert("Vui lòng nhập đúng định dạng Email để nhận mã!");
    }
    
    setLoading(true);
    try {
      await axios.post('${API_BASE}/otp/send-otp', { email: customerInfo.email.trim() });
      setIsOtpSent(true);
      setCountdown(60);
      alert("Mã OTP đã được gửi vào email của bạn!");
    } catch (error) {
      alert("Không thể gửi OTP. Vui lòng kiểm tra lại kết nối!");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return alert("Vui lòng nhập đủ 6 số OTP!");
    
    setLoading(true);
    try {
      await axios.post('${API_BASE}/otp/verify', { 
        email: customerInfo.email.trim(),
        otp: otp 
      });
      
      setIsOtpVerified(true); 
      setIsOtpSent(false);    
      alert("Xác thực Email thành công! Bạn có thể tiếp tục thanh toán.");
      
    } catch (error: any) {
      alert(error.response?.data?.message || "Mã OTP không chính xác hoặc đã hết hạn!");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (tripType === 'round' && bookingStep === 'outbound') {
      if (outboundSeats.length < tickets) return alert(`Vui lòng chọn đủ ${tickets} ghế chuyến đi!`);
      if (!returnTripId) return alert('Lỗi dữ liệu: Không tìm thấy chuyến về.');
      setBookingStep('return');
      return;
    }

    const currentSeats = bookingStep === 'outbound' ? outboundSeats : returnSeats;
    if (currentSeats.length < tickets) return alert(`Vui lòng chọn đủ ${tickets} ghế.`);
    if (!isWithinBookingWindow) return alert('Chỉ được đặt vé trước giờ khởi hành ít nhất 3 tiếng.');

    const finalName = session?.user?.name ? session.user.name : customerInfo.name.trim();
    const finalEmail = session?.user?.email ? session.user.email : customerInfo.email.trim();
    
    if (!finalName || !finalEmail) return alert('Vui lòng điền đủ thông tin liên hệ!');
    if (phoneError || !customerInfo.phone) return alert('Số điện thoại không hợp lệ!');
  
    if (!session?.user && !isOtpVerified) {
      return alert("Vui lòng hoàn thành xác thực Email (nhập mã OTP và bấm Xác nhận) trước khi thanh toán!");
    }

    // ======================================================
    // --- KHÔNG CÒN CHẶN NỮA VÌ ĐÃ CÓ VIETQR ---
    // ======================================================

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
        paymentMethod: paymentMethod === 'BANK' ? 'VIETQR' : 'MOMO'
      };

      const response = await axios.post('${API_BASE}/payment/create-link', payload);
      
      if (response.data?.isVietQR) {
        const query = new URLSearchParams({
          tripType, tickets: tickets.toString(), from, to, date,
          outboundTripId: outboundTripId.toString(),
          seats: outboundSeats.join(','),
          name: finalName, phone: normalizedPhone, email: finalEmail,
          totalPrice: finalAmount.toString(),
          paymentMethod: 'VIETQR',
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
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo giao dịch!');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-700">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Breadcrumb items={[{ label: 'Kết quả tìm chuyến', href: `/search-trip${searchParams.toString() ? `?${searchParams.toString()}` : ''}` }, { label: 'Chọn ghế & Thanh toán' }]} />

        <div className="mb-8 mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => bookingStep === 'return' ? setBookingStep('outbound') : router.back()} className="group flex w-fit items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-600 transition-colors hover:text-orange-700">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-orange-600 transition-transform group-hover:-translate-x-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </div>
            {bookingStep === 'return' ? 'Lùi lại chuyến đi' : 'Trở về tìm kiếm'}
          </button>
          {tripType === 'round' && (
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className={`px-3 py-1 rounded-full ${bookingStep === 'outbound' ? 'bg-orange-100 text-orange-700 font-bold' : 'bg-green-100 text-green-700'}`}>1. Chuyến đi</span>
              <div className={`h-0.5 w-8 ${bookingStep === 'return' ? 'bg-orange-500' : 'bg-slate-300'}`} />
              <span className={`px-3 py-1 rounded-full ${bookingStep === 'return' ? 'bg-orange-100 text-orange-700 font-bold' : 'bg-slate-200 text-slate-500'}`}>2. Chuyến về</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6 overflow-hidden">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <h2 className="text-lg font-bold uppercase text-slate-800 tracking-tight">Thông tin liên hệ</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Họ và tên <span className="text-red-500">*</span></label>
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
                          setNameError('Vui lòng nhập đầy đủ Họ và Tên (ít nhất 2 từ)');
                        } else {
                          setNameError('');
                        }
                      } else {
                        setNameError('');
                      }
                    }} 
                    className={`w-full rounded-xl border p-3.5 text-sm outline-none transition-all ${
                      session?.user 
                        ? 'bg-orange-50 border-orange-100 text-orange-800 cursor-not-allowed' 
                        : nameError 
                          ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                          : 'border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                    }`} 
                    placeholder="Ví dụ: Trần H***" 
                  />
                  {nameError && !session?.user && (
                    <p className="text-xs text-red-500 font-semibold animate-pulse">
                      * {nameError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="tel" 
                    maxLength={10}
                    value={customerInfo.phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCustomerInfo({...customerInfo, phone: val});
                      
                      if (val.length > 0 && !isValidVietnamMobile(val)) {
                        setPhoneError('Số điện thoại không hợp lệ (cần 10 số)');
                      } else {
                        setPhoneError('');
                      }
                    }} 
                    className={`w-full rounded-xl border p-3.5 text-sm outline-none transition-all ${
                      phoneError 
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                        : 'border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                    }`} 
                    placeholder="09xx xxx xxx" 
                  />
                  {phoneError && (
                    <p className="text-xs text-red-500 font-semibold animate-pulse">
                      * {phoneError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500">
                    Email <span className="text-red-500">*</span> 
                    {session?.user && <span className="text-orange-600 ml-2 font-normal">(Đang sử dụng email tài khoản)</span>}
                    {isOtpVerified && <span className="text-green-600 ml-2 font-bold">✓ Đã xác thực</span>}
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
                        (session?.user || isOtpVerified) ? 'bg-green-50 border-green-200 text-green-800 cursor-not-allowed' : 'border-slate-300 focus:border-orange-500'
                      }`} 
                      placeholder="email@example.com" 
                    />

                    {!session?.user && !isOtpVerified && (
                      <button 
                        type="button" 
                        onClick={handleSendOtp} 
                        disabled={countdown > 0} 
                        className="px-4 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 disabled:bg-slate-300 transition-all"
                      >
                        {countdown > 0 ? `${countdown}s` : 'Xác Minh'}
                      </button>
                    )}
                  </div>
                </div>

                {!session?.user && isOtpSent && !isOtpVerified && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 md:col-span-2 bg-orange-50 p-4 rounded-xl border border-orange-200">
                    <label className="text-xs font-bold text-orange-700">Nhập mã xác thực 6 số gửi về email:</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" maxLength={6} value={otp} 
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 rounded-xl border-2 border-orange-300 bg-white p-3 text-center text-xl font-black tracking-[0.5em] text-orange-600 outline-none focus:border-orange-500"
                      />
                      <button 
                        type="button"
                        onClick={handleVerifyOtp}
                        className="px-6 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-all"
                      >
                        Xác nhận
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={bookingStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                      <h2 className="text-lg font-bold uppercase text-slate-800 tracking-tight">Chọn ghế {tripType === 'round' ? (bookingStep === 'outbound' ? '(Lượt Đi)' : '(Lượt Về)') : ''}</h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                      <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span></span>
                      22 Cabin VIP
                    </div>
                  </div>

                 {/* ========================================================= */}
                  {/* --- BANNER THÔNG BÁO AI HOẠT ĐỘNG CHO CẢ 2 CHIỀU --- */}
                  {currentAiSuggestedSeat && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="mb-8 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-4 flex items-start gap-3 shadow-sm"
                    >
                      <div className="text-2xl animate-bounce mt-0.5">✨</div>
                      <div>
                        <p className="text-sm font-bold text-orange-800">
                          {session?.user ? 'Trợ lý AI cá nhân hóa' : 'Gợi ý vị trí tốt nhất'}
                        </p>
                        
                        <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                          {session?.user 
                            ? 'Dựa trên thói quen đi xe của bạn, hệ thống đã tự động chọn sẵn ghế ' 
                            : 'Để giúp bạn thao tác nhanh hơn, hệ thống đã chọn sẵn một vị trí có tầm nhìn đẹp và thoải mái (ghế '}
                          <strong className="text-orange-600 text-sm bg-white px-2 py-0.5 rounded border border-orange-200 mx-1">
                            {currentAiSuggestedSeat}
                          </strong>
                          {session?.user 
                            ? '. Bạn hoàn toàn có thể bỏ chọn và đổi sang ghế khác nếu muốn!' 
                            : '). Bạn hoàn toàn có thể bỏ chọn và đổi sang ghế khác!'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                  {/* ========================================================= */}

                  <div className="flex flex-col items-center gap-12 md:flex-row md:justify-around">
                    {[{ label: 'Tầng dưới', data: seatsTầngDưới }, { label: 'Tầng trên', data: seatsTầngTrên }].map((floor, idx) => (
                      <div key={idx} className="w-[180px]">
                        <div className="mb-6 flex items-center justify-center gap-2">
                          <div className="h-px w-8 bg-slate-200"></div>
                          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">{floor.label}</p>
                          <div className="h-px w-8 bg-slate-200"></div>
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
        isSold ? 'border-slate-200 bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 
        isLocked ? 'border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50' : 
        isSelected ? 'border-orange-500 bg-orange-50 text-orange-600 ring-4 ring-orange-500/20' : 
        'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-500'
      }`}
    >
      {/* Gạch chéo cho ghế khóa */}
      {isLocked && <div className="absolute w-full h-[2px] bg-slate-400 -rotate-45"></div>}
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
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-orange-500 h-full"></div>
                <h3 className="mb-5 text-base font-bold uppercase text-slate-800 tracking-tight">Hành trình của bạn</h3>
                <div className="space-y-0 text-sm">
                  <div className={`relative pl-6 ${tripType === 'round' ? 'pb-6' : ''}`}>
                    {tripType === 'round' && <div className="absolute left-1.5 top-2 bottom-0 w-[2px] bg-slate-200"></div>}
                    <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-blue-500 ring-1 ring-slate-200 z-10"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800 uppercase text-[13px]">{from} → {to}</p>
                        <p className="text-xs text-slate-500 mt-1.5"><span className="font-semibold text-blue-600">{formatTime(departureDateObj)}</span> • {formatDate(departureDateObj, 'display')}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Lượt đi ({outboundSeats.length}/{tickets})</span>
                        <p className="mt-1 text-xs font-bold text-orange-500">{outboundSeats.length > 0 ? outboundSeats.join(', ') : 'Chưa chọn'}</p>
                      </div>
                    </div>
                  </div>

                  {tripType === 'round' && (
                    <div className="relative pl-6">
                      <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-orange-500 ring-1 ring-slate-200 z-10"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800 uppercase text-[13px]">{to} → {from}</p>
                          <p className="text-xs text-slate-500 mt-1.5"><span className="font-semibold text-orange-600">{formatTime(returnDepartureDateObj)}</span> • {formatDate(returnDepartureDateObj, 'display')}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Lượt về ({returnSeats.length}/{tickets})</span>
                          <p className="mt-1 text-xs font-bold text-orange-500">{returnSeats.length > 0 ? returnSeats.join(', ') : 'Chưa chọn'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-base font-bold uppercase text-slate-800 tracking-tight">Chi tiết thanh toán</h3>
                
                {!isWithinBookingWindow && (
                  <div className="mb-4 rounded-xl bg-red-50 p-3.5 border border-red-200 text-red-600 text-xs flex items-start gap-2.5">
                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p className="leading-relaxed"><strong>Không thể đặt vé:</strong> Phải đặt vé trước giờ khởi hành ít nhất <strong>3 tiếng</strong>.</p>
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                      Ưu đãi & Khuyến mãi
                    </span>
                  </div>
                  
                  {appliedPromo ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="text-sm font-bold text-green-700">{appliedPromo.code}</span>
                        </div>
                        <p className="text-[11px] text-green-600 font-medium ml-6">{appliedPromo.title}</p>
                      </div>
                      <button onClick={handleRemovePromo} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                        Bỏ chọn
                      </button>
                    </div>
                  ) : (
                    sessionStatus === 'authenticated' ? (
                      <button 
                        onClick={() => setIsPromoModalOpen(true)}
                        className="w-full flex items-center justify-between bg-orange-50/50 hover:bg-orange-50 border border-orange-200 border-dashed rounded-xl p-3 transition-colors text-orange-600"
                      >
                        <span className="text-sm font-bold">🎁 Chọn hoặc nhập mã ưu đãi</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ) : (
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-center text-sm font-medium text-slate-500">
                        Vui lòng đăng nhập để dùng Ưu đãi
                      </div>
                    )
                  )}
                </div>

                <div className="space-y-3 text-sm mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
  <div className="flex justify-between text-slate-600">
    <span>Lượt đi ({outboundSeats.length}x)</span>
    {/* ĐÃ SỬA THÀNH outboundTotal */}
    <span className="font-bold text-slate-800">{formatPrice(outboundTotal)}</span>
  </div>
  {tripType === 'round' && (
    <div className="flex justify-between text-slate-600">
      <span>Lượt về ({returnSeats.length}x)</span>
      {/* ĐÃ SỬA THÀNH returnTotal */}
      <span className="font-bold text-slate-800">{formatPrice(returnTotal)}</span>
    </div>
  )}
                  
                  {appliedPromo && baseTotalAmount > 0 && (
                    <div className="flex justify-between text-green-600 items-center border-t border-slate-200 pt-2 mt-2">
                      <span className="font-semibold">Giảm giá voucher</span>
                      <span className="font-bold">- {formatPrice(discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between mt-4 px-1">
                  <span className="text-sm font-bold uppercase text-slate-500 pb-1">Tổng cộng</span>
                  <div className="text-right">
                    {appliedPromo && baseTotalAmount > 0 && (
                      <div className="text-xs text-slate-400 line-through mb-0.5">{formatPrice(baseTotalAmount)}</div>
                    )}
                    <span className="text-2xl font-black text-orange-600">{formatPrice(finalAmount)}</span>
                  </div>
                </div>

                {/* ====================================================== */}
                {/* --- CHỌN PHƯƠNG THỨC THANH TOÁN --- */}
                {/* ====================================================== */}
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Phương thức thanh toán</h4>
                  <div className="space-y-3">
                    
                    {/* Nút MoMo */}
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'MOMO' ? 'border-[#A50064] bg-pink-50/50 ring-1 ring-[#A50064]' : 'border-slate-200 hover:border-pink-300'}`}>
                      <input type="radio" name="paymentMethod" value="MOMO" checked={paymentMethod === 'MOMO'} onChange={() => setPaymentMethod('MOMO')} className="hidden" />
                      <div className="w-8 h-8 rounded-lg bg-[#A50064] flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-[10px]">MoMo</span>
                      </div>
                      <span className={`text-sm font-bold ${paymentMethod === 'MOMO' ? 'text-[#A50064]' : 'text-slate-700'}`}>Ví điện tử MoMo</span>
                      {paymentMethod === 'MOMO' && (
                         <svg className="w-5 h-5 text-[#A50064] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      )}
                    </label>

                    {/* Nút Chuyển khoản */}
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'BANK' ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300'}`}>
                      <input type="radio" name="paymentMethod" value="BANK" checked={paymentMethod === 'BANK'} onChange={() => setPaymentMethod('BANK')} className="hidden" />
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-[12px]">🏦</span>
                      </div>
                      <span className={`text-sm font-bold ${paymentMethod === 'BANK' ? 'text-blue-700' : 'text-slate-700'}`}>Chuyển khoản Ngân hàng (VietQR)</span>
                      {paymentMethod === 'BANK' && (
                         <svg className="w-5 h-5 text-blue-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                  className="mt-6 w-full flex justify-center items-center gap-2 rounded-xl bg-orange-500 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : tripType === 'round' && bookingStep === 'outbound' ? 'Tiếp tục chọn vé về' : `THANH TOÁN ${paymentMethod === 'MOMO' ? 'MOMO' : ''}`}
                </motion.button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {isPromoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                  Khuyến mãi & Ưu đãi
                </h3>
                <button onClick={() => setIsPromoModalOpen(false)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-5 border-b border-slate-100">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Nhập mã ưu đãi..." 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold uppercase outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                  <button 
                    onClick={handleApplyPromoManual}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>

              <div className="flex border-b border-slate-200">
                <button 
                  onClick={() => setPromoTab('my_vouchers')}
                  className={`flex-1 py-3.5 text-sm font-bold transition-colors relative ${promoTab === 'my_vouchers' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Voucher của bạn
                  {promoTab === 'my_vouchers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></div>}
                </button>
                <button 
                  onClick={() => setPromoTab('redeem')}
                  className={`flex-1 py-3.5 text-sm font-bold transition-colors relative ${promoTab === 'redeem' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Đổi điểm lấy mã
                  {promoTab === 'redeem' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></div>}
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
                {promoTab === 'my_vouchers' && (
                  <div className="space-y-3">
                    {availableVouchers.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">Bạn chưa có mã ưu đãi nào.</div>
                    ) : (
                      availableVouchers.map((voucher) => (
                        <div 
                          key={voucher.id} 
                          className={`bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm transition-all
                            ${voucher.isUsed ? 'border-gray-200 opacity-60 grayscale' : 'border-slate-200 hover:border-orange-300'}
                          `}
                        >
                          <div className="flex gap-3 items-center">
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{voucher.code}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{voucher.title}</p>
                              {voucher.isUsed && (
                                <span className="text-[10px] text-red-500 font-bold uppercase mt-1 inline-block bg-red-50 px-1.5 py-0.5 rounded">
                                  Đã sử dụng
                                </span>
                              )}
                            </div>
                          </div>
                          <button 
                            disabled={voucher.isUsed}
                            onClick={() => handleSelectVoucher(voucher)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors
                              ${voucher.isUsed 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white'}
                            `}
                          >
                            {voucher.isUsed ? 'Đã dùng' : 'Dùng ngay'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {promoTab === 'redeem' && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white flex justify-between items-center shadow-md">
                      <div>
                        <p className="text-xs font-medium opacity-90">Điểm tích lũy hiện tại</p>
                        <p className="text-2xl font-black">{userPoints} <span className="text-sm font-semibold opacity-80">điểm</span></p>
                      </div>
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      </div>
                    </div>
                    <p className="text-[11px] text-center text-slate-500 italic">* Hoàn thành 1 chuyến đi nhận ngay 100 điểm.</p>

                    <div className="space-y-3">
                      {redeemableVouchers.map(promo => {
                        const canAfford = userPoints >= promo.cost;
                        return (
                          <div key={promo.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{promo.title}</p>
                              <p className="text-xs font-semibold text-orange-500 mt-0.5 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                {promo.cost} điểm
                              </p>
                            </div>
                            <button 
                              disabled={!canAfford}
                              onClick={() => handleRedeem(promo)}
                              className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${canAfford ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-md active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                            >
                              Đổi mã
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