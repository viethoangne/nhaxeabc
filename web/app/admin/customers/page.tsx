'use client';
import { API_BASE } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, Mail, Phone, Star, ShieldCheck, Loader2, 
  XCircle, Calendar, MapPin, Compass, Ticket, ArrowRightLeft,
  ChevronRight
} from 'lucide-react';
import { useSession } from 'next-auth/react';

// --- CÁC HÀM ĐỊNH DẠNG HỖ TRỢ DIỆN MẠO PREMIUM ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('vi-VN');
  return `${time} | ${date}`;
};

const getBookingStatusStyle = (bookingStatus: string, paymentStatus: string) => {
  if (bookingStatus === 'CANCELLED') return 'bg-rose-50 text-rose-600 border-rose-100';
  if (bookingStatus === 'COMPLETED' || bookingStatus === 'ARCHIVED') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (bookingStatus === 'CONFIRMED' && paymentStatus === 'PAID') return 'bg-blue-50 text-blue-600 border-blue-100';
  return 'bg-amber-50 text-amber-600 border-amber-100';
};

const getBookingStatusText = (bookingStatus: string, paymentStatus: string) => {
  if (bookingStatus === 'CANCELLED') return 'Đã huỷ';
  if (bookingStatus === 'COMPLETED' || bookingStatus === 'ARCHIVED') return 'Đã hoàn thành';
  if (bookingStatus === 'CONFIRMED' && paymentStatus === 'PAID') return 'Đã xác nhận';
  return 'Chờ thanh toán / Giữ chỗ';
};

