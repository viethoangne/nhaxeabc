'use client';

import React, { useState, useEffect, useRef,  } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx'; // 🟢 THƯ VIỆN XUẤT EXCEL
import { 
  Search, Ticket, Calendar, MapPin, CheckCircle2, 
  XCircle, Clock, CreditCard, ChevronRight, 
  AlertTriangle, User, Phone, 
  ArrowRightLeft, ListFilter, Navigation, CalendarDays, Download,
  QrCode, Printer
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

  // 🟢 STATE CHO LỌC TỪ NGÀY - ĐẾN NGÀY
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  // ... các state cũ
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tripTypeRef.current && !tripTypeRef.current.contains(event.target as Node)) setIsTripTypeOpen(false);
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) setIsDateFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tripTypeOptions = [
    { value: 'ALL', label: 'Tất cả loại vé' },
    { value: 'ONEWAY', label: 'Vé Một chiều' },
    { value: 'ROUNDTRIP', label: 'Vé Khứ hồi' }
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
      const res = await axios.get('http://localhost:3001/api/admin/orders', {
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
    try {
      await axios.put(`http://localhost:3001/api/admin/orders/${orderCode}/cancel`, { reason }, { headers: { 'x-user-id': userId } });
      alert('Đã huỷ vé thành công!');
      fetchOrders(); 
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi huỷ vé. Bạn có đủ quyền không?');
    }
  };

  const getRealStatus = (bookingStatus: string, departDate: string | null) => {
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
    if (realStatus === 'COMPLETED') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (realStatus === 'UPCOMING') return 'bg-blue-50 text-blue-600 border-blue-100';
    if (realStatus === 'RUNNING') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    if (realStatus === 'CANCELLED') return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };

  const getBookingStatusText = (realStatus: string) => {
    if (realStatus === 'COMPLETED') return 'Đã hoàn thành';
    if (realStatus === 'UPCOMING') return 'Sắp đi';
    if (realStatus === 'RUNNING') return 'Đang đi';
    if (realStatus === 'CANCELLED') return 'Đã huỷ vé';
    return realStatus;
  };

  const filteredOrders = orders.filter(o => {
    const realStatus = getRealStatus(o.bookingStatus, o.outboundDepart);
    const matchesSearch = o.id.includes(searchTerm) || (o.customerPhone && o.customerPhone.includes(searchTerm)) || (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = activeStatus === 'ALL' || realStatus === activeStatus;
    const matchesTripType = activeTripType === 'ALL' || (activeTripType === 'ONEWAY' && o.tripType === 'oneway') || (activeTripType === 'ROUNDTRIP' && o.tripType === 'round');
    
    // 🟢 Truyền thêm CustomStartDate và CustomEndDate vào hàm lọc
    const matchesDate = isDateInRange(o.createdAt, activeDateFilter, customStartDate, customEndDate);

    return matchesSearch && matchesStatus && matchesTripType && matchesDate;
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
      'Trạng Thái Thanh Toán': o.paymentStatus === 'PAID' ? 'Đã Thanh Toán' : 'Chờ Thanh Toán',
      'Tình Trạng Chuyến': getBookingStatusText(getRealStatus(o.bookingStatus, o.outboundDepart)),
    }));

    // Tạo file Excel và tải xuống
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachDonHang");
    
    // Auto-fit độ rộng cột cho đẹp
    const wscols = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Thong_Ke_Don_Hang_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative mb-6 z-20">
        <div className="absolute inset-0 overflow-hidden rounded-[32px] pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-orange-100/60 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        </div>

        <div className="p-6 md:p-8 relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-12 bg-gradient-to-b from-[#EF5222] to-orange-400 rounded-full shadow-sm"></div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Quản lý Đơn hàng</h1>
                <p className="text-[13px] font-medium text-slate-500 mt-1">
                  Đang hiển thị <strong className="text-[#EF5222] text-sm">{filteredOrders.length}</strong> đơn đặt vé
                </p>
              </div>
            </div>
            
            {/* 🟢 NÚT XUẤT EXCEL GÓC PHẢI */}
            <button 
              onClick={handleExportExcel}
              className="px-5 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Download size={16} /> Xuất Excel
            </button>
          </div>

          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 pt-6 border-t border-slate-100">
            <div className="w-full xl:w-[25%] relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-slate-400 group-focus-within:text-[#EF5222] transition-colors duration-300" size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Nhập mã đơn, sđt..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all duration-300 hover:border-orange-200 placeholder:font-medium"
              />
            </div>

            <div className="flex w-full xl:w-auto flex-1 flex-col sm:flex-row items-center gap-3 xl:justify-end">
              
              {/* DROPDOWN LỌC THỜI GIAN */}
              <div className="relative group w-full sm:w-[170px] shrink-0" ref={dateFilterRef}>
                <button
                  onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                  className={`w-full flex items-center justify-between pl-11 pr-4 py-3.5 bg-slate-50/70 border rounded-2xl text-[13px] font-bold outline-none transition-all duration-300 ${
                    isDateFilterOpen ? 'bg-white border-[#EF5222] ring-4 ring-orange-50 text-[#EF5222]' : 'border-slate-200 text-slate-700 hover:border-orange-200'
                  }`}
                >
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <CalendarDays className={`transition-colors duration-300 ${isDateFilterOpen ? 'text-[#EF5222]' : 'text-slate-400 group-hover:text-[#EF5222]'}`} size={16} />
                  </div>
                  <span>{dateFilterOptions.find(opt => opt.value === activeDateFilter)?.label}</span>
                  <ChevronRight className={`text-slate-400 transition-transform duration-300 ${isDateFilterOpen ? '-rotate-90' : 'rotate-90'}`} size={16} />
                </button>

                <div className={`absolute z-50 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-[0_10px_40px_rgb(0,0,0,0.08)] overflow-hidden transition-all duration-200 origin-top ${
                  isDateFilterOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
                }`}>
                  <div className="p-1.5 flex flex-col gap-0.5 max-h-[250px] overflow-y-auto custom-scrollbar">
                    {dateFilterOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setActiveDateFilter(opt.value);
                          setIsDateFilterOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-3 py-3 text-[13px] font-bold rounded-xl transition-all ${
                          activeDateFilter === opt.value
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
              <div className="relative group w-full sm:w-[170px] shrink-0" ref={tripTypeRef}>
                <button
                  onClick={() => setIsTripTypeOpen(!isTripTypeOpen)}
                  className={`w-full flex items-center justify-between pl-11 pr-4 py-3.5 bg-slate-50/70 border rounded-2xl text-[13px] font-bold outline-none transition-all duration-300 ${
                    isTripTypeOpen ? 'bg-white border-[#EF5222] ring-4 ring-orange-50 text-[#EF5222]' : 'border-slate-200 text-slate-700 hover:border-orange-200'
                  }`}
                >
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ArrowRightLeft className={`transition-colors duration-300 ${isTripTypeOpen ? 'text-[#EF5222]' : 'text-slate-400 group-hover:text-[#EF5222]'}`} size={16} />
                  </div>
                  <span>{tripTypeOptions.find(opt => opt.value === activeTripType)?.label}</span>
                  <ChevronRight className={`text-slate-400 transition-transform duration-300 ${isTripTypeOpen ? '-rotate-90' : 'rotate-90'}`} size={16} />
                </button>

                <div className={`absolute z-50 w-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-[0_10px_40px_rgb(0,0,0,0.08)] overflow-hidden transition-all duration-200 origin-top ${
                  isTripTypeOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
                }`}>
                  <div className="p-1.5 flex flex-col gap-0.5">
                    {tripTypeOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setActiveTripType(opt.value);
                          setIsTripTypeOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-3 py-3 text-[13px] font-bold rounded-xl transition-all ${
                          activeTripType === opt.value
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

              <div className="hidden lg:block w-px h-8 bg-slate-200 mx-1 shrink-0"></div>

              {/* TABS TRẠNG THÁI */}
              <div className="flex bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto hide-scrollbar w-full xl:w-auto">
                {[
                  { id: 'ALL', label: 'Tất cả', icon: ListFilter, color: 'text-slate-500' },
                  { id: 'UPCOMING', label: 'Sắp đi', icon: Calendar, color: 'text-blue-500' },
                  { id: 'RUNNING', label: 'Đang đi', icon: Navigation, color: 'text-indigo-500' },
                  { id: 'COMPLETED', label: 'Hoàn thành', icon: CheckCircle2, color: 'text-emerald-500' },
                  { id: 'CANCELLED', label: 'Đã hủy', icon: XCircle, color: 'text-rose-500' }
                ].map(st => {
                  const Icon = st.icon;
                  const isActive = activeStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setActiveStatus(st.id)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-xl transition-all duration-300 whitespace-nowrap flex-1 xl:flex-none ${
                        isActive 
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
          const realStatus = getRealStatus(order.bookingStatus, order.outboundDepart);
          
          return (
            <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:border-orange-200 hover:shadow-sm transition-all group">
              
              <div className="flex items-center gap-4 min-w-[280px]">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100 shrink-0">
                  <Ticket size={20} />
                </div>
                <div>
                  <div className="font-black text-slate-800 text-[15px]">#{order.id}</div>
                  <div className="text-[12px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                    <span className="font-bold text-slate-700 flex items-center gap-1"><User size={12}/>{order.customerName}</span> 
                    <span>•</span>
                    <span className="flex items-center gap-1"><Phone size={12}/>{order.customerPhone}</span>
                  </div>
                </div>
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
                <div className="flex items-center gap-1.5 text-[14px] font-black text-slate-800">
                  <CreditCard size={15} className="text-emerald-500" />
                  {formatCurrency(order.amount)}
                </div>
              </div>

              <div className="flex items-center justify-between xl:justify-end gap-4 min-w-[200px] mt-4 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-transparent border-slate-100">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-[11px] font-black uppercase tracking-wider ${getBookingStatusStyle(realStatus)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-current`}></div>
                  {getBookingStatusText(realStatus)}
                </div>
                
                {(realStatus === 'UPCOMING') && userRole === 'ADMIN' ? (
                  <button 
                    onClick={() => handleCancelOrder(order.id, realStatus)}
                    className="px-3 py-2 text-[12px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100 transition-all flex items-center gap-1.5"
                    title="Huỷ đơn & Nhả ghế"
                  >
                    <AlertTriangle size={14} /> Huỷ vé
                  </button>
                ) : (
                  <button 
                  onClick={() => setSelectedOrder(order)}
                  className="px-4 py-2 text-[12px] font-bold text-slate-500 bg-slate-50 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-all"
                >
                  Chi tiết
                </button>
                )}
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
                      <div className="text-lg font-black text-slate-800">{selectedOrder.customerName}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-orange-100/50">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Số điện thoại</div>
                      <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Phone size={14} className="text-slate-400"/> {selectedOrder.customerPhone}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ngày đặt vé</div>
                      <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400"/> {formatDate(selectedOrder.createdAt)}</div>
                    </div>
                  </div>
                </div>
                
                {/* Giả lập QR Code */}
                <div className="w-full sm:w-32 flex flex-col items-center justify-center gap-2 border-t sm:border-t-0 sm:border-l border-orange-100/50 pt-4 sm:pt-0 sm:pl-6 shrink-0">
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                     {/* Bạn có thể thay bằng thẻ Image gắn link QR API sau này */}
                     <QrCode size={80} className="text-slate-800" strokeWidth={1.5} />
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Quét để<br/>soát vé</div>
                </div>
              </div>

              {/* Chi tiết Hành trình */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={16} className="text-[#EF5222]"/> Thông tin Hành trình
                </h3>
                
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {/* Lượt đi */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                       <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest">Lượt đi</span>
                       <span className="text-sm font-bold text-slate-800">{selectedOrder.route}</span>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Clock size={18}/></div>
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
                         <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0"><Clock size={18}/></div>
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
                  <CreditCard size={16} className="text-[#EF5222]"/> Thông tin Thanh toán
                </h3>
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 space-y-3">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Trạng thái thanh toán</span>
                      <span className={`font-bold ${selectedOrder.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {selectedOrder.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
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
                   <div className="pt-3 border-t border-slate-200/60 flex justify-between items-center">
                      <span className="text-slate-700 font-bold uppercase tracking-wider">Tổng cộng</span>
                      <span className="text-xl font-black text-[#EF5222]">{formatCurrency(selectedOrder.amount)}</span>
                   </div>
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
      </div>
    </div>
  );
}