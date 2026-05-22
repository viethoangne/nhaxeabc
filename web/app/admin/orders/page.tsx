'use client';
import { API_BASE } from '@/lib/api';

import React, { useState, useEffect, useRef, } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx'; // 🟢 THƯ VIỆN XUẤT EXCEL
import {
  Search, Ticket, Calendar, MapPin, CheckCircle2,
  XCircle, Clock, CreditCard, ChevronRight,
  AlertTriangle, User, Phone,
  ArrowRightLeft, ListFilter, Navigation, CalendarDays, Download,
  QrCode, Printer, Trash2, RefreshCw
} from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

const formatTime = (dateStr: string | null) => {
  if (!dateStr) return '--:--';
  return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Chưa xếp lịch';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

// 🟢 HÀM KIỂM TRA THỜI GIAN (BỔ SUNG LOGIC TỪ NGÀY - ĐẾN NGÀY)
const isDateInRange = (dateStr: string, filterValue: string, customStart?: string, customEnd?: string) => {
  if (filterValue === 'ALL') return true;
  if (!dateStr) return false;

  const targetDate = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filterValue) {
    case 'TODAY':
      return targetDate >= today;
    case 'LAST_7_DAYS':
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return targetDate >= sevenDaysAgo;
    case 'THIS_MONTH':
      return targetDate.getMonth() === now.getMonth() && targetDate.getFullYear() === now.getFullYear();
    case 'THIS_QUARTER':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const targetQuarter = Math.floor(targetDate.getMonth() / 3);
      return targetQuarter === currentQuarter && targetDate.getFullYear() === now.getFullYear();
    case 'THIS_YEAR':
      return targetDate.getFullYear() === now.getFullYear();
    case 'CUSTOM':
      if (!customStart || !customEnd) return true; // Nếu chưa chọn thì hiện tất cả
      const startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0); // Lấy từ 00:00 của ngày bắt đầu
      const endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999); // Lấy đến 23:59 của ngày kết thúc
      return targetDate >= startDate && targetDate <= endDate;
    default:
      return true;
  }
};

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;

  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState('ALL');

  const [activeTripType, setActiveTripType] = useState('ALL');
  const [isTripTypeOpen, setIsTripTypeOpen] = useState(false);
  const tripTypeRef = useRef<HTMLDivElement>(null);

  const [activeDateFilter, setActiveDateFilter] = useState('ALL');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const dateFilterRef = useRef<HTMLDivElement>(null);

  const [activeUserType, setActiveUserType] = useState('ALL');
  const [isUserTypeOpen, setIsUserTypeOpen] = useState(false);
  const userTypeRef = useRef<HTMLDivElement>(null);

  const [changingSeatOrder, setChangingSeatOrder] = useState<any | null>(null);
  const [selectedSeatToSwap, setSelectedSeatToSwap] = useState('');
  const [newSeatNumber, setNewSeatNumber] = useState('');
  const [isSwappingSeat, setIsSwappingSeat] = useState(false);
  const [swapSeatError, setSwapSeatError] = useState('');

  const [showSeatMap, setShowSeatMap] = useState(false);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [lockedSeats, setLockedSeats] = useState<string[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);

  const loadSeatsForTrip = async (tripId: number) => {
    if (!tripId) return;
    setIsLoadingSeats(true);
    try {
      const res = await axios.get(`${API_BASE}/payment/booked-seats/${tripId}`);
      if (res.data && !Array.isArray(res.data)) {
        setBookedSeats(res.data.bookedSeats || []);
        setLockedSeats(res.data.lockedSeats || []);
      } else {
        setBookedSeats(res.data || []);
        setLockedSeats([]);
      }
    } catch (error) {
      console.error('Lỗi tải sơ đồ ghế:', error);
    } finally {
      setIsLoadingSeats(false);
    }
  };

  // 🟢 STATE CHO LỌC TỪ NGÀY - ĐẾN NGÀY
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  // ... các state cũ
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  const [refundPreviewData, setRefundPreviewData] = useState<any | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const isActionSubmittingRef = useRef(false);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tripTypeRef.current && !tripTypeRef.current.contains(event.target as Node)) setIsTripTypeOpen(false);
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) setIsDateFilterOpen(false);
      if (userTypeRef.current && !userTypeRef.current.contains(event.target as Node)) setIsUserTypeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tripTypeOptions = [
    { value: 'ALL', label: 'Tất cả loại vé' },
    { value: 'ONEWAY', label: 'Vé Một chiều' },
    { value: 'ROUNDTRIP', label: 'Vé Khứ hồi' }
  ];

  const userTypeOptions = [
    { value: 'ALL', label: 'Tất cả loại khách' },
    { value: 'VIP', label: 'Thành viên VIP' },
    { value: 'GUEST', label: 'Khách vãng lai' }
  ];

  const dateFilterOptions = [
    { value: 'ALL', label: 'Tất cả thời gian' },
    { value: 'TODAY', label: 'Hôm nay' },
    { value: 'LAST_7_DAYS', label: '7 ngày qua' },
    { value: 'THIS_MONTH', label: 'Tháng này' },
    { value: 'THIS_QUARTER', label: 'Quý này' },
    { value: 'THIS_YEAR', label: 'Năm nay' },
    { value: 'CUSTOM', label: 'Tùy chọn ngày...' } // 🟢 BỔ SUNG TUỲ CHỌN MỚI
  ];

  const fetchOrders = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/orders`, {
        headers: { 'x-user-id': userId }
      });
      setOrders(res.data);
    } catch (error) {
      console.error('Lỗi khi tải đơn hàng:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [userId]);

  const handleCancelOrder = async (orderCode: string, realStatus: string) => {
    if (realStatus === 'CANCELLED') return alert('Đơn này đã huỷ rồi!');
    const reason = prompt('Vui lòng nhập lý do huỷ vé (Bắt buộc để ghi Log):');
    if (!reason) return;
    if (isActionSubmittingRef.current) return;
    isActionSubmittingRef.current = true;
    try {
      await axios.put(`${API_BASE}/admin/orders/${orderCode}/cancel`, { reason }, { headers: { 'x-user-id': userId } });
      alert('Đã huỷ vé thành công!');
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi huỷ vé. Bạn có đủ quyền không?');
    } finally {
      isActionSubmittingRef.current = false;
    }
  };

  const handleDeleteOrder = async (orderCode: string) => {
    if (!window.confirm('CẢNH BÁO: Hành động này sẽ xoá vé vĩnh viễn khỏi cơ sở dữ liệu và không thể hoàn tác! Bạn có chắc chắn muốn tiếp tục?')) return;
    if (isActionSubmittingRef.current) return;
    isActionSubmittingRef.current = true;
    try {
      await axios.delete(`${API_BASE}/admin/orders/${orderCode}`, { headers: { 'x-user-id': userId } });
      alert('Đã xoá vé vĩnh viễn!');
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xoá vé. Bạn có đủ quyền không?');
    } finally {
      isActionSubmittingRef.current = false;
    }
  };

  const handlePreviewRefund = async (orderCode: string) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/orders/${orderCode}/refund-preview`, {
        headers: { 'x-user-id': userId }
      });
      setRefundPreviewData(res.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi lấy thông tin hoàn tiền');
    }
  };

  const processRefund = async () => {
    if (!refundPreviewData) return;
    if (isActionSubmittingRef.current) return;
    isActionSubmittingRef.current = true;
    setIsRefunding(true);
    try {
      await axios.put(`${API_BASE}/admin/orders/${refundPreviewData.orderCode}/refund`, {}, {
        headers: { 'x-user-id': userId }
      });
      alert('Đã xác nhận hoàn tiền thành công!');
      setRefundPreviewData(null);
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xác nhận hoàn tiền');
    } finally {
      setIsRefunding(false);
      isActionSubmittingRef.current = false;
    }
  };

  const handleSwapSeat = async () => {
    if (!changingSeatOrder) return;
    if (!newSeatNumber.trim()) {
      setSwapSeatError('Vui lòng nhập số ghế mới!');
      return;
    }

    setIsSwappingSeat(true);
    setSwapSeatError('');

    try {
      const response = await axios.put(`${API_BASE}/admin/orders/${changingSeatOrder.id}/swap-seat`, {
        currentSeat: selectedSeatToSwap,
        newSeat: newSeatNumber.trim(),
        direction: 'outbound'
      }, {
        headers: {
          'x-user-id': userId || 'admin'
        }
      });

      if (response.data.success) {
        alert('Thay đổi ghế ngồi thành công!');
        setChangingSeatOrder(null);
        fetchOrders();
      }
    } catch (err: any) {
      setSwapSeatError(err.response?.data?.message || 'Có lỗi xảy ra khi đổi ghế!');
    } finally {
      setIsSwappingSeat(false);
    }
  };


  const getRealStatus = (bookingStatus: string, paymentStatus: string, departDate: string | null) => {
    if (paymentStatus === 'REFUNDED') return 'REFUNDED';
    if (bookingStatus === 'COMPLETED' || bookingStatus === 'ARCHIVED') return 'COMPLETED';
    if (bookingStatus === 'CANCELLED') return 'CANCELLED';
    if (bookingStatus === 'CONFIRMED') {
      if (!departDate) return 'UPCOMING';
      const now = new Date().getTime();
      const departTime = new Date(departDate).getTime();
      return departTime > now ? 'UPCOMING' : 'RUNNING';
    }
    return bookingStatus;
  };

  const getBookingStatusStyle = (realStatus: string) => {
    if (realStatus === 'REFUNDED') return 'bg-cyan-50 text-cyan-600 border-cyan-100';
    if (realStatus === 'COMPLETED') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (realStatus === 'UPCOMING') return 'bg-blue-50 text-blue-600 border-blue-100';
    if (realStatus === 'RUNNING') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    if (realStatus === 'CANCELLED') return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };

  const getBookingStatusText = (realStatus: string) => {
    if (realStatus === 'REFUNDED') return 'Đã hoàn tiền';
    if (realStatus === 'COMPLETED') return 'Đã hoàn thành';
    if (realStatus === 'UPCOMING') return 'Sắp đi';
    if (realStatus === 'RUNNING') return 'Đang đi';
    if (realStatus === 'CANCELLED') return 'Đã huỷ vé';
    return realStatus;
  };

  const filteredOrders = orders.filter(o => {
    const realStatus = getRealStatus(o.bookingStatus, o.paymentStatus, o.outboundDepart);
    const matchesSearch = o.id.includes(searchTerm) || (o.customerPhone && o.customerPhone.includes(searchTerm)) || (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = activeStatus === 'ALL' || realStatus === activeStatus;
    const matchesTripType = activeTripType === 'ALL' || (activeTripType === 'ONEWAY' && o.tripType === 'oneway') || (activeTripType === 'ROUNDTRIP' && o.tripType === 'round');
    const matchesUserType = activeUserType === 'ALL' || (activeUserType === 'VIP' && o.userId) || (activeUserType === 'GUEST' && !o.userId);

    // 🟢 Truyền thêm CustomStartDate và CustomEndDate vào hàm lọc
    const matchesDate = isDateInRange(o.createdAt, activeDateFilter, customStartDate, customEndDate);

    return matchesSearch && matchesStatus && matchesTripType && matchesDate && matchesUserType;
  });

  // 🟢 HÀM XUẤT EXCEL CHUẨN XỊN
  const handleExportExcel = () => {
    if (filteredOrders.length === 0) return alert('Không có dữ liệu để xuất!');

    // Cấu trúc lại dữ liệu cho đẹp trước khi đưa vào Excel
    const dataToExport = filteredOrders.map(o => ({
      'Mã Đơn': o.id,
      'Ngày Đặt Vé': formatDate(o.createdAt),
      'Khách Hàng': o.customerName,
      'Số Điện Thoại': o.customerPhone,
      'Tuyển Đi': o.route,
      'Ngày Khởi Hành': formatDate(o.outboundDepart),
      'Loại Vé': o.tripType === 'round' ? 'Khứ hồi' : '1 Chiều',
      'Số Lượng': o.ticketsCount,
      'Ghế Đã Đặt': o.seats && o.seats.length > 0 ? o.seats.join(', ') : 'Chưa xếp',
      'Tổng Tiền (VNĐ)': o.amount,
      'Trạng Thái Thanh Toán': o.paymentStatus === 'PAID' ? 'Đã Thanh Toán' : (o.paymentStatus === 'REFUNDED' ? 'Đã Hoàn Tiền' : 'Chờ Thanh Toán'),
      'Tình Trạng Chuyến': getBookingStatusText(getRealStatus(o.bookingStatus, o.paymentStatus, o.outboundDepart)),
    }));

    // Tạo file Excel và tải xuống
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachDonHang");

    // Auto-fit độ rộng cột cho đẹp
    const wscols = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Thong_Ke_Don_Hang_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Header Premium Style */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg mb-6 mt-1 bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 border border-orange-500/20">
        {/* Ambient Lighting Orbs */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#ea580c]/15 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:20px_20px]"></div>
        
        <div className="relative p-6 lg:px-8 lg:py-6 backdrop-blur-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="bg-gradient-to-tr from-[#ea580c] to-[#EF5222] p-2.5 rounded-xl shadow-[0_4px_12px_rgba(234,88,12,0.3)] border border-orange-400/30">
                <Ticket className="w-6 h-6 text-white animate-pulse" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                <span>Quản lý Đơn hàng & Vé</span>
                <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent text-[11px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 shadow-inner">TICKET MANAGER</span>
              </h1>
            </div>
            <p className="text-slate-300 font-medium text-sm max-w-2xl leading-relaxed">
              Kiểm soát tất cả đơn đặt vé từ khách hàng, xử lý huỷ vé, hoàn tiền và xuất báo cáo thống kê chuyên sâu.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 sm:mt-0">
             <div className="text-xs font-black text-slate-300 bg-white/5 px-4 py-3 rounded-xl border border-white/10 shadow-2xs">
               Đang hiển thị: <span className="text-[#ea580c] text-sm">{filteredOrders.length}</span> đơn
             </div>
             <button
                onClick={handleExportExcel}
                className="px-5 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 backdrop-blur-md shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
              >
                <Download size={16} /> Xuất Excel
              </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] relative mb-6 z-20">
        <div className="p-5 md:p-6 relative z-10 space-y-4">
          
          {/* Hàng 1: Tìm kiếm rộng rãi & Bộ Tabs Trạng thái chuyến đi */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="w-full lg:max-w-md relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-slate-400 group-focus-within:text-[#EF5222] transition-colors duration-300" size={18} />
              </div>
              <input
                type="text"
                placeholder="Nhập mã đơn, sđt, tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all duration-300 hover:border-orange-200 placeholder:font-medium"
              />
            </div>

            {/* TABS TRẠNG THÁI */}
            <div className="flex bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto hide-scrollbar w-full lg:w-auto">
              {[
                { id: 'ALL', label: 'Tất cả', icon: ListFilter, color: 'text-slate-500' },
                { id: 'UPCOMING', label: 'Sắp đi', icon: Calendar, color: 'text-blue-500' },
                { id: 'RUNNING', label: 'Đang đi', icon: Navigation, color: 'text-indigo-500' },
                { id: 'COMPLETED', label: 'Hoàn thành', icon: CheckCircle2, color: 'text-emerald-500' },
                { id: 'CANCELLED', label: 'Đã hủy', icon: XCircle, color: 'text-rose-500' },
                { id: 'REFUNDED', label: 'Đã hoàn tiền', icon: ArrowRightLeft, color: 'text-cyan-500' }
              ].map(st => {
                const Icon = st.icon;
                const isActive = activeStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setActiveStatus(st.id)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-xl transition-all duration-300 whitespace-nowrap flex-1 lg:flex-none ${isActive
                        ? 'bg-white text-[#EF5222] shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-slate-100 scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent'
                      }`}
                  >
                    <Icon size={14} className={isActive ? 'text-[#EF5222]' : st.color} strokeWidth={isActive ? 3 : 2} />
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Đường kẻ phân cách tinh tế */}
          <div className="h-px bg-slate-100"></div>

          {/* Hàng 2: Bộ ba Dropdown Lọc nâng cao */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* DROPDOWN LỌC THỜI GIAN */}
            <div className="relative group w-full sm:w-[180px] shrink-0" ref={dateFilterRef}>
              <button
                type="button"
                onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                className={`w-full flex items-center justify-between pl-11 pr-4 py-3.5 bg-slate-50/70 border rounded-2xl text-[13px] font-bold outline-none transition-all duration-300 ${isDateFilterOpen ? 'bg-white border-[#EF5222] ring-4 ring-orange-50 text-[#EF5222]' : 'border-slate-200 text-slate-700 hover:border-orange-200'
                  }`}
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <CalendarDays className={`transition-colors duration-300 ${isDateFilterOpen ? 'text-[#EF5222]' : 'text-slate-400 group-hover:text-[#EF5222]'}`} size={16} />
                </div>
                <span>{dateFilterOptions.find(opt => opt.value === activeDateFilter)?.label}</span>
                <ChevronRight className={`text-slate-400 transition-transform duration-300 ${isDateFilterOpen ? '-rotate-90' : 'rotate-90'}`} size={16} />
              </button>

              <div className={`absolute z-50 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-[0_10px_40px_rgb(0,0,0,0.08)] overflow-hidden transition-all duration-200 origin-top ${isDateFilterOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
                }`}>
                <div className="p-1.5 flex flex-col gap-0.5 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {dateFilterOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setActiveDateFilter(opt.value);
                        setIsDateFilterOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-3 text-[13px] font-bold rounded-xl transition-all ${activeDateFilter === opt.value
                          ? 'bg-orange-50 text-[#EF5222]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      {opt.label}
                      {activeDateFilter === opt.value && <CheckCircle2 size={16} className="text-[#EF5222]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* BỘ LỌC LOẠI VÉ */}
            <div className="relative group w-full sm:w-[180px] shrink-0" ref={tripTypeRef}>
              <button
                type="button"
                onClick={() => setIsTripTypeOpen(!isTripTypeOpen)}
                className={`w-full flex items-center justify-between pl-11 pr-4 py-3.5 bg-slate-50/70 border rounded-2xl text-[13px] font-bold outline-none transition-all duration-300 ${isTripTypeOpen ? 'bg-white border-[#EF5222] ring-4 ring-orange-50 text-[#EF5222]' : 'border-slate-200 text-slate-700 hover:border-orange-200'
                  }`}
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <ArrowRightLeft className={`transition-colors duration-300 ${isTripTypeOpen ? 'text-[#EF5222]' : 'text-slate-400 group-hover:text-[#EF5222]'}`} size={16} />
                </div>
                <span>{tripTypeOptions.find(opt => opt.value === activeTripType)?.label}</span>
                <ChevronRight className={`text-slate-400 transition-transform duration-300 ${isTripTypeOpen ? '-rotate-90' : 'rotate-90'}`} size={16} />
              </button>

              <div className={`absolute z-50 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-[0_10px_40px_rgb(0,0,0,0.08)] overflow-hidden transition-all duration-200 origin-top ${isTripTypeOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
                }`}>
                <div className="p-1.5 flex flex-col gap-0.5">
                  {tripTypeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setActiveTripType(opt.value);
                        setIsTripTypeOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-3 text-[13px] font-bold rounded-xl transition-all ${activeTripType === opt.value
                          ? 'bg-orange-50 text-[#EF5222]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      {opt.label}
                      {activeTripType === opt.value && <CheckCircle2 size={16} className="text-[#EF5222]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* BỘ LỌC LOẠI KHÁCH HÀNG */}
            <div className="relative group w-full sm:w-[180px] shrink-0" ref={userTypeRef}>
              <button
                type="button"
                onClick={() => setIsUserTypeOpen(!isUserTypeOpen)}
                className={`w-full flex items-center justify-between pl-11 pr-4 py-3.5 bg-slate-50/70 border rounded-2xl text-[13px] font-bold outline-none transition-all duration-300 ${isUserTypeOpen ? 'bg-white border-[#EF5222] ring-4 ring-orange-50 text-[#EF5222]' : 'border-slate-200 text-slate-700 hover:border-orange-200'
                  }`}
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className={`transition-colors duration-300 ${isUserTypeOpen ? 'text-[#EF5222]' : 'text-slate-400 group-hover:text-[#EF5222]'}`} size={16} />
                </div>
                <span>{userTypeOptions.find(opt => opt.value === activeUserType)?.label}</span>
                <ChevronRight className={`text-slate-400 transition-transform duration-300 ${isUserTypeOpen ? '-rotate-90' : 'rotate-90'}`} size={16} />
              </button>

              <div className={`absolute z-50 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-[0_10px_40px_rgb(0,0,0,0.08)] overflow-hidden transition-all duration-200 origin-top ${isUserTypeOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
                }`}>
                <div className="p-1.5 flex flex-col gap-0.5">
                  {userTypeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setActiveUserType(opt.value);
                        setIsUserTypeOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-3 text-[13px] font-bold rounded-xl transition-all ${activeUserType === opt.value
                          ? 'bg-orange-50 text-[#EF5222]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      {opt.label}
                      {activeUserType === opt.value && <CheckCircle2 size={16} className="text-[#EF5222]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* 🟢 KHU VỰC CHỌN NGÀY TÙY CHỈNH KHI CHỌN "TUỲ CHỌN NGÀY..." */}
          {activeDateFilter === 'CUSTOM' && (
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl mt-4 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[13px] font-bold text-slate-600">Từ ngày:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-[#EF5222] focus:ring-2 focus:ring-orange-50"
                />
              </div>
              <div className="hidden sm:block text-slate-300">➔</div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[13px] font-bold text-slate-600">Đến ngày:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-[#EF5222] focus:ring-2 focus:ring-orange-50"
                />
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="space-y-3 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-3xl min-h-[200px]">
            <div className="w-8 h-8 border-4 border-[#EF5222]/30 border-t-[#EF5222] rounded-full animate-spin" />
          </div>
        )}

        {filteredOrders.map(order => {
          const realStatus = getRealStatus(order.bookingStatus, order.paymentStatus, order.outboundDepart);

          // --- MOCK AI LOGIC CHO ĐƠN HÀNG ---
          const isHighRisk = (order.paymentStatus === 'UNPAID' && order.ticketsCount >= 2 && realStatus === 'UPCOMING') || (order.cancelCount >= 2 && realStatus === 'UPCOMING');
          const isUrgent = order.outboundDepart && (new Date(order.outboundDepart).getTime() - new Date().getTime()) < 24 * 60 * 60 * 1000 && realStatus === 'UPCOMING';
          
          const aiTags = [];
          if (order.ticketsCount >= 3) aiTags.push('🎟️ Đơn Sỉ');
          if (order.tripType === 'round') aiTags.push('🔄 Khách Khứ Hồi');
          if (isUrgent) aiTags.push('🕒 Cần Gọi Gấp');
          if (order.cancelCount > 0) aiTags.push(`🚨 Từng huỷ ${order.cancelCount} đơn`);
          if (order.seatSwapCount > 0) aiTags.push(`💺 Đã đổi ghế ${order.seatSwapCount} lần`);

          return (
            <div key={order.id} className={`bg-white border rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all group ${isHighRisk ? 'border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:border-rose-400' : 'border-slate-200 hover:border-orange-200 hover:shadow-sm'}`}>

              <div className="flex flex-col gap-3 min-w-[280px] w-full xl:w-auto border-b xl:border-b-0 border-slate-100 pb-4 xl:pb-0">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${isHighRisk ? 'bg-rose-50 text-rose-500 border-rose-200 animate-pulse shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                    {isHighRisk ? <AlertTriangle size={20} /> : <Ticket size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-black text-slate-800 text-[15px]">#{order.id}</div>
                      {isHighRisk && <span className="bg-gradient-to-r from-rose-500 to-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest shadow-[0_2px_8px_rgba(225,29,72,0.4)] animate-pulse">⚠️ NGUY CƠ BOM HÀNG</span>}
                    </div>
                    <div className="text-[12px] font-medium text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-700 flex items-center gap-1"><User size={12} />{order.customerName}</span>
                      {!order.userId ? (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Khách vãng lai
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-amber-500/20 dark:border-amber-900/30 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Thành viên VIP
                        </span>
                      )}
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1"><Phone size={12} />{order.customerPhone}</span>
                    </div>
                  </div>
                </div>
                {/* AI Tags */}
                {aiTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-[64px]">
                    {aiTags.map((tag, idx) => (
                       <span key={idx} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200/60 text-[#EF5222] text-[10px] px-2 py-0.5 rounded-md font-extrabold shadow-sm flex items-center gap-1">
                         {tag}
                       </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 min-w-[300px]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[13px] font-black text-[#EF5222]">
                    <MapPin size={15} className="shrink-0" />
                    {order.route}
                    {order.tripType === 'round' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-purple-100 text-purple-600 border border-purple-200 ml-1">
                        Khứ hồi
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 ml-1">
                        1 Chiều
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-bold text-slate-600 pl-6">
                    <Clock size={13} className="text-blue-500 shrink-0" />
                    <span className="text-slate-800">{formatTime(order.outboundDepart)} ➔ {formatTime(order.outboundArrival)}</span>
                    <span className="text-slate-300">•</span>
                    {formatDate(order.outboundDepart)}
                  </div>
                </div>

                {order.tripType === 'round' && (
                  <div className="flex flex-col gap-1 pt-2.5 border-t border-slate-100 border-dashed">
                    <div className="flex items-center gap-2 text-[13px] font-black text-purple-600">
                      <ArrowRightLeft size={14} className="shrink-0" />
                      {order.returnRoute}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] font-bold text-slate-500 pl-6">
                      <Clock size={13} className="text-blue-400 shrink-0" />
                      <span className="text-slate-700">{formatTime(order.returnDepart)} ➔ {formatTime(order.returnArrival)}</span>
                      <span className="text-slate-300">•</span>
                      {formatDate(order.returnDepart)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start min-w-[150px]">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  Số ghế:
                  {order.seats && order.seats.length > 0 ? (
                    <span className="text-[#EF5222] bg-orange-50 px-2 py-0.5 rounded ml-1 truncate max-w-[100px]">
                      {order.seats.join(', ')}
                    </span>
                  ) : (
                    <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded ml-1">Chưa xếp</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-[14px] font-black text-slate-800">
                    <CreditCard size={15} className="text-emerald-500" />
                    {realStatus === 'REFUNDED' ? (
                      <span className="text-slate-400 line-through">{formatCurrency(order.amount)}</span>
                    ) : (
                      formatCurrency(order.amount)
                    )}
                  </div>
                  {realStatus === 'REFUNDED' && order.refundAmount > 0 && (
                    <div className="text-[11px] font-black text-rose-500 mt-1 flex items-center gap-1">
                      <span>↩</span> Hoàn: -{formatCurrency(order.refundAmount)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between xl:justify-end gap-4 min-w-[200px] mt-4 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-transparent border-slate-100">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-[11px] font-black uppercase tracking-wider ${getBookingStatusStyle(realStatus)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-current`}></div>
                  {getBookingStatusText(realStatus)}
                </div>

                <div className="flex items-center gap-2">
                  {userRole === 'ADMIN' && realStatus === 'UPCOMING' && (
                    <>
                      <button
                        onClick={() => {
                          setChangingSeatOrder(order);
                          const initialSeat = order.seats && order.seats.length > 0 ? order.seats[0] : '';
                          setSelectedSeatToSwap(initialSeat);
                          setNewSeatNumber('');
                          setSwapSeatError('');
                          setShowSeatMap(false);
                          setBookedSeats([]);
                          setLockedSeats([]);
                          if (order.outboundTripId) {
                            loadSeatsForTrip(order.outboundTripId);
                          }
                        }}
                        className="px-3 py-2 text-[12px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-all flex items-center gap-1.5 active:scale-95"
                        title="Thay đổi ghế ngồi"
                      >
                        <RefreshCw size={14} /> Đổi ghế
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id, realStatus)}
                        className="px-3 py-2 text-[12px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100 transition-all flex items-center gap-1.5 active:scale-95"
                        title="Huỷ đơn & Nhả ghế"
                      >
                        <AlertTriangle size={14} /> Huỷ vé
                      </button>
                    </>
                  )}
                  {userRole === 'ADMIN' && realStatus === 'CANCELLED' && (
                    <button
                      onClick={() => handlePreviewRefund(order.id)}
                      className="px-3 py-2 text-[12px] font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-600 hover:text-white rounded-lg border border-cyan-200 hover:border-cyan-600 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Tính toán và Hoàn tiền"
                    >
                      <ArrowRightLeft size={14} /> Hoàn tiền
                    </button>
                  )}
                  {userRole === 'ADMIN' && (realStatus === 'COMPLETED' || realStatus === 'CANCELLED' || realStatus === 'REFUNDED') && (
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="px-3 py-2 text-[12px] font-bold text-slate-400 bg-slate-50 hover:bg-rose-500 hover:text-white rounded-lg border border-slate-200 hover:border-rose-600 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Xoá vĩnh viễn khỏi CSDL"
                    >
                      <Trash2 size={14} /> Xoá
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-2 text-[12px] font-bold text-slate-500 bg-slate-50 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-all"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>

            </div>
          );
        })}

        {filteredOrders.length === 0 && !isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy đơn hàng</h3>
            <p className="text-sm text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        )}
        {/* =========================================================
          POPUP CHI TIẾT ĐƠN HÀNG (VÉ ĐIỆN TỬ)
          ========================================================= */}
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            {/* Lớp nền mờ */}
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedOrder(null)}
            ></div>

            {/* Khung Popup */}
            <div className="relative w-full max-w-2xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

              {/* Header Popup */}
              <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Chi tiết Đơn vé</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Mã tham chiếu: <span className="text-[#EF5222] font-bold">#{selectedOrder.id}</span></p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Nội dung cuộn được */}
              <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar space-y-6">

                {/* Card Hành khách & QR Code */}
                <div className="flex flex-col sm:flex-row gap-6 p-5 rounded-2xl border border-[#EF5222]/20 bg-orange-50/30">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-orange-100 text-[#EF5222]">
                        <User size={24} />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hành khách</div>
                        <div className="text-lg font-black text-slate-800 flex items-center gap-2 flex-wrap">
                          {selectedOrder.customerName}
                          {!selectedOrder.userId ? (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Khách vãng lai
                            </span>
                          ) : (
                            <span className="bg-amber-500/10 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-amber-500/20 dark:border-amber-900/30 flex items-center gap-1 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Thành viên VIP
                        </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-orange-100/50">
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Số điện thoại</div>
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> {selectedOrder.customerPhone}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ngày đặt vé</div>
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" /> {formatDate(selectedOrder.createdAt)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Giả lập QR Code */}
                  <div className="w-full sm:w-32 flex flex-col items-center justify-center gap-2 border-t sm:border-t-0 sm:border-l border-orange-100/50 pt-4 sm:pt-0 sm:pl-6 shrink-0">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                      {/* Bạn có thể thay bằng thẻ Image gắn link QR API sau này */}
                      <QrCode size={80} className="text-slate-800" strokeWidth={1.5} />
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Quét để<br />soát vé</div>
                  </div>
                </div>

                {/* Chi tiết Hành trình */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={16} className="text-[#EF5222]" /> Thông tin Hành trình
                  </h3>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    {/* Lượt đi */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest">Lượt đi</span>
                        <span className="text-sm font-bold text-slate-800">{selectedOrder.route}</span>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Clock size={18} /></div>
                        <div>
                          <div className="text-base font-black text-slate-800">{formatTime(selectedOrder.outboundDepart)} <span className="text-slate-300 font-normal mx-1">➔</span> {formatTime(selectedOrder.outboundArrival)}</div>
                          <div className="text-sm font-medium text-slate-500">{formatDate(selectedOrder.outboundDepart)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Lượt về (nếu có) */}
                    {selectedOrder.tripType === 'round' && (
                      <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-[10px] font-black uppercase tracking-widest">Lượt về</span>
                          <span className="text-sm font-bold text-slate-800">{selectedOrder.returnRoute}</span>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0"><Clock size={18} /></div>
                          <div>
                            <div className="text-base font-black text-slate-800">{formatTime(selectedOrder.returnDepart)} <span className="text-slate-300 font-normal mx-1">➔</span> {formatTime(selectedOrder.returnArrival)}</div>
                            <div className="text-sm font-medium text-slate-500">{formatDate(selectedOrder.returnDepart)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thông tin Thanh toán */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={16} className="text-[#EF5222]" /> Thông tin Thanh toán
                  </h3>
                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Trạng thái</span>
                      <span className={`font-bold ${
                        selectedOrder.paymentStatus === 'REFUNDED' 
                          ? 'text-cyan-600' 
                          : selectedOrder.bookingStatus === 'CANCELLED' 
                            ? 'text-rose-600' 
                            : selectedOrder.paymentStatus === 'PAID' 
                              ? 'text-emerald-600' 
                              : 'text-amber-500'
                      }`}>
                        {selectedOrder.paymentStatus === 'REFUNDED' 
                          ? 'Đã hoàn tiền' 
                          : selectedOrder.bookingStatus === 'CANCELLED' 
                            ? 'Đã huỷ vé' 
                            : selectedOrder.paymentStatus === 'PAID' 
                              ? 'Đã thanh toán' 
                              : 'Chưa thanh toán'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Số lượng vé</span>
                      <span className="font-bold text-slate-800">{selectedOrder.ticketsCount} vé</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Ghế đã chọn</span>
                      <span className="font-bold text-slate-800">{selectedOrder.seats && selectedOrder.seats.length > 0 ? selectedOrder.seats.join(', ') : 'Chưa xếp ghế'}</span>
                    </div>
                    {selectedOrder.paymentStatus === 'REFUNDED' && (
                      <>
                        <div className="flex justify-between items-center text-sm border-t border-dashed border-slate-200/60 pt-2">
                          <span className="text-slate-500 font-medium">Đã thanh toán gộp</span>
                          <span className="font-bold text-slate-400 line-through">{formatCurrency(selectedOrder.amount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Đã hoàn tiền</span>
                          <span className="font-bold text-rose-500">-{formatCurrency(selectedOrder.refundAmount ?? 0)}</span>
                        </div>
                        <div className="pt-3 border-t border-slate-200/60 flex justify-between items-center">
                          <span className="text-slate-700 font-bold uppercase tracking-wider">Doanh thu thực nhận</span>
                          <span className="text-xl font-black text-emerald-600">{formatCurrency(selectedOrder.netAmount ?? 0)}</span>
                        </div>
                      </>
                    )}
                    {selectedOrder.paymentStatus !== 'REFUNDED' && (
                      <div className="pt-3 border-t border-slate-200/60 flex justify-between items-center">
                        <span className="text-slate-700 font-bold uppercase tracking-wider">Tổng cộng</span>
                        <span className="text-xl font-black text-[#EF5222]">{formatCurrency(selectedOrder.amount)}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer / Buttons */}
              <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/20"
                >
                  <Printer size={16} /> In vé xe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
          POPUP ĐỔI GHẾ NGỒI (SEAT SWAP MODAL)
          ========================================================= */}
        {/* =========================================================
          POPUP ĐỔI GHẾ NGỒI (SEAT SWAP MODAL - INTERACTIVE SEAT MAP)
          ========================================================= */}
        {changingSeatOrder && (() => {
          const departDate = changingSeatOrder.outboundDepart;
          const timeDiff = departDate ? new Date(departDate).getTime() - Date.now() : 0;
          const fiveHoursInMs = 5 * 60 * 60 * 1000;
          const isChangeAllowed = timeDiff >= fiveHoursInMs;

          // Định nghĩa các loại ghế
          const getSeatStatus = (seatId: string) => {
            if (seatId === selectedSeatToSwap) return 'current';
            if (bookedSeats.includes(seatId)) return 'sold';
            if (lockedSeats.includes(seatId)) return 'locked';
            return 'available';
          };

          const generateFloor = (startNum: number, prefix: string) => 
            Array.from({ length: 5 }, (_, i) => ({ 
              id: `${prefix}${startNum + i}`, 
              status: getSeatStatus(`${prefix}${startNum + i}`) 
            }));

          const seatsTầngDưới = [...generateFloor(1, 'A'), { id: 'A6', status: getSeatStatus('A6') }, ...generateFloor(1, 'B')];
          const seatsTầngTrên = [...generateFloor(7, 'A'), { id: 'A12', status: getSeatStatus('A12') }, ...generateFloor(6, 'B')];

          return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => !isSwappingSeat && setChangingSeatOrder(null)}
              ></div>

              <div className={`relative w-full ${showSeatMap ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col transition-all duration-505 ease-out animate-in zoom-in-95 duration-300`}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                      <RefreshCw className={`text-blue-500 ${isSwappingSeat ? 'animate-spin' : ''}`} size={20} />
                      Đổi ghế hành khách
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">Đơn hàng: <span className="text-[#EF5222]">#{changingSeatOrder.id}</span></p>
                  </div>
                  <button
                    onClick={() => setChangingSeatOrder(null)}
                    disabled={isSwappingSeat}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
                  >
                    <XCircle size={16} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 md:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                  {!isChangeAllowed ? (
                    /* 🔴 MÀN HÌNH BÁO LỖI HẾT HẠN ĐỔI GHẾ (DƯỚI 5 TIẾNG) */
                    <div className="py-6 flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500">
                        <AlertTriangle size={32} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base font-black text-rose-600 uppercase tracking-wider">Hết thời gian đổi ghế</h3>
                        <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-sm">
                          Theo chính sách nhà xe, ghế chỉ được thay đổi **trước giờ khởi hành ít nhất 5 tiếng**.
                        </p>
                        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-slate-705 space-y-1 mt-2">
                          <div>Khởi hành lúc: {formatTime(departDate)} - {formatDate(departDate)}</div>
                          <div className="text-rose-500 font-bold mt-1">Thời gian hiện tại không đủ điều kiện đổi ghế!</div>
                        </div>
                      </div>
                    </div>
                  ) : !showSeatMap ? (
                    /* 🟢 BƯỚC 1: XÁC NHẬN THÔNG TIN VÀ NÚT XEM GHẾ TRỐNG */
                    <div className="space-y-4">
                      {/* Thông tin khách */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hành khách liên hệ:</div>
                        <div className="text-base font-black text-slate-800">{changingSeatOrder.customerName}</div>
                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <span>SĐT: {changingSeatOrder.customerPhone}</span>
                          <span className="text-slate-300">•</span>
                          <span>Chuyến đi ID: {changingSeatOrder.outboundTripId}</span>
                        </div>
                      </div>

                      {/* Chọn ghế cần đổi (nếu đơn có nhiều ghế) */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">Chọn ghế cần đổi:</label>
                        {changingSeatOrder.seats && changingSeatOrder.seats.length > 1 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {changingSeatOrder.seats.map((seat: string) => (
                              <button
                                key={seat}
                                type="button"
                                onClick={() => setSelectedSeatToSwap(seat)}
                                className={`px-3 py-2.5 rounded-xl text-xs font-black border transition-all text-center ${selectedSeatToSwap === seat
                                  ? 'bg-blue-50 border-blue-400 text-blue-600 ring-2 ring-blue-100'
                                  : 'bg-white border-slate-200 text-slate-650 hover:border-blue-200'
                                }`}
                              >
                                {seat}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3.5 py-3 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-black text-blue-600 flex justify-between items-center animate-in fade-in">
                            <span>Vị trí ghế hiện tại:</span>
                            <span className="bg-blue-100 border border-blue-200 px-3 py-1 rounded-md text-base">{selectedSeatToSwap}</span>
                          </div>
                        )}
                      </div>

                      {/* Nút Xem sơ đồ ghế trống */}
                      <div className="space-y-2 pt-2">
                        <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">Chọn ghế thay thế:</label>
                        <button
                          type="button"
                          onClick={() => setShowSeatMap(true)}
                          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 active:scale-95 cursor-pointer"
                        >
                          <Search size={14} className="animate-pulse" />
                          Xem sơ đồ ghế trống
                        </button>
                        <p className="text-[10px] font-bold text-slate-400 leading-normal">Bấm nút để mở sơ đồ xe Cabin VIP và chọn vị trí ghế mới.</p>
                      </div>
                    </div>
                  ) : (
                    /* 🔵 BƯỚC 2: SƠ ĐỒ GHẾ TRỰC QUAN CỦA XE */
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-bold text-slate-600">
                          Đang chọn ghế thay thế cho: <strong className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded ml-1">{selectedSeatToSwap}</strong>
                        </div>
                        {newSeatNumber && (
                          <div className="text-xs font-bold text-blue-600 animate-pulse">
                            Ghế mới đã chọn: <strong className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-1">{newSeatNumber}</strong>
                          </div>
                        )}
                      </div>

                      {/* Lưới sơ đồ ghế 2 tầng side-by-side */}
                      {isLoadingSeats ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-2">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-xs font-bold text-slate-400">Đang tải sơ đồ xe...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-6 border border-slate-100 bg-slate-50/50 p-4 rounded-2xl shadow-inner">
                          {/* Tầng dưới */}
                          <div>
                            <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">— Tầng dưới —</div>
                            <div className="grid grid-cols-2 gap-2">
                              {seatsTầngDưới.map(seat => {
                                const isCurrent = seat.status === 'current';
                                const isSold = seat.status === 'sold';
                                const isLocked = seat.status === 'locked';
                                const isSelectedNew = newSeatNumber === seat.id;
                                const isDisabled = isSold || isLocked || isCurrent;

                                let btnClass = '';
                                if (isCurrent) {
                                  btnClass = 'border-orange-200 bg-orange-50 text-orange-600 cursor-not-allowed opacity-80';
                                } else if (isSold) {
                                  btnClass = 'border-slate-200 bg-slate-200 text-slate-400 cursor-not-allowed opacity-60';
                                } else if (isLocked) {
                                  btnClass = 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-40';
                                } else if (isSelectedNew) {
                                  btnClass = 'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100 scale-105 shadow-sm';
                                } else {
                                  btnClass = 'border-slate-200 bg-white text-slate-650 hover:border-blue-300 hover:text-blue-600';
                                }

                                return (
                                  <button
                                    key={seat.id}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => setNewSeatNumber(seat.id)}
                                    className={`h-9 w-full flex items-center justify-center rounded-lg border text-[11px] font-black transition-all active:scale-95 ${btnClass}`}
                                    title={isCurrent ? 'Ghế hiện tại' : isSold ? 'Đã bán' : isLocked ? 'Bị khóa' : `Chọn ghế ${seat.id}`}
                                  >
                                    {seat.id}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Tầng trên */}
                          <div>
                            <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">— Tầng trên —</div>
                            <div className="grid grid-cols-2 gap-2">
                              {seatsTầngTrên.map(seat => {
                                const isCurrent = seat.status === 'current';
                                const isSold = seat.status === 'sold';
                                const isLocked = seat.status === 'locked';
                                const isSelectedNew = newSeatNumber === seat.id;
                                const isDisabled = isSold || isLocked || isCurrent;

                                let btnClass = '';
                                if (isCurrent) {
                                  btnClass = 'border-orange-200 bg-orange-50 text-orange-600 cursor-not-allowed opacity-80';
                                } else if (isSold) {
                                  btnClass = 'border-slate-200 bg-slate-200 text-slate-400 cursor-not-allowed opacity-60';
                                } else if (isLocked) {
                                  btnClass = 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-40';
                                } else if (isSelectedNew) {
                                  btnClass = 'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100 scale-105 shadow-sm';
                                } else {
                                  btnClass = 'border-slate-200 bg-white text-slate-650 hover:border-blue-300 hover:text-blue-600';
                                }

                                return (
                                  <button
                                    key={seat.id}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => setNewSeatNumber(seat.id)}
                                    className={`h-9 w-full flex items-center justify-center rounded-lg border text-[11px] font-black transition-all active:scale-95 ${btnClass}`}
                                    title={isCurrent ? 'Ghế hiện tại' : isSold ? 'Đã bán' : isLocked ? 'Bị khóa' : `Chọn ghế ${seat.id}`}
                                  >
                                    {seat.id}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Legend giải thích màu sắc sơ đồ */}
                      <div className="grid grid-cols-4 gap-2 pt-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-200 shrink-0"></div>
                          <span>Đã đặt</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded bg-orange-50 border border-orange-200 shrink-0"></div>
                          <span>Đang đi</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded bg-blue-600 shrink-0"></div>
                          <span>Đang chọn</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded bg-white border border-slate-200 shrink-0"></div>
                          <span>Trống</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hiển thị lỗi nếu có */}
                  {swapSeatError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-500 flex items-start gap-1.5">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>{swapSeatError}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                  {showSeatMap ? (
                    <button
                      type="button"
                      disabled={isSwappingSeat}
                      onClick={() => setShowSeatMap(false)}
                      className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Quay lại
                    </button>
                  ) : (
                    <div></div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSwappingSeat}
                      onClick={() => setChangingSeatOrder(null)}
                      className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Đóng
                    </button>

                    {isChangeAllowed && (!showSeatMap ? (
                      <button
                        type="button"
                        onClick={() => setShowSeatMap(true)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
                      >
                        Tiếp tục
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSwapSeat}
                        disabled={isSwappingSeat || !newSeatNumber}
                        className={`px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                      >
                        {isSwappingSeat ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang đổi ghế...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={14} />
                            Đổi ghế & Gửi Mail
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

      {/* 🟢 POPUP HOÀN TIỀN */}
      {refundPreviewData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-transparent" onClick={() => !isRefunding && setRefundPreviewData(null)} />
          
          <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 text-white overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <ArrowRightLeft size={120} className="transform rotate-12 translate-x-4 -translate-y-4" />
              </div>
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black mb-1">Quyết Toán Hoàn Tiền</h2>
                  <p className="text-slate-400 text-sm font-medium">Mã vé: <span className="text-white">#{refundPreviewData.orderCode}</span></p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                  <ArrowRightLeft size={24} className="text-cyan-400" />
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><User size={12} /> Khách Hàng</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{refundPreviewData.customerName || 'Khách vãng lai'}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{refundPreviewData.customerPhone || 'Không có SĐT'}</p>
                </div>
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                  <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><CreditCard size={12} /> Đã Thanh Toán</p>
                  <p className="text-xl font-black text-emerald-600">{formatCurrency(refundPreviewData.amount)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar size={12} /> Giờ Khởi Hành</p>
                  <p className="text-sm font-bold text-slate-800">{formatTime(refundPreviewData.departureTime)} <span className="text-xs font-medium text-slate-500 ml-1">{formatDate(refundPreviewData.departureTime)}</span></p>
                </div>
                <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 flex flex-col justify-center">
                  <p className="text-[11px] text-rose-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><XCircle size={12} /> Lúc Khách Huỷ</p>
                  <p className="text-sm font-bold text-rose-700">{formatTime(refundPreviewData.cancelTime)} <span className="text-xs font-medium text-rose-600/70 ml-1">{formatDate(refundPreviewData.cancelTime)}</span></p>
                </div>
              </div>

              {/* Phân tích */}
              <div className="relative pt-2 pb-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-dashed border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân tích chính sách</span>
                </div>
              </div>

              <div className="bg-blue-50/80 p-5 sm:p-6 rounded-3xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-[13px] text-slate-600 font-bold mb-1">Chênh lệch thời gian</p>
                  <p className="text-2xl font-black text-slate-800">{Math.floor(refundPreviewData.timeDiffHours)} <span className="text-sm font-bold text-slate-500">tiếng trước giờ chạy</span></p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-[13px] text-slate-600 font-bold mb-1">Mức hoàn tiền</p>
                  <div className="inline-block bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xl font-black shadow-sm">
                    {refundPreviewData.refundPercentage}%
                  </div>
                </div>
              </div>

              {/* Tổng kết */}
              <div className="bg-gradient-to-r from-rose-50 via-orange-50/50 to-rose-50 p-6 sm:p-8 rounded-3xl border border-rose-100/60 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex flex-col items-center justify-center text-center relative z-10">
                  <span className="text-xs font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Thực Tế Cần Chuyển Khoản
                  </span>
                  <span className="text-5xl font-black text-rose-600 tracking-tight drop-shadow-sm">{formatCurrency(refundPreviewData.refundAmount)}</span>
                  <p className="text-[13px] text-rose-500/80 font-medium mt-4">
                    * Vui lòng chuyển khoản cho khách hàng trước khi xác nhận trên hệ thống.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end items-center rounded-b-3xl shrink-0">
              <button 
                onClick={() => setRefundPreviewData(null)}
                disabled={isRefunding}
                className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={processRefund}
                disabled={isRefunding}
                className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-[#0f172a] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group hover:-translate-y-0.5"
              >
                {isRefunding ? 'Đang xử lý...' : (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Xác nhận hoàn tất</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}