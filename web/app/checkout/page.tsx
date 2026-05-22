'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatPrice } from '@/utils/date';
import { ChevronLeft, Loader2, CheckCircle2, ShieldCheck, QrCode, ExternalLink, Copy, AlertCircle, Clock, Info, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

export default function IntegratedCheckout() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const initialPaymentUrl = searchParams.get('paymentUrl');
  const initialOrderCode = searchParams.get('orderCode');

  const [paymentUrl, setPaymentUrl] = useState<string>(initialPaymentUrl || '');
  const [orderCode, setOrderCode] = useState<string>(initialOrderCode || '');
  const [isPaid, setIsPaid] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null); // seconds remaining
  const [hasStartedPayment, setHasStartedPayment] = useState(!!initialPaymentUrl);
  const [copied, setCopied] = useState(false);

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
  const paymentMethod = searchParams.get('paymentMethod') || 'MOMO';

  const handleStartPayment = async () => {
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
        price: bookingData.totalPrice, 
        amount: bookingData.totalPrice, 
        paymentMethod: paymentMethod,
        userId: (session?.user as any)?.id || null,
      };

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api'}/payment/create-link`, payload);
      
      const url = response.data.checkoutUrl || response.data.payUrl;
      if (url) {
        setPaymentUrl(url);
        if (response.data.orderCode) setOrderCode(response.data.orderCode);
        
        const qrExpiredAt = response.data.qrExpiredAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const secsLeft = Math.floor((new Date(qrExpiredAt).getTime() - Date.now()) / 1000);
        setCountdown(secsLeft > 0 ? secsLeft : 0);
        setHasStartedPayment(true);
      }
    } catch (error: any) {
      console.error("Lỗi tạo giao dịch:", error.response?.data);
      alert(error.response?.data?.message || `Không thể khởi tạo thanh toán ${paymentMethod}. Vui lòng thử lại!`);
    } finally {
      setLoading(false);
    }
  };

  // Tự động khởi chạy thanh toán ngay khi tải trang
  useEffect(() => {
    if (!paymentUrl && bookingData.outboundTripId && !loading) {
      handleStartPayment();
    }
  }, [bookingData.outboundTripId]);

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
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
    const checkStatus = setInterval(async () => {
      try {
        const res = await axios.get(`${apiBase}/payment/status/${orderCode}`);
        if (res.data.isPaid) {
          setIsPaid(true);
          clearInterval(checkStatus);
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

  const copyOrderCode = () => {
    navigator.clipboard.writeText(orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !hasStartedPayment) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0F172A]">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full blur-2xl bg-[#EF5222]/30 animate-pulse"></div>
          <div className="relative bg-[#1E293B] p-5 rounded-full shadow-2xl border border-slate-700">
            <Loader2 className="animate-spin text-[#EF5222]" size={56} />
          </div>
        </div>
        <h2 className="mt-8 text-2xl font-black text-white tracking-tight">Đang kết nối cổng {paymentMethod}...</h2>
        <p className="mt-2 text-sm text-slate-400 font-medium">Hệ thống đang mã hóa bảo mật giao dịch của bạn...</p>
      </div>
    );
  }

  // --- BRAND DETAILS ---
  const getBrandConfig = () => {
    if (paymentMethod === 'VNPAY') {
      return {
        name: 'VNPAY',
        title: 'CỔNG THANH TOÁN VNPAY',
        primaryColor: '#005BAA',
        gradientClass: 'from-[#005BAA] to-[#003B73]',
        accentLight: 'bg-[#EFF6FF] text-[#005BAA] border-[#DBEAFE]',
        bannerText: 'An toàn, tiện lợi, nhanh chóng',
        logoUrl: 'https://vnpay.vn/s1/statics.vnpay.vn/2023/6/0oxhzjmxbksr1686814746087.png',
        qrLogoUrl: 'https://vnpay.vn/s1/statics.vnpay.vn/2023/6/0oxhzjmxbksr1686814746087.png',
        instruction: 'Sử dụng ứng dụng Ngân hàng (Mobile Banking) hỗ trợ VNPAY-QR để quét mã thanh toán.',
        promotions: [
          'Thanh toán nhanh chóng bằng thẻ ATM/Visa/MasterCard',
          'Hỗ trợ hơn 40+ ngân hàng tại Việt Nam'
        ],
        buttonText: 'Mở Website VNPAY'
      };
    }
    return {
      name: 'MoMo',
      title: 'CỔNG THANH TOÁN MOMO',
      primaryColor: '#A50064',
      gradientClass: 'from-[#a50064] to-[#6a003f]',
      accentLight: 'bg-[#fdf2f8] text-[#a50064] border-[#fbcfe8]',
      bannerText: 'Tích xu đổi quà cho mọi giao dịch',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',
      qrLogoUrl: 'https://images.viblo.asia/avatar/60x60/88db4f79-ee81-424d-b9cf-2b6bc932bc3e.png',
      instruction: 'Sử dụng ứng dụng Ví MoMo hoặc ứng dụng camera hỗ trợ QR code trên điện thoại để quét mã.',
      promotions: [
        'Hoàn tiền đến 10% khi thanh toán bằng ví MoMo',
        'Tích lũy heo vàng quyên góp cộng đồng lành mạnh'
      ],
      buttonText: 'Mở Ứng Dụng MoMo'
    };
  };

  const brandConfig = getBrandConfig();

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#020617] font-sans antialiased text-slate-800 dark:text-slate-200 flex flex-col justify-between transition-colors duration-500">
      
      {/* HEADER SECTION */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex items-center text-slate-600 dark:text-slate-450 hover:text-slate-900 dark:hover:text-white font-bold text-sm transition-colors gap-1.5"
          >
            <ChevronLeft size={20} />
            <span>Quay lại</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#EF5222] rounded-xl flex items-center justify-center text-white font-black italic tracking-tighter text-sm shadow-md">ABC</div>
            <div className="text-left">
              <h1 className="text-lg font-black italic tracking-tight uppercase leading-tight text-slate-900 dark:text-white">ABC Bus Line</h1>
              <p className="text-[10px] font-black tracking-widest text-[#EF5222] uppercase">Hệ thống thanh toán vé xe</p>
            </div>
          </div>
          <div className="w-14"></div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-6 md:py-10 flex items-center justify-center">
        
        <AnimatePresence mode="wait">
          {isPaid ? (

            /* --- SUCCESS COMPONENT --- */
            <motion.div 
              key="success"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-14 text-center max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-orange-950/5 border border-slate-100 dark:border-slate-800"
            >
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner animate-bounce">
                <CheckCircle2 size={56} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-3">Thanh Toán Thành Công!</h2>
              <p className="text-[#EF5222] font-black text-lg mb-6">{formatPrice(bookingData.totalPrice)}</p>
              <div className="h-0.5 bg-slate-100 dark:bg-slate-800 w-full mb-6"></div>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed">
                Hệ thống đang tự động xác thực và xuất vé điện tử gửi về email <strong className="text-slate-800 dark:text-white">{bookingData.email}</strong> của bạn...
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Loader2 className="animate-spin text-[#EF5222]" size={20} />
                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Đang chuyển hướng trong giây lát</span>
              </div>
            </motion.div>

          ) : (

            /* --- HIGH-FIDELITY MOMO PORTAL --- */
            <motion.div 
              key="portal"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.06)] dark:shadow-orange-950/5 border border-slate-100 dark:border-slate-800 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]"
            >
              
              {/* LEFT COLUMN: ORDER DETAILS (38% WIDTH) */}
              <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
                <div>
                  {/* Brand Header */}
                  <div className="flex items-center gap-2.5 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 bg-[#EF5222] rounded-xl flex items-center justify-center text-white font-black italic text-sm">ABC</div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">NHÀ XE ABC</h3>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ABC BUS LINE</p>
                    </div>
                  </div>

                  {/* Order Details Fields */}
                  <div className="space-y-6 mt-6">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Thông tin đơn hàng</h4>
                    
                    <div className="space-y-4">
                      {/* Merchant name */}
                      <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nhà cung cấp</span>
                        <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5">CÔNG TY CỔ PHẦN XE ABC BUS LINE</p>
                      </div>

                      {/* Order code */}
                      <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-wider">Mã đặt chỗ (Order Code)</span>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg text-[#EF5222] font-mono text-sm font-extrabold border border-slate-200/50 dark:border-slate-800">{orderCode}</code>
                          <button 
                            onClick={copyOrderCode}
                            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 transition-colors border border-slate-100 dark:border-slate-800"
                            title="Sao chép"
                          >
                            {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Route information */}
                      <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tuyến đường hành trình</span>
                        <p className="font-black text-slate-800 dark:text-slate-200 text-base leading-tight mt-0.5 uppercase">{bookingData.from} ➔ {bookingData.to}</p>
                      </div>

                      {/* Seats & Departure */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mã ghế</span>
                          <p className="font-extrabold text-[#EF5222] text-sm mt-0.5">{bookingData.seats.join(', ')}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ngày đi</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{bookingData.date}</p>
                        </div>
                      </div>

                      {/* Total Amount block */}
                      <div className="bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tổng tiền</span>
                          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">{formatPrice(bookingData.totalPrice)}</p>
                        </div>
                        <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Trạng thái</span>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500 dark:text-amber-450 mt-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            CHỜ QUÉT
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expiration Timer */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  {countdown !== null && !isExpired && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs">
                      <Clock size={16} className="text-slate-400" />
                      <span>Đơn đặt chỗ tự động hủy sau: </span>
                      <span className="text-red-500 font-extrabold text-sm ml-0.5">
                        {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                      </span>
                    </div>
                  )}

                  <button 
                    onClick={() => router.back()}
                    className="text-xs font-black text-[#EF5222] hover:brightness-95 transition-colors flex items-center gap-1 uppercase tracking-widest mt-1"
                  >
                    ← Hủy đặt vé & Quay lại
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: BRANDED MOMO GATEWAY (62% WIDTH) */}
              <div className={`md:col-span-7 bg-gradient-to-br ${brandConfig.gradientClass} p-6 md:p-10 flex flex-col justify-between text-white relative overflow-hidden`}>
                
                {/* Decorative background grid elements for professional look */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.05)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.05)_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
                
                {/* Brand Header Portal */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <img src={brandConfig.logoUrl} alt={brandConfig.name} className="h-8 object-contain" />
                    <span className="font-extrabold text-sm tracking-tight border-l border-white/20 pl-2.5 opacity-90">{brandConfig.title}</span>
                  </div>
                  <div className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">SECURE IPN</div>
                </div>

                {/* QR Code Container Card */}
                <div className="flex flex-col items-center justify-center my-6 md:my-8 z-10">
                  
                  {/* Styled Outer Border Shadow Glow */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-white/25 rounded-[36px] blur-xl opacity-70 group-hover:opacity-100 transition duration-1000"></div>
                    
                    {/* White QR Area */}
                    <div className="relative bg-white dark:bg-slate-950 p-5 rounded-[28px] shadow-2xl dark:shadow-orange-950/5 flex items-center justify-center h-64 w-64 md:h-72 md:w-72 border dark:border-slate-800">
                      {isExpired ? (
                        <div className="flex flex-col items-center justify-center text-center p-4">
                          <AlertCircle className="w-14 h-14 text-red-500 mb-3" />
                          <p className="font-black text-slate-800 dark:text-white text-lg">Mã thanh toán hết hạn</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4 leading-normal">Mã QR giữ chỗ đã quá hạn. Vui lòng bắt đầu lại hành trình.</p>
                          <button 
                            onClick={() => router.back()} 
                            className="px-4 py-2 bg-[#EF5222] text-white rounded-xl font-bold text-xs hover:bg-[#EF5222]/90 transition"
                          >
                            ← Quay lại trang chủ
                          </button>
                        </div>
                      ) : paymentUrl ? (
                        
                        /* --- PREMIUM QR WRAPPER WITH LOGO IN THE CENTER --- */
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative flex items-center justify-center bg-white dark:bg-slate-900 p-2.5 rounded-3xl shadow-[inset_0_-2px_4px_rgba(0,0,0,0.06)] border border-slate-100 dark:border-slate-800">
                            {/* Khung viền góc mô phỏng UI quét thực tế */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl"></div>
                            
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=1&data=${encodeURIComponent(paymentUrl)}`} 
                              alt="Payment QR Code"
                              className="w-56 h-56 md:w-60 md:h-60 object-contain rounded-xl select-none"
                            />
                            {/* absolute center logo overlay */}
                            <div className="absolute w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.15)] p-1.5 border border-slate-100 ring-4 ring-white">
                              <img src={brandConfig.qrLogoUrl} alt={brandConfig.name} className="w-full h-full object-contain rounded-xl" />
                            </div>
                          </div>
                          
                          {/* Nút bấm trực tiếp cho mobile */}
                          <a 
                            href={paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/20 hover:bg-white/30 border border-white/40 backdrop-blur-sm px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-sm active:scale-95 flex items-center gap-2"
                          >
                            {brandConfig.buttonText}
                            <ArrowRight size={16} />
                          </a>
                        </div>

                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-4">
                          <Loader2 className={`w-10 h-10 animate-spin text-[${brandConfig.primaryColor}]`} />
                          <span className="font-bold text-xs uppercase tracking-wider">Đang khởi tạo QR...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pulsing Active Status Block */}
                  <div className="bg-white/10 border border-white/10 backdrop-blur-md px-6 py-2.5 rounded-full flex items-center justify-center gap-3 mt-6">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                    </span>
                    <span className="text-[11px] font-black tracking-widest text-emerald-300 uppercase leading-none">HỆ THỐNG ĐANG CHỜ QUÉT MÃ...</span>
                  </div>

                </div>

                {/* Footer Brand Instruction Block */}
                <div className="z-10 bg-white/5 border border-white/10 backdrop-blur-lg rounded-2xl p-4.5 text-left space-y-3">
                  <div className="flex items-start gap-3">
                    <Info size={18} className="text-white/80 shrink-0 mt-0.5" />
                    <p className="text-xs text-white/90 leading-relaxed font-bold">
                      {brandConfig.instruction}
                    </p>
                  </div>
                  <div className="h-[1px] bg-white/10 w-full"></div>
                  <div className="flex items-center justify-between text-[10px] font-black text-white/50 uppercase tracking-widest">
                    <span>ĐỪNG THOÁT TRANG NÀY</span>
                    <span>TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI TRONG NỀN</span>
                  </div>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* FOOTER SECTION */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">
        <p>© 2026 ABC BUS LINE. ĐÃ ĐƯỢC MÃ HÓA BẢO MẬT & XỬ LÝ AN TOÀN.</p>
      </footer>

    </div>
  );
}