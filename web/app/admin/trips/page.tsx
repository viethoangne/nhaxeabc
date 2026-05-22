'use client';

import { API_BASE } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion'; 
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Calendar as CalendarIcon, Bus, Plus, Clock, MapPin, ChevronRight, ChevronLeft, 
  Filter, Search, ArrowRightLeft, Navigation, User, CarFront, 
  CheckCircle2, BadgeCheck, X, CircleDollarSign, Trash2, ShieldCheck, AlertCircle
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminTripsPage() {
  const today = new Date().toISOString().split('T')[0];
  
  // 🟢 HÀM CHUẨN HÓA ĐỊNH DẠNG NGÀY: DD/MM/YYYY
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const [selectedDate, setSelectedDate] = useState(today);
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [filterFromCity, setFilterFromCity] = useState('ALL');
  const [operationalFilter, setOperationalFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL'); 
  const [bookingFilter, setBookingFilter] = useState('ALL'); 
  const [sortBy, setSortBy] = useState('TIME'); 
  const [currentPage, setCurrentPage] = useState(1);
  
  // --- STATE MODAL THÊM CHUYẾN ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({
    from: 'TP. Hồ Chí Minh',
    to: 'Đà Lạt',
    departDate: '', 
    price: 100000,
    busType: 'Limousine'
  });

  const CITIES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Nha Trang', 'Đà Lạt', 'Vũng Tàu', 'Phan Thiết', 'Cần Thơ'];
  const HOURS = ['05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '00'];
  const MINUTES = ['00', '15', '30', '45']; 

  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(''); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // --- STATE & REF CHO BỘ LỊCH TÙY BIẾN CAO CẤP (CUSTOM CALENDAR HUD) ---
  const [isCustomCalendarOpen, setIsCustomCalendarOpen] = useState(false);
  const [currentCalMonth, setCurrentCalMonth] = useState(new Date(today));
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.city-dropdown-container')) {
        setIsDropdownOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(target)) {
        setIsCustomCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const ITEMS_PER_PAGE = 20;
  const { data: session } = useSession();
  const router = useRouter();

  // 🟢 GIỮ NGUYÊN 100% CÁC HÀM LOGIC CŨ
  const handleDeleteTrip = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chuyến xe này? Thao tác này không thể hoàn tác.")) return;

    try {
      const userId = (session?.user as any)?.id;
      await axios.delete(`${API_BASE}/admin/trips/${id}`, {
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
      const res = await axios.get(`${API_BASE}/admin/trips?date=${selectedDate}`, {
        headers: { 'x-user-id': userId }
      });
      setTrips(res.data);
    } catch (err) { 
      console.error("Lỗi lấy chuyến xe:", err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchFrom, searchTo, filterFromCity, selectedDate, operationalFilter, driverFilter, bookingFilter, sortBy]);

  useEffect(() => { 
    if (session) {
      fetchTrips(); 
    }
  }, [selectedDate, session]);

  useEffect(() => {
    const handleTripDeletedFromAI = () => {
      fetchTrips();
    };
    window.addEventListener('trip-deleted', handleTripDeletedFromAI);
    return () => {
      window.removeEventListener('trip-deleted', handleTripDeletedFromAI);
    };
  }, [selectedDate, session]);

  const handleAddTrip = async (formData: any) => {
    if (!selectedDay) return alert("Vui lòng chọn ngày khởi hành!");
    
    const departDate = `${selectedDay}T${selectedHour}:${selectedMinute}:00`;
    const payload = { ...formData, departDate };
  
    try {
      const userId = (session?.user as any)?.id;
      await axios.post(`${API_BASE}/admin/trips/manual`, payload, {
        headers: { 'x-user-id': userId }
      });
      alert("✅ Thêm chuyến xe thành công!");
      setIsAddModalOpen(false);
      fetchTrips();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi: Chuyến xe bị trùng giờ hoặc không đủ điều kiện 48h.");
    }
  };
  
  const handleSwapLocation = () => {
    const temp = searchFrom;
    setSearchFrom(searchTo);
    setSearchTo(temp);
  };

  const filteredTrips = useMemo(() => {
    const currentTime = new Date().getTime();
    const sixHoursLater = currentTime + 6 * 60 * 60 * 1000; 

    const filtered = trips.filter((trip: any) => {
      const fromMatch = trip.from.toLowerCase().includes(searchFrom.toLowerCase()) || trip.pickupPoint?.toLowerCase().includes(searchFrom.toLowerCase());
      const toMatch = trip.to.toLowerCase().includes(searchTo.toLowerCase()) || trip.dropoffPoint?.toLowerCase().includes(searchTo.toLowerCase());
      const cityMatch = filterFromCity === 'ALL' || trip.from === filterFromCity;

      const tripTime = new Date(trip.departDate).getTime();

      let opMatch = true;
      if (operationalFilter === 'UPCOMING_6H') {
        opMatch = tripTime >= currentTime && tripTime <= sixHoursLater && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED';
      } else if (operationalFilter === 'RUNNING') {
        opMatch = trip.status === 'RUNNING';
      } else if (operationalFilter === 'COMPLETED') {
        opMatch = trip.status === 'COMPLETED';
      }

      let driverMatch = true;
      if (driverFilter === 'HAS_DRIVER') {
        driverMatch = !!trip.driverId; 
      } else if (driverFilter === 'NO_DRIVER') {
        driverMatch = !trip.driverId;  
      }

      let bookingMatch = true;
      const bookedSeats = trip._count?.orderSeats || trip._count?.seats || 0;
      if (bookingFilter === 'HAS_BOOKINGS') {
        bookingMatch = bookedSeats > 0;
      } else if (bookingFilter === 'NO_BOOKINGS') {
        bookingMatch = bookedSeats === 0;
      }

      return fromMatch && toMatch && cityMatch && opMatch && driverMatch && bookingMatch;
    });

    return filtered.sort((a: any, b: any) => {
      if (sortBy === 'PASSENGERS_DESC') {
        const bookedA = a._count?.orderSeats || a._count?.seats || 0;
        const bookedB = b._count?.orderSeats || b._count?.seats || 0;
        return bookedB - bookedA; 
      } else {
        const fromCompare = a.from.localeCompare(b.from, 'vi');
        if (fromCompare !== 0) return fromCompare;
        
        const toCompare = a.to.localeCompare(b.to, 'vi');
        if (toCompare !== 0) return toCompare;

        return new Date(a.departDate).getTime() - new Date(b.departDate).getTime();
      }
    });

  }, [trips, searchFrom, searchTo, filterFromCity, operationalFilter, driverFilter, bookingFilter, sortBy]);

  const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE);
  const paginatedTrips = filteredTrips.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- HÀM TẠO LỊCH TÙY BIẾN ---
  const generateCalendarDays = () => {
    const year = currentCalMonth.getFullYear();
    const month = currentCalMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, dateStr: '' });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      days.push({ day: i, isCurrentMonth: true, dateStr: `${year}-${mStr}-${dStr}` });
    }
    const totalCells = Math.ceil(days.length / 7) * 7;
    const nextDaysCount = totalCells - days.length;
    for (let i = 1; i <= nextDaysCount; i++) {
      days.push({ day: i, isCurrentMonth: false, dateStr: '' });
    }
    return days;
  };

  const nextCalMonth = () => {
    setCurrentCalMonth(new Date(currentCalMonth.getFullYear(), currentCalMonth.getMonth() + 1, 1));
  };
  const prevCalMonth = () => {
    setCurrentCalMonth(new Date(currentCalMonth.getFullYear(), currentCalMonth.getMonth() - 1, 1));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header VIP Ambient Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg mb-6 mt-1 bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 border border-orange-500/20">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#ea580c]/15 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:20px_20px]"></div>
        
        <div className="relative p-6 lg:px-8 lg:py-6 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="bg-gradient-to-tr from-[#ea580c] to-[#EF5222] p-2.5 rounded-xl shadow-[0_4px_12px_rgba(234,88,12,0.3)] border border-orange-400/30">
                <Bus className="w-6 h-6 text-white animate-pulse" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                <span>Điều phối Chuyến xe</span>
                <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent text-[11px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 shadow-inner">DISPATCH HUD</span>
              </h1>
            </div>
            <p className="text-slate-300 font-medium text-sm max-w-2xl leading-relaxed">
              Quản lý lộ trình, giám sát phân công tài xế và phương tiện theo thời gian thực.
            </p>
          </div>
        </div>
      </div>

      {/* KHU VỰC BỘ LỌC ĐA NĂNG */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6 overflow-visible">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-gradient-to-b from-[#ea580c] to-amber-500 rounded-full"></div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Bộ Lọc & Tra Cứu Nhanh</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Khả dụng: <strong className="text-[#ea580c] font-black">{filteredTrips.length}</strong> chuyến xe
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* CÁC NÚT CHỌN NGÀY NHANH CỰC KỲ TIỆN LỢI */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shadow-inner">
              {[
                { label: 'Hôm qua', val: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
                { label: 'Hôm nay', val: today },
                { label: 'Ngày mai', val: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => setSelectedDate(item.val)}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${selectedDate === item.val ? 'bg-white text-[#ea580c] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* BỘ LỊCH TÙY BIẾN CAO CẤP (CUSTOM CALENDAR HUD - KHÔNG XÀI TRUYỀN THỐNG) */}
            <div className="relative" ref={calendarRef}>
              <button 
                onClick={() => setIsCustomCalendarOpen(!isCustomCalendarOpen)}
                className={`flex items-center bg-white border rounded-xl px-4 py-2 text-sm font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${isCustomCalendarOpen ? 'border-[#ea580c] ring-2 ring-orange-50 text-[#ea580c]' : 'border-slate-200 hover:border-orange-400 text-slate-800'}`}
              >
                <CalendarIcon size={16} className="text-[#ea580c] mr-2" />
                <span>{formatDisplayDate(selectedDate)}</span>
              </button>

              <AnimatePresence>
                {isCustomCalendarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-2xl border border-slate-100 rounded-2xl shadow-2xl p-4 z-50"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <button onClick={prevCalMonth} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                        <ChevronLeft size={18} strokeWidth={2.5} />
                      </button>
                      <span className="font-black text-sm text-slate-800 capitalize tracking-wide">
                        Tháng {currentCalMonth.getMonth() + 1} / {currentCalMonth.getFullYear()}
                      </span>
                      <button onClick={nextCalMonth} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                        <ChevronRight size={18} strokeWidth={2.5} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-[11px] text-slate-400 py-2">
                      {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <span key={d}>{d}</span>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {generateCalendarDays().map((cell, idx) => {
                        const isSelected = cell.dateStr === selectedDate;
                        const isToday = cell.dateStr === today;
                        return (
                          <button
                            key={idx}
                            disabled={!cell.isCurrentMonth}
                            onClick={() => {
                              setSelectedDate(cell.dateStr);
                              setIsCustomCalendarOpen(false);
                            }}
                            className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-black transition-all ${
                              !cell.isCurrentMonth ? 'text-slate-200 cursor-not-allowed' :
                              isSelected ? 'bg-gradient-to-r from-[#ea580c] to-amber-500 text-white shadow-md shadow-orange-500/20 scale-105' :
                              isToday ? 'bg-orange-50 text-[#ea580c] border border-orange-200' :
                              'text-slate-700 hover:bg-slate-100 cursor-pointer'
                            }`}
                          >
                            {cell.day}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsAddModalOpen(true)} 
              className="bg-gradient-to-r from-[#ea580c] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white p-3 rounded-xl shadow-[0_4px_15px_rgba(234,88,12,0.3)] active:scale-95 transition-all cursor-pointer ml-1"
              title="Thêm chuyến xe mới"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Tìm Kiếm & Lọc */}
        <div className="flex flex-col lg:flex-row items-center gap-3">
          <div className="relative flex-1 w-full group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ea580c] transition-colors">
              <MapPin size={18} strokeWidth={2.5} />
            </div>
            <input 
              type="text"
              placeholder="Điểm khởi hành..."
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-50 shadow-inner transition-all placeholder:text-slate-400"
            />
          </div>
          
          <button 
            onClick={handleSwapLocation}
            className="w-10 h-10 shrink-0 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-[#ea580c] hover:border-[#ea580c] hover:bg-orange-50 hover:rotate-180 active:scale-90 transition-all duration-300 z-10 shadow-2xs hover:shadow-md cursor-pointer"
            title="Đảo chiều tuyến"
          >
            <ArrowRightLeft size={16} strokeWidth={2.5} />
          </button>

          <div className="relative flex-1 w-full group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ea580c] transition-colors">
              <Navigation size={18} strokeWidth={2.5} />
            </div>
            <input 
              type="text"
              placeholder="Điểm đến..."
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-50 shadow-inner transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="relative w-full lg:w-[220px] shrink-0 city-dropdown-container">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none z-10 ${isDropdownOpen ? 'text-[#ea580c]' : 'text-slate-400'}`}>
              <Filter size={18} strokeWidth={2.5} />
            </div>
            
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full pl-11 pr-10 py-3 text-left text-sm font-black rounded-xl outline-none border transition-all duration-200 flex items-center justify-between shadow-sm cursor-pointer ${isDropdownOpen ? 'bg-white border-[#ea580c] ring-2 ring-orange-50 text-[#ea580c]' : 'bg-slate-50 border-slate-200 hover:border-orange-400 text-slate-700'}`}
            >
              <span className="truncate">
                {filterFromCity === 'ALL' ? 'Tất cả điểm đi' : filterFromCity}
              </span>
              <ChevronRight size={16} className={`text-slate-400 transition-transform duration-300 shrink-0 ${isDropdownOpen ? 'rotate-90' : 'rotate-0'}`} />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-0 lg:right-0 top-full mt-2 w-full bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-2xl py-2 z-50 max-h-[300px] overflow-y-auto"
                >
                  <button
                    onClick={() => {
                      setFilterFromCity('ALL');
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-5 py-2.5 text-left text-[13.5px] font-black transition-colors cursor-pointer ${filterFromCity === 'ALL' ? 'bg-orange-50 text-[#ea580c]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <span>Tất cả điểm đi</span>
                    {filterFromCity === 'ALL' && <CheckCircle2 size={16} className="text-[#ea580c]" />}
                  </button>
                  
                  <div className="h-px bg-slate-100 my-1 mx-2"></div>

                  {CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setFilterFromCity(city);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-5 py-2.5 text-left text-[13.5px] font-black transition-colors cursor-pointer ${filterFromCity === city ? 'bg-orange-50 text-[#ea580c]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <span>{city}</span>
                      {filterFromCity === city && <CheckCircle2 size={16} className="text-[#ea580c]" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="pt-5 mt-2 border-t border-slate-100 space-y-4 w-full">
          {/* Dòng 1: Lọc Trạng Thái Vận Hành */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="w-[110px] text-xs font-extrabold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <Clock size={14} className="text-slate-400" /> Vận hành:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setOperationalFilter('ALL')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${operationalFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800 shadow-md scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
              >
                Tất cả chuyến
              </button>
              <button 
                onClick={() => setOperationalFilter('UPCOMING_6H')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${operationalFilter === 'UPCOMING_6H' ? 'bg-orange-50 text-[#ea580c] border-[#ea580c] ring-2 ring-orange-100 shadow-sm scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-orange-200 hover:bg-orange-50/50'}`}
              >
                Sắp chạy (6h tới)
              </button>
              <button 
                onClick={() => setOperationalFilter('RUNNING')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${operationalFilter === 'RUNNING' ? 'bg-blue-50 text-blue-600 border-blue-500 ring-2 ring-blue-100 shadow-sm scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-200 hover:bg-blue-50/50'}`}
              >
                Đang trên đường
              </button>
              <button 
                onClick={() => setOperationalFilter('COMPLETED')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${operationalFilter === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-500 ring-2 ring-emerald-100 shadow-sm scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50'}`}
              >
                Đã cập bến
              </button>
            </div>
          </div>

          {/* Dòng 2: Lọc Trạng Thái Tài Xế */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="w-[110px] text-xs font-extrabold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <User size={14} className="text-slate-400" /> Tài xế:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setDriverFilter('ALL')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${driverFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800 shadow-md scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
              >
                Tất cả tài xế
              </button>
              <button 
                onClick={() => setDriverFilter('NO_DRIVER')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${driverFilter === 'NO_DRIVER' ? 'bg-rose-50 text-rose-600 border-rose-500 ring-2 ring-rose-100 shadow-sm scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-200 hover:bg-rose-50/50'}`}
              >
                Chưa có tài xế
              </button>
              <button 
                onClick={() => setDriverFilter('HAS_DRIVER')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${driverFilter === 'HAS_DRIVER' ? 'bg-indigo-50 text-indigo-600 border-indigo-500 ring-2 ring-indigo-100 shadow-sm scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'}`}
              >
                Đã xếp tài xế
              </button>
            </div>
          </div>

          {/* Dòng 3: Lọc Trạng Thái Vé Đặt */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="w-[110px] text-xs font-extrabold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400" /> Vé đặt:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setBookingFilter('ALL')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${bookingFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800 shadow-md scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
              >
                Tất cả lượng vé
              </button>
              <button 
                onClick={() => setBookingFilter('HAS_BOOKINGS')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${bookingFilter === 'HAS_BOOKINGS' ? 'bg-amber-50 text-amber-600 border-amber-500 ring-2 ring-amber-100 shadow-sm scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-200 hover:bg-amber-50/50'}`}
              >
                Đã có khách đặt
              </button>
              <button 
                onClick={() => setBookingFilter('NO_BOOKINGS')}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${bookingFilter === 'NO_BOOKINGS' ? 'bg-slate-100 text-slate-600 border-slate-400 ring-2 ring-slate-200 shadow-sm scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
              >
                Chưa có khách
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-slate-100 mt-1 gap-2">
            <div className="text-xs font-extrabold text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#ea580c]" />
              <span>* Mẹo: Kết hợp các bộ lọc hàng ngang trên để tra cứu chính xác lộ trình Ngài mong muốn.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1">Sắp xếp:</span>
              <button
                onClick={() => setSortBy(prev => prev === 'TIME' ? 'PASSENGERS_DESC' : 'TIME')}
                className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black rounded-xl border transition-all shadow-2xs hover:shadow-md cursor-pointer active:scale-95 ${sortBy === 'PASSENGERS_DESC' ? 'bg-gradient-to-r from-[#ea580c] to-amber-500 text-white border-orange-500' : 'bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:bg-orange-50/20'}`}
              >
                {sortBy === 'PASSENGERS_DESC' ? '🔥 Khách đặt nhiều nhất' : '🕒 Giờ chạy (Lộ trình)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DANH SÁCH CHUYẾN XE */}
      <div className="grid grid-cols-1 gap-4 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-xs z-10 flex items-center justify-center rounded-2xl">
             <div className="w-8 h-8 border-4 border-[#ea580c]/30 border-t-[#ea580c] rounded-full animate-spin" />
          </div>
        )}

        {paginatedTrips.map((trip: any) => {
          const bookedSeats = trip._count?.orderSeats || trip._count?.seats || 0;
          const totalSeats = trip.tickets?.[0]?.numTickets || 0;
          const fillPercentage = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;
          
          const tripTime = new Date(trip.departDate).getTime();
          const currentTime = new Date().getTime();
          const isPastDate = tripTime < currentTime;
          const isDepartingWithin42h = tripTime >= currentTime && tripTime <= currentTime + 42 * 60 * 60 * 1000;
          const hasDriverAssigned = !!trip.driverId;
          const hasBookings = bookedSeats > 0;

          // 🟢 ĐIỀU KIỆN CHO PHÉP XÓA: CHƯA QUA GIỜ CHẠY + CHƯA CÓ KHÁCH + (NẾU CÓ TÀI THÌ KHÔNG NẰM TRONG 42H)
          const canDelete = trip.status === 'PUBLISHED' && !isPastDate && !hasBookings && !(hasDriverAssigned && isDepartingWithin42h);

          return (
            <div key={trip.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-orange-500/40 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-lg group flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6 min-w-[380px]">
                <div className="text-center w-[70px] bg-slate-50 group-hover:bg-orange-50/60 p-3 rounded-2xl border border-slate-100 group-hover:border-orange-200 transition-colors">
                  <p className="text-xl font-black text-slate-800 group-hover:text-[#ea580c] transition-colors">
                    {new Date(trip.departDate).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 font-black text-slate-800 text-base tracking-tight">
                    <span className="hover:text-[#ea580c] transition-colors">{trip.from}</span>
                    <ChevronRight size={16} className="text-[#ea580c]" />
                    <span className="hover:text-[#ea580c] transition-colors">{trip.to}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-2xs">
                      {trip.busType}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {trip.pickupPoint}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-3 text-xs flex-wrap">
                    <span className="flex items-center gap-1.5 font-black text-slate-700 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                      <User size={14} className={trip.driver ? "text-[#ea580c]" : "text-slate-300"} /> 
                      {trip.driver ? trip.driver.name : <span className="text-slate-400 font-bold italic">Chưa xếp tài xế</span>}
                    </span>
                    <span className="flex items-center gap-1.5 font-black text-slate-700 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 font-mono">
                      <CarFront size={14} className={trip.bus ? "text-blue-500" : "text-slate-300"} /> 
                      {trip.bus ? trip.bus.plateNumber : <span className="text-slate-400 font-bold italic">Chưa xếp xe</span>}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center min-w-[140px] px-4 py-2 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Tình trạng vé</p>
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-[#ea580c] to-amber-500 transition-all duration-500" style={{ width: `${fillPercentage}%` }} />
                  </div>
                  <span className="text-xs font-black text-slate-800">{bookedSeats}/{totalSeats}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 min-w-[200px] justify-end">
                 <div className="text-right mr-2">
                    <p className="text-xl font-black text-[#ea580c] tracking-tight">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ</p>
                    <p className={`text-[10px] font-black mt-0.5 uppercase tracking-widest ${trip.status === 'PUBLISHED' ? 'text-emerald-500' : 'text-blue-600'}`}>
                      ● {trip.status}
                    </p>
                 </div>
                 
                 {canDelete && (
                   <button 
                     onClick={() => handleDeleteTrip(trip.id)}
                     className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-2xs hover:shadow-md cursor-pointer active:scale-95"
                     title="Xóa chuyến xe"
                   >
                     <Trash2 size={18} strokeWidth={2.5} />
                   </button>
                 )}

                 <button 
                   onClick={() => router.push(`/admin/trips/${trip.id}`)} 
                   disabled={trip.status === 'COMPLETED'} 
                   className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-md ${
                     trip.status === 'RUNNING' 
                     ? 'bg-blue-50 text-blue-500 border-blue-200 hover:bg-blue-600 hover:text-white' 
                     : 'bg-white text-slate-600 border-slate-200 hover:bg-gradient-to-r hover:from-[#ea580c] hover:to-amber-500 hover:text-white hover:border-transparent'
                   }`}
                   title="Quản lý chi tiết / Xếp tài xế"
                 >
                   <ChevronRight size={20} strokeWidth={3} />
                 </button>
              </div>
            </div>
          );
        })}
        
        {!isLoading && filteredTrips.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Bus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-black text-lg mb-1">Không tìm thấy chuyến xe nào khớp với ngày/bộ lọc!</p>
            <p className="text-slate-500 text-sm font-medium">Vui lòng chọn ngày khác hoặc thử tra cứu với điều kiện khác thưa Ngài.</p>
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mt-2 font-bold text-sm">
            <span className="text-slate-500">
              Trang <span className="text-[#ea580c] font-black">{currentPage}</span> / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-[#ea580c] hover:border-[#ea580c] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={18} strokeWidth={3} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-[#ea580c] hover:border-[#ea580c] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all cursor-pointer shadow-2xs"
              >
                <ChevronRight size={18} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL THÊM CHUYẾN - PHIÊN BẢN MỞ RỘNG LUXURY */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }} 
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center shadow-inner">
                    <Plus className="text-[#ea580c]" size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">Thiết lập Chuyến xe mới</h3>
                    <p className="text-[12px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Hệ thống điều phối thủ công</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-rose-50 hover:text-rose-500 text-slate-300 transition-all duration-300 cursor-pointer"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={14} /> Khởi hành từ
                    </label>
                    <div className="relative">
                      <button 
                        onClick={() => setIsFromOpen(!isFromOpen)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 hover:bg-white hover:border-[#ea580c] transition-all cursor-pointer shadow-inner"
                      >
                        <span>{newTrip.from}</span>
                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isFromOpen ? 'rotate-90' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isFromOpen && (
                          <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="absolute z-[110] w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 max-h-64 overflow-y-auto">
                            {CITIES.map(city => (
                              <div key={city} onClick={() => { setNewTrip({...newTrip, from: city}); setIsFromOpen(false); }} className="px-4 py-3 hover:bg-orange-50 hover:text-[#ea580c] rounded-xl cursor-pointer font-extrabold text-sm text-slate-600 transition-colors">{city}</div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Navigation size={14} /> Đích đến tại
                    </label>
                    <div className="relative">
                      <button 
                        onClick={() => setIsToOpen(!isToOpen)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 hover:bg-white hover:border-[#ea580c] transition-all cursor-pointer shadow-inner"
                      >
                        <span>{newTrip.to}</span>
                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isToOpen ? 'rotate-90' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isToOpen && (
                          <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="absolute z-[110] w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 max-h-64 overflow-y-auto">
                            {CITIES.map(city => (
                              <div key={city} onClick={() => { setNewTrip({...newTrip, to: city}); setIsToOpen(false); }} className="px-4 py-3 hover:bg-orange-50 hover:text-[#ea580c] rounded-xl cursor-pointer font-extrabold text-sm text-slate-600 transition-colors">{city}</div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-3 col-span-1">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CalendarIcon size={14} /> Ngày chạy
                    </label>
                    <input 
                      type="date" 
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:bg-white focus:border-[#ea580c] transition-all shadow-inner" 
                    />
                  </div>

                  <div className="space-y-3 col-span-2">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} /> Giờ xuất phát chính xác
                    </label>
                    <div className="flex items-center gap-3">
                       <div className="flex-1 relative group">
                          <select 
                            value={selectedHour} 
                            onChange={(e) => setSelectedHour(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:bg-white focus:border-[#ea580c] appearance-none cursor-pointer transition-all shadow-inner"
                          >
                            {HOURS.map(h => <option key={h} value={h}>{h} Giờ</option>)}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-[#ea580c]">▼</div>
                       </div>
                       
                       <span className="text-2xl font-black text-slate-300">:</span>

                       <div className="flex-1 relative group">
                          <select 
                            value={selectedMinute} 
                            onChange={(e) => setSelectedMinute(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:bg-white focus:border-[#ea580c] appearance-none cursor-pointer transition-all shadow-inner"
                          >
                            {MINUTES.map(m => <option key={m} value={m}>{m} Phút</option>)}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-[#ea580c]">▼</div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CircleDollarSign size={14} /> Đơn giá niêm yết (VNĐ)
                  </label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl group-focus-within:text-[#ea580c] transition-colors">₫</span>
                    <input 
                      type="number" 
                      value={newTrip.price} 
                      onChange={e => setNewTrip({...newTrip, price: Number(e.target.value)})} 
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-black text-2xl text-[#ea580c] outline-none focus:bg-white focus:border-[#ea580c] transition-all placeholder:text-slate-200 shadow-inner" 
                      placeholder="0.000"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="flex-1 py-5 text-sm font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={() => {
                    const finalDepartDate = `${selectedDay}T${selectedHour}:${selectedMinute}:00`;
                    handleAddTrip({...newTrip, departDate: finalDepartDate});
                  }} 
                  className="flex-[2] py-5 bg-gradient-to-r from-[#ea580c] to-amber-500 text-white rounded-[20px] text-sm font-black uppercase tracking-widest shadow-[0_12px_24px_-6px_rgba(234,88,12,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
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