'use client';
import { API_BASE } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { 
  Plus, Search, Edit2, Trash2, BadgeCheck, 
  Phone, MapPin, User, ChevronLeft, ChevronRight, CarFront, Navigation, CheckCircle2, Clock,
  FileSpreadsheet, ChevronDown, Check, Sparkles, AlertTriangle, ShieldCheck, Calendar, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';


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
  const [isRouteOpen, setIsRouteOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'ASSIGNMENTS_DESC'>('DEFAULT');

  const sortedDrivers = React.useMemo(() => {
    if (sortBy === 'ASSIGNMENTS_DESC') {
      return [...drivers].sort((a, b) => {
        const countA = a._count?.assignments || 0;
        const countB = b._count?.assignments || 0;
        return countB - countA;
      });
    }
    return drivers;
  }, [drivers, sortBy]);

  const handleExportExcel = () => {
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta charset="utf-8" /><style>table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ddd; padding: 10px; text-align: left; font-family: Tahoma, sans-serif; font-size: 13px; } th { background-color: #EF5222; color: white; font-weight: bold; }</style></head><body>`;
    html += `<h2 style="color: #EF5222; font-family: Tahoma, sans-serif;">DANH SÁCH TÀI XẾ ĐIỀU PHỐI - ABC BUS LINES</h2>`;
    html += `<p style="font-family: Tahoma, sans-serif; font-size: 12px; color: #666;">Báo cáo tổng hợp tức thời từ CSDL nội bộ | Xuất bản: ${new Date().toLocaleDateString('vi-VN')} lúc ${new Date().toLocaleTimeString('vi-VN')}</p>`;
    html += `<table>`;
    html += `<thead><tr>`;
    html += `<th>STT</th>`;
    html += `<th>Mã Tài Xế</th>`;
    html += `<th>Họ và Tên</th>`;
    html += `<th>Số Điện Thoại</th>`;
    html += `<th>Bằng Lái</th>`;
    html += `<th>Khu Vực Gốc</th>`;
    html += `<th>Biên Chế Tuyến</th>`;
    html += `<th>Trạng Thái</th>`;
    html += `<th>Biển Số Xe</th>`;
    html += `<th>Số Chuyến Đã Hoàn Thành</th>`;
    html += `</tr></thead><tbody>`;
    
    sortedDrivers.forEach((driver, idx) => {
      const statusText = driver.status === 'AVAILABLE' ? 'Sẵn sàng' : driver.status === 'ON_TRIP' ? 'Đang chạy' : 'Đang nghỉ';
      html += `<tr>`;
      html += `<td style="text-align: center;">${idx + 1}</td>`;
      html += `<td style="font-weight: bold; color: #EF5222;">${driver.driverCode}</td>`;
      html += `<td style="font-weight: bold;">${driver.name}</td>`;
      html += `<td>${driver.phone}</td>`;
      html += `<td>${driver.licenseNo || 'Chưa cập nhật'}</td>`;
      html += `<td>${driver.baseLocation || 'Chưa xác định'}</td>`;
      html += `<td>${driver.routeCode || 'Chưa phân biên chế'}</td>`;
      html += `<td>${statusText}</td>`;
      html += `<td style="font-weight: bold; color: #3b82f6;">${driver.defaultBus?.plateNumber || 'Chưa gán xe'}</td>`;
      html += `<td style="text-align: right; font-weight: bold;">${driver._count?.assignments || 0}</td>`;
      html += `</tr>`;
    });
    
    html += `</tbody></table></body></html>`;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Tai_Xe_ABC_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };
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

  // Trạng thái mở Popmenu trong Modal thêm/sửa tài xế
  const [isModalLocationOpen, setIsModalLocationOpen] = useState(false);
  const [isModalRouteOpen, setIsModalRouteOpen] = useState(false);

  // Lấy danh sách tỉnh thành/địa bàn độc nhất từ danh sách các tuyến đường thực tế
  const modalLocations = React.useMemo(() => {
    const cities = new Set<string>();
    dynamicRoutes.forEach((r: any) => {
      if (r.from) cities.add(r.from);
      if (r.to) cities.add(r.to);
    });
    if (cities.size === 0) {
      return ['TP. Hồ Chí Minh', 'Đà Lạt', 'Phan Thiết', 'Nha Trang', 'Vũng Tàu', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ'];
    }
    return Array.from(cities);
  }, [dynamicRoutes]);

  // Bộ lọc tuyến trong Modal: Chỉ hiển thị tuyến có ĐIỂM ĐI hoặc ĐIỂM ĐẾN trùng với Khu vực Gốc (Tỉnh thành cư trú) thưa Admin
  const filteredModalRoutes = React.useMemo(() => {
    if (!formData.baseLocation) return dynamicRoutes;
    return dynamicRoutes.filter((r: any) => 
      r.from === formData.baseLocation || r.to === formData.baseLocation
    );
  }, [dynamicRoutes, formData.baseLocation]);

  // Hàm chọn khu vực gốc trong modal và tự động đồng bộ hóa tuyến vận hành phù hợp
  const handleSelectModalLocation = (loc: string) => {
    const matchedRoutes = dynamicRoutes.filter((r: any) => r.from === loc || r.to === loc);
    const currentRouteMatches = matchedRoutes.some((r: any) => `${r.from} ➔ ${r.to}` === formData.routeCode);
    
    setFormData((prev: any) => ({
      ...prev,
      baseLocation: loc,
      // Nếu tuyến cũ không nằm trong các tuyến liên quan đến khu vực gốc mới, tự động đổi sang tuyến khớp đầu tiên
      routeCode: currentRouteMatches ? prev.routeCode : (matchedRoutes.length > 0 ? `${matchedRoutes[0].from} ➔ ${matchedRoutes[0].to}` : '')
    }));
    setIsModalLocationOpen(false);
  };

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        // Gọi API từ schedule.controller.ts của bạn
        const res = await axios.get(`${API_BASE}/schedule/routes`);
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
      
      const res = await axios.get(`${API_BASE}/admin/trips/drivers/paginated`, {
        params: { 
          page, 
          limit: 20, 
          search: searchTerm, 
          // 🟢 Gửi thêm tham số lọc mới vào đây
          routeCode: activeRouteFilter !== 'TẤT CẢ' ? activeRouteFilter : undefined,
          busStatus: activeBusFilter !== 'ALL' ? activeBusFilter : undefined,
          status: activeStatusFilter !== 'ALL' ? activeStatusFilter : undefined,
          baseLocation: activeLocationFilter !== 'ALL' ? activeLocationFilter : undefined,
          sortBy: sortBy !== 'DEFAULT' ? sortBy : undefined // 🟢 TRUYỀN SORTBY ĐỂ LỌC TRÊN DB
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
    // 🟢 Thêm sortBy vào mảng theo dõi để load lại ngay khi bấm nút
  }, [searchTerm, activeRouteFilter, activeStatusFilter, activeLocationFilter, activeBusFilter, sortBy, session]);

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
        await axios.post(`${API_BASE}/admin/trips/drivers`, formData, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
      }
      setIsModalOpen(false);
      fetchDrivers(pagination.page); // Reload lại trang hiện tại
    } catch (error) {
      alert('❌ Lỗi: Số điện thoại, Mã tài xế hoặc Biển số xe đã tồn tại trên hệ thống!');
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
      
      const res = await axios.get(`${API_BASE}/admin/trips/emergency-sync`, {
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
    <div className="p-6 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      
      {/* =========================================================
          1. TOP ACTION BAR (ĐƯỢC ĐƯA RA KHỎI HEADER BANNER)
          ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-10 bg-gradient-to-b from-[#EF5222] to-orange-400 rounded-full shadow-sm"></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Quản Lý Nhân Sự Tài Xế</h1>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Đang kiểm soát: <strong className="text-[#EF5222]">{pagination.total}</strong> Bác tài trên toàn bộ tuyến
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 🟢 NÚT ĐỒNG BỘ DỮ LIỆU KHẨN CẤP */}
          <button 
            onClick={handleFixRoutes}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 group border border-orange-400/30 cursor-pointer"
            title="Quét và gỡ kẹt trạng thái ĐANG NGHỈ cho toàn bộ tài xế"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
            <span>⚡ Đồng Bộ & Gỡ Kẹt</span>
          </button>

          <Link 
            href="/admin/drivers/payroll"
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 border border-emerald-500/30 cursor-pointer"
          >
            <Calculator size={15} className="text-emerald-100" />
            <span>💰 Quyết Toán Lương</span>
          </Link>

          <button 
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-emerald-400" />
            <span>Xuất Excel</span>
          </button>


          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-[#EF5222] hover:bg-[#D93814] text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/30 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Thêm Tài Xế Mới</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          2. HEADER BANNER VIP NHỎ GỌN (COMPACT DARK AMBIENT MODE)
          ========================================================= */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-800">
        
        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[#EF5222]/20 via-orange-500/10 to-transparent rounded-full blur-2xl pointer-events-none -translate-y-1/3 translate-x-1/3"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-orange-400 text-[11px] font-black uppercase tracking-wider">
              <Sparkles size={12} className="animate-spin" /> Trạm Điều Phối Bến Bãi Tự Động AI
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Cân Bằng Tải Phân Công Ca Chạy
            </h2>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              Thuật toán AI tự động đánh giá thâm niên, ưu tiên điều phối Bác tài có số ca chạy ít nhất và phát hiện cảnh báo xung đột lịch trình theo thời gian thực.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. BỘ LỌC TƯƠNG TÁC (COMPACT INTERACTIVE FILTERS HUD)
          ========================================================= */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
        
        {/* HÀNG LỌC TÌM KIẾM CHÍNH */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Ô Tìm kiếm */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="text-slate-400 group-focus-within:text-[#EF5222] transition-colors" size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Tìm tên, SĐT hoặc mã tài xế..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3.5 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-2 focus:ring-orange-50 transition-all"
            />
          </div>

          {/* 2. Custom Dropdown Tuyến Xe */}
          <div className="relative z-30">
            <button
              type="button"
              onClick={() => {
                setIsRouteOpen(!isRouteOpen);
                setIsLocationOpen(false);
              }}
              className="w-full flex items-center justify-between pl-10 pr-3.5 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-[#EF5222] focus:ring-2 focus:ring-orange-50 transition-all cursor-pointer text-left shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Navigation size={16} className="text-slate-400" />
                <span className="truncate">{activeRouteFilter === 'TẤT CẢ' ? 'Tất cả tuyến hoạt động' : activeRouteFilter}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isRouteOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isRouteOpen && <div className="fixed inset-0 z-10" onClick={() => setIsRouteOpen(false)} />}

            <AnimatePresence>
              {isRouteOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-xl overflow-hidden z-30 max-h-56 overflow-y-auto"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRouteFilter('TẤT CẢ');
                      setIsRouteOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EF5222] transition-colors flex items-center justify-between text-left"
                  >
                    <span>Tất cả tuyến hoạt động</span>
                    {activeRouteFilter === 'TẤT CẢ' && <Check size={14} className="text-[#EF5222]" />}
                  </button>
                  {dynamicRoutes.map((route, idx) => {
                    const routeName = `${route.from} ➔ ${route.to}`;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveRouteFilter(routeName);
                          setIsRouteOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EF5222] transition-colors flex items-center justify-between text-left"
                      >
                        <span className="truncate">{routeName}</span>
                        {activeRouteFilter === routeName && <Check size={14} className="text-[#EF5222]" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Custom Dropdown Khu Vực Gốc */}
          <div className="relative z-30">
            <button
              type="button"
              onClick={() => {
                setIsLocationOpen(!isLocationOpen);
                setIsRouteOpen(false);
              }}
              className="w-full flex items-center justify-between pl-10 pr-3.5 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-[#EF5222] focus:ring-2 focus:ring-orange-50 transition-all cursor-pointer text-left shadow-sm"
            >
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-slate-400" />
                <span className="truncate">{activeLocationFilter === 'ALL' ? 'Tất cả khu vực' : activeLocationFilter}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isLocationOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isLocationOpen && <div className="fixed inset-0 z-10" onClick={() => setIsLocationOpen(false)} />}

            <AnimatePresence>
              {isLocationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-xl overflow-hidden z-30 max-h-56 overflow-y-auto"
                >
                  {locations.map((loc) => {
                    const label = loc === 'ALL' ? 'Tất cả khu vực' : loc;
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setActiveLocationFilter(loc);
                          setIsLocationOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EF5222] transition-colors flex items-center justify-between text-left"
                      >
                        <span>{label}</span>
                        {activeLocationFilter === loc && <Check size={14} className="text-[#EF5222]" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* HÀNG LỌC TRẠNG THÁI & SẮP XẾP NHANH */}
        <div className="pt-4 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Tình trạng & Gắn Xe */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <User size={13} className="text-slate-400" /> Tình trạng:
            </div>
            <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
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
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      isActive 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' 
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={13} className={isActive ? 'text-[#EF5222]' : 'text-slate-400'} strokeWidth={2.5} /> 
                    {st.label}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-slate-200 hidden xl:block"></div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button 
                onClick={() => setActiveBusFilter(prev => prev === 'NO_BUS' ? 'ALL' : 'NO_BUS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  activeBusFilter === 'NO_BUS' 
                  ? 'bg-red-50 text-red-600 border-red-300 shadow-sm' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-red-200 hover:bg-red-50/50 hover:text-red-600'
                }`}
              >
                <AlertTriangle size={13} className={activeBusFilter === 'NO_BUS' ? 'text-red-600' : 'text-slate-400'} />
                <span>Chưa gắn chuyến</span>
              </button>

              <button 
                onClick={() => setActiveBusFilter(prev => prev === 'HAS_BUS' ? 'ALL' : 'HAS_BUS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  activeBusFilter === 'HAS_BUS' 
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-300 shadow-sm' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600'
                }`}
              >
                <ShieldCheck size={13} className={activeBusFilter === 'HAS_BUS' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Đã có chuyến</span>
              </button>
            </div>
          </div>

          {/* Sắp xếp */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">
              <Sparkles size={13} className="text-[#EF5222]" /> Sắp xếp:
            </div>
            <button
              onClick={() => setSortBy(prev => prev === 'DEFAULT' ? 'ASSIGNMENTS_DESC' : 'DEFAULT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shadow-sm ${
                sortBy === 'ASSIGNMENTS_DESC' 
                ? 'bg-[#EF5222] text-white border-[#EF5222] ring-2 ring-[#EF5222]/10 hover:bg-[#D93814]' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-orange-500/30 hover:bg-orange-50/20'
              }`}
            >
              {sortBy === 'ASSIGNMENTS_DESC' ? '🔥 Chạy nhiều chuyến nhất' : '🕒 Mặc định (Tên)'}
            </button>
          </div>

        </div>
      </div>

      {/* =========================================================
          4. DANH SÁCH TÀI XẾ (COMPACT 3D WORKSTATION CARDS)
          ========================================================= */}
      <div className="relative space-y-3">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <div className="w-8 h-8 border-4 border-[#EF5222]/20 border-t-[#EF5222] rounded-full animate-spin" />
          </div>
        )}

        {sortedDrivers.map(driver => (
          <div 
            key={driver.id} 
            className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-md hover:border-orange-500/30 transition-all duration-300 flex flex-col xl:flex-row xl:items-center justify-between gap-4 group relative overflow-hidden"
          >
            {/* Vạch highlight bên trái */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#EF5222]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

            {/* CỘT 1: THÔNG TIN CÁ NHÂN */}
            <div className="flex items-center gap-3.5 min-w-[260px]">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-500/10 to-amber-500/10 border border-orange-500/20 flex items-center justify-center text-[#EF5222] font-black text-sm shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                {driver.driverCode.split('-').pop()}
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800 text-[15px] group-hover:text-[#EF5222] transition-colors flex items-center gap-2">
                  <span>{driver.name}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-200">
                    {driver.driverCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Phone size={12} className="text-slate-400" /> {driver.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* CỘT 2: XE & BẰNG LÁI */}
            <div className="flex flex-col gap-1.5 min-w-[220px]">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-[#EF5222] flex items-center justify-center shrink-0">
                  <CarFront size={13} />
                </span>
                <span className="text-[13px] text-[#EF5222]">
                  {driver.defaultBus?.plateNumber || 'Chưa được phân xe'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <BadgeCheck size={13} />
                </span>
                <span>Bằng lái: <strong className="text-slate-800">{driver.licenseNo || 'Chưa cập nhật'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <MapPin size={13} />
                </span>
                <span>Khu vực: <strong className="text-slate-700">{driver.baseLocation}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-[#EF5222] flex items-center justify-center shrink-0">
                  <Navigation size={13} />
                </span>
                <span>Tuyến: <strong className="text-slate-700">{driver.routeCode}</strong></span>
              </div>
            </div>

            {/* CỘT 3: TÌNH TRẠNG & SỐ CHUYẾN */}
            <div className="flex flex-col items-start min-w-[200px] space-y-1.5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>Hoàn thành:</span> 
                <span className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded font-black border border-slate-200">
                  {driver._count?.assignments || 0} chuyến
                </span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider ${getStatusStyle(driver.status)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${driver.status === 'AVAILABLE' ? 'bg-emerald-500 animate-ping' : driver.status === 'ON_TRIP' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'}`}></div>
                  {driver.status === 'AVAILABLE' ? 'Sẵn sàng nhận chuyến' : driver.status === 'ON_TRIP' ? 'Đang chạy chuyến' : 'Đang nghỉ ngơi'}
                </div>
                
                {/* Hành trình đang chạy hoặc sắp chạy */}
                {driver.assignments?.[0]?.trip && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[11px] font-bold shadow-inner ${
                    driver.status === 'ON_TRIP' 
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-700' 
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700'
                  }`}>
                    {driver.status === 'ON_TRIP' ? (
                      <Navigation size={12} className="text-blue-600 animate-pulse shrink-0" />
                    ) : (
                      <Calendar size={12} className="text-indigo-600 shrink-0" />
                    )}
                    <span className="truncate max-w-[160px]">
                      {driver.status === 'ON_TRIP' ? 'Đang chạy: ' : 'Sắp chạy: '} 
                      {driver.assignments[0].trip.from} ➔ {driver.assignments[0].trip.to}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* CỘT 4: THAO TÁC */}
            <div className="flex items-center justify-end gap-2 min-w-[100px] mt-2 xl:mt-0 pt-3 xl:pt-0 border-t xl:border-transparent border-slate-100">
              <button 
                onClick={() => handleOpenModal(driver)} 
                className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50/80 hover:border-blue-200 rounded-xl border border-slate-200/80 hover:shadow-sm transition-all font-bold cursor-pointer"
                title="Sửa thông tin hồ sơ"
              >
                <Edit2 size={15} strokeWidth={2.5} />
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
                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${
                  driver.status === 'ON_TRIP'
                  ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60'
                  : 'bg-white text-slate-400 border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 hover:shadow-sm font-bold cursor-pointer'
                }`}
                title={driver.status === 'ON_TRIP' ? "Đang chạy xe, không thể xóa" : "Xóa hồ sơ tài xế"}
              >
                <Trash2 size={15} strokeWidth={2.5} />
              </button>
            </div>

          </div>
        ))}

        {/* Trạng thái trống (Không có tài xế) */}
        {sortedDrivers.length === 0 && !isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-orange-500/10 text-[#EF5222] rounded-2xl flex items-center justify-center mb-4 border border-orange-500/20 shadow-inner">
              <User size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Không tìm thấy tài xế</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm leading-relaxed">
              Thử thay đổi bộ lọc tỉnh thành, tình trạng hoặc từ khóa tìm kiếm để quét lại danh sách nhân sự.
            </p>
          </div>
        )}
      </div>

      {/* PHÂN TRANG HIỆN ĐẠI */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-500">
            Trang <span className="text-[#EF5222] font-black">{pagination.page}</span> / {pagination.totalPages}
          </span>
          <div className="flex gap-1.5">
            <button 
              disabled={pagination.page <= 1} 
              onClick={() => fetchDrivers(pagination.page - 1)} 
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-[#EF5222] hover:border-[#EF5222] hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all cursor-pointer"
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
            <button 
              disabled={pagination.page >= pagination.totalPages} 
              onClick={() => fetchDrivers(pagination.page + 1)} 
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-[#EF5222] hover:border-[#EF5222] hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all cursor-pointer"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          4. MODAL THÊM / CẬP NHẬT TÀI XẾ (VIP ROUNDED MODAL)
          ========================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-100"
            >
              {/* Header Modal */}
              <div className="p-8 bg-slate-900 text-white border-b border-slate-800 flex justify-between items-center shrink-0 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-48 h-48 bg-[#EF5222]/20 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#EF5222]">
                    <User size={24} className="font-bold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">
                      {isEditing ? 'Cập nhật hồ sơ tài xế' : 'Đăng ký tài xế mới'}
                    </h2>
                    <p className="text-xs font-medium text-slate-400 mt-1">
                      {isEditing ? 'Thay đổi thông tin nhân sự và phương tiện' : 'Tạo mới hồ sơ tài xế trên hệ thống điều phối'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold text-lg relative z-10 border border-transparent hover:border-slate-700"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
                
                {/* PHÂN ĐOẠN 1: THÔNG TIN CÁ NHÂN */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                    <span className="text-xs font-black text-[#EF5222] uppercase tracking-wider flex items-center gap-1.5">
                      <User size={15} /> Thông tin cá nhân cơ bản
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-600 uppercase tracking-widest block">Họ và Tên tài xế</label>
                      <input 
                        type="text"
                        placeholder="VD: Nguyễn Văn Hải"
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className="w-full px-5 py-3.5 bg-white border border-slate-200/80 rounded-2xl font-bold text-slate-800 outline-none focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all text-sm shadow-sm" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-600 uppercase tracking-widest block">Số điện thoại liên lạc</label>
                      <input 
                        type="text"
                        maxLength={10}
                        placeholder="VD: 0987654321"
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                        className="w-full px-5 py-3.5 bg-white border border-slate-200/80 rounded-2xl font-bold text-slate-800 outline-none focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all text-sm shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest block">Khu vực Gốc (Tỉnh cư trú)</label>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsModalLocationOpen(!isModalLocationOpen);
                        setIsModalRouteOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-white border border-slate-200/80 rounded-2xl font-bold text-slate-800 outline-none hover:bg-slate-50 focus:border-[#EF5222] transition-all text-sm text-left shadow-sm cursor-pointer"
                    >
                      <span>{formData.baseLocation || "Chọn khu vực cư trú chính..."}</span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isModalLocationOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isModalLocationOpen && <div className="fixed inset-0 z-40" onClick={() => setIsModalLocationOpen(false)} />}

                    <AnimatePresence>
                      {isModalLocationOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto"
                        >
                          {modalLocations.map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => handleSelectModalLocation(loc)}
                              className="w-full px-5 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EF5222] transition-colors flex items-center justify-between text-left"
                            >
                              <span>{loc}</span>
                              {formData.baseLocation === loc && <Check size={16} className="text-[#EF5222]" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* PHÂN ĐOẠN 2: CHỨNG CHỈ & TUYẾN HOẠT ĐỘNG */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                    <span className="text-xs font-black text-[#EF5222] uppercase tracking-wider flex items-center gap-1.5">
                      <BadgeCheck size={15} /> Bằng lái & Tuyến vận hành
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-600 uppercase tracking-widest block">Mã định danh</label>
                      <input 
                        disabled={isEditing} 
                        value={formData.driverCode} 
                        onChange={e => setFormData({...formData, driverCode: e.target.value})} 
                        className="w-full px-5 py-3.5 bg-slate-100 border border-slate-200/60 rounded-2xl font-black text-[#EF5222] outline-none text-sm disabled:opacity-80" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-600 uppercase tracking-widest block">Hạng bằng lái</label>
                      <input 
                        type="text"
                        placeholder="VD: Hạng E, Hạng FC..."
                        value={formData.licenseNo} 
                        onChange={e => setFormData({...formData, licenseNo: e.target.value})} 
                        className="w-full px-5 py-3.5 bg-white border border-slate-200/80 rounded-2xl font-bold text-slate-800 outline-none focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all text-sm shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest block">Biên chế Tuyến ưu tiên</label>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsModalRouteOpen(!isModalRouteOpen);
                        setIsModalLocationOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-white border border-slate-200/80 rounded-2xl font-bold text-slate-800 outline-none hover:bg-slate-50 focus:border-[#EF5222] transition-all text-sm text-left shadow-sm cursor-pointer"
                    >
                      <span className="truncate">{formData.routeCode || "Chọn tuyến vận hành..."}</span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isModalRouteOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isModalRouteOpen && <div className="fixed inset-0 z-40" onClick={() => setIsModalRouteOpen(false)} />}

                    <AnimatePresence>
                      {isModalRouteOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto"
                        >
                          {filteredModalRoutes.map((route, idx) => {
                            const routeName = `${route.from} ➔ ${route.to}`;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, routeCode: routeName });
                                  setIsModalRouteOpen(false);
                                }}
                                className="w-full px-5 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EF5222] transition-colors flex items-center justify-between text-left"
                              >
                                <span className="truncate">{routeName}</span>
                                {formData.routeCode === routeName && <Check size={16} className="text-[#EF5222]" />}
                              </button>
                            );
                          })}
                          {filteredModalRoutes.length === 0 && (
                            <div className="px-5 py-4 text-xs text-slate-400 font-bold text-center">
                              Không có tuyến chạy qua khu vực cư trú đã chọn!
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* PHÂN ĐOẠN 3: GẮN PHƯƠNG TIỆN */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                    <span className="text-xs font-black text-[#EF5222] uppercase tracking-wider flex items-center gap-1.5">
                      <CarFront size={15} /> Phân bổ xe mặc định
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest block flex items-center justify-between">
                      <span>Biển số xe gán cố định</span>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Limousine 22 phòng</span>
                    </label>
                    <input 
                      placeholder="VD: 51B-123.45 hoặc 79B-001.23..."
                      value={formData.plateNumber || ''} 
                      onChange={e => setFormData({...formData, plateNumber: e.target.value})} 
                      className="w-full px-5 py-3.5 bg-white border border-slate-200/80 rounded-2xl font-bold text-slate-800 outline-none focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all text-sm shadow-sm" 
                    />
                  </div>
                </div>

              </div>

              {/* Footer Modal */}
              <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-4 font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-2xl transition-all text-sm text-center"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="button"
                  onClick={handleSubmit} 
                  className="flex-[2] py-4 bg-[#EF5222] text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 hover:bg-[#D93814] hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all text-sm text-center"
                >
                  Xác nhận Lưu hồ sơ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}