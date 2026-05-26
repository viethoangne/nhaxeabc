'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { motion } from 'framer-motion';

export default function VerifyTicketPage() {
  const t = useTranslations('verifyTicketPage');
  const { orderCode } = useParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await axios.get(`${apiUrl}/payment/verify/${orderCode}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
  
        if (res.data.success) {
          setStatus('success');
          setData(res.data.data);
        } else {
          setData(res.data.data);
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };
    if (orderCode) verify();
  }, [orderCode]);

  const handleDownloadImage = async () => {
    const element = document.getElementById('ticket-capture-area');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true,
        backgroundColor: '#ffffff' 
      });
      const link = document.createElement('a');
      link.download = `VIP-Ticket-${orderCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Lỗi khi chụp ảnh vé:", error);
      alert(t('downloadError'));
    }
  };

  const formatPhone = (p?: string) => {
    if (!p) return '---';
    return p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const renderDateTime = (dateString?: string) => {
    if (!dateString) return '--- | ---';
    const d = new Date(dateString);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = d.toLocaleDateString('vi-VN');
    return `${time} | ${date}`;
  };

  const isRoundTrip = data?.tripType === 'round';
  const outboundSeats = data?.seats?.filter((s: any) => s.tripDirection === 'outbound') || [];
  const returnSeats = data?.seats?.filter((s: any) => s.tripDirection === 'return') || [];

  const customerName = data?.customerName || '---';
  const customerPhone = data?.customerPhone || '---';
  const busType = data?.outboundBusTypeSnapshot || data?.outboundTrip?.busType || 'LIMOUSINE';
  
  const departTime = data?.outboundDepartDateSnapshot || data?.outboundTrip?.departDate || data?.date;
  const arrivalTime = data?.outboundArrivalTimeSnapshot || data?.outboundTrip?.arrivalDate || data?.outboundTrip?.arrivalTime;
  
  const returnDepartTime = data?.returnDepartDateSnapshot || data?.returnTrip?.departDate || data?.returnDate;
  const returnArrivalTime = data?.returnArrivalTimeSnapshot || data?.returnTrip?.arrivalDate || data?.returnTrip?.arrivalTime;

  const isPaid = status === 'success';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-[#020617] p-4 md:p-8 font-sans overflow-hidden transition-colors duration-500">
      
      {status === 'loading' ? (
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#EF5222] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('loading')}</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full flex flex-col items-center"
        >
          {/* ========================================
            MOBILE VIEW: Card layout (< md)
          ======================================== */}
          <div className="md:hidden w-full max-w-sm mx-auto space-y-3">
            {/* Status badge */}
            <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-black text-sm uppercase tracking-widest ${isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-500 border border-rose-200'}`}>
              {isPaid ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              )}
              {isPaid ? t('paid') : t('unpaid')}
            </div>

            {/* Ticket card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              {/* Header bar */}
              <div className="h-1 w-full bg-gradient-to-r from-[#EF5222] via-orange-300 to-[#EF5222]"></div>
              <div className="p-4">
                {/* Brand + code */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wide">NHÀ XE ABC</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">{t('vipPass')}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-right">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">{t('bookingCode')}</p>
                    <p className="text-xs font-mono font-black text-[#EF5222]">#{orderCode}</p>
                  </div>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">{t('departure')}</p>
                    <p className="text-lg font-black text-[#EF5222] uppercase">{data?.from || '---'}</p>
                  </div>
                  <div className="text-slate-300 flex-shrink-0">
                    {isRoundTrip ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 12h16M20 12l-6-6M20 12l-6 6 M4 16h16M4 16l6-6M4 16l6 6"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    )}
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">{t('destination')}</p>
                    <p className="text-lg font-black text-[#EF5222] uppercase">{data?.to || '---'}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative flex items-center my-3 -mx-4">
                  <div className="w-3 h-3 rounded-full bg-[#f8f9fa] border border-slate-200 absolute -left-1.5"></div>
                  <div className="w-full border-t-2 border-dashed border-slate-200 mx-3"></div>
                  <div className="w-3 h-3 rounded-full bg-[#f8f9fa] border border-slate-200 absolute -right-1.5"></div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50/60 rounded-xl p-3">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">{t('departAt')}</p>
                    <p className="text-xs font-semibold text-slate-700">{renderDateTime(departTime)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">{t('arriveAt')}</p>
                    <p className="text-xs font-semibold text-slate-700">{renderDateTime(arrivalTime)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">{t('passenger')}</p>
                    <p className="text-xs font-bold text-slate-800 uppercase">{customerName}</p>
                    <p className="text-[10px] text-slate-500">{formatPhone(customerPhone)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">{t('busType')}</p>
                    <p className="text-xs font-bold text-[#EF5222] uppercase">{busType}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">{t('seats')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {outboundSeats.map((s: any) => (
                        <span key={s.id} className="border border-[#EF5222] text-[#EF5222] px-2 py-0.5 rounded text-[10px] font-bold">{s.seatNumber}</span>
                      ))}
                      {isRoundTrip && returnSeats.map((s: any) => (
                        <span key={s.id} className="border border-indigo-500 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold">{s.seatNumber} ({t('return')})</span>
                      ))}
                      {outboundSeats.length === 0 && <span className="text-slate-500 text-xs">---</span>}
                    </div>
                  </div>
                  <div className="col-span-2 border-t border-slate-200 pt-2 flex justify-between items-center">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">{t('totalPayment')}</p>
                    <p className="text-lg font-black text-slate-800">
                      {Number(data?.amount || 0).toLocaleString('vi-VN')}<span className="text-sm text-[#EF5222]">đ</span>
                    </p>
                  </div>
                </div>

                {/* Return trip info */}
                {isRoundTrip && (
                  <div className="mt-3 bg-indigo-50/60 rounded-xl p-3 border border-indigo-100">
                    <p className="text-[9px] text-indigo-400 uppercase tracking-widest font-black mb-2">{t('return')} ↩</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">{t('departAt')}</p>
                        <p className="text-xs font-semibold text-slate-700">{renderDateTime(returnDepartTime)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">{t('arriveAt')}</p>
                        <p className="text-xs font-semibold text-slate-700">{renderDateTime(returnArrivalTime)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Download button */}
            <button 
              onClick={handleDownloadImage}
              className="w-full border border-slate-300 bg-white text-slate-700 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              {t('downloadBtn')}
            </button>
          </div>

          {/* ========================================
            DESKTOP VIEW: Horizontal scroll ticket (>= md)  
          ======================================== */}
          <div className="hidden md:flex flex-col items-center w-full">
            {/* Gợi ý vuốt ngang */}
            <div className="flex items-center gap-2 mb-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
              {t('mobileHint')}
            </div>

            {/* VÙNG CHỤP ẢNH VÉ */}
            <div className="w-full max-w-full overflow-x-auto pb-8 custom-scrollbar flex justify-start lg:justify-center px-2">
              <div id="ticket-capture-area" className="min-w-[900px] w-[900px] bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] relative border border-slate-100 flex flex-col">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#EF5222] via-[#ff9b7d] to-[#EF5222] rounded-t-xl"></div>

                <div className="p-8">
                  {/* 1. HEADER */}
                  <div className="flex justify-between items-end mb-10 border-b border-slate-100 pb-5">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-800 tracking-wide uppercase">{t('brand')}</h1>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.25em] font-semibold">{t('vipPass')}</p>
                        {isRoundTrip && (
                          <span className="bg-indigo-100 text-indigo-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{t('roundTrip')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">{t('bookingCode')}</p>
                      <div className="bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-md">
                        <p className="text-lg font-mono font-bold tracking-widest text-[#EF5222] leading-none">#{orderCode}</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. TUYẾN ĐƯỜNG CHÍNH */}
                  <div className="flex items-center justify-center gap-12 mb-10 w-full px-4">
                    <div className="flex-1 flex flex-col items-end text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{t('departure')}</p>
                      <p className="text-2xl font-bold text-[#EF5222] uppercase leading-tight">{data?.from || '---'}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-slate-300 mt-4 px-6">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={isRoundTrip ? "M4 12h16M20 12l-6-6M20 12l-6 6 M4 16h16M4 16l6-6M4 16l6 6" : "M17 8l4 4m0 0l-4 4m4-4H3"}></path>
                      </svg>
                    </div>
                    <div className="flex-1 flex flex-col items-start text-left">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{t('destination')}</p>
                      <p className="text-2xl font-bold text-[#EF5222] uppercase leading-tight">{data?.to || '---'}</p>
                    </div>
                  </div>

                  {/* 3. LƯỚI THÔNG TIN CHI TIẾT */}
                  <div className="grid grid-cols-4 gap-8 bg-[#fafafa] p-6 rounded-xl border border-slate-100">
                    {/* Cột 1 */}
                    <div className="col-span-1 flex flex-col justify-between gap-5">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t('departAt')} {isRoundTrip ? `(${t('outbound')})` : ''}</p>
                        <p className="text-[13px] font-semibold text-slate-700">{renderDateTime(departTime)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t('arriveAt')} {isRoundTrip ? `(${t('outbound')})` : ''}</p>
                        <p className="text-[13px] font-semibold text-slate-700">{renderDateTime(arrivalTime)}</p>
                      </div>
                    </div>

                    {/* Cột 2 */}
                    <div className="col-span-1 flex flex-col justify-between gap-5 border-l border-slate-200 pl-6">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t('passenger')}</p>
                        <p className="text-[13px] font-bold text-slate-800 uppercase">{customerName}</p>
                        <p className="text-[12px] text-slate-500 font-medium mt-0.5">{formatPhone(customerPhone)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t('busType')}</p>
                        <p className="text-[13px] font-bold text-[#EF5222] uppercase tracking-wide">{busType}</p>
                      </div>
                    </div>

                    {/* Cột 3 */}
                    <div className="col-span-1 flex flex-col justify-between gap-5 border-l border-slate-200 pl-6">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{t('seats')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {outboundSeats.length > 0 ? (
                            outboundSeats.map((s: any) => (
                              <span key={s.id} className="border border-[#EF5222] text-[#EF5222] px-2 py-0.5 rounded text-xs font-bold">
                                {s.seatNumber}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 text-[13px] font-semibold">---</span>
                          )}
                          {isRoundTrip && returnSeats.length > 0 && returnSeats.map((s: any) => (
                            <span key={s.id} className="border border-indigo-600 text-indigo-600 px-2 py-0.5 rounded text-xs font-bold">
                              {s.seatNumber} ({t('return')})
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t('status')}</p>
                        {status === 'success' ? (
                          <p className="text-[13px] font-bold text-emerald-600 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                            {t('paid')}
                          </p>
                        ) : (
                          <p className="text-[13px] font-bold text-rose-500 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            {t('unpaid')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Cột 4 */}
                    <div className="col-span-1 flex flex-col justify-between items-end border-l border-slate-200 pl-6 text-right">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t('totalPayment')}</p>
                        <p className="text-2xl font-bold text-slate-800 leading-none">
                          {Number(data?.amount || 0).toLocaleString('vi-VN')}<span className="text-[15px] text-[#EF5222] ml-0.5 underline decoration-2 underline-offset-2">đ</span>
                        </p>
                      </div>
                      <div className="flex items-end gap-[2px] h-8 opacity-40 mt-4">
                        {[1,3,1,2,4,1,2,1,3,1,1,2,3,1,2,1,4,1,2,1,3,1,2].map((w, i) => (
                          <div key={i} className="bg-slate-900 h-full rounded-sm" style={{ width: `${w}px` }}></div>
                        ))}
                      </div>
                    </div>

                    {/* Hàng Khứ hồi (Nếu có) */}
                    {isRoundTrip && (
                      <>
                        <div className="col-span-1 flex flex-col gap-5 pt-4 mt-2 border-t border-slate-200">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t('departAt')} ({t('return')})</p>
                            <p className="text-[13px] font-semibold text-slate-700">{renderDateTime(returnDepartTime)}</p>
                          </div>
                        </div>
                        <div className="col-span-1 flex flex-col gap-5 pt-4 mt-2 border-t border-slate-200 border-l pl-6">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t('arriveAt')} ({t('return')})</p>
                            <p className="text-[13px] font-semibold text-slate-700">{renderDateTime(returnArrivalTime)}</p>
                          </div>
                        </div>
                        <div className="col-span-1 pt-4 mt-2 border-t border-slate-200 border-l pl-6"></div>
                        <div className="col-span-1 pt-4 mt-2 border-t border-slate-200 border-l pl-6"></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleDownloadImage}
              className="mt-6 border border-slate-300 bg-white text-slate-700 px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              {t('downloadBtn')}
            </button>
          </div>

        </motion.div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}