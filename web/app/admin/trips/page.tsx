'use client';
import { motion, AnimatePresence } from 'framer-motion'; // 🟢 Thêm dòng này để hết lỗi
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Calendar, Bus, Plus, Clock, MapPin, ChevronRight, ChevronLeft, Filter, Search, ArrowRightLeft, Navigation, User, CarFront, CheckCircle2, BadgeCheck,X, CircleDollarSign, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminTripsPage() {
  const today = new Date().toISOString().split('T')[0];
  
  const [selectedDate, setSelectedDate] = useState(today);
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  // 🟢 THÊM STATE BỘ LỌC MỚI NÀY
  // 🟢 THÊM STATE BỘ LỌC TÀI XẾ RIÊNG BIỆT
  const [operationalFilter, setOperationalFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL'); // 'ALL' | 'HAS_DRIVER' | 'NO_DRIVER'
  // 🟢 THÊM STATE PHÂN TRANG (MỖI TRANG 20 CHUYẾN)
  const [currentPage, setCurrentPage] = useState(1);
  // --- 1. STATE CHO MODAL THÊM CHUYẾN ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({
    from: 'TP. Hồ Chí Minh',
    to: 'Đà Lạt',
    departDate: '', // Sẽ có định dạng YYYY-MM-DDTHH:mm từ input
    price: 100000,
    busType: 'Limousine'
  });
  const CITIES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Nha Trang', 'Đà Lạt', 'Vũng Tàu', 'Phan Thiết', 'Cần Thơ'];
  const TIME_SLOTS = ['05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];
  // 1. Tách riêng Giờ và Phút để Admin chọn linh hoạt
const HOURS = ['05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '00'];
const MINUTES = ['00', '15', '30', '45']; // Hoặc ['00', '10', '20', '30', '40', '50']

// 2. Trong Component, bổ sung state phút
const [selectedHour, setSelectedHour] = useState('08');
const [selectedMinute, setSelectedMinute] = useState('00');

// Trong component, thêm các state điều khiển menu
const [isFromOpen, setIsFromOpen] = useState(false);
const [isToOpen, setIsToOpen] = useState(false);
const [selectedTime, setSelectedTime] = useState('08:00');
const [selectedDay, setSelectedDay] = useState(''); // Định dạng YYYY-MM-DD
  const ITEMS_PER_PAGE = 20;

  const { data: session } = useSession();
  const router = useRouter();
  // State đóng mở Modal thêm chuyến

  const handleDeleteTrip = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chuyến xe này? Thao tác này không thể hoàn tác.")) return;

    try {
      const userId = (session?.user as any)?.id;
      await axios.delete(`http://localhost:3001/api/admin/trips/${id}`, {
        headers: { 'x-user-id': userId }
      });
      alert("✅ Đã xóa chuyến xe thành công!");
      fetchTrips();
    } catch (err: any) {
      alert(err.response?.data?.message || "Có lỗi khi xóa chuyến.");
    }
  };

  const fetchTrips = async () => {
    if (!session) return; 
    const userId = (session.user as any)?.id;

    setIsLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/admin/trips?date=${selectedDate}`, {
        headers: { 'x-user-id': userId }
      });
      setTrips(res.data);
    } catch (err) { 
      console.error("Lỗi lấy chuyến xe:", err); 
    } finally { 
      setIsLoading(false); 
    }
  };
// 🟢 THÊM EFFECT NÀY: Để khi bạn đổi ngày hoặc gõ tìm kiếm, nó tự quay về trang 1
// 🟢 Thêm operationalFilter vào mảng này để khi bấm lọc nó tự quay về trang 1
useEffect(() => {
  setCurrentPage(1);
}, [searchFrom, searchTo, filterStatus, selectedDate, operationalFilter, driverFilter]);
  useEffect(() => { 
    if (session) {
      fetchTrips(); 
    }
  }, [selectedDate, session]);

  const handleAddTrip = async (formData: any) => {
    if (!selectedDay) return alert("Vui lòng chọn ngày khởi hành!");
    
    // Ghép Ngày + Giờ + Phút thành định dạng chuẩn ISO
    const departDate = `${selectedDay}T${selectedHour}:${selectedMinute}:00`;
    const payload = { ...formData, departDate };
  
    try {
      const userId = (session?.user as any)?.id;
      await axios.post('http://localhost:3001/api/admin/trips/manual', payload, {
        headers: { 'x-user-id': userId }
      });
      alert("✅ Thêm chuyến xe thành công!");
      setIsAddModalOpen(false);
      fetchTrips();
    } catch (err: any) {
      // Nếu Backend báo lỗi trùng (Error 400/409), thông báo sẽ hiện ở đây
      alert(err.response?.data?.message || "Lỗi: Chuyến xe bị trùng giờ hoặc không đủ điều kiện 48h.");
    }
  };
  
  const handleSwapLocation = () => {
    setSearchFrom(searchTo);
    setSearchTo(searchFrom);
  };

  // 🟢 LOGIC LỌC DỮ LIỆU ĐA CHIỀU THÔNG MINH ĐÃ NÂNG CẤP
  const filteredTrips = useMemo(() => {
    const currentTime = new Date().getTime();
    const sixHoursLater = currentTime + 6 * 60 * 60 * 1000; // Tính mốc 6 tiếng sau

    // Bước 1: Lọc dữ liệu
    const filtered = trips.filter((trip: any) => {
      const fromMatch = trip.from.toLowerCase().includes(searchFrom.toLowerCase()) || trip.pickupPoint?.toLowerCase().includes(searchFrom.toLowerCase());
      const toMatch = trip.to.toLowerCase().includes(searchTo.toLowerCase()) || trip.dropoffPoint?.toLowerCase().includes(searchTo.toLowerCase());
      const statusMatch = filterStatus === 'ALL' || trip.status === filterStatus;

      const tripTime = new Date(trip.departDate).getTime();

     // 1. Lọc theo Trạng thái vận hành
     let opMatch = true;
     if (operationalFilter === 'UPCOMING_6H') {
       opMatch = tripTime >= currentTime && tripTime <= sixHoursLater && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED';
     } else if (operationalFilter === 'RUNNING') {
       opMatch = trip.status === 'RUNNING';
     } else if (operationalFilter === 'COMPLETED') {
       opMatch = trip.status === 'COMPLETED';
     }

     // 2. 🟢 Lọc ĐỘC LẬP theo Trạng thái Tài xế
     let driverMatch = true;
     if (driverFilter === 'HAS_DRIVER') {
       driverMatch = !!trip.driverId; // Phải có ID tài xế
     } else if (driverFilter === 'NO_DRIVER') {
       driverMatch = !trip.driverId;  // ID tài xế = null/undefined
     }

     // 3. 🟢 TRẢ VỀ: Phải thỏa mãn CẢ 2 bộ lọc
     return fromMatch && toMatch && statusMatch && opMatch && driverMatch;
   });

    // Bước 2: Sắp xếp kết quả (Ưu tiên giờ chạy)
    return filtered.sort((a: any, b: any) => {
      const fromCompare = a.from.localeCompare(b.from, 'vi');
      if (fromCompare !== 0) return fromCompare;
      
      const toCompare = a.to.localeCompare(b.to, 'vi');
      if (toCompare !== 0) return toCompare;

      return new Date(a.departDate).getTime() - new Date(b.departDate).getTime();
    });

  }, [trips, searchFrom, searchTo, filterStatus, operationalFilter, driverFilter]); // 🟢 Nhớ thêm driverFilter vào đây
  // 🟢 CẮT DỮ LIỆU THEO TRANG (Phân trang ở Frontend)
  const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE);
  const paginatedTrips = filteredTrips.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* ==========================================
          KHU VỰC BỘ LỌC ĐA NĂNG (STYLE TỐI GIẢN) 
      ========================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
        
        {/* Tiêu đề & Chọn Lịch */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#EF5222] rounded-full"></div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Điều phối Chuyến xe</h1>
              <p className="text-[13px] text-slate-500 font-medium mt-0.5">
                Đang hiển thị <strong className="text-[#EF5222] font-bold">{filteredTrips.length}</strong> chuyến xe khả dụng
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#EF5222]">
                <Calendar size={18} strokeWidth={2} />
              </div>
              <input 
                type="date" 
                min={today}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-orange-50/30 hover:bg-orange-50/50 border border-orange-100 text-[#EF5222] text-[14px] font-bold rounded-xl outline-none focus:border-[#EF5222] transition-colors cursor-pointer"
              />
            </div>
            <button 
  onClick={() => setIsAddModalOpen(true)} // 🟢 Mở Modal khi click
  className="bg-[#EF5222] hover:bg-[#D93814] text-white p-2.5 rounded-xl shadow-md shadow-orange-500/20 active:scale-95 transition-all"
>
  <Plus size={20} strokeWidth={2.5} />
</button>
          </div>
        </div>

        {/* Tìm Kiếm & Lọc */}
        <div className="flex flex-col lg:flex-row items-center gap-3">
          
          {/* Ô Nhập Điểm Đi */}
          <div className="relative flex-1 w-full group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#EF5222] transition-colors">
              <MapPin size={18} strokeWidth={2} />
            </div>
            <input 
              type="text"
              placeholder="Điểm khởi hành..."
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] transition-colors placeholder:text-slate-400"
            />
          </div>
          

          {/* Nút Swap */}
          <button 
            onClick={handleSwapLocation}
            className="w-10 h-10 shrink-0 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-[#EF5222] hover:border-[#EF5222] hover:bg-orange-50 hover:rotate-180 active:scale-90 transition-all duration-300 z-10 lg:-mx-5"
          >
            <ArrowRightLeft size={16} strokeWidth={2} />
          </button>

          {/* Ô Nhập Điểm Đến */}
          <div className="relative flex-1 w-full group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#EF5222] transition-colors">
              <Navigation size={18} strokeWidth={2} />
            </div>
            <input 
              type="text"
              placeholder="Điểm đến..."
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] transition-colors placeholder:text-slate-400"
            />
          </div>

          {/* Lọc Trạng thái (Phần code cũ của bạn) */}
          <div className="relative w-full lg:w-[200px] group shrink-0">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#EF5222] transition-colors pointer-events-none">
              <Filter size={18} strokeWidth={2} />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-11 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-600 outline-none focus:bg-white focus:border-[#EF5222] transition-colors cursor-pointer appearance-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PUBLISHED">Mở bán (PUBLISHED)</option>
              <option value="DRAFT">Chờ duyệt (DRAFT)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ChevronRight size={16} className="rotate-90" />
            </div>
          </div>
        </div> {/* 🔴 QUAN TRỌNG: ĐÓNG THẺ CỦA KHỐI TÌM KIẾM Ở ĐÂY */}

        {/* 🟢 BỘ LỌC VẬN HÀNH NHANH (PILLS) NẰM ĐỘC LẬP BÊN DƯỚI */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-3 pt-5 mt-2 border-t border-slate-100 w-full">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden sm:block">Lọc nhanh:</span>
          
          <button 
            onClick={() => setOperationalFilter('ALL')}
            className={`px-4 py-2 text-[12px] font-bold rounded-full border transition-all ${operationalFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
          >
            Tất cả chuyến
          </button>
          
          <button 
            onClick={() => setOperationalFilter('UPCOMING_6H')}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-full border transition-all ${operationalFilter === 'UPCOMING_6H' ? 'bg-orange-50 text-[#EF5222] border-[#EF5222] ring-2 ring-[#EF5222]/20' : 'bg-white text-slate-500 border-slate-200 hover:border-orange-200 hover:bg-orange-50/50'}`}
          >
            <Clock size={14} /> Sắp chạy (6h tới)
          </button>
          
          <button 
            onClick={() => setOperationalFilter('RUNNING')}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-full border transition-all ${operationalFilter === 'RUNNING' ? 'bg-blue-50 text-blue-600 border-blue-500 ring-2 ring-blue-500/20' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:bg-blue-50/50'}`}
          >
            <Bus size={14} /> Đang trên đường
          </button>

          <button 
            onClick={() => setOperationalFilter('COMPLETED')}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-full border transition-all ${operationalFilter === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50'}`}
          >
            <CheckCircle2 size={14} /> Đã cập bến
          </button>

          {/* 🟢 Gạch phân cách 2 nhóm lọc */}
          <div className="w-px h-6 bg-slate-200 mx-1 hidden lg:block"></div>

          {/* 🟢 NHÓM LỌC TÀI XẾ (Bấm để bật/tắt) */}
          <button 
            onClick={() => setDriverFilter(prev => prev === 'NO_DRIVER' ? 'ALL' : 'NO_DRIVER')}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-full border transition-all ${driverFilter === 'NO_DRIVER' ? 'bg-red-50 text-red-600 border-red-500 ring-2 ring-red-500/20 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-red-200 hover:bg-red-50'}`}
          >
            <User size={14} /> Chưa có tài
          </button>

          <button 
            onClick={() => setDriverFilter(prev => prev === 'HAS_DRIVER' ? 'ALL' : 'HAS_DRIVER')}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-full border transition-all ${driverFilter === 'HAS_DRIVER' ? 'bg-indigo-50 text-indigo-600 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50'}`}
          >
            <BadgeCheck size={14} /> Đã có tài
          </button>
        </div>

      </div> {/* <-- Thẻ đóng của cục màu trắng to đùng chứa Header + Filter */}

     {/* ==========================================
          DANH SÁCH CHUYẾN XE & PHÂN TRANG
      ========================================== */}
      <div className="grid grid-cols-1 gap-3 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
             <div className="w-8 h-8 border-3 border-[#EF5222]/30 border-t-[#EF5222] rounded-full animate-spin" />
          </div>
        )}

        {/* 🟢 ĐỔI TỪ filteredTrips SANG paginatedTrips */}
        {paginatedTrips.map((trip: any) => {
          const bookedSeats = trip._count?.orderSeats || trip._count?.seats || 0;
          const totalSeats = trip.tickets?.[0]?.numTickets || 0;
          const fillPercentage = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

          return (
            <div key={trip.id} className="bg-white px-6 py-4 rounded-xl border border-slate-200 hover:border-[#EF5222]/40 transition-colors group flex flex-col lg:flex-row items-center justify-between gap-6">
              
              {/* Cột 1: Tuyến đường, Xe & TÀI XẾ */}
              <div className="flex items-center gap-6 min-w-[350px]">
                <div className="text-center w-[60px]">
                  <p className="text-xl font-bold text-slate-800">{new Date(trip.departDate).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-700 text-[15px]">
                    <span className="hover:text-[#EF5222] transition-colors">{trip.from}</span>
                    <ChevronRight size={14} className="text-slate-400" />
                    <span className="hover:text-[#EF5222] transition-colors">{trip.to}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="bg-orange-50 text-[#EF5222] px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider">
                      {trip.busType}
                    </span>
                    <span className="text-[12px] font-medium text-slate-500 line-clamp-1">
                      {trip.pickupPoint}
                    </span>
                  </div>
                  
                  {/* 🟢 GIAO DIỆN MỚI: HIỂN THỊ TÀI XẾ VÀ BIỂN SỐ XE */}
                  <div className="flex items-center gap-3 mt-2 text-[12px]">
                    <span className="flex items-center gap-1.5 font-bold text-slate-600">
                      <User size={13} className={trip.driver ? "text-[#EF5222]" : "text-slate-300"} /> 
                      {trip.driver ? trip.driver.name : <span className="text-slate-400 font-medium italic">Chưa xếp tài</span>}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1.5 font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                      <CarFront size={13} className={trip.bus ? "text-blue-500" : "text-slate-300"} /> 
                      {trip.bus ? trip.bus.plateNumber : <span className="text-slate-400 font-medium italic">Chưa có xe</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cột 2: Tình trạng (Giữ nguyên) */}
              <div className="flex flex-col items-center justify-center min-w-[120px]">
                <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Tình trạng</p>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#EF5222] transition-all" style={{ width: `${fillPercentage}%` }} />
                  </div>
                  <span className="text-[13px] font-bold text-slate-700">{bookedSeats}/{totalSeats}</span>
                </div>
              </div>

              {/* Cột 3: Giá & Nút */}
  <div className="flex items-center gap-3 min-w-[180px] justify-end">
     <div className="text-right mr-2">
        <p className="text-lg font-bold text-[#EF5222]">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ</p>
        <p className={`text-[10px] font-black mt-0.5 uppercase ${trip.status === 'PUBLISHED' ? 'text-emerald-500' : 'text-slate-400'}`}>
          {trip.status}
        </p>
     </div>
     
     {/* 🟢 NÚT XÓA CHUYẾN (Chỉ hiện khi chưa có khách/chưa chạy) */}
     {trip.status === 'PUBLISHED' && (
       <button 
         onClick={() => handleDeleteTrip(trip.id)}
         className="w-9 h-9 rounded-xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
       >
         <Trash2 size={16} />
       </button>
     )}

     {/* NÚT CHI TIẾT / CÀI ĐẶT */}
     <button 
       onClick={() => router.push(`/admin/trips/${trip.id}`)} 
       disabled={trip.status === 'COMPLETED'} // 🟢 Vô hiệu hóa nếu đã hoàn thành
       className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
         trip.status === 'RUNNING' 
         ? 'bg-blue-50 text-blue-500 border-blue-100' 
         : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-[#EF5222] hover:text-white'
       }`}
     >
       <ChevronRight size={18} strokeWidth={2.5} />
     </button>
  </div>
            </div>
          );
        })}
        
        {/* KHÔNG TÌM THẤY */}
        {!isLoading && filteredTrips.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Bus className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-600 font-bold text-[15px] mb-1">Không tìm thấy chuyến xe!</p>
            <p className="text-slate-400 text-[13px]">Vui lòng thử tìm với từ khóa khác.</p>
          </div>
        )}

        {/* 🟢 THANH ĐIỀU HƯỚNG PHÂN TRANG (PAGINATION) Ở CHÂN TRANG */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 mt-2">
            <span className="text-[13px] font-bold text-slate-500">
              Trang <span className="text-[#EF5222]">{currentPage}</span> / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-[#EF5222] hover:border-[#EF5222] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all"
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-[#EF5222] hover:border-[#EF5222] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all"
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>
      {/* 🟢 MODAL THÊM CHUYẾN - PHIÊN BẢN MỞ RỘNG LUXURY */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }} 
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden border border-slate-100"
            >
              {/* --- Header: Sang trọng với hiệu ứng Gradient --- */}
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center shadow-inner">
                    <Plus className="text-[#EF5222]" size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Thiết lập Chuyến xe mới</h3>
                    <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hệ thống điều phối thủ công</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all duration-300"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              {/* --- Body: Bố cục lưới rộng rãi --- */}
              <div className="p-8 space-y-8">
                
                {/* HÀNG 1: ĐIỂM ĐI & ĐIỂM ĐẾN */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Điểm đi */}
                  <div className="space-y-3">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={14} /> Khởi hành từ
                    </label>
                    <div className="relative">
                      <button 
                        onClick={() => setIsFromOpen(!isFromOpen)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-white hover:border-[#EF5222] transition-all"
                      >
                        <span>{newTrip.from}</span>
                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isFromOpen ? 'rotate-90' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isFromOpen && (
                          <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="absolute z-[110] w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 max-h-64 overflow-y-auto custom-scrollbar">
                            {CITIES.map(city => (
                              <div key={city} onClick={() => { setNewTrip({...newTrip, from: city}); setIsFromOpen(false); }} className="px-4 py-3 hover:bg-orange-50 hover:text-[#EF5222] rounded-xl cursor-pointer font-bold text-sm text-slate-600 transition-colors">{city}</div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Điểm đến */}
                  <div className="space-y-3">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Navigation size={14} /> Đích đến tại
                    </label>
                    <div className="relative">
                      <button 
                        onClick={() => setIsToOpen(!isToOpen)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-white hover:border-[#EF5222] transition-all"
                      >
                        <span>{newTrip.to}</span>
                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isToOpen ? 'rotate-90' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isToOpen && (
                          <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="absolute z-[110] w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 max-h-64 overflow-y-auto custom-scrollbar">
                            {CITIES.map(city => (
                              <div key={city} onClick={() => { setNewTrip({...newTrip, to: city}); setIsToOpen(false); }} className="px-4 py-3 hover:bg-orange-50 hover:text-[#EF5222] rounded-xl cursor-pointer font-bold text-sm text-slate-600 transition-colors">{city}</div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* HÀNG 2: THỜI GIAN (NGÀY + GIỜ + PHÚT) */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Chọn Ngày */}
                  <div className="space-y-3 col-span-1">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={14} /> Ngày chạy
                    </label>
                    <input 
                      type="date" 
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] transition-all" 
                    />
                  </div>

                  {/* Chọn Giờ & Phút */}
                  <div className="space-y-3 col-span-2">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} /> Giờ xuất phát chính xác
                    </label>
                    <div className="flex items-center gap-3">
                       <div className="flex-1 relative group">
                          <select 
                            value={selectedHour} 
                            onChange={(e) => setSelectedHour(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] appearance-none cursor-pointer transition-all"
                          >
                            {HOURS.map(h => <option key={h} value={h}>{h} Giờ</option>)}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-[#EF5222]">▼</div>
                       </div>
                       
                       <span className="text-2xl font-black text-slate-200">:</span>

                       <div className="flex-1 relative group">
                          <select 
                            value={selectedMinute} 
                            onChange={(e) => setSelectedMinute(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] appearance-none cursor-pointer transition-all"
                          >
                            {MINUTES.map(m => <option key={m} value={m}>{m} Phút</option>)}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-[#EF5222]">▼</div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* HÀNG 3: GIÁ VÉ */}
                <div className="space-y-3">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CircleDollarSign size={14} /> Đơn giá niêm yết (VNĐ)
                  </label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl group-focus-within:text-[#EF5222] transition-colors">₫</span>
                    <input 
                      type="number" 
                      value={newTrip.price} 
                      onChange={e => setNewTrip({...newTrip, price: Number(e.target.value)})} 
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-black text-2xl text-[#EF5222] outline-none focus:bg-white focus:border-[#EF5222] transition-all placeholder:text-slate-200" 
                      placeholder="0.000"
                    />
                  </div>
                </div>
              </div>

              {/* --- Footer: Nút bấm lớn, nổi bật --- */}
              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="flex-1 py-5 text-sm font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={() => {
                    // Ghép giờ phút vào departDate trước khi gửi
                    const finalDepartDate = `${selectedDay}T${selectedHour}:${selectedMinute}:00`;
                    handleAddTrip({...newTrip, departDate: finalDepartDate});
                  }} 
                  className="flex-[2] py-5 bg-gradient-to-r from-[#EF5222] to-[#D93814] text-white rounded-[20px] text-sm font-black uppercase tracking-widest shadow-[0_12px_24px_-6px_rgba(239,82,34,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                >
                  Xác nhận khởi tạo chuyến
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}