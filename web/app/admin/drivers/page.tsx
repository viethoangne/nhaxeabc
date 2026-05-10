'use client';
import { API_BASE } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { 
  Plus, Search, Edit2, Trash2, BadgeCheck, 
  Phone, MapPin, User, ChevronLeft, ChevronRight, CarFront, Navigation, CheckCircle2, Clock, 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DriverManagementPage() {
  const { data: session } = useSession();
  
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🟢 State cho Filter & Phân trang
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRouteFilter, setActiveRouteFilter] = useState('TẤT CẢ');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  // Chỉ giữ lại một lần duy nhất đoạn này
const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
const [activeLocationFilter, setActiveLocationFilter] = useState('ALL');
const [activeBusFilter, setActiveBusFilter] = useState('ALL');
const locations = ['ALL', 'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Lạt', 'Nha Trang', 'Cần Thơ', 'Đà Nẵng', 'Vũng Tàu', 'Phan Thiết'];
const [isLocationOpen, setIsLocationOpen] = useState(false);
  // Modal State
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ 
    id: null, driverCode: '', name: '', phone: '', 
    licenseNo: '', baseLocation: '', routeCode: 'SG-DL', status: 'AVAILABLE' ,
    plateNumber: '' // 🟢 Thêm dòng này
  });

  // 🟢 THÊM STATE ĐỂ LƯU TUYẾN XE ĐỘNG & GỌI API
  const [dynamicRoutes, setDynamicRoutes] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        // Gọi API từ schedule.controller.ts của bạn
        const res = await axios.get('${API_BASE}/schedule/routes');
        setDynamicRoutes(res.data);
      } catch (error) {
        console.error('Lỗi tải danh sách tuyến:', error);
      }
    };
    fetchRoutes();
  }, []);

  const fetchDrivers = async (page = 1) => {
    setIsLoading(true);
    try {
      const token = (session as any)?.accessToken || (session?.user as any)?.token || '';
      const userId = (session?.user as any)?.id;
      
      const res = await axios.get('${API_BASE}/admin/trips/drivers/paginated', {
        params: { 
          page, 
          limit: 20, 
          search: searchTerm, 
          // 🟢 Gửi thêm 2 tham số lọc mới vào đây
          // 🟢 Sửa 'route' thành 'routeCode'
          routeCode: activeRouteFilter !== 'TẤT CẢ' ? activeRouteFilter : undefined,
          busStatus: activeBusFilter !== 'ALL' ? activeBusFilter : undefined,
          
          status: activeStatusFilter !== 'ALL' ? activeStatusFilter : undefined,
          baseLocation: activeLocationFilter !== 'ALL' ? activeLocationFilter : undefined
        },
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId 
        }
      });
      
      setDrivers(res.data.data);
      setPagination(res.data.meta);
    } catch (error) {
      console.error('Lỗi tải danh sách tài xế:', error);
    } finally {
      setIsLoading(false);
    }
  };
  // 🟢 DEBOUNCE SEARCH: Tự động gọi API sau khi ngừng gõ 500ms hoặc đổi Tab
  // 🟢 Tự động gọi API khi bất kỳ bộ lọc nào thay đổi
  useEffect(() => {
    if (!session) return;
    const delayDebounceFn = setTimeout(() => {
      fetchDrivers(1); // Luôn về trang 1 khi đổi bộ lọc
    }, 500);

    return () => clearTimeout(delayDebounceFn);
    // 🟢 Thêm activeRouteFilter và activeBusFilter vào mảng theo dõi
  }, [searchTerm, activeRouteFilter, activeStatusFilter, activeLocationFilter, activeBusFilter, session]);

  // Các hàm Modal giữ nguyên
  const handleOpenModal = (driver: any = null) => {
    if (driver) {
      setIsEditing(true);
      // 🟢 Cập nhật plateNumber khi bấm Edit
      setFormData({ ...driver, plateNumber: driver.defaultBus?.plateNumber || '' }); 
    } else {
      setIsEditing(false);
      setFormData({ 
        id: null, driverCode: `TX-${Date.now().toString().slice(-4)}`, 
        name: '', phone: '', licenseNo: '', 
        baseLocation: '', routeCode: 'SG-DL', status: 'AVAILABLE',
        plateNumber: '' // 🟢 Reset plateNumber khi thêm mới
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const token = (session as any)?.accessToken || (session?.user as any)?.token || '';
    try {
      if (isEditing) {
        await axios.put(`${API_BASE}/admin/trips/drivers/${formData.id}`, formData, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
      } else {
        await axios.post('${API_BASE}/admin/trips/drivers', formData, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
      }
      setIsModalOpen(false);
      fetchDrivers(pagination.page); // Reload lại trang hiện tại
    } catch (error) {
      alert('Lỗi: Số điện thoại hoặc Mã tài xế đã tồn tại!');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'ON_TRIP': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'RESTING': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
    
  };
  // 🟢 HÀM XỬ LÝ XÓA TÀI XẾ
  const handleDeleteDriver = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài xế này? Thao tác này sẽ giải phóng xe được gán.")) return;

    try {
      const token = (session as any)?.accessToken || (session?.user as any)?.token || '';
      await axios.delete(`${API_BASE}/admin/trips/drivers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("✅ Đã xóa tài xế thành công!");
      fetchDrivers(pagination.page); // Load lại danh sách
    } catch (error) {
      alert("Lỗi: Không thể xóa tài xế đang có lịch trình chạy!");
    }
  };
  // 🟢 ĐÃ SỬA: Hàm gọi API đồng bộ khẩn cấp
  const handleFixRoutes = async () => {
    if (!window.confirm("Hệ thống sẽ quét và gỡ kẹt cho toàn bộ tài xế, đồng thời gán xe cho các chuyến sắp chạy. Bạn có chắc chắn?")) return;
    
    try {
      setIsLoading(true);
      const token = (session as any)?.accessToken || (session?.user as any)?.token || '';
      
      const res = await axios.get('${API_BASE}/admin/trips/emergency-sync', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      alert(`🎉 Thành công: ${res.data.message}`);
      fetchDrivers(1); // Tự động load lại danh sách
    } catch (error) {
      alert("❌ Có lỗi xảy ra khi chạy lệnh đồng bộ!");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* =========================================================
          PHẦN 1 & 2: HEADER VÀ BỘ LỌC (GIAO DIỆN CAO CẤP)
          ========================================================= */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative mb-6">
        
        {/* 🟢 Background Gradient siêu đẹp ở góc phải */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-orange-100/60 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

        <div className="p-6 md:p-8 relative z-10 space-y-6">
          
          {/* TOP: TIÊU ĐỀ & NÚT THÊM */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-12 bg-gradient-to-b from-[#EF5222] to-orange-400 rounded-full shadow-sm"></div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Điều phối Tài xế</h1>
                <p className="text-[13px] font-medium text-slate-500 mt-1">
                  Đang quản lý <strong className="text-[#EF5222] text-sm">{pagination.total}</strong> nhân sự trên toàn hệ thống
                </p>
              </div>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="px-6 py-3.5 bg-[#EF5222] text-white rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 transition-all shrink-0"
            >
              <Plus size={20} strokeWidth={3} /> Thêm tài xế mới
            </button>
            {/* Bạn có thể đổi tên nút nếu có, hoặc nếu trước đó tôi chưa đưa bạn nút này thì bỏ qua */}
            {/* Nút gọi hàm handleFixRoutes */}
            <button 
              onClick={handleFixRoutes}
              className="px-6 py-3.5 bg-slate-800 text-white rounded-2xl flex items-center gap-2 font-bold shadow-lg hover:-translate-y-0.5 transition-all shrink-0"
            >
               Khôi phục Hệ thống
            </button>
          </div>

          {/* MIDDLE: BỘ LỌC TÌM KIẾM CHI TIẾT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Ô Tìm kiếm */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-slate-400 group-focus-within:text-[#EF5222] transition-colors" size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Tìm tên, SĐT hoặc mã tài xế..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all"
              />
            </div>

            {/* 2. Dropdown Tuyến Xe (Lấy tự động từ API) */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Navigation className="text-slate-400 group-focus-within:text-[#EF5222] transition-colors" size={18} />
              </div>
              <select
                value={activeRouteFilter}
                onChange={(e) => setActiveRouteFilter(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all appearance-none cursor-pointer"
              >
                <option value="TẤT CẢ">Tất cả tuyến hoạt động</option>
                {/* Render Tuyến bằng tên ĐẦY ĐỦ, không viết tắt */}
                {dynamicRoutes.map((route, idx) => {
                  const routeName = `${route.from} ➔ ${route.to}`;
                  return (
                    <option key={idx} value={routeName}>
                      {routeName}
                    </option>
                  );
                })}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={16} />
            </div>

            {/* 3. Dropdown Khu Vực Gốc */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="text-slate-400 group-focus-within:text-[#EF5222] transition-colors" size={18} />
              </div>
              <select
                value={activeLocationFilter}
                onChange={(e) => setActiveLocationFilter(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all appearance-none cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc === 'ALL' ? 'Tất cả khu vực' : loc}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={16} />
            </div>

          </div>

          {/* BOTTOM: LỌC NHANH (Trạng thái Tài xế & Tình trạng gắn xe) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-6 border-t border-slate-100">
            
            {/* Nhóm 1: Trạng thái cá nhân */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-2">Tình trạng:</span>
              {[
                { id: 'ALL', label: 'Tất cả', icon: User },
                { id: 'AVAILABLE', label: 'Sẵn sàng', icon: CheckCircle2 },
                { id: 'ON_TRIP', label: 'Đang chạy', icon: Navigation },
                { id: 'RESTING', label: 'Đang nghỉ', icon: Clock }
              ].map(st => {
                const Icon = st.icon;
                const isActive = activeStatusFilter === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveStatusFilter(st.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold rounded-xl border transition-all ${
                      isActive 
                      ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} strokeWidth={2.5} /> 
                    {st.label}
                  </button>
                );
              })}
            </div>

            {/* Nhóm 2: Tình trạng gắn Biển số (Nút có màu nổi bật) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-2 hidden sm:block">Xe phân bổ:</span>
              <button 
                onClick={() => setActiveBusFilter(prev => prev === 'NO_BUS' ? 'ALL' : 'NO_BUS')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold rounded-xl border transition-all ${activeBusFilter === 'NO_BUS' ? 'bg-red-50 text-red-600 border-red-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600'}`}
              >
                <CarFront size={14} /> Chưa gắn xe
              </button>

              <button 
                onClick={() => setActiveBusFilter(prev => prev === 'HAS_BUS' ? 'ALL' : 'HAS_BUS')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold rounded-xl border transition-all ${activeBusFilter === 'HAS_BUS' ? 'bg-indigo-50 text-indigo-600 border-indigo-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'}`}
              >
                <BadgeCheck size={14} /> Đã có xe
              </button>
            </div>

          </div>
        </div>
      </div>
      {/* ========================================================= */}
      {/* 3. DRIVERS LIST (GIAO DIỆN DẠNG THẺ GIỐNG QUẢN LÝ CHUYẾN XE) */}
      <div className="relative space-y-3">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-3xl">
            <div className="w-8 h-8 border-4 border-[#EF5222]/30 border-t-[#EF5222] rounded-full animate-spin" />
          </div>
        )}

        {drivers.map(driver => (
          <div key={driver.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:border-orange-200 hover:shadow-sm transition-all group">
            
            {/* CỘT 1: THÔNG TIN CÁ NHÂN */}
            <div className="flex items-center gap-4 min-w-[280px]">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-[#EF5222] font-black text-sm border border-orange-100 shrink-0">
                {driver.driverCode.split('-').pop()}
              </div>
              <div>
                <div className="font-bold text-slate-800 text-[15px]">{driver.name}</div>
                <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 mt-1">
                  <span>{driver.driverCode}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="flex items-center gap-1"><Phone size={12}/> {driver.phone}</span>
                </div>
              </div>
            </div>

            {/* CỘT 2: XE & BẰNG LÁI */}
            <div className="flex flex-col gap-1.5 min-w-[220px]">
              <div className="flex items-center gap-2 text-[13px] font-black text-[#EF5222]">
                <CarFront size={15} className="shrink-0" /> 
                {driver.defaultBus?.plateNumber || 'Chưa được phân xe'}
              </div>
              <div className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
                <BadgeCheck size={14} className="text-blue-500 shrink-0" /> 
                Bằng: {driver.licenseNo || 'Chưa cập nhật'}
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                <MapPin size={12} className="shrink-0" /> 
                {driver.baseLocation}
              </div>
            </div>

            {/* CỘT 3: TÌNH TRẠNG & SỐ CHUYẾN */}
            <div className="flex flex-col items-start min-w-[200px]">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Đã hoàn thành: <span className="text-slate-600">{driver._count?.assignments || 0} chuyến</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-[11px] font-black uppercase tracking-wider ${getStatusStyle(driver.status)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${driver.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-current'}`}></div>
                  {driver.status === 'AVAILABLE' ? 'Sẵn sàng' : driver.status === 'ON_TRIP' ? 'Đang chạy' : 'Đang nghỉ'}
                </div>
                
                {/* Hành trình đang chạy */}
                {driver.status === 'ON_TRIP' && driver.assignments?.[0]?.trip && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-md text-[11px] font-bold">
                    <Navigation size={12} className="text-blue-500 animate-pulse shrink-0" />
                    <span className="truncate max-w-[140px]">
                      {driver.assignments[0].trip.from} ➔ {driver.assignments[0].trip.to}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* CỘT 4: THAO TÁC */}
            <div className="flex items-center justify-end gap-2 min-w-[100px] mt-4 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-transparent border-slate-100">
              <button 
                onClick={() => handleOpenModal(driver)} 
                className="w-10 h-10 flex items-center justify-center text-slate-400 bg-slate-50 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-xl border border-slate-200 transition-all"
                title="Sửa thông tin"
              >
                <Edit2 size={16} strokeWidth={2.5} />
              </button>
              
              <button 
                onClick={() => {
                  if (driver.status === 'ON_TRIP') {
                    alert("⚠️ Hệ thống từ chối thao tác: Không thể xóa tài xế đang thực hiện chuyến đi!");
                    return;
                  }
                  handleDeleteDriver(driver.id);
                }} 
                disabled={driver.status === 'ON_TRIP'}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                  driver.status === 'ON_TRIP'
                  ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60'
                  : 'bg-white text-slate-400 border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200'
                }`}
                title={driver.status === 'ON_TRIP' ? "Đang chạy xe, không thể xóa" : "Xóa tài xế"}
              >
                <Trash2 size={16} strokeWidth={2.5} />
              </button>
            </div>

          </div>
        ))}

        {/* Trạng thái trống (Không có tài xế) */}
        {drivers.length === 0 && !isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <User size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy tài xế</h3>
            <p className="text-sm text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        )}
      </div>

      {/* PHÂN TRANG KIỂU HIỆN ĐẠI */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 mt-4 shadow-sm">
          <span className="text-[13px] font-bold text-slate-500">
            Trang <span className="text-[#EF5222]">{pagination.page}</span> / {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              disabled={pagination.page <= 1} 
              onClick={() => fetchDrivers(pagination.page - 1)} 
              className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-[#EF5222] hover:border-[#EF5222] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button 
              disabled={pagination.page >= pagination.totalPages} 
              onClick={() => fetchDrivers(pagination.page + 1)} 
              className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-[#EF5222] hover:border-[#EF5222] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-500 transition-all"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL SECTION */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl">
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{isEditing ? 'Cập nhật tài xế' : 'Đăng ký tài xế mới'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">✕</button>
              </div>
              <div className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mã định danh</label>
                    <input disabled={isEditing} value={formData.driverCode} onChange={e => setFormData({...formData, driverCode: e.target.value})} className="w-full px-5 py-3.5 bg-slate-100 border-none rounded-2xl font-bold text-[#EF5222] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Họ và Tên</label>
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:bg-white focus:border-[#EF5222] transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                      <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-[#EF5222]" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Khu vực Gốc (Nơi ở)</label>
                      <input value={formData.baseLocation} onChange={e => setFormData({...formData, baseLocation: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-[#EF5222]" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bằng lái</label>
                      <input value={formData.licenseNo} onChange={e => setFormData({...formData, licenseNo: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-[#EF5222]" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Biên chế Tuyến</label>
                      <select 
                        value={formData.routeCode} 
                        onChange={e => setFormData({...formData, routeCode: e.target.value})} 
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none cursor-pointer"
                      >
                        <option value="SG-DL">Chọn tuyến khai thác...</option>
                        {/* 🟢 Đã đổi sang dùng dynamicRoutes (Tên tuyến đầy đủ từ API) */}
                        {dynamicRoutes.map((route, idx) => {
                          const routeName = `${route.from} ➔ ${route.to}`;
                          return <option key={idx} value={routeName}>{routeName}</option>;
                        })}
                      </select>
                   </div>
                </div>

                {/* 🟢 DÁN ĐOẠN NÀY VÀO NGAY DƯỚI GRID Ở TRÊN */}
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Biển số xe</span>
                    <span className="text-[10px] text-[#EF5222] bg-orange-50 px-2 py-0.5 rounded">Tự cấp Limousine 22 phòng</span>
                  </label>
                  <input 
                    placeholder="VD: 51B-123.45"
                    value={formData.plateNumber || ''} 
                    onChange={e => setFormData({...formData, plateNumber: e.target.value})} 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:bg-white focus:border-[#EF5222] transition-all" 
                  />
                </div>
                {/* ------------------------------------------- */}

              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-200 rounded-2xl transition-colors">Hủy</button>
                <button onClick={handleSubmit} className="flex-[2] py-4 bg-[#EF5222] text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:bg-[#D93814] transition-colors">Xác nhận Lưu</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}