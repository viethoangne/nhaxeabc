'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Mail, Copy, Check, AlertCircle, Home, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';

function ConfettiEffect() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const colors = ['#EF5222', '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-30">
      {Array.from({ length: 45 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 80 + Math.random() * 200;
        const size = 6 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 0.15;
        const duration = 2.0 + Math.random() * 1.5;

        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/4 rounded-full"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * velocity * 2,
              y: Math.sin(angle) * velocity * 2 - 80, // drift upward
              scale: [0, 1, 0.7, 0],
              opacity: [1, 1, 0.4, 0],
            }}
            transition={{
              duration,
              delay,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}

export default function PaymentSuccessPage() {
  const t = useTranslations('paymentSuccessPage');
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCalledApi = useRef(false);
  const [copied, setCopied] = useState(false);

  // === LẤY MÃ ĐƠN HÀNG ===
  // MoMo: ?orderCode=xxx hoặc ?orderId=TRIP_xxx
  // VNPAY: backend redirect về ?orderCode=xxx&vnp_ResponseCode=00
  let finalOrderCode = searchParams.get('orderCode') || '';
  if (!finalOrderCode) {
    const momoOrderId = searchParams.get('orderId') || '';
    finalOrderCode = momoOrderId.replace('TRIP_', '');
  }

  // === XÁC ĐỊNH TRẠNG THÁI ===
  const resultCode = searchParams.get('resultCode') || '';         // MoMo
  const vnpResponseCode = searchParams.get('vnp_ResponseCode') || ''; // VNPAY

  useEffect(() => {
    // MoMo thất bại → redirect sang cancel
    if (resultCode && resultCode !== '0' && resultCode !== '9000') {
      router.replace(`/payment-cancel?${searchParams.toString()}`);
      return;
    }

    // VNPAY không phải '00' → redirect sang cancel (safety net)
    if (vnpResponseCode && vnpResponseCode !== '00') {
      router.replace(`/payment-cancel?${searchParams.toString()}`);
      return;
    }

    // Kích hoạt confirm-local cho cả MoMo và VNPAY ở môi trường phát triển (Local/Test)
    const isMomoSuccess = resultCode === '0' || resultCode === '9000';
    const isVnpaySuccess = vnpResponseCode === '00';
    if ((isMomoSuccess || isVnpaySuccess) && finalOrderCode && !hasCalledApi.current) {
      hasCalledApi.current = true;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      console.log('🚀 Xác nhận đơn thanh toán:', finalOrderCode);
      fetch(`${apiUrl}/payment/confirm-local/${finalOrderCode}`, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
        .then(res => res.json())
        .then(data => console.log('✅ Kết quả:', data))
        .catch(err => console.error('❌ Lỗi:', err));
    }
  }, [resultCode, vnpResponseCode, finalOrderCode, router, searchParams]);

  const handleCopyOrderCode = () => {
    if (!finalOrderCode) return;
    navigator.clipboard.writeText(finalOrderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 relative overflow-visible">
      {/* Festive Floating Particles celebration */}
      <ConfettiEffect />
      
      <motion.div 
        className="rounded-[32px] border border-slate-200/75 bg-white/95 p-8 md:p-10 shadow-2xl shadow-slate-100 relative overflow-hidden backdrop-blur-md"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 15 }}
      >
        {/* Visual elegant light source decor */}
        <div className="absolute -left-16 -top-16 w-44 h-44 bg-emerald-200/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-44 h-44 bg-orange-200/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center relative z-10">
          {/* Spring-animated checkmark circle with glowing rings */}
          <div className="relative mb-6">
            {/* Pulsing halo rings */}
            <motion.div
              className="absolute inset-0 rounded-full bg-emerald-100/50"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -inset-2.5 rounded-full bg-emerald-50/60"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            />
            
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-200"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 130, damping: 11, delay: 0.15 }}
            >
              <CheckCircle2 className="h-12 w-12" />
            </motion.div>
          </div>

          <motion.h1 
            className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {t('title')}
          </motion.h1>

          <p className="mt-3.5 max-w-2xl text-slate-500 font-semibold leading-relaxed">
            {t('desc')}
          </p>

          {/* Mail info alert card */}
          <motion.div 
            className="mt-8 w-full overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-6 shadow-sm shadow-amber-50/50 relative"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, ease: 'easeOut' }}
          >
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-200/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col items-center gap-3 relative z-10">
              <motion.div 
                className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100/80 text-amber-600 shadow-md shadow-amber-100/50"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              >
                <Mail className="h-7 w-7" />
              </motion.div>
              
              <h3 className="text-xl font-bold text-amber-800">{t('checkMailTitle')}</h3>
              <p className="text-amber-700 leading-relaxed text-sm md:text-base max-w-xl font-medium">
                {t('checkMailDesc')}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Detailed Info Cards */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 relative z-10">
          {/* Card Mã đơn hàng */}
          <motion.div 
            className="group relative rounded-2xl border border-slate-100 bg-slate-50/50 p-5 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-md hover:border-slate-200/80"
            initial={{ x: -25, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('orderCode')}</div>
            
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-2xl font-black text-slate-800 font-sans tracking-normal">
                {finalOrderCode || '---'}
              </span>
              
              {finalOrderCode && (
                <div className="relative">
                  <button
                    onClick={handleCopyOrderCode}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-orange-500 hover:border-orange-200 active:scale-90"
                    title={t('copyTitle')}
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.4, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-emerald-500"
                        >
                          <Check className="h-5 w-5" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.4, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Copy className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  <AnimatePresence>
                    {copied && (
                      <motion.div 
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white shadow-lg pointer-events-none whitespace-nowrap z-20"
                        initial={{ opacity: 0, y: 8, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        {t('copied')}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          {/* Card Trạng thái */}
          <motion.div 
            className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-5 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-md hover:border-slate-200/80"
            initial={{ x: 25, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('txStatus')}</div>
            
            <div className="mt-3 flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              
              <span className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                {t('paid')}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Important notices panel */}
        <motion.div 
          className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/20 p-6 relative overflow-hidden"
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="absolute -left-10 -bottom-10 w-28 h-28 bg-emerald-200/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
          
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-emerald-600" />
            <span>{t('importantNotice')}</span>
          </h2>
          
          <ul className="mt-4 space-y-3.5 z-10 relative">
            {[
              t('notice1'),
              t('notice2'),
              t('notice3')
            ].map((text, idx) => (
              <li key={idx} className="flex items-start gap-3.5 text-sm text-slate-600 leading-relaxed font-semibold">
                <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-[10px]">
                  ✓
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Action button row */}
        <motion.div 
          className="mt-9 flex flex-wrap justify-center gap-4 relative z-10"
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 font-bold text-white shadow-lg shadow-orange-100 transition-all duration-300 hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-0.5 active:scale-95"
          >
            <Home className="h-5 w-5" />
            {t('btnHome')}
          </Link>

          <Link
            href="/search-trip"
            className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-8 py-4 font-bold text-slate-700 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:scale-95"
          >
            <Ticket className="h-5 w-5" />
            {t('btnNew')}
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}