export default function AdminCustomersPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE AI SEGMENTATION ---
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  // --- STATE PHỤC VỤ HIỂN THỊ DANH SÁCH CHUYẾN ĐI CHI TIẾT ---
  const [selectedUserForTrips, setSelectedUserForTrips] = useState<any | null>(null);
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  // Gọi API lấy dữ liệu khách hàng
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!userId || isAiMode) return;
      setIsLoading(true);
      try {
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
        const res = await axios.get(`${API_BASE}/admin/customers${query}`, {
          headers: { 'x-user-id': userId }
        });
        
        if (res.data.success) {
          setCustomers(res.data.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách Khách hàng:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchCustomers();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [userId, searchTerm, isAiMode]);

  const handleToggleAi = async () => {
    if (isAiMode) {
      setIsAiMode(false);
      setAiSummary(null);
      setSelectedSegment(null);
      if (userId) {
        setIsLoading(true);
        try {
          const res = await axios.get(`${API_BASE}/admin/customers`, { headers: { 'x-user-id': userId } });
          if (res.data.success) setCustomers(res.data.data);
        } finally {
          setIsLoading(false);
        }
      }
      return;
    }

    setIsAiMode(true);
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/customers/ai/segmentation`, { headers: { 'x-user-id': userId } });
      if (res.data.success) {
        setCustomers(res.data.data.users);
        setAiSummary(res.data.data.summary);
      }
    } catch (error) {
      console.error('Lỗi khi bật AI Phân lớp:', error);
      alert('Không thể tải phân tích AI.');
      setIsAiMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = selectedSegment 
    ? customers.filter(c => c.segment === selectedSegment)
    : customers;

  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) {
      alert('Không có dữ liệu để xuất file.');
      return;
    }

    let csvContent = '\uFEFF'; 
    csvContent += 'ID,Tên Khách Hàng,Email,Số Điện Thoại,Số Chuyến Đi,Điểm Loyalty,Phân Quyền,Phân Lớp AI\n';

    filteredCustomers.forEach(user => {
      const id = `"${user.id}"`;
      const name = `"${user.name || 'Ẩn danh'}"`;
      const email = `"${user.email}"`;
      const phone = `"${user.phone || 'Chưa cập nhật'}"`;
      const trips = user.trips;
      const points = user.points;
      const role = `"${user.role}"`;
      const segment = `"${user.segment || 'Chưa phân tích'}"`;

      csvContent += `${id},${name},${email},${phone},${trips},${points},${role},${segment}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Danh_Sach_Khach_Hang_${selectedSegment || 'Toan_Bo'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- LOGIC TRUY VẤN LỊCH SỬ CHUYẾN ĐI CỦA 1 KHÁCH HÀNG ---
  const handleViewTrips = async (user: any) => {
    setSelectedUserForTrips(user);
    setIsLoadingTrips(true);
    setUserTrips([]);
    try {
      const res = await axios.get(`${API_BASE}/admin/customers/${user.id}/orders`, {
        headers: { 'x-user-id': userId }
      });
      if (res.data.success) {
        setUserTrips(res.data.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải lịch sử chuyến đi:', error);
      alert('Không thể tải lịch sử chuyến đi của khách hàng này.');
    } finally {
      setIsLoadingTrips(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Premium Style */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg mb-6 mt-1 bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 border border-orange-500/20">
        {/* Ambient Lighting Orbs */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#ea580c]/15 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:20px_20px]"></div>
        
        <div className="relative p-6 lg:px-8 lg:py-6 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="bg-gradient-to-tr from-[#ea580c] to-[#EF5222] p-2.5 rounded-xl shadow-[0_4px_12px_rgba(234,88,12,0.3)] border border-orange-400/30">
                <ShieldCheck className="w-6 h-6 text-white animate-pulse" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                <span>Quản trị Khách hàng & Tài khoản</span>
                <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent text-[11px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 shadow-inner">VIP DIRECTORY</span>
              </h1>
            </div>
            <p className="text-slate-300 font-medium text-sm max-w-2xl leading-relaxed">
              Quản lý toàn diện tài khoản hành khách, theo dõi lịch sử đặt vé, điểm Loyalty thưởng và thiết lập phân quyền quản trị.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex gap-4 items-center justify-between flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm theo tên, email, số điện thoại..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#ea580c] focus:ring-2 focus:ring-orange-50 outline-none transition-all shadow-inner" 
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleAi}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs transition-all duration-300 cursor-pointer ${
                isAiMode 
                  ? 'bg-gradient-to-r from-amber-500 to-[#ea580c] text-white shadow-[0_4px_15px_rgba(234,88,12,0.4)] scale-105' 
                  : 'bg-orange-50 text-[#ea580c] hover:bg-orange-100/80 border border-orange-200/50'
              }`}
            >
              <Loader2 className={`w-4 h-4 ${isLoading && isAiMode ? 'animate-spin' : 'hidden'}`} />
              <Star className={`w-4 h-4 ${isAiMode ? 'fill-white animate-spin' : 'fill-amber-500 text-amber-500'}`} />
              <span>{isAiMode ? 'Đang bật AI Phân Lớp' : 'AI Phân Lớp Khách Hàng'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100/80 rounded-xl font-black text-xs border border-emerald-200/50 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-md"
              title="Xuất danh sách hiển thị ra file CSV / Excel"
            >
              <Mail className="w-4 h-4 text-emerald-600 hidden" />
              <span>📥 Xuất Excel</span>
            </button>

            <div className="text-xs font-black text-slate-400 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
              Tổng cộng: <span className="text-[#ea580c]">{filteredCustomers.length}</span> tài khoản
            </div>
          </div>
        </div>

        {/* THẺ THỐNG KÊ KPI AI (BẤM ĐỂ LỌC) */}
        {isAiMode && aiSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border-b border-purple-500/20 text-white animate-in fade-in duration-300">
            <button 
              type="button"
              onClick={() => setSelectedSegment(selectedSegment === 'VIP HẠNG SANG' ? null : 'VIP HẠNG SANG')}
              className={`p-4 rounded-xl text-left border backdrop-blur-md transition-all cursor-pointer ${
                selectedSegment === 'VIP HẠNG SANG' 
                  ? 'bg-amber-500/30 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-105' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider flex items-center justify-between">
                <span>👑 VIP Hạng Sang</span>
                {selectedSegment === 'VIP HẠNG SANG' && <span className="text-[9px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded font-black">ĐANG LỌC</span>}
              </div>
              <div className="text-2xl font-black mt-1">{aiSummary.vipCount} <span className="text-xs font-normal text-slate-300">khách</span></div>
            </button>

            <button 
              type="button"
              onClick={() => setSelectedSegment(selectedSegment === 'THƯỜNG XUYÊN' ? null : 'THƯỜNG XUYÊN')}
              className={`p-4 rounded-xl text-left border backdrop-blur-md transition-all cursor-pointer ${
                selectedSegment === 'THƯỜNG XUYÊN' 
                  ? 'bg-emerald-500/30 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider flex items-center justify-between">
                <span>🌟 Khách Thường Xuyên</span>
                {selectedSegment === 'THƯỜNG XUYÊN' && <span className="text-[9px] bg-emerald-400 text-slate-900 px-1.5 py-0.5 rounded font-black">ĐANG LỌC</span>}
              </div>
              <div className="text-2xl font-black mt-1">{aiSummary.regularCount} <span className="text-xs font-normal text-slate-300">khách</span></div>
            </button>

            <button 
              type="button"
              onClick={() => setSelectedSegment(selectedSegment === 'NGUY CƠ RỜI BỎ' ? null : 'NGUY CƠ RỜI BỎ')}
              className={`p-4 rounded-xl text-left border backdrop-blur-md transition-all cursor-pointer ${
                selectedSegment === 'NGUY CƠ RỜI BỎ' 
                  ? 'bg-rose-500/30 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-105' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-[10px] uppercase font-extrabold text-rose-400 tracking-wider flex items-center justify-between">
                <span>⚠️ Nguy Cơ Rời Bỏ</span>
                {selectedSegment === 'NGUY CƠ RỜI BỎ' && <span className="text-[9px] bg-rose-400 text-slate-900 px-1.5 py-0.5 rounded font-black">ĐANG LỌC</span>}
              </div>
              <div className="text-2xl font-black mt-1 text-rose-300">{aiSummary.churnRiskCount} <span className="text-xs font-normal text-slate-300">khách</span></div>
            </button>

            <button 
              type="button"
              onClick={() => setSelectedSegment(selectedSegment === 'TIỀM NĂNG' ? null : 'TIỀM NĂNG')}
              className={`p-4 rounded-xl text-left border backdrop-blur-md transition-all cursor-pointer ${
                selectedSegment === 'TIỀM NĂNG' 
                  ? 'bg-blue-500/30 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-105' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-[10px] uppercase font-extrabold text-blue-400 tracking-wider flex items-center justify-between">
                <span>🌱 Khách Tiềm Năng</span>
                {selectedSegment === 'TIỀM NĂNG' && <span className="text-[9px] bg-blue-400 text-slate-900 px-1.5 py-0.5 rounded font-black">ĐANG LỌC</span>}
              </div>
              <div className="text-2xl font-black mt-1">{aiSummary.potentialCount} <span className="text-xs font-normal text-slate-300">khách</span></div>
            </button>
          </div>
        )}
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <th className="p-5">Khách hàng</th>
              <th className="p-5">Liên hệ</th>
              <th className="p-5 text-center">Tổng chuyến đi</th>
              <th className="p-5 text-center">Điểm Loyalty</th>
              {isAiMode && <th className="p-5">Phân tích từ AI</th>}
              <th className="p-5 text-right">Phân quyền</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={isAiMode ? 6 : 5} className="p-12 text-center text-slate-400 font-extrabold">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#ea580c] mb-3" />
                  Đang tải dữ liệu khách hàng...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={isAiMode ? 6 : 5} className="p-12 text-center text-slate-400 font-extrabold">
                  Không tìm thấy tài khoản nào khớp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredCustomers.map(user => (
                <tr key={user.id} className="hover:bg-orange-50/60 transition-all duration-300 group hover:-translate-y-0.5">
                  <td className="p-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-black flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(234,88,12,0.3)] overflow-hidden border border-orange-400/20">
                      {user.avatar ? <img src={user.avatar} alt="avt" className="w-full h-full object-cover" /> : (user.name ? user.name.charAt(0).toUpperCase() : '?')}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-base tracking-tight group-hover:text-[#ea580c] transition-colors">{user.name || 'Người dùng Ẩn danh'}</div>
                      <div className="text-[11px] font-extrabold text-slate-400 mt-0.5">Thành viên ABC</div>
                    </div>
                  </td>
                  <td className="p-5 text-slate-600 space-y-1.5 font-bold">
                    <div className="flex items-center gap-2 text-xs bg-slate-50 px-2.5 py-1 rounded-lg w-fit border border-slate-100">
                      <Mail className="w-3.5 h-3.5 text-[#ea580c]" /> <span className="text-slate-700">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-slate-50 px-2.5 py-1 rounded-lg w-fit border border-slate-100">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> <span className="text-slate-700">{user.phone || 'Chưa cập nhật'}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <button 
                      onClick={() => handleViewTrips(user)}
                      className="group/btn px-4 py-2 rounded-xl text-sm font-black text-[#ea580c] bg-orange-50/80 hover:bg-gradient-to-r hover:from-[#ea580c] hover:to-amber-500 hover:text-white border border-orange-200/60 hover:border-transparent transition-all duration-300 inline-flex items-center gap-2 cursor-pointer shadow-2xs hover:shadow-[0_6px_15px_rgba(234,88,12,0.25)] hover:scale-105 active:scale-95"
                      title="Nhấn để xem lịch sử chuyến đi chi tiết"
                    >
                      <Ticket className="w-4 h-4 text-[#ea580c] group-hover/btn:text-white transition-colors" />
                      <span>{user.trips} chuyến</span>
                      <ChevronRight size={14} className="opacity-70 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </td>
                  <td className="p-5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-[#ea580c] font-black border border-amber-500/20 shadow-2xs group-hover:scale-110 transition-transform duration-300">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 animate-spin" /> 
                      <span className="text-base tracking-tight">{user.points}</span>
                    </div>
                  </td>
                  {isAiMode && (
                    <td className="p-5">
                      {user.segment ? (
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-wider border ${user.segmentStyle}`}>
                            <Star className="w-3 h-3 fill-current" /> {user.segment}
                          </span>
                          <div className="text-[11px] font-bold text-slate-500 max-w-xs leading-relaxed">{user.aiNote}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Chưa phân tích</span>
                      )}
                    </td>
                  )}
                  <td className="p-5 text-right">
                    {user.role === 'ADMIN' ? (
                       <span className="inline-flex items-center gap-1.5 text-xs font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 shadow-2xs animate-pulse"><ShieldCheck className="w-3.5 h-3.5"/> ADMIN</span>
                    ) : (
                       <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">CUSTOMER</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================================
          ⭐ POPUP MODAL DANH SÁCH CHUYÊN ĐI CHI TIẾT
          ========================================================= */}
      {selectedUserForTrips && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Backdrop mờ nền */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedUserForTrips(null)}
          ></div>

          {/* Khung Modal */}
          <div className="relative w-full max-w-3xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-[#ea580c] font-black flex items-center justify-center shrink-0 border border-orange-200/50">
                  {selectedUserForTrips.avatar ? (
                    <img src={selectedUserForTrips.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    selectedUserForTrips.name ? selectedUserForTrips.name.charAt(0).toUpperCase() : '?'
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Chi tiết hành trình khách hàng</h2>
                  <p className="text-sm font-bold text-[#ea580c] mt-0.5">{selectedUserForTrips.name || 'Người dùng Ẩn danh'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserForTrips(null)}
                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Vùng nội dung cuộn được */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-[300px] bg-slate-50/30">
              {isLoadingTrips ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-[#ea580c] mb-3" />
                  <p className="font-bold text-sm">Đang truy vấn lịch sử chuyến đi...</p>
                </div>
              ) : userTrips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
                  <div className="w-16 h-16 bg-white text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <Compass size={32} />
                  </div>
                  <h3 className="text-base font-bold text-slate-700">Chưa có chuyến đi nào</h3>
                  <p className="text-xs text-slate-400 mt-1">Khách hàng này chưa thực hiện chuyến đi nào được ghi nhận trên hệ thống.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userTrips.map((order: any) => {
                    const statusStyle = getBookingStatusStyle(order.bookingStatus, order.paymentStatus);
                    const statusText = getBookingStatusText(order.bookingStatus, order.paymentStatus);

                    return (
                      <div key={order.id} className="bg-white border border-slate-200/80 hover:border-orange-200 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-4 transition-all hover:shadow-[0_4px_20px_rgb(0,0,0,0.02)] group">
                        
                        <div className="space-y-3 flex-1">
                          {/* Mã đơn & Loại vé */}
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-orange-100/70 text-[#ea580c] border border-orange-200/10">
                              #{order.orderCode}
                            </span>
                            {order.tripType === 'round' ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-200/50 flex items-center gap-1">
                                <ArrowRightLeft size={10} /> Khứ hồi
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200/50">
                                Một chiều
                              </span>
                            )}
                          </div>

                          {/* Chi tiết lộ trình đi */}
                          <div className="space-y-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                                <MapPin size={14} className="text-[#ea580c] shrink-0" />
                                <span>{order.from} ➔ {order.to}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 pl-5">
                                <Calendar size={12} className="text-blue-500 shrink-0" />
                                <span>{formatDate(order.outboundDepart)}</span>
                                {order.outboundSeats.length > 0 && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="bg-orange-50 text-[#ea580c] px-2 py-0.5 rounded border border-orange-100/30 text-[10px] font-black">
                                      Ghế đi: {order.outboundSeats.join(', ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Chi tiết lộ trình về (Vé khứ hồi) */}
                            {order.tripType === 'round' && (
                              <div className="flex flex-col gap-1 pt-2.5 border-t border-slate-100 border-dashed">
                                <div className="flex items-center gap-2 text-sm font-black text-purple-600">
                                  <MapPin size={14} className="text-purple-500 shrink-0" />
                                  <span>{order.to} ➔ {order.from}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 pl-5">
                                  <Calendar size={12} className="text-purple-400 shrink-0" />
                                  <span>{formatDate(order.returnDepart)}</span>
                                  {order.returnSeats.length > 0 && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100/30 text-[10px] font-black">
                                        Ghế về: {order.returnSeats.join(', ')}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tổng tiền & Trạng thái */}
                        <div className="flex md:flex-col justify-between md:justify-center items-center md:items-end gap-3 md:border-l md:border-slate-100 md:pl-5 shrink-0">
                          <div className="text-left md:text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng thanh toán</p>
                            <p className="text-base font-black text-[#ea580c] mt-0.5">{formatCurrency(order.amount)}</p>
                          </div>
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider ${statusStyle}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span>{statusText}</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end">
              <button 
                onClick={() => setSelectedUserForTrips(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}