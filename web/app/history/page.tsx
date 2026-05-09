'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const Icons = {
  ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Filter: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  RefreshCcw: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>,
  Ticket: () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Phone: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  Bus: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>,
  Seat: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 16V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12"/><path d="M3 16h18"/><path d="M7 16v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
};

// Đã bổ sung thêm các trường time dự phòng vào interface
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
  bookingStatus: 'PENDING' | 'SUCCESS' | 'CANCELLED' | 'string'; // Thêm dòng này vào
}

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'CANCELLED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'oneway' | 'round'>('all');

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all';

  const formatPhone = (p?: string) => {
    if (!p) return 'Chưa cập nhật';
    return p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
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
        console.error("Lỗi:", err);
        setBookings([]);
      })
      .finally(() => setLoading(false));
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
    
  }, [session, status]);

  // HÀM XÓA VÉ - ĐÃ FIX THEO CẤU TRÚC payment.controller.ts
  // HÀM XÓA VÉ
  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa vé này khỏi lịch sử? Hành động này không thể hoàn tác.")) {
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      // LOGIC FIX: Đổi từ /payment/${bookingId} thành /history/${bookingId} cho khớp với Controller
      await axios.delete(`${baseUrl}/history/${bookingId}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      
      setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId));
      alert("Đã xóa vé thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa vé:", error);
      alert("Không thể xóa vé lúc này. Vui lòng thử lại sau.");
    }
  };

  const filtered = bookings.filter((b) => {
    const currentStatus = b.bookingStatus?.toUpperCase();
  
    // 1. Lọc theo trạng thái
    if (statusFilter === 'cancelled') {
      return currentStatus === 'CANCELLED';
    }
  
    // 2. Lọc tất cả (phải xét thêm loại vé nếu có)
    if (statusFilter === 'all') {
      if (typeFilter !== 'all') {
        const isRound = b.tripType === 'round';
        if (typeFilter === 'oneway' && isRound) return false;
        if (typeFilter === 'round' && !isRound) return false;
      }
      return true; 
    }
    // 3. Logic cho upcoming / completed
    const departAt = b.outboundDepartDateSnapshot || b.outboundTrip?.departDate || b.date;
    if (!departAt || currentStatus === 'CANCELLED') return false;
  
    const isUpcoming = new Date(departAt).getTime() > Date.now();
    if (statusFilter === 'upcoming') return isUpcoming;
    if (statusFilter === 'completed') return !isUpcoming;
    // Nếu chọn 'all' (Tất cả), hiện mọi thứ bao gồm cả vé đã hủy
    if (statusFilter === 'all') {
      // Lọc theo loại vé nếu có
      if (typeFilter !== 'all') {
        const isRound = b.tripType === 'round';
        if (typeFilter === 'oneway' && isRound) return false;
        if (typeFilter === 'round' && !isRound) return false;
      }
      return true; 
    }
    return true;
  });
  // Sau đó ở phần hiển thị, anh dùng filteredOrders.map thay vì orders.map

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-[#FFF0EB] text-[#EF5222] rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.User />
          </div>
          <h2 className="text-[20px] font-bold text-slate-800 mb-2">Chưa đăng nhập</h2>
          <p className="text-[14px] text-slate-500 mb-6">Vui lòng đăng nhập để xem lịch sử vé của bạn.</p>
        </div>
      </div>
    );
  }

  const FilterRadio = ({ name, label, value, checked, onChange }: { name: string, label: string, value: string, checked: boolean, onChange: () => void }) => (
    <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 group ${checked ? 'bg-[#FFF0EB] shadow-sm' : 'hover:bg-slate-50'}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="absolute opacity-0 w-0 h-0" />
      <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
        checked ? 'border-[#EF5222] bg-white' : 'border-slate-300 group-hover:border-[#EF5222]'
      }`}>
        <div className={`w-[10px] h-[10px] bg-[#EF5222] rounded-full transition-transform duration-300 ease-out ${checked ? 'scale-100' : 'scale-0'}`}></div>
      </div>
      <span className={`text-[14px] transition-all duration-300 ${checked ? 'text-[#EF5222] font-black' : 'text-slate-600 group-hover:text-slate-800 font-medium'}`}>{label}</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans pb-24 antialiased">
      <div className="max-w-[1120px] mx-auto px-4 pt-8">
        
        {/* BREADCRUMB */}
        <div className="flex items-center mb-6">
          <button 
            onClick={() => router.back()} 
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-slate-50 hover:shadow-md text-slate-600 transition-all duration-200 mr-4 shadow-sm border border-slate-200"
          >
            <Icons.ChevronLeft />
          </button>
          <div className="flex items-center gap-2.5 text-[14px] text-slate-500 font-medium">
            <Link href="/" className="hover:text-[#EF5222] transition-colors flex items-center gap-1.5">
              <Icons.Home /> Trang chủ
            </Link>
            <Icons.ChevronRight />
            <span className="text-slate-800 font-bold">Lịch sử mua vé</span>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-slate-800 tracking-tight">Lịch sử chuyến đi của bạn</h1>
          <p className="text-[14px] text-slate-500 mt-1">Quản lý, theo dõi trạng thái và tra cứu lại thông tin các vé xe đã đặt.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* CỘT TRÁI: BỘ LỌC */}
          <div className="w-full lg:w-[280px] shrink-0 lg:sticky lg:top-24 z-10">
            <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 overflow-hidden">
              
              <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#EF5222]">
                    <Icons.Filter />
                  </div>
                  <h2 className="text-[15px] font-black text-slate-800 uppercase tracking-widest">Bộ lọc</h2>
                </div>

                <AnimatePresence>
                  {hasActiveFilters && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                      whileHover={{ rotate: 180 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FFF0EB] text-[#EF5222] hover:bg-[#EF5222] hover:text-white hover:shadow-md transition-colors"
                      title="Xóa bộ lọc"
                    >
                      <Icons.RefreshCcw />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-4 border-b border-slate-100">
                <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Trạng thái</h3>
                <div className="space-y-1">
                  <FilterRadio name="status" value="all" label="Tất cả trạng thái" checked={statusFilter === 'all'} onChange={() => setStatusFilter('all')} />
                  <FilterRadio name="status" value="upcoming" label="Vé sắp đi" checked={statusFilter === 'upcoming'} onChange={() => setStatusFilter('upcoming')} />
                  <FilterRadio name="status" value="completed" label="Vé đã hoàn thành" checked={statusFilter === 'completed'} onChange={() => setStatusFilter('completed')} />
                  <FilterRadio name="status" label="Vé đã hủy" value="cancelled" checked={statusFilter === 'cancelled'} onChange={() => setStatusFilter('cancelled')} />
                </div>
              </div>

              <div className="p-4 bg-slate-50/30">
                <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Loại vé</h3>
                <div className="space-y-1">
                  <FilterRadio name="type" value="all" label="Tất cả loại vé" checked={typeFilter === 'all'} onChange={() => setTypeFilter('all')} />
                  <FilterRadio name="type" value="oneway" label="Vé 1 chiều" checked={typeFilter === 'oneway'} onChange={() => setTypeFilter('oneway')} />
                  <FilterRadio name="type" value="round" label="Vé Khứ hồi" checked={typeFilter === 'round'} onChange={() => setTypeFilter('round')} />
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: DANH SÁCH VÉ */}
          <div className="flex-1 w-full space-y-6">
            {loading ? (
              <div className="space-y-6">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-[16px] h-[280px] animate-pulse border border-slate-100 shadow-sm"></div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm p-16 text-center flex flex-col items-center transition-all hover:shadow-md">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-5">
                  <Icons.Ticket />
                </div>
                <h3 className="text-[18px] font-bold text-slate-800 mb-2">Không tìm thấy vé nào</h3>
                <p className="text-[14px] text-slate-500">Thử thay đổi bộ lọc để xem các vé khác.</p>
                <button 
                  onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
                  className="mt-6 px-6 py-2.5 bg-[#FFF0EB] text-[#EF5222] font-semibold rounded-xl hover:bg-[#FFE5DB] transition-all duration-200 active:scale-95 text-[14px]"
                >
                  Xóa bộ lọc ngay
                </button>
              </div>
            ) : (
              <AnimatePresence mode='popLayout'>
                {filtered.map((item, index) => {
                  const isRoundTrip = item.tripType === 'round';
                  
                  const outboundSeats = item.seats?.filter(s => s.tripDirection === 'outbound') || [];
                  const returnSeats = item.seats?.filter(s => s.tripDirection === 'return') || [];

                  // LOGIC FIX: Hàm quét format thời gian chống mù
                  const safeFormatTime = (timeStr?: string) => {
                    if (!timeStr) return '--:--';
                    // Nếu backend vốn trả về dạng chuỗi HH:mm (ví dụ "18:00")
                    if (/^\d{1,2}:\d{2}/.test(timeStr)) {
                      return timeStr.substring(0, 5); 
                    }
                    try {
                      const dateObj = new Date(timeStr);
                      if (isNaN(dateObj.getTime())) return timeStr; 
                      return dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    } catch {
                      return '--:--';
                    }
                  };

                  const safeFormatDate = (dateStr?: string) => {
                    if (!dateStr) return '--/--';
                    try {
                      const dateObj = new Date(dateStr);
                      if (isNaN(dateObj.getTime())) return dateStr;
                      return dateObj.toLocaleDateString('vi-VN');
                    } catch {
                      return '--/--';
                    }
                  };

                  // --- XỬ LÝ DỮ LIỆU LƯỢT ĐI ---
                  const departAt = item.outboundDepartDateSnapshot || item.outboundTrip?.departDate || item.date;
                  const exactDepartTime = item.outboundTrip?.departTime || item.outboundTrip?.time || item.time;
                  const displayOutboundTime = exactDepartTime ? safeFormatTime(exactDepartTime) : safeFormatTime(departAt);

                  const arrivalAt = item.outboundArrivalTimeSnapshot || item.outboundTrip?.arrivalDate;
                  const exactArrivalTime = item.outboundTrip?.arrivalTime;
                  const displayOutArrival = exactArrivalTime ? safeFormatTime(exactArrivalTime) : safeFormatTime(arrivalAt);

                  const durationOut = item.outboundDurationMinutesSnapshot || item.outboundTrip?.durationMinutes || item.outboundTrip?.duration;
                  const busTypeOut = item.outboundBusTypeSnapshot || item.outboundTrip?.busType || 'Limousine';

                  // --- XỬ LÝ DỮ LIỆU LƯỢT VỀ ---
                  const returnDepartAt = item.returnDepartDateSnapshot || item.returnTrip?.departDate || item.returnDate;
                  const exactReturnTime = item.returnTrip?.departTime || item.returnTrip?.time || item.returnTime;
                  const displayReturnTime = exactReturnTime ? safeFormatTime(exactReturnTime) : safeFormatTime(returnDepartAt);

                  const returnArrivalAt = item.returnArrivalTimeSnapshot || item.returnTrip?.arrivalDate;
                  const exactReturnArrivalTime = item.returnTrip?.arrivalTime || item.returnTrip?.expectedArrivalTime;
                  const displayReturnArrival = exactReturnArrivalTime ? safeFormatTime(exactReturnArrivalTime) : safeFormatTime(returnArrivalAt);

                  const durationReturn = item.returnDurationMinutesSnapshot || item.returnTrip?.durationMinutes || item.returnTrip?.duration;
                  const busTypeReturn = item.returnBusTypeSnapshot || item.returnTrip?.busType || 'Limousine';

                  const isUpcoming = departAt ? new Date(departAt).getTime() > Date.now() : false;

                  const TimelineRoute = ({ 
                    title, from, to, deptTimeDisplay, arrTimeDisplay, deptDate, arrDate, duration, busType 
                  }: { 
                    title: string; from: string; to: string; deptTimeDisplay: string; arrTimeDisplay: string; deptDate?: string; arrDate?: string; duration?: number; busType: string; isReturn?: boolean 
                  }) => (
                    <div className="mb-6 last:mb-0 group/timeline">
                      <div className="flex items-center gap-3 mb-5">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#EF5222] bg-[#FFF0EB] px-2.5 py-1 rounded-md">
                           <Icons.Bus /> {title}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <span className="text-[13px] text-slate-500 capitalize font-medium">
                          {busType}
                        </span>
                      </div>
                      
                      <div className="flex items-stretch gap-5">
                        <div className="flex flex-col items-end justify-between w-[54px] py-0.5">
                          <div className="text-[18px] font-black text-slate-800 leading-none tracking-tight">
                            {deptTimeDisplay}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium py-3 bg-white">
                            <Icons.Clock />
                            {duration ? `${Math.floor(duration / 60)}h${duration % 60}p` : '---'}
                          </div>
                          <div className="text-[18px] font-black text-slate-500 leading-none tracking-tight">
                            {arrTimeDisplay}
                          </div>
                        </div>

                        <div className="flex flex-col items-center pt-1.5 pb-1.5 relative">
                          <div className="w-[12px] h-[12px] rounded-full border-[3px] bg-white z-10 border-[#EF5222] shadow-[0_0_0_3px_#FFF0EB]"></div>
                          <div className="w-[2px] h-full bg-[linear-gradient(to_bottom,#EF5222_50%,transparent_50%)] bg-[length:2px_8px] my-1 opacity-40"></div>
                          <div className="w-[12px] h-[12px] rounded-full border-[3px] bg-white z-10 border-slate-300"></div>
                        </div>

                        <div className="flex flex-col justify-between pb-0.5">
                          <div className="group-hover/timeline:translate-x-1 transition-transform duration-300">
                            <div className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
                              {from}
                            </div>
                            <div className="text-[12px] text-slate-500 mt-1">{safeFormatDate(deptDate)}</div>
                          </div>
                          <div className="mt-8 group-hover/timeline:translate-x-1 transition-transform duration-300">
                            <div className="flex items-center gap-1.5 text-[15px] font-bold text-slate-600">
                              <span className="text-slate-400"><Icons.MapPin /></span>
                              {to}
                            </div>
                            <div className="text-[12px] text-slate-500 mt-1">{safeFormatDate(arrDate)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <motion.div 
                      key={item.id || index}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="relative group bg-white rounded-[16px] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 hover:border-orange-100 transition-all duration-300 ease-out hover:-translate-y-1 overflow-hidden p-6"
                    >
                      <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                          
                          <div className={`flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-[6px] uppercase tracking-wide transition-colors ${
                            isUpcoming ? 'bg-[#FFF0EB] text-[#EF5222]' : 'bg-[#F4F4F4] text-slate-500'
                          }`}>
                            {isUpcoming && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF5222] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF5222]"></span>
                              </span>
                            )}
                            {isUpcoming ? 'Vé sắp đi' : 'Vé đã đi'}
                          </div>

                          <span className="text-[11px] font-bold px-3 py-1.5 rounded-[6px] border border-slate-200 text-slate-600 uppercase tracking-wide">
                            {isRoundTrip ? 'Khứ hồi' : '1 Chiều'} 
                          </span>
                          
                          <span className="text-[13px] text-slate-500 ml-2 bg-slate-50 px-3 py-1.5 rounded-[8px] border border-slate-100 flex items-center gap-1.5">
                            <Icons.Ticket /> Mã vé: <strong className="text-slate-800 tracking-wide">{item.orderCode}</strong>
                          </span>
                        </div>                   
{/* Thêm vào trong bookings.map */}
<div className="flex justify-between items-start">
  {item.bookingStatus === 'CANCELLED' && (
    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full border border-red-200">
      ĐÃ HỦY
    </span>
  )}
</div>

                        <div className="text-right flex items-start gap-4">
                          <div>
                            <p className="text-[12px] text-slate-500 mb-0.5">Tổng tiền</p>
                            <p className="text-[22px] font-black text-[#EF5222] tracking-tight">
                              {Number(item.amount || 0).toLocaleString('vi-VN')}đ
                            </p>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteBooking(item.id)}
                            className="p-2 -mr-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
                            title="Xóa vé"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-stretch gap-8 pt-2">
                        <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-100 md:pr-8 pb-6 md:pb-0">
                          <TimelineRoute 
                            title="Lượt Đi" from={item.from} to={item.to} 
                            deptTimeDisplay={displayOutboundTime} arrTimeDisplay={displayOutArrival}
                            deptDate={departAt} arrDate={arrivalAt}
                            duration={durationOut} busType={busTypeOut} isReturn={false}
                          />
                          {isRoundTrip && (
                            <div className="mt-6 pt-6 border-t border-slate-100 border-dashed">
                              <TimelineRoute 
                                title="Lượt Về" from={item.to} to={item.from} 
                                deptTimeDisplay={displayReturnTime} arrTimeDisplay={displayReturnArrival}
                                deptDate={returnDepartAt} arrDate={returnArrivalAt}
                                duration={durationReturn} busType={busTypeReturn} isReturn={true}
                              />
                            </div>
                          )}
                        </div>

                        <div className="w-full md:w-[260px] flex flex-col justify-end">
                          <div className="space-y-4 mb-5">
                            <div className="bg-slate-50/50 border border-slate-200/60 rounded-[12px] p-4 group-hover:bg-white transition-colors duration-300">
                              <div className="flex justify-between items-center text-[14px]">
                                <span className="text-slate-500 flex items-center gap-1.5"><Icons.Seat /> {isRoundTrip ? 'Ghế đi:' : 'Số ghế:'}</span>
                                <span className="text-[#EF5222] font-bold text-[15px]">{outboundSeats.length > 0 ? outboundSeats.map(s => s.seatNumber).join(', ') : '--'}</span>
                              </div>
                              {isRoundTrip && (
                                <div className="flex justify-between items-center text-[14px] mt-3 pt-3 border-t border-slate-200/60">
                                  <span className="text-slate-500 flex items-center gap-1.5"><Icons.Seat /> Ghế về:</span>
                                  <span className="text-[#EF5222] font-bold text-[15px]">{returnSeats.length > 0 ? returnSeats.map(s => s.seatNumber).join(', ') : '--'}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] px-1 bg-white rounded-lg">
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-slate-400 bg-slate-50 p-1.5 rounded-full"><Icons.User /></span>
                                <span className="font-semibold text-slate-800">{item.customerName || 'Chưa cập nhật'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-slate-400 bg-slate-50 p-1.5 rounded-full"><Icons.Phone /></span>
                                <span className="font-semibold text-slate-800">{formatPhone(item.customerPhone)}</span>
                              </div>
                            </div>
                          </div>

                          <Link 
                            href={`/verify/${item.orderCode}`} 
                            className="w-full bg-[#FFF0EB] text-[#EF5222] border border-transparent hover:border-[#EF5222]/20 hover:bg-[#FFE5DB] transition-all duration-200 active:scale-[0.98] text-center py-3 rounded-[12px] text-[14px] font-bold block shadow-sm"
                          >
                            Xem chi tiết vé
                          </Link>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}