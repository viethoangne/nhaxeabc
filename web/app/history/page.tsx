'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Filter, 
  Ticket, 
  User, 
  Phone, 
  MapPin, 
  Bus, 
  Trash2, 
  Compass, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles,
  CircleDot,
  CheckCircle2,
  Activity,
  Clock
} from 'lucide-react';

interface BookingRecord {
  id: string;
  orderCode: string;
  tripType: string;
  amount: number | string;
  customerName: string;
  customerPhone: string;
  from: string;
  to: string;
  createdAt: string;
  date?: string;
  time?: string;
  returnDate?: string;
  returnTime?: string;
  outboundDepartDateSnapshot?: string;
  outboundArrivalTimeSnapshot?: string;
  outboundDurationMinutesSnapshot?: number;
  outboundBusTypeSnapshot?: string;
  returnDepartDateSnapshot?: string;
  returnArrivalTimeSnapshot?: string;
  returnDurationMinutesSnapshot?: number;
  returnBusTypeSnapshot?: string;
  outboundTrip?: any;
  returnTrip?: any;
  seats?: { seatNumber: string; tripDirection: string }[];
  bookingStatus: 'PENDING' | 'SUCCESS' | 'CANCELLED' | 'string';
}

export default function HistoryPage() {
  const t = useTranslations('historyPage');
  const router = useRouter();
  const { data: session, status } = useSession();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'oneway' | 'round'>('all');

  // 🟢 TOAST NOTIFICATION STATE
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all';

  const formatPhone = (p?: string) => {
    if (!p) return t('notUpdated');
    return p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const formatPrice = (p: number) => {
    return p.toLocaleString('vi-VN') + 'đ';
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      axios.get(`${baseUrl}/payment/history/${session.user.id}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      .then(res => {
        const historyData = res.data?.data || res.data;
        const sortedData = (Array.isArray(historyData) ? historyData : []).sort((a: BookingRecord, b: BookingRecord) => {
           const dateA = new Date(a.createdAt || 0).getTime();
           const dateB = new Date(b.createdAt || 0).getTime();
           return dateB - dateA;
        });
        setBookings(sortedData);
      })
      .catch(err => {
        console.error("Lỗi tải lịch sử:", err);
        setBookings([]);
      })
      .finally(() => setLoading(false));
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [session, status]);

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm(t('deleteConfirm'))) {
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      await axios.delete(`${baseUrl}/history/${bookingId}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      
      setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId));
      showToast(t('deleteSuccess'), "success");
    } catch (error) {
      console.error("Lỗi khi xóa vé:", error);
      showToast(t('deleteError'), "error");
    }
  };

  const filtered = bookings.filter((b) => {
    // 1. Kiểm tra bộ lọc Loại vé (typeFilter)
    if (typeFilter !== 'all') {
      const isRound = b.tripType === 'round';
      if (typeFilter === 'oneway' && isRound) return false;
      if (typeFilter === 'round' && !isRound) return false;
    }

    // 2. Kiểm tra bộ lọc Trạng thái (statusFilter)
    const currentStatus = b.bookingStatus?.toUpperCase();
    if (statusFilter === 'all') return true;

    if (statusFilter === 'cancelled') {
      return currentStatus === 'CANCELLED';
    }

    if (currentStatus === 'CANCELLED') return false;

    const departAt = b.outboundDepartDateSnapshot || b.outboundTrip?.departDate || b.date;
    const durationMin = b.outboundDurationMinutesSnapshot || b.outboundTrip?.durationMinutes || 240;
    
    let arrivalAt = b.outboundArrivalTimeSnapshot || b.outboundTrip?.arrivalDate;
    if (!arrivalAt && departAt) {
      const arr = new Date(departAt);
      arr.setMinutes(arr.getMinutes() + durationMin);
      arrivalAt = arr;
    }

    if (!departAt) return false;
  
    const now = Date.now();
    const isUpcoming = new Date(departAt).getTime() > now;
    const isOngoing = !isUpcoming && arrivalAt && new Date(arrivalAt).getTime() > now;
    const isCompleted = !isUpcoming && !isOngoing;

    if (statusFilter === 'upcoming') return isUpcoming;
    if (statusFilter === 'ongoing') return isOngoing;
    if (statusFilter === 'completed') return isCompleted;

    return true;
  });

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden text-[#333333] transition-colors duration-500">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 text-center max-w-md w-full relative z-10"
        >
          <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/20 text-orange-500 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <User size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('notLoggedInTitle')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">{t('notLoggedInDesc')}</p>
          <Link 
            href="/login" 
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-semibold text-sm transition block shadow-md"
          >
            {t('loginBtn')}
          </Link>
        </motion.div>
      </div>
    );
  }

  // --- PREMIUM SIDEBAR TAB BUTTON (MATCHING SEARCH PAGE STYLING) ---
  const FilterTab = ({ label, desc, checked, onChange, icon: Icon }: { label: string, desc: string, checked: boolean, onChange: () => void, icon?: any }) => (
    <button
      onClick={onChange}
      className={`w-full group relative flex items-center justify-between overflow-hidden rounded-2xl border p-3.5 transition-all duration-300 ${
        checked 
        ? 'border-[#ea580c] bg-orange-50/50 dark:bg-[#ea580c]/10 ring-1 ring-[#ea580c]' 
        : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 hover:border-orange-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors shrink-0 ${checked ? 'bg-[#ea580c] text-white' : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 shadow-sm border border-slate-100 dark:border-slate-800'}`}>
          {Icon && <Icon size={18} />}
        </div>
        <div className="text-left">
          <p className={`text-sm font-bold ${checked ? 'text-orange-900 dark:text-orange-200' : 'text-slate-700 dark:text-slate-300'}`}>{label}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{desc}</p>
        </div>
      </div>
      <div className={`h-2 w-2 rounded-full transition-all duration-500 ${checked ? 'bg-[#ea580c] scale-125' : 'bg-slate-200 dark:bg-slate-700 opacity-0'}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans pb-28 antialiased relative overflow-hidden text-[#333333] dark:text-slate-300 transition-colors duration-500">
      
      {/* 🟢 FLOATING TOAST BANNER */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-md border ${
              toast.type === 'success' ? 'bg-emerald-500/95 border-emerald-400 text-white' :
              toast.type === 'error' ? 'bg-rose-500/95 border-rose-400 text-white' :
              'bg-amber-500/95 border-amber-400 text-white'
            }`}
          >
            <div className="p-1 rounded-lg bg-white/20">
              {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <Activity className="w-6 h-6 animate-pulse" />}
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-white/80">
                {toast.type === 'success' ? t('toastSuccess') : toast.type === 'error' ? t('toastWarning') : t('toastInfo')}
              </p>
              <p className="text-sm font-bold text-white">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Background Mesh Blowouts */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-400/5 to-rose-400/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-400/5 to-indigo-400/5 blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 pt-10 relative z-10">
        
        {/* BREADCRUMB */}
        <div className="flex items-center mb-8">
          <button 
            onClick={() => router.back()} 
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md text-slate-600 dark:text-slate-400 transition-all duration-200 mr-4 shadow-sm border border-slate-200/80 dark:border-slate-800"
          >
            <ChevronLeft size={20} className="stroke-[2.5px]" />
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-orange-500 transition-colors flex items-center gap-1.5">
              <Home size={14} /> {t('home')}
            </Link>
            <ChevronRight size={12} className="text-slate-300 dark:text-slate-700 stroke-[3px]" />
            <span className="text-orange-600 font-bold">{t('title')}</span>
          </div>
        </div>

        {/* HEADER */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-1.5 rounded-full w-fit shadow-sm">
            <Sparkles size={15} />
            <span className="text-[11px] font-bold tracking-wide uppercase">{t('honorMember')}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-relaxed max-w-xl">{t('subtitle')}</p>
        </div>

        {/* THE 2-COLUMN MODEL */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* LEFT STICKY SIDEBAR COLUMN: BỘ LỌC */}
          <div className="w-full lg:w-[300px] shrink-0 lg:sticky lg:top-24 z-10">
            <div className="w-full rounded-[32px] border border-white/40 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(234,88,12,0.08)]">
              
              {/* Header */}
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ea580c] text-white shadow-lg shadow-orange-200 dark:shadow-none shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">{t('searchFilter')}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('historyOptions')}</p>
                  </div>
                </div>

                <AnimatePresence>
                  {hasActiveFilters && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#ea580c] transition-all hover:bg-orange-50 dark:hover:bg-orange-950/20 active:scale-95"
                    >
                      {t('clearFilter')}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-8">
                {/* Section: Trạng thái vé */}
                <section>
                  <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Clock size={18} className="text-[#ea580c]" />
                    <h4 className="font-bold text-sm uppercase tracking-widest">{t('ticketStatus')}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <FilterTab desc={t('statusAllDesc')} label={t('statusAll')} checked={statusFilter === 'all'} onChange={() => setStatusFilter('all')} icon={CircleDot} />
                    <FilterTab desc={t('statusUpcomingDesc')} label={t('statusUpcoming')} checked={statusFilter === 'upcoming'} onChange={() => setStatusFilter('upcoming')} icon={Compass} />
                    <FilterTab desc={t('statusOngoingDesc')} label={t('statusOngoing')} checked={statusFilter === 'ongoing'} onChange={() => setStatusFilter('ongoing')} icon={Bus} />
                    <FilterTab desc={t('statusCompletedDesc')} label={t('statusCompleted')} checked={statusFilter === 'completed'} onChange={() => setStatusFilter('completed')} icon={ShieldCheck} />
                    <FilterTab desc={t('statusCancelledDesc')} label={t('statusCancelled')} checked={statusFilter === 'cancelled'} onChange={() => setStatusFilter('cancelled')} icon={AlertCircle} />
                  </div>
                </section>

                {/* Section: Loại vé */}
                <section>
                  <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <Bus size={18} className="text-[#ea580c]" />
                    <h4 className="font-bold text-sm uppercase tracking-widest">{t('ticketType')}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <FilterTab desc={t('typeAllDesc')} label={t('typeAll')} checked={typeFilter === 'all'} onChange={() => setTypeFilter('all')} icon={CircleDot} />
                    <FilterTab desc={t('typeOnewayDesc')} label={t('typeOneway')} checked={typeFilter === 'oneway'} onChange={() => setTypeFilter('oneway')} icon={Bus} />
                    <FilterTab desc={t('typeRoundDesc')} label={t('typeRound')} checked={typeFilter === 'round'} onChange={() => setTypeFilter('round')} icon={Ticket} />
                  </div>
                </section>
              </div>

              <div className="mt-8 rounded-2xl bg-orange-50 dark:bg-orange-950/20 p-3 text-center">
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ea580c] dark:text-orange-400">{t('smartSystem')}</p>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: DANH SÁCH VÉ SANG TRỌNG */}
          <div className="flex-1 w-full space-y-6">
            {loading ? (
              <div className="space-y-6">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white dark:bg-slate-900 rounded-[28px] h-56 animate-pulse border border-slate-200/80 dark:border-slate-850 shadow-sm"></div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/80 dark:border-slate-800 shadow-sm p-12 text-center flex flex-col items-center max-w-xl mx-auto"
              >
                <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/20 text-orange-500 dark:text-orange-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Ticket size={32} />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">{t('noTrips')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-normal">{t('noTripsDesc')}</p>
                <button 
                  onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
                  className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full text-xs uppercase tracking-wider transition shadow-sm"
                >
                  {t('viewAllHistory')}
                </button>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {filtered.map((item, index) => {
                    const isRoundTrip = item.tripType === 'round';
                    const outboundSeats = item.seats?.filter(s => s.tripDirection === 'outbound') || [];
                    const returnSeats = item.seats?.filter(s => s.tripDirection === 'return') || [];

                    // Helpers for Date / Time Formatting
                    const safeFormatTime = (timeStr?: string) => {
                      if (!timeStr) return '--:--';
                      if (/^\d{1,2}:\d{2}/.test(timeStr)) {
                        return timeStr.substring(0, 5); 
                      }
                      try {
                        const dateObj = new Date(timeStr);
                        if (isNaN(dateObj.getTime())) return timeStr; 
                        return dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                      } catch {
                        return '--:--';
                      }
                    };

                    const safeFormatDate = (dateStr?: string) => {
                      if (!dateStr) return '--/--';
                      try {
                        const dateObj = new Date(dateStr);
                        if (isNaN(dateObj.getTime())) return dateStr;
                        return dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      } catch {
                        return '--/--';
                      }
                    };

                    // Outbound data
                    const departAt = item.outboundDepartDateSnapshot || item.outboundTrip?.departDate || item.date;
                    const exactDepartTime = item.outboundTrip?.departTime || item.outboundTrip?.time || item.time;
                    const displayOutboundTime = exactDepartTime ? safeFormatTime(exactDepartTime) : safeFormatTime(departAt);

                    const arrivalAt = item.outboundArrivalTimeSnapshot || item.outboundTrip?.arrivalDate;
                    const exactArrivalTime = item.outboundTrip?.arrivalTime;
                    const displayOutArrival = exactArrivalTime ? safeFormatTime(exactArrivalTime) : safeFormatTime(arrivalAt);

                    const durationOut = item.outboundDurationMinutesSnapshot || item.outboundTrip?.durationMinutes || item.outboundTrip?.duration;
                    const busTypeOut = item.outboundBusTypeSnapshot || item.outboundTrip?.busType || 'Limousine';

                    // Return data
                    const returnDepartAt = item.returnDepartDateSnapshot || item.returnTrip?.departDate || item.returnDate;
                    const exactReturnTime = item.returnTrip?.departTime || item.returnTrip?.time || item.returnTime;
                    const displayReturnTime = exactReturnTime ? safeFormatTime(exactReturnTime) : safeFormatTime(returnDepartAt);

                    const returnArrivalAt = item.returnArrivalTimeSnapshot || item.returnTrip?.arrivalDate;
                    const exactReturnArrivalTime = item.returnTrip?.arrivalTime || item.returnTrip?.expectedArrivalTime;
                    const displayReturnArrival = exactReturnArrivalTime ? safeFormatTime(exactReturnArrivalTime) : safeFormatTime(returnArrivalAt);

                    const durationReturn = item.returnDurationMinutesSnapshot || item.returnTrip?.durationMinutes || item.returnTrip?.duration;
                    const busTypeReturn = item.returnBusTypeSnapshot || item.returnTrip?.busType || 'Limousine';

                    const isCancelled = item.bookingStatus === 'CANCELLED';
                    
                    const durationMinOut = item.outboundDurationMinutesSnapshot || item.outboundTrip?.durationMinutes || 240;
                    let arrivalOut = arrivalAt;
                    if (!arrivalOut && departAt) {
                      const arr = new Date(departAt);
                      arr.setMinutes(arr.getMinutes() + durationMinOut);
                      arrivalOut = arr;
                    }
                    
                    const now = Date.now();
                    const isUpcoming = departAt ? (new Date(departAt).getTime() > now && !isCancelled) : false;
                    const isOngoing = !isCancelled && !isUpcoming && arrivalOut && (new Date(arrivalOut).getTime() > now);

                    const TimelineRoute = ({ 
                      title, from, to, deptTimeDisplay, arrTimeDisplay, deptDate, arrDate, duration, busType 
                    }: { 
                      title: string; from: string; to: string; deptTimeDisplay: string; arrTimeDisplay: string; deptDate?: string; arrDate?: string; duration?: number; busType: string 
                    }) => (
                      <div className="mb-4 last:mb-0 group/timeline">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 px-2.5 py-0.5 rounded-lg shadow-sm">
                             <Bus size={12} className="stroke-[2.5px]" /> {title}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-850">
                            {busType}
                          </span>
                        </div>
                        
                        <div className="flex gap-4 sm:gap-5 items-center">
                          <div className="flex flex-col items-end justify-between w-[90px] sm:w-[100px] shrink-0 py-0.5">
                            <span className="text-2xl sm:text-[32px] font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">{deptTimeDisplay}</span>
                            <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 px-2 py-0.5 rounded-lg my-2 shadow-sm leading-none">
                              {duration ? `${Math.floor(duration / 60)}${t('h')}${duration % 60}${t('m')}` : '---'}
                            </span>
                            <span className="text-2xl sm:text-[32px] font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">{arrTimeDisplay}</span>
                          </div>

                          {/* LINE ART INDICATOR */}
                          <div className="flex flex-col items-center py-1.5 self-stretch relative">
                            <div className="w-3.5 h-3.5 rounded-full border-[3px] bg-white dark:bg-slate-900 z-10 border-orange-500 shadow-sm"></div>
                            <div className="w-[2px] flex-grow bg-slate-300 dark:bg-slate-800 my-1 opacity-80 border-dashed border-l-2 border-spacing-2"></div>
                            <div className="w-3.5 h-3.5 rounded-full border-[3px] bg-white dark:bg-slate-900 z-10 border-slate-400 shadow-sm"></div>
                          </div>

                          {/* DESTINATIONS DETAILS */}
                          <div className="flex flex-col justify-between py-0.5 flex-grow space-y-4 overflow-hidden">
                            <div className="group-hover/timeline:translate-x-1 transition-transform duration-300">
                              <span className="text-xs font-medium text-slate-400 block mb-0.5 truncate">{t('departure')}</span>
                              <h5 className="font-semibold text-slate-800 dark:text-white text-lg sm:text-[20px] leading-tight truncate">{from}</h5>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">{safeFormatDate(deptDate)}</p>
                            </div>
                            
                            <div className="group-hover/timeline:translate-x-1 transition-transform duration-300">
                              <span className="text-xs font-medium text-slate-400 block mb-0.5 truncate">{t('destination')}</span>
                              <h5 className="font-semibold text-slate-800 dark:text-white text-lg sm:text-[20px] leading-tight flex items-center gap-1.5 truncate">
                                <MapPin size={16} className="text-orange-500 shrink-0" />
                                <span className="truncate">{to}</span>
                              </h5>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">{safeFormatDate(arrDate)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                    return (
                      <motion.div 
                        key={item.id || index}
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="relative bg-white dark:bg-slate-900 rounded-[28px] shadow-[0_10px_35px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(239,82,34,0.06)] border border-slate-200 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900/40 transition-all duration-300 group overflow-hidden"
                      >
                        {/* Ticket cut-out aesthetic line overlay */}
                        <div className="absolute right-0 md:right-[260px] top-0 bottom-0 pointer-events-none hidden md:flex flex-col justify-between py-6 z-10">
                          <div className="w-6 h-6 rounded-full bg-[#F8FAFC] dark:bg-[#020617] border border-slate-200/80 dark:border-slate-800 -mr-3 shadow-inner"></div>
                          <div className="h-full border-l-2 border-dashed border-slate-200 dark:border-slate-800 my-3 opacity-70"></div>
                          <div className="w-6 h-6 rounded-full bg-[#F8FAFC] dark:bg-[#020617] border border-slate-200/80 dark:border-slate-800 -mr-3 shadow-inner"></div>
                        </div>

                        {/* Header Segment */}
                        <div className="p-4 md:px-6 md:py-4 flex flex-wrap justify-between items-center gap-4 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-white dark:to-slate-900">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* Animated Status Tag */}
                            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl uppercase tracking-wide transition-colors shadow-sm ${
                              isCancelled 
                                ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                                : isUpcoming 
                                  ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30' 
                                  : isOngoing
                                    ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                                    : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                            }`}>
                              {(isUpcoming || isOngoing) && (
                                <span className="relative flex h-2 w-2">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOngoing ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isOngoing ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                                </span>
                              )}
                              {isCancelled ? t('cancelled') : isUpcoming ? t('upcoming') : isOngoing ? t('ongoing') : t('completed')}
                            </div>

                            <span className="text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 shadow-sm">
                              {isRoundTrip ? t('roundTrip') : t('oneWay')} 
                            </span>
                            
                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-850 flex items-center gap-1.5 font-medium shadow-sm">
                              <Ticket size={14} className="text-orange-500 shrink-0" />
                              <span>{t('orderCode')}</span>
                              <strong className="text-slate-900 dark:text-white font-bold">{item.orderCode}</strong>
                            </span>
                          </div>                   

                          {/* Top Right Pricing & Actions */}
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 leading-none">{t('totalPayment')}</p>
                              <p className="text-xl font-bold text-orange-600 mt-1 leading-none">
                                {formatPrice(Number(item.amount || 0))}
                              </p>
                            </div>
                            
                            <button
                              onClick={() => handleDeleteBooking(item.id)}
                              className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-white hover:bg-rose-500 dark:hover:bg-rose-600 rounded-xl transition-all duration-300 border border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-600 shadow-sm"
                              title={t('deleteTitle')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Content Segment */}
                        <div className="p-5 md:px-6 md:py-5 flex flex-col md:flex-row gap-6 items-stretch">
                          
                          {/* Outbound & Return Timelines */}
                          <div className="flex-1 pb-5 md:pb-0 md:pr-6">
                            <TimelineRoute 
                              title={t('outboundTrip')} from={item.from} to={item.to} 
                              deptTimeDisplay={displayOutboundTime} arrTimeDisplay={displayOutArrival}
                              deptDate={departAt} arrDate={arrivalAt}
                              duration={durationOut} busType={busTypeOut}
                            />
                            {isRoundTrip && (
                              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 border-dashed">
                                <TimelineRoute 
                                  title={t('returnTrip')} from={item.to} to={item.from} 
                                  deptTimeDisplay={displayReturnTime} arrTimeDisplay={displayReturnArrival}
                                  deptDate={returnDepartAt} arrDate={returnArrivalAt}
                                  duration={durationReturn} busType={busTypeReturn}
                                />
                              </div>
                            )}
                          </div>

                          {/* Seats Details & Passenger Side Panel (Right Part) */}
                          <div className="w-full md:w-[240px] flex flex-col justify-between shrink-0 border-t md:border-t-0 md:border-l border-slate-200/80 dark:border-slate-800 pt-5 md:pt-0 md:pl-6">
                            
                            <div className="space-y-3">
                              {/* Inner card with seats */}
                              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-4 group-hover:bg-orange-50/40 dark:group-hover:bg-orange-950/10 transition-all duration-300 shadow-sm">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2"><Compass size={14} className="text-orange-500" /> {isRoundTrip ? t('seatsOutbound') : t('seatsNumber')}</span>
                                  <span className="text-orange-600 dark:text-orange-400 font-bold text-base">{outboundSeats.length > 0 ? outboundSeats.map(s => s.seatNumber).join(', ') : '--'}</span>
                                </div>
                                {isRoundTrip && (
                                  <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2"><Compass size={14} className="text-orange-500" /> {t('seatsReturn')}</span>
                                    <span className="text-orange-600 dark:text-orange-400 font-bold text-base">{returnSeats.length > 0 ? returnSeats.map(s => s.seatNumber).join(', ') : '--'}</span>
                                  </div>
                                )}
                              </div>

                              {/* Customer metadata summary */}
                              <div className="space-y-2.5 bg-slate-50/80 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                  <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <User size={13} />
                                  </div>
                                  <span className="truncate">{item.customerName || t('notUpdated')}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                  <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center text-orange-500 shrink-0">
                                    <Phone size={13} />
                                  </div>
                                  <span>{formatPhone(item.customerPhone)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Details Invoice Action button */}
                            <Link 
                              href={`/verify/${item.orderCode}`} 
                              className="w-full mt-4 py-3 bg-orange-500 hover:bg-orange-600 text-white transition-all duration-300 font-semibold text-xs uppercase tracking-wider text-center rounded-xl block shadow-sm hover:shadow-md"
                            >
                              {t('viewTicket')}
                            </Link>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}