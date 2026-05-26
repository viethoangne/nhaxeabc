'use client';
import { API_BASE } from '@/lib/api';

import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { useTranslations, useLocale } from 'next-intl';

// IMPORT COMPONENT BREADCRUMB VÀO ĐÂY
// (Lưu ý: Đổi lại đường dẫn import này cho đúng với thư mục dự án của bạn nếu cần)
import { Breadcrumb } from '@/components/ui/Breadcrumb';

/**
 * TRANG TRA CỨU VÀ QUẢN LÝ VÉ (LOOKUP PAGE)
 * Bao gồm: Tra cứu thông tin, Hiển thị chi tiết, và Quy trình hủy vé bảo mật.
 */
export default function LookupPage() {
  const t = useTranslations('lookupPage');
  const locale = useLocale();

  // --- [1] STATES CHO LOGIC TRA CỨU VÉ ---
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  

  // --- [2] STATES CHO LOGIC HỦY VÉ (MỚI) ---
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(''); 
  const [isAgreed, setIsAgreed] = useState(false);
  const [confirmPhone, setConfirmPhone] = useState(''); // Thêm dòng này
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user; // Để check nhanh đã đăng nhập chưa

  // --- [3] HELPER FUNCTIONS (TIỆN ÍCH) ---
  
  // Định dạng số điện thoại hiển thị: 0123 456 789
  const formatPhone = (p: string) => {
    return p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  // Tính toán chính sách hoàn tiền dựa trên thời gian khởi hành
  const getRefundPolicy = () => {
    if (!ticketInfo) return { canCancel: false, refundPercent: 0, hoursLeft: 0 };
    
    const rawDepartureDate = ticketInfo.outboundDepartDateSnapshot || ticketInfo.date;
    const departureTime = new Date(rawDepartureDate).getTime();
    const now = new Date().getTime();
    
    const timeDiffHours = (departureTime - now) / (1000 * 60 * 60);

    // Chính sách: >24h hoàn 100%, >12h hoàn 50%, còn lại không cho hủy
    if (timeDiffHours >= 24) return { canCancel: true, refundPercent: 100, hoursLeft: timeDiffHours };
    if (timeDiffHours >= 12) return { canCancel: true, refundPercent: 50, hoursLeft: timeDiffHours };
    return { canCancel: false, refundPercent: 0, hoursLeft: timeDiffHours };
  };

  const refundPolicy = getRefundPolicy();

  // --- [4] HANDLERS (XỬ LÝ API) ---

  // Xử lý tra cứu vé
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Loại bỏ ký tự # nếu người dùng nhập vào
    const searchCode = orderCode.replace('#', '').trim();

    try {
      const res = await axios.get(`${API_BASE}/lookup`, {
        params: { 
          orderCode: searchCode, 
          phone: phone.trim() 
        }
      });
      setTicketInfo(res.data);
    } catch (err: any) {
      setError(t('errorMessage'));
      setTicketInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý gửi yêu cầu hủy vé lên Server
  const handleCancelTicket = async () => {
    const emailInput = confirmEmail.trim();
    const phoneInput = confirmPhone.trim();
    const ticketPhone = ticketInfo.customerPhone.replace(/[\s.-]/g, '');
    if (!confirmEmail.trim() || !confirmPhone.trim()) {
      return toast.error(t('validateFields'));
    }
  
    // Kiểm tra khớp số điện thoại (tùy chọn bảo mật thêm ở Client)
    if (confirmPhone.trim() !== ticketInfo.customerPhone) {
      return toast.error(t('phoneIncorrect'));
    }
  
    if (!isAgreed) {
      return toast.error(t('agreeTermsError'));
    }
    // 1. Kiểm tra trống
    if (!emailInput || !phoneInput) {
      return toast.error(t('fillAllError'));
    }

    // 1. Kiểm tra Email theo yêu cầu của bạn
    if (isLoggedIn) {
      if (emailInput !== session.user?.email) {
        return toast.error(t('emailMatchError'));
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput)) {
        return toast.error(t('emailInvalidError'));
      }
    }

    // 2. Kiểm tra Số điện thoại (Đã chuẩn hóa)
    if (phoneInput !== ticketPhone) {
      return toast.error(t('phoneMatchError'));
    }
  
    setCancelLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/cancel-ticket`, {
        orderCode: ticketInfo.orderCode,
        phone: confirmPhone.trim(), // Gửi số điện thoại đã xác nhận
        email: confirmEmail.trim() 
      });
  
      toast.success(res.data.message || t('cancelSuccess'));
      setTicketInfo({ ...ticketInfo, bookingStatus: 'CANCELLED' });
      setIsCancelModalOpen(false);
      
      // Reset form
      setConfirmEmail(''); 
      setConfirmPhone(''); // Reset sđt
      setIsAgreed(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || t('serverError');
      toast.error(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  // --- [5] GIAO DIỆN (UI) ---
  return (
    <div className="min-h-[85vh] py-6 md:py-10 flex items-center justify-center p-4 md:p-8 bg-gray-50/50 dark:bg-[#020617] relative transition-colors duration-500">
      
      {/* KHỐI WRAPPER CHÍNH (Chứa cả Breadcrumb và Khung hiển thị) */}
      <div className="w-full max-w-6xl flex flex-col h-full">
        
        {/* --- COMPONENT BREADCRUMB ĐƯỢC THÊM VÀO ĐÂY --- */}
        <div className="mb-6 w-full">
          <Breadcrumb items={[{ label: t('breadcrumb'), href: '/tra-cuu' }]} />
        </div>

        {/* Khung nội dung thay đổi layout động dựa trên việc có ticketInfo hay chưa */}
        <div className={`w-full transition-all duration-700 ease-in-out grid grid-cols-1 ${ticketInfo ? 'md:grid-cols-12 gap-8' : 'md:grid-cols-1'}`}>
          
          {/* ============================================================
            CỘT 1: FORM TRA CỨU VÉ
            ============================================================ */}
          <motion.div 
            layout
            className={`${ticketInfo ? 'md:col-span-4' : 'max-w-md mx-auto w-full'}`}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-[1.8rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 transition-colors duration-500">
              <div className="bg-white dark:bg-slate-900 p-6 md:p-10 text-center border-b border-slate-50 dark:border-slate-800 transition-colors duration-500">
                <h1 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">{t('title')}</h1>
                <p className="text-[#EF5222] text-[10px] font-extrabold tracking-widest uppercase">{t('subtitle')}</p>
              </div>

              <form onSubmit={handleLookup} className="p-5 md:p-8 space-y-4 md:space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mb-2 ml-1">{t('phone')}</label>
                  <input 
                    type="tel"
                    className="w-full bg-gray-50 dark:bg-slate-950/80 border border-gray-100 dark:border-slate-800 rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-4 outline-none focus:ring-2 focus:ring-[#EF5222]/20 font-bold text-gray-700 dark:text-slate-200 transition-all"
                    placeholder={t('phonePlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mb-2 ml-1">{t('orderCode')}</label>
                  <input 
                    type="text"
                    className="w-full bg-gray-50 dark:bg-slate-950/80 border border-gray-100 dark:border-slate-800 rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-4 outline-none focus:ring-2 focus:ring-[#EF5222]/20 font-bold text-gray-700 dark:text-slate-200 transition-all"
                    placeholder={t('orderCodePlaceholder')}
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value)}
                    required
                  />
                </div>

                <button 
                  disabled={loading}
                  className="w-full bg-[#EF5222] text-white font-black rounded-xl md:rounded-2xl hover:bg-[#d4451b] transition-all shadow-lg shadow-orange-200 dark:shadow-orange-950/20 uppercase tracking-widest text-sm py-3 md:py-4 mt-2"
                >
                  {loading ? t('checking') : t('checkBtn')}
                </button>
              </form>

              {error && (
                <motion.p 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[#EF5222] text-center pb-8 text-[11px] font-bold px-4 leading-relaxed"
                >
                  {error}
                </motion.p>
              )}
            </div>
          </motion.div>

          {/* ============================================================
            CỘT 2: HIỂN THỊ THÔNG TIN VÉ CHI TIẾT
            ============================================================ */}
          <AnimatePresence>
            {ticketInfo && (
              <motion.div 
                initial={{ opacity: 0, x: 150 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="md:col-span-8"
              >
                <div className="bg-white dark:bg-slate-900 p-5 md:p-10 rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-orange-200 dark:border-orange-900/30 shadow-sm relative h-auto flex flex-col transition-colors duration-500">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 md:pb-6 md:mb-8">
                    <div>
                      <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">{t('ticketTitle')}</h2>
                      <p className="text-[#EF5222] text-[10px] font-extrabold tracking-widest uppercase mt-1">{t('ticketSubtitle')}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                        {t('ticketCode', { code: ticketInfo.orderCode })}
                      </div>
                      {ticketInfo.bookingStatus === 'CANCELLED' ? (
                        <span className="bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase border dark:border-red-900/20">{t('statusCancelled')}</span>
                      ) : (ticketInfo.bookingStatus === 'COMPLETED' || ticketInfo.bookingStatus === 'ARCHIVED') ? (
                        <span className="bg-slate-100 dark:bg-slate-850/50 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase border dark:border-slate-800">{t('statusCompleted')}</span>
                      ) : (
                        <span className="bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase border dark:border-green-900/20">{t('statusPending')}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                    {/* Cột trái của vé: Lộ trình */}
                    <div className="space-y-4 flex flex-col justify-between">
                      <div className="bg-orange-50/40 dark:bg-orange-950/20 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-orange-200 dark:border-orange-900/30 flex-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></div>
                        
                        {ticketInfo.tripType === 'round' ? (
                           <p className="text-[#EF5222] text-[10px] font-black uppercase mb-2 md:mb-3 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-[#EF5222] animate-pulse"></span> {t('outboundTitleRound')}
                           </p>
                        ) : (
                           <p className="text-[#EF5222] text-[10px] font-black uppercase mb-2 md:mb-3 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-[#EF5222] animate-pulse"></span> {t('outboundTitleOneWay')}
                           </p>
                        )}
                        
                        <div className="flex items-center gap-2 mb-4 font-black text-lg md:text-xl text-[#EF5222] relative z-10">
                          <span>{ticketInfo.outboundFromSnapshot}</span>
                          <div className="flex-grow flex items-center h-px bg-gradient-to-r from-[#EF5222] to-transparent opacity-30 mx-2">
                            <span className="text-[#EF5222] ml-auto">➔</span>
                          </div>
                          <span>{ticketInfo.outboundToSnapshot}</span>
                        </div>

                        <div className="space-y-4 text-sm font-bold relative z-10">
                          <div className="flex justify-between items-center">
                            <span className="text-orange-900/40 dark:text-orange-200/40 uppercase text-[9px]">{t('departTime')}</span>
                            <span className="text-orange-900 dark:text-orange-100">
                              {new Date(ticketInfo.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                              <span className="text-orange-900/20 dark:text-orange-100/20 mx-2">|</span>
                              {new Date(ticketInfo.date).toLocaleDateString(locale)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-orange-900/40 dark:text-orange-200/40 uppercase text-[9px]">{t('arrivalTime')}</span>
                            <span className="text-orange-900 dark:text-orange-100">
                              {ticketInfo.outboundArrivalTimeSnapshot 
                                ? `${new Date(ticketInfo.outboundArrivalTimeSnapshot).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} | ${new Date(ticketInfo.outboundArrivalTimeSnapshot).toLocaleDateString(locale)}`
                                : '--:--'}
                            </span>
                          </div>

                          <div className="flex justify-between border-t border-orange-200/50 dark:border-orange-900/30 pt-4 mt-2">
                            <span className="text-orange-900/40 dark:text-orange-200/40 uppercase text-[9px]">{t('duration')}</span>
                            <span className="text-[#EF5222] bg-white dark:bg-orange-950 px-2 py-0.5 rounded-md">
                              {ticketInfo.outboundDurationMinutesSnapshot 
                                ? `${Math.floor(ticketInfo.outboundDurationMinutesSnapshot / 60)}${t('hours')} ${ticketInfo.outboundDurationMinutesSnapshot % 60}${t('minutes')}` 
                                : '---'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Chiều về (Chỉ hiển thị nếu là vé khứ hồi) */}
                      {ticketInfo.tripType === 'round' && (
                        <div className="bg-orange-50/40 dark:bg-orange-950/20 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-orange-200 dark:border-orange-900/30 flex-1 relative overflow-hidden mt-0">
                          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></div>
                          <p className="text-[#EF5222] text-[10px] font-black uppercase mb-2 md:mb-3 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-[#EF5222] animate-pulse"></span> {t('returnTitle')}
                          </p>
                          <div className="flex items-center gap-2 mb-4 font-black text-lg md:text-xl text-[#EF5222]">
                            <span>{ticketInfo.returnFromSnapshot}</span>
                            <div className="flex-grow flex items-center h-px bg-gradient-to-r from-[#EF5222] to-transparent opacity-30 mx-2">
                              <span className="text-[#EF5222] ml-auto">➔</span>
                            </div>
                            <span>{ticketInfo.returnToSnapshot}</span>
                          </div>

                          <div className="space-y-4 text-sm font-bold">
                            <div className="flex justify-between items-center">
                              <span className="text-orange-900/40 dark:text-orange-200/40 uppercase text-[9px]">{t('departTime')}</span>
                              <span className="text-orange-900 dark:text-orange-100">
                                {ticketInfo.returnDepartDateSnapshot 
                                  ? `${new Date(ticketInfo.returnDepartDateSnapshot).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} | ${new Date(ticketInfo.returnDepartDateSnapshot).toLocaleDateString(locale)}`
                                  : '--:--'}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-orange-900/40 dark:text-orange-200/40 uppercase text-[9px]">{t('arrivalTime')}</span>
                              <span className="text-orange-900 dark:text-orange-100">
                                {ticketInfo.returnArrivalTimeSnapshot 
                                  ? `${new Date(ticketInfo.returnArrivalTimeSnapshot).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} | ${new Date(ticketInfo.returnArrivalTimeSnapshot).toLocaleDateString(locale)}`
                                  : '--:--'}
                              </span>
                            </div>

                            <div className="flex justify-between border-t border-orange-200/50 dark:border-orange-900/30 pt-4 mt-2">
                              <span className="text-orange-900/40 dark:text-orange-200/40 uppercase text-[9px]">{t('duration')}</span>
                              <span className="text-[#EF5222] bg-white dark:bg-orange-950 px-2 py-0.5 rounded-md">
                                {ticketInfo.returnDurationMinutesSnapshot 
                                  ? `${Math.floor(ticketInfo.returnDurationMinutesSnapshot / 60)}${t('hours')} ${ticketInfo.returnDurationMinutesSnapshot % 60}${t('minutes')}` 
                                  : '---'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cột phải của vé: Khách hàng & Thanh toán */}
                    <div className="flex flex-col gap-4">
                      <div className="bg-orange-50/30 dark:bg-orange-950/5 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-orange-100 dark:border-orange-900/10 flex-grow">
                        <div className="mb-4">
                          <p className="text-[9px] text-gray-400 dark:text-slate-500 font-black uppercase mb-1">{t('passenger')}</p>
                          <p className="font-black text-gray-800 dark:text-slate-100 text-base md:text-lg uppercase leading-none">{ticketInfo.customerName}</p>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-[9px] text-gray-400 dark:text-slate-500 font-black uppercase mb-1">{t('phoneLabel')}</p>
                          <p className="font-black text-gray-700 dark:text-slate-200 text-sm">{formatPhone(ticketInfo.customerPhone)}</p>
                        </div>

                        <div>
                          <p className="text-[9px] text-gray-400 dark:text-slate-500 font-black uppercase mb-2">{t('seatsLabel')}</p>
                          <div className="flex flex-col gap-2.5">
                            <div className="flex gap-2 flex-wrap">
                              {ticketInfo.seats?.filter((s: any) => s.tripDirection === 'outbound').map((s: any) => (
                                <span key={s.id} className="bg-white dark:bg-slate-900 border-2 border-[#EF5222] text-[#EF5222] px-3.5 py-1 rounded-xl font-black text-xs shadow-sm flex items-center gap-1.5">
                                  {ticketInfo.tripType === 'round' && <span className="text-[9px] uppercase opacity-70 bg-orange-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{t('outboundLabel')}</span>}
                                  {s.seatNumber}
                                </span>
                              ))}
                            </div>
                            
                            {ticketInfo.tripType === 'round' && (
                              <div className="flex gap-2 flex-wrap border-t border-orange-200/40 dark:border-slate-800 pt-2">
                                {ticketInfo.seats?.filter((s: any) => s.tripDirection === 'return').map((s: any) => (
                                  <span key={s.id} className="bg-gradient-to-r from-[#EF5222] to-orange-500 text-white px-3.5 py-1.5 rounded-xl font-black text-xs shadow-sm flex items-center gap-1.5">
                                    <span className="text-[9px] uppercase opacity-90 bg-white/20 px-1.5 py-0.5 rounded-md">{t('returnLabel')}</span>
                                    {s.seatNumber}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tổng tiền & Trạng thái thanh toán */}
                      <div className="bg-[#1a1a1a] dark:bg-slate-950 dark:border dark:border-slate-800 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl flex justify-between items-center text-white transition-all">
                        <div>
                          <p className="text-[9px] text-gray-400 dark:text-slate-500 font-black uppercase mb-1">{t('totalAmount')}</p>
                          <p className="text-2xl font-black text-[#EF5222] leading-none">
                            {Number(ticketInfo.amount).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                        <div className={`text-[10px] font-black px-4 py-1.5 rounded-xl uppercase ${ticketInfo.paymentStatus === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {ticketInfo.paymentStatus === 'PAID' ? t('paidStatus') : t('unpaidStatus')}
                        </div>
                      </div>

                      {/* Nút hủy vé (Chỉ hiện nếu trạng thái cho phép) */}
                      {ticketInfo.bookingStatus !== 'CANCELLED' && ticketInfo.bookingStatus !== 'COMPLETED' && ticketInfo.bookingStatus !== 'ARCHIVED' && (
                        <div className="mt-2 text-center">
                          {refundPolicy.canCancel ? (
                            <button 
                              onClick={() => setIsCancelModalOpen(true)}
                              className="text-red-500 font-bold text-sm underline hover:text-red-700 transition-colors"
                            >
                              {t('cancelTicketLink')}
                            </button>
                          ) : (
                            <p className="text-gray-400 text-[10px] font-bold px-4">
                              {t('cannotCancelWarning')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================================
            MODAL XÁC NHẬN HỦY VÉ (OVERLAY)
            ============================================================ */}
          <AnimatePresence>
            {isCancelModalOpen && ticketInfo && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                  className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 max-w-lg w-full border border-gray-100 dark:border-slate-800 relative overflow-hidden transition-colors duration-500"
                >
                  {/* Thanh trang trí phía trên */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>

                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight text-center">{t('cancelModalTitle')}</h3>
                  
                  {/* KHỐI CHÍNH SÁCH HOÀN TIỀN */}
                  <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/20 rounded-3xl p-6 mb-6 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase">{t('refundPercent')}</span>
                      <span className="text-xl font-black text-red-600">{refundPolicy.refundPercent}%</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-red-200/30 dark:border-red-950/30 pt-3">
                      <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase">{t('refundAmount')}</span>
                      <span className="text-2xl font-black text-red-600">
                        {((ticketInfo.amount * refundPolicy.refundPercent) / 100).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* ĐIỀU KHOẢN HỦY VÉ */}
                  <div className="mb-6">
                    <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase mb-3 ml-1 tracking-widest">
                      {t('termsTitle')}
                    </label>
                    <div className="bg-gray-50 dark:bg-slate-950/50 rounded-2xl p-4 text-[12px] text-gray-600 dark:text-slate-400 leading-relaxed border border-gray-100 dark:border-slate-800 max-h-32 overflow-y-auto mb-4 custom-scrollbar">
                      <ul className="space-y-2 list-disc pl-4 font-medium">
                        <li>{t('term1')}</li>
                        <li>{t('term2')}</li>
                        <li>{t('term3')}</li>
                        <li>{t('term4')}</li>
                        <li>{t('term5')}</li>
                        <li>{t('term6')}</li>
                        <li>{t('term7')}</li>
                      </ul>
                    </div>

                    {/* CHECKBOX ĐỒNG Ý */}
                    <label className="flex items-center gap-3 cursor-pointer group px-2">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="peer appearance-none w-6 h-6 border-2 border-gray-300 dark:border-slate-700 rounded-lg checked:bg-red-500 checked:border-red-500 transition-all duration-300"
                          checked={isAgreed}
                          onChange={(e) => setIsAgreed(e.target.checked)}
                        />
                        <svg className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-slate-300 group-hover:text-red-600 transition-colors">
                        {t('agreeTermsCheckbox')}
                      </span>
                    </label>
                  </div>

                  {/* XÁC MINH THÔNG TIN BẢO MẬT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mb-2 ml-1">
                        {t('emailLabel')} {isLoggedIn ? t('emailMatchNote') : t('emailTicketNote')}
                      </label>
                      <input
                        type="email"
                        className={`w-full bg-gray-50 dark:bg-slate-950/80 border ${
                          isLoggedIn && confirmEmail && confirmEmail !== session.user?.email 
                          ? 'border-red-500' 
                          : 'border-gray-200 dark:border-slate-800'
                        } rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-500/20 font-bold text-gray-700 dark:text-slate-200 transition-all`}
                        placeholder={isLoggedIn ? session.user?.email || "" : "nhanvien@gmail.com"}
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                      />
                      {isLoggedIn && confirmEmail && confirmEmail !== session.user?.email && (
                        <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold italic">*{t('emailMismatch')}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mb-2 ml-1">{t('confirmPhoneLabel')}</label>
                      <input
                        type="tel"
                        className="w-full bg-gray-50 dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-500/20 font-bold text-gray-700 dark:text-slate-200 transition-all"
                        placeholder={t('confirmPhonePlaceholder')}
                        value={confirmPhone}
                        onChange={(e) => setConfirmPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* NÚT BẤM ĐIỀU KHIỂN */}
                  <div className="flex gap-4">
                    <button 
                      onClick={() => { setIsCancelModalOpen(false); setConfirmEmail(''); setIsAgreed(false); }}
                      disabled={cancelLoading}
                      className="flex-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 font-black py-4 rounded-2xl transition-all uppercase text-xs tracking-widest"
                    >
                      {t('backBtn')}
                    </button>
                    <button 
                      onClick={handleCancelTicket}
                      disabled={cancelLoading || !confirmEmail.trim() || !isAgreed}
                      className={`flex-[1.5] font-black py-4 rounded-2xl transition-all shadow-lg uppercase text-xs tracking-widest flex justify-center items-center gap-2
                        ${isAgreed && confirmEmail.trim() 
                          ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200 dark:shadow-red-950/20 cursor-pointer' 
                          : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed shadow-none'}`}
                    >
                      {cancelLoading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          {t('confirmCancelBtn')}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}