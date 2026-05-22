'use client';

import { API_BASE } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, HelpCircle, Copy, Check, AlertCircle, Home, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';

function RedFadingParticles() {
  const colors = ['#F43F5E', '#EF4444', '#FDA4AF', '#FECDD3', '#E11D48'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-30">
      {Array.from({ length: 25 }).map((_, i) => {
        const x = Math.random() * 400 - 200; // side drift
        const y = -120 - Math.random() * 200; // upward flow
        const size = 5 + Math.random() * 7;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 1.5;
        const duration = 3.5 + Math.random() * 2.0;

        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/4 rounded-full"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x,
              y,
              scale: [0, 1.2, 0.8, 0],
              opacity: [0, 0.8, 0.4, 0],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}

export default function PaymentCancelPage() {
  const t = useTranslations('paymentCancelPage');
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [copied, setCopied] = useState(false);
  const hasCalledApi = useRef(false);

  // === LẤY MÃ ĐƠN HÀNG ===
  let finalOrderCode = searchParams.get('orderCode') || '';
  if (!finalOrderCode) {
    const momoOrderId = searchParams.get('orderId') || '';
    finalOrderCode = momoOrderId.replace('TRIP_', '');
  }

  const resultCode = searchParams.get('resultCode');

  useEffect(() => {
    if (!finalOrderCode || hasCalledApi.current) return;
    hasCalledApi.current = true;

    // 1. NẾU THÀNH CÔNG (resultCode = 0) - Trường hợp đặc biệt
    if (resultCode === '0') {
      setStatus('confirming');
      fetch(`${API_BASE}/payment/confirm-local/${finalOrderCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStatus('confirmSuccess');
          } else {
            setStatus('confirmDup');
          }
        })
        .catch((err) => {
          console.error('Lỗi xác nhận:', err);
          setStatus('emailError');
        });
    } 
    // 2. NẾU KHÁCH ẤN HỦY HOẶC GIAO DỊCH LỖI (resultCode != 0)
    else {
      setStatus('cancelling');
      
      // Gọi API báo Backend hủy đơn và nhả ghế ngay lập tức
      fetch(`${API_BASE}/payment/failed-local/${finalOrderCode}`)
        .then(() => {
          setStatus('cancelSuccess');
        })
        .catch(() => {
          setStatus('cancelFail');
        });
    }
  }, [finalOrderCode, resultCode]);

  const handleCopyOrderCode = () => {
    if (!finalOrderCode) return;
    navigator.clipboard.writeText(finalOrderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 relative overflow-visible">
      {/* Slow floating red particles */}
      <RedFadingParticles />
      
      <motion.div 
        className="rounded-[32px] border border-slate-200/75 bg-white/95 p-8 md:p-10 shadow-2xl shadow-slate-100 relative overflow-hidden backdrop-blur-md"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 15 }}
      >
        {/* Visual elegant light source decor */}
        <div className="absolute -left-16 -top-16 w-44 h-44 bg-rose-200/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-44 h-44 bg-orange-200/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center relative z-10">
          {/* Spring-animated error circle with glowing rings */}
          <div className="relative mb-6">
            {/* Pulsing halo rings */}
            <motion.div
              className="absolute inset-0 rounded-full bg-rose-100/50"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -inset-2.5 rounded-full bg-rose-50/60"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            />
            
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-xl shadow-rose-200"
              initial={{ scale: 0, rotate: 45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 130, damping: 11, delay: 0.15 }}
            >
              <XCircle className="h-12 w-12" />
            </motion.div>
          </div>

          <motion.h1 
            className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-rose-600 to-red-700 bg-clip-text text-transparent"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {t('title')}
          </motion.h1>

          <p className="mt-3.5 max-w-2xl text-slate-500 font-semibold leading-relaxed">
            {status && t(status)}
          </p>

          {/* System status alert card */}
          <motion.div 
            className="mt-8 w-full overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/60 to-red-50/40 p-6 shadow-sm shadow-rose-50/50 relative"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, ease: 'easeOut' }}
          >
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-rose-200/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col items-center gap-3 relative z-10">
              <motion.div 
                className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100/80 text-rose-600 shadow-md shadow-rose-100/50"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              >
                <HelpCircle className="h-7 w-7" />
              </motion.div>
              
              <h3 className="text-xl font-bold text-rose-800">{t('sysMsg')}</h3>
              <p className="text-rose-700 leading-relaxed text-sm md:text-base max-w-xl font-medium">
                {t('sysMsgDesc')}
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
                          className="text-rose-500"
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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              
              <span className="text-2xl font-black bg-gradient-to-r from-rose-600 to-red-500 bg-clip-text text-transparent">
                {t('failed')}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Important notices panel */}
        <motion.div 
          className="mt-8 rounded-2xl border border-rose-100 bg-rose-50/20 p-6 relative overflow-hidden"
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="absolute -left-10 -bottom-10 w-28 h-28 bg-rose-200/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
          
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <span>{t('importantNotice')}</span>
          </h2>
          
          <ul className="mt-4 space-y-3.5 z-10 relative">
            {[
              t('notice1'),
              t('notice2'),
              t('notice3')
            ].map((text, idx) => (
              <li key={idx} className="flex items-start gap-3.5 text-sm text-slate-600 leading-relaxed font-semibold">
                <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-[10px]">
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
            href="/search-trip"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 font-bold text-white shadow-lg shadow-orange-100 transition-all duration-300 hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-0.5 active:scale-95"
          >
            <Ticket className="h-5 w-5" />
            {t('btnRedo')}
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-8 py-4 font-bold text-slate-700 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:scale-95"
          >
            <Home className="h-5 w-5" />
            {t('btnHome')}
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}