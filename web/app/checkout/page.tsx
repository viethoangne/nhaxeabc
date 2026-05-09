'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatPrice } from '@/utils/date';
import { ChevronLeft, Loader2, CheckCircle2, ShieldCheck, QrCode, ExternalLink, Copy, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

export default function IntegratedCheckout() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const initialPaymentUrl = searchParams.get('paymentUrl');
  const initialOrderCode = searchParams.get('orderCode');
  const initialPaymentMethod = searchParams.get('paymentMethod') as 'MOMO' | 'VIETQR' | null;

  const [paymentUrl, setPaymentUrl] = useState<string>(initialPaymentUrl || '');
  const [orderCode, setOrderCode] = useState<string>(initialOrderCode || '');
  const [isPaid, setIsPaid] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null); // seconds remaining
  const [paymentMethod, setPaymentMethod] = useState<'MOMO' | 'VIETQR'>(initialPaymentMethod || 'MOMO');
  
  // Nếu đã truyền paymentUrl từ trước thì coi như đã start payment
  const [hasStartedPayment, setHasStartedPayment] = useState(!!initialPaymentUrl || !!initialPaymentMethod);
  const [isVietQR, setIsVietQR] = useState(initialPaymentMethod === 'VIETQR');

  // Lấy data từ params
  const bookingData = {
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    date: searchParams.get('date') || '',
    seats: searchParams.get('seats')?.split(',') || [],
    name: searchParams.get('name') || '',
    phone: searchParams.get('phone') || '',
    email: searchParams.get('email') || '',
    totalPrice: Number(searchParams.get('totalPrice') || 0),
    outboundTripId: Number(searchParams.get('outboundTripId')),
  };

  // 1. Hàm tạo link/QR thanh toán
  const handleStartPayment = async (method: 'MOMO' | 'VIETQR') => {
    setLoading(true);
    try {
      const payload = {
        tripType: 'oneway',
        tickets: bookingData.seats.length,
        from: bookingData.from,
        to: bookingData.to,
        date: bookingData.date,
        outboundTripId: bookingData.outboundTripId,
        outboundSeats: bookingData.seats,
        customerName: bookingData.name,
        customerPhone: bookingData.phone,
        customerEmail: bookingData.email,
        amount: bookingData.totalPrice, 
        paymentMethod: method,
        userId: (session?.user as any)?.id || null,
      };

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/payment/create-link`, payload);
      
      const url = response.data.checkoutUrl || response.data.payUrl;
      if (url) {
        setPaymentUrl(url);
        setIsVietQR(response.data.isVietQR);
        if (response.data.orderCode) setOrderCode(response.data.orderCode);
        // Đặt countdown 5 phút nếu là VietQR
        if (response.data.qrExpiredAt) {
          const secsLeft = Math.floor((new Date(response.data.qrExpiredAt).getTime() - Date.now()) / 1000);
          setCountdown(secsLeft > 0 ? secsLeft : 0);
        }
        setHasStartedPayment(true);
      }
    } catch (error: any) {
      console.error("Lỗi tạo giao dịch:", error.response?.data);
      alert(error.response?.data?.message || "Không thể khởi tạo thanh toán. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // Tự động chạy nếu được truyền phương thức từ URL mà CHƯA có paymentUrl
  useEffect(() => {
    if (initialPaymentMethod && !initialPaymentUrl && bookingData.outboundTripId) {
      handleStartPayment(initialPaymentMethod);
    }
  }, []);

  // 2. Countdown đếm ngược QR (chạy mỗi giây)
  useEffect(() => {
    if (countdown === null || isPaid) return;
    if (countdown <= 0) { setIsExpired(true); return; }
    const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isPaid]);

  // 3. Polling: Tự động kiểm tra trạng thái thanh toán (3 giây/lần)
  useEffect(() => {
    if (!orderCode || isPaid || isExpired) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const checkStatus = setInterval(async () => {
      try {
        const res = await axios.get(`${apiBase}/payment/status/${orderCode}`);
        if (res.data.isPaid) {
          setIsPaid(true);
          clearInterval(checkStatus);
          // Chuyển hướng về lịch sử đơn hàng sau 2 giây
          setTimeout(() => router.push('/history'), 2000);
        }
        if (res.data.isExpired) {
          setIsExpired(true);
          clearInterval(checkStatus);
        }
      } catch (e) { /* keep polling */ }
    }, 3000);
    return () => clearInterval(checkStatus);
  }, [orderCode, isPaid, isExpired, router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full blur-xl bg-orange-400/30 animate-pulse"></div>
          <div className="relative bg-white p-4 rounded-full shadow-2xl">
            <Loader2 className="animate-spin text-orange-500" size={48} />
          </div>
        </div>
        <h2 className="mt-8 text-xl font-black text-slate-800 tracking-tight">Đang khởi tạo thanh toán</h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">Vui lòng đợi trong giây lát...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-[#1A1A1A]">
      <div className="bg-[#EF5222] text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center hover:opacity-80 transition-all">
            <ChevronLeft size={24} /> <span className="font-bold ml-1">Quay lại chọn ghế</span>
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black italic tracking-tighter uppercase">Nhà Xe ABC</h1>
            <p className="text-[10px] font-bold opacity-80">THANH TOÁN AN TOÀN</p>
          </div>
          <div className="w-10"></div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative"
            >
              <div className={`absolute top-0 left-0 w-full h-1.5 ${isVietQR ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-pink-500 to-rose-500'}`}></div>
              
              <div className="p-6 md:p-8 flex flex-col items-center relative">
                {!hasStartedPayment ? (
                  <div className="w-full">
                    <h2 className="text-2xl font-black text-slate-800 mb-2 text-center tracking-tight">Chọn phương thức thanh toán</h2>
                    <p className="text-slate-500 text-center text-sm mb-8">Vui lòng chọn 1 trong 2 phương thức dưới đây</p>
                    
                    <div className="grid grid-cols-1 gap-4 mb-8">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod('MOMO')}
                        className={`flex items-center p-5 border-2 rounded-2xl transition-all ${paymentMethod === 'MOMO' ? 'border-pink-500 bg-pink-50/30 shadow-md ring-4 ring-pink-500/10' : 'border-slate-100 hover:border-pink-200 bg-slate-50/50'}`}
                      >
                        <div className="w-14 h-14 bg-[#A50064] rounded-2xl flex items-center justify-center shadow-inner mr-5 shrink-0">
                          <span className="text-white font-black text-sm tracking-wider">MoMo</span>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-800 text-lg">Ví điện tử MoMo</p>
                          <p className="text-sm text-slate-500 mt-0.5">Thanh toán nhanh qua ứng dụng MoMo</p>
                        </div>
                      </motion.button>

                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod('VIETQR')}
                        className={`flex items-center p-5 border-2 rounded-2xl transition-all ${paymentMethod === 'VIETQR' ? 'border-blue-500 bg-blue-50/30 shadow-md ring-4 ring-blue-500/10' : 'border-slate-100 hover:border-blue-200 bg-slate-50/50'}`}
                      >
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-inner mr-5 shrink-0">
                          <QrCode className="text-white" size={24} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-800 text-lg">Chuyển khoản Ngân hàng</p>
                          <p className="text-sm text-slate-500 mt-0.5">Quét mã VietQR bằng App Ngân hàng</p>
                        </div>
                      </motion.button>
                    </div>

                    <button 
                      onClick={() => handleStartPayment(paymentMethod)}
                      className={`w-full py-4 rounded-xl font-black text-lg text-white shadow-lg transition-all active:scale-[0.98] ${
                        paymentMethod === 'VIETQR' 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25' 
                          : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-pink-500/25'
                      }`}
                    >
                      Tiến hành thanh toán {formatPrice(bookingData.totalPrice)}
                    </button>
                  </div>
                ) : isPaid ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-16 text-center w-full"
                  >
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={50} className="text-green-500" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Thanh toán thành công!</h2>
                    <p className="text-slate-500 mt-3 font-medium text-lg">Hệ thống đang xuất vé, vui lòng đợi trong giây lát...</p>
                  </motion.div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-8">
                      <div className={`p-2 rounded-lg ${isVietQR ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                        {isVietQR ? <QrCode size={20} /> : <ShieldCheck size={20} />}
                      </div>
                      <span className="font-bold text-sm uppercase tracking-wider text-slate-600">
                        Cổng thanh toán {isVietQR ? 'Ngân hàng VietQR' : 'MoMo'}
                      </span>
                    </div>

                    <div className="text-center mb-8">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng tiền thanh toán</span>
                      <h2 className={`text-5xl font-black mt-2 tracking-tighter ${isVietQR ? 'text-blue-600' : 'text-pink-600'}`}>
                        {formatPrice(bookingData.totalPrice)}
                      </h2>
                    </div>

                    {/* QR Code Container with Glassmorphism */}
                    <div className="relative mb-6 group">
                      <div className={`absolute -inset-1 rounded-[40px] blur-lg opacity-50 transition duration-1000 group-hover:opacity-100 ${isVietQR ? 'bg-blue-400/50' : 'bg-pink-400/50'}`}></div>
                      <div className="relative bg-white/80 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 shadow-2xl flex items-center justify-center min-h-[280px] min-w-[280px]">
                        {isExpired ? (
                          <div className="flex flex-col items-center justify-center text-center p-6">
                            <AlertCircle className="w-14 h-14 text-red-400 mb-3" />
                            <p className="font-black text-slate-700 text-lg">Mã QR đã hết hạn</p>
                            <p className="text-sm text-slate-500 mt-1 mb-4">Vui lòng tạo lại giao dịch mới</p>
                            <button onClick={() => router.back()} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition">← Quay lại chọn ghế</button>
                          </div>
                        ) : paymentUrl ? (
                          <img 
                            src={isVietQR ? paymentUrl : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentUrl)}`} 
                            alt="Payment QR"
                            className="w-64 h-64 md:w-72 md:h-72 object-contain rounded-2xl"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
                            <span className="font-medium text-sm">Đang tải mã QR...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Countdown Timer */}
                    {isVietQR && countdown !== null && !isExpired && !isPaid && (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4 ${
                        countdown <= 60 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        Mã QR hết hiệu lực sau: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                      </div>
                    )}

                    <div className="w-full max-w-sm space-y-6">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
                        <div className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </div>
                        <span className="text-green-600 font-bold text-sm tracking-wide">HỆ THỐNG ĐANG CHỜ QUÉT MÃ...</span>
                      </div>
                      
                      {!isVietQR && (
                        <a 
                          href={paymentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex lg:hidden items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-bold shadow-lg shadow-pink-500/30 active:scale-95 transition-all"
                        >
                          <ExternalLink size={20} /> Mở ứng dụng MoMo ngay
                        </a>
                      )}

                      <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex items-start gap-3 text-left">
                        <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-orange-800 leading-relaxed font-medium">
                          {isVietQR 
                            ? <>Mở App Ngân hàng của bạn, chọn "Quét Mã QR" để thanh toán.<br/><strong className="text-orange-900">Lưu ý KHÔNG SỬA nội dung chuyển khoản.</strong><br/>Vé sẽ được tự động xuất sau khi tiền vào tài khoản.</>
                            : <>Mở App <strong>MoMo</strong>, chọn "Quét Mã" để thanh toán.<br/>Đừng thoát trang này cho đến khi nhận được thông báo thành công.</>
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">Thông tin hành trình</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Tuyến đường</p>
                  <p className="font-black text-[#00613D] text-lg uppercase leading-tight">{bookingData.from} → {bookingData.to}</p>
                </div>
                <div className="flex justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Ngày đi</p>
                    <p className="font-bold text-gray-700">{bookingData.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Số ghế</p>
                    <p className="font-black text-[#EF5222] text-xl">{bookingData.seats.join(', ')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">Người mua vé</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Họ tên:</span><span className="font-bold text-gray-800">{bookingData.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Số điện thoại:</span><span className="font-bold text-gray-800">{bookingData.phone}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Email:</span><span className="font-bold text-gray-800 break-all ml-4">{bookingData.email}</span></div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                * Sau khi thanh toán thành công, vé điện tử sẽ được gửi về Email và Số điện thoại bạn đã cung cấp.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}