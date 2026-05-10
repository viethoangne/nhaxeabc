  'use client';

  import React, { useState, useEffect } from 'react';
  import { useParams, useRouter } from 'next/navigation';
  import { useSession } from 'next-auth/react';
  import { ChevronLeft, Users, Package, FileText, User, Phone, CheckCircle2, BadgeCheck, CarFront, CircleDollarSign, Activity } from 'lucide-react';
  import axios from 'axios';
  import { motion, AnimatePresence } from 'framer-motion'; // 🟢 Import Framer Motion cho Modal
  import { API_BASE } from '@/lib/api';

  export default function TripDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tripId = params.id;
    const { data: session } = useSession();

    const [trip, setTrip] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PASSENGERS');

    const tangDuoi = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5'];
    const tangTren = ['A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'B6', 'B7', 'B8', 'B9', 'B10'];

    const [seatStatus, setSeatStatus] = useState<Record<string, any>>({});

    // 🟢 THÊM STATE CHO MODAL CÀI ĐẶT CHUYẾN
    const [isSettingOpen, setIsSettingOpen] = useState(false);
    const [editData, setEditData] = useState({ driverId: '', busId: '', price: 0, status: '' });
    const [drivers, setDrivers] = useState<any[]>([]);
    const [buses, setBuses] = useState<any[]>([]);
    // 🟢 STATE CHO SEARCHABLE DROPDOWN TÀI XẾ
    const [driverSearch, setDriverSearch] = useState('');
    const [showDriverDropdown, setShowDriverDropdown] = useState(false);

    // 🟢 1. HÀM TẢI DỮ LIỆU ĐÃ ĐƯỢC GẮN TOKEN
    const fetchTripDetail = async () => {
      if (!session) return;
      const userId = (session.user as any)?.id;
      const token = (session as any)?.accessToken || (session.user as any)?.accessToken || (session.user as any)?.token || '';

      setIsLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/admin/trips/${tripId}`, {
          headers: { 
            'x-user-id': userId,
            'Authorization': `Bearer ${token}` 
          }
        });
        
        const tripData = res.data;
        setTrip(tripData);

        // 🟢 Đổ dữ liệu chuyến xe vào Form Modal Cài đặt
        setEditData({
          driverId: tripData.driverId || '',
          busId: tripData.busId || '',
          price: tripData.price || 0,
          status: tripData.status || 'PUBLISHED'
        });
        // 🟢 Đổ dữ liệu chuyến xe vào Form Modal Cài đặt
        setEditData({
          driverId: tripData.driverId || '',
          busId: tripData.busId || '',
          price: tripData.price || 0,
          status: tripData.status || 'PUBLISHED'
        });

        // 🟢 THÊM ĐOẠN NÀY: Hiển thị tên bác tài vào ô Input nếu đã được phân công
        if (tripData.driver) {
          setDriverSearch(`[${tripData.driver.driverCode}] ${tripData.driver.name} • ${tripData.driver.phone}`);
        } else {
          setDriverSearch(''); // Xóa trắng nếu chưa có
        }

        const newSeatStatus: Record<string, any> = {};

        // 🟢 ĐÃ SỬA: Xử lý ghế đã đặt (BOOKED) chuẩn với Database mới
      if (tripData.outboundOrders && tripData.outboundOrders.length > 0) {
        tripData.outboundOrders.forEach((order: any) => {
          
          // Lấy mảng tên ghế từ quan hệ OrderSeat (VD: ['A1', 'A2'])
          const seatsArray = order.seats ? order.seats.map((s: any) => s.seatNumber) : [];

          seatsArray.forEach((seatCode: string) => {
            if (seatCode) {
              newSeatStatus[seatCode] = {
                status: 'BOOKED',
                // Sửa thành đúng tên trường customerName và customerPhone trong schema.prisma
                passengerName: order.customerName || 'Khách vãng lai',
                phone: order.customerPhone || 'N/A'
              };
            }
          });
        });
      }

        // Xử lý ghế bị khóa (LOCKED) từ DB hiển thị lên
        if (tripData.lockedSeats && Array.isArray(tripData.lockedSeats)) {
          tripData.lockedSeats.forEach((seatCode: string) => {
            if (newSeatStatus[seatCode]?.status !== 'BOOKED') {
              newSeatStatus[seatCode] = { status: 'LOCKED' };
            }
          });
        }

        setSeatStatus(newSeatStatus);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết chuyến xe:", error);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      fetchTripDetail();
    }, [tripId, session]);

    useEffect(() => {
      if (isSettingOpen && session) {
        const fetchData = async () => {
          // 🟢 Đảm bảo lấy Token và ID chuẩn từ Session
          const userId = (session.user as any)?.id;
          const token = (session as any)?.accessToken || (session.user as any)?.token || '';
          
          const headers = { 
            'Authorization': `Bearer ${token}`,
            'x-user-id': userId 
          };
    
          try {
            const [resDrivers, resBuses] = await Promise.all([
              axios.get(`${API_BASE}/admin/trips/${tripId}/drivers/suggest`, { headers }),
              axios.get(`${API_BASE}/admin/trips/${tripId}/buses/suggest`, { headers })
            ]);
            
            setDrivers(resDrivers.data);
            setBuses(resBuses.data);
          } catch (error: any) {
            console.error("Lỗi 403 hoặc API:", error.response?.data);
          }
        };
        fetchData();
      }
    }, [isSettingOpen, session, tripId]);

    const handleUpdateTrip = async () => {
      // 🟢 Lấy token và userId y hệt như lúc tải dữ liệu để không bị lỗi 403
      const userId = (session?.user as any)?.id;
      const token = (session as any)?.accessToken || (session?.user as any)?.accessToken || (session?.user as any)?.token || '';
      
      try {
        const payload = {
          ...editData,
          driverId: editData.driverId ? Number(editData.driverId) : null,
          busId: editData.busId ? Number(editData.busId) : null,
        };

        await axios.put(`${API_BASE}/admin/trips/${tripId}/assign`, payload, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'x-user-id': userId // 🟢 Bắt buộc phải có dòng này để Backend cho phép qua cửa
          }
        });
        alert("Đã cập nhật phân công chuyến xe!");
        setIsSettingOpen(false);
        setDriverSearch(''); 
        fetchTripDetail(); // Tự động load lại dữ liệu mới nhất
      } catch (error: any) {
        console.error("Lỗi cập nhật:", error.response?.data || error.message);
        alert("Có lỗi khi cập nhật! Vui lòng kiểm tra lại quyền hoặc đăng nhập lại.");
      }
    };

    if (isLoading) {
      return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-3 border-[#EF5222]/30 border-t-[#EF5222] rounded-full animate-spin" /></div>;
    }

    // 🟢 2. HÀM CLICK GHẾ ĐÃ ĐƯỢC GẮN TOKEN (CHỐNG LỖI 403)
    const handleSeatClick = async (seatId: string) => {
      const currentStatus = seatStatus[seatId]?.status || 'AVAILABLE';

      if (currentStatus === 'BOOKED') {
        alert(`Ghế ${seatId} đã được đặt. Không thể khóa!`);
        return;
      }

      const isCurrentlyLocked = currentStatus === 'LOCKED';
      const newStatus = isCurrentlyLocked ? 'AVAILABLE' : 'LOCKED';

      // UI thay đổi mượt mà
      setSeatStatus(prev => ({
        ...prev,
        [seatId]: { status: newStatus }
      }));

      try {
        const userId = (session?.user as any)?.id;
        const token = (session as any)?.accessToken || (session?.user as any)?.accessToken || (session?.user as any)?.token || '';

        await axios.post(`${API_BASE}/admin/trips/${tripId}/seats/lock`, {
          seatId: seatId,
          isLocked: !isCurrentlyLocked
        }, {
          headers: { 
            'x-user-id': userId,
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error("Lỗi khi khóa ghế:", error);
        setSeatStatus(prev => ({
          ...prev,
          [seatId]: { status: currentStatus }
        }));
        alert("Có lỗi xảy ra, không thể thay đổi trạng thái ghế!");
      }
    };
    // 🟢 HÀM XUẤT DANH SÁCH HÀNH KHÁCH RA EXCEL (CSV)
  const handleExportExcel = () => {
    // Lọc ra những ghế có trạng thái BOOKED
    const passengers = Object.keys(seatStatus)
      .filter(k => seatStatus[k].status === 'BOOKED')
      .map(seatId => ({
        seat: seatId,
        name: seatStatus[seatId].passengerName,
        phone: seatStatus[seatId].phone,
        status: 'Đã thanh toán'
      }));

    if (passengers.length === 0) {
      alert('Chưa có hành khách nào để xuất!');
      return;
    }

    // Tạo nội dung file CSV
    const headers = ['Ghế,Tên khách hàng,Số điện thoại,Trạng thái'];
    const rows = passengers.map(p => `${p.seat},"${p.name}",="${p.phone}",${p.status}`);
    const csvContent = headers.concat(rows).join('\n');
    
    // Thêm BOM (\ufeff) để Excel không bị lỗi font Tiếng Việt
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Danh_sach_khach_Chuyen_${tripId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    // Hàm Render giao diện từng ghế
    const renderSeat = (seatId: string) => {
      const statusInfo = seatStatus[seatId];
      const status = statusInfo?.status || 'AVAILABLE';
      
      const uiConfig = {
        'AVAILABLE': 'bg-white border-slate-200 text-slate-500 hover:border-[#EF5222] hover:text-[#EF5222]',
        'BOOKED': 'bg-[#EF5222] border-[#EF5222] text-white shadow-sm cursor-not-allowed',
        'LOCKED': 'bg-slate-100 border-slate-300 text-slate-400 opacity-60 relative overflow-hidden',
      };

      return (
        <div 
          key={seatId}
          onClick={() => handleSeatClick(seatId)} 
          title={status === 'BOOKED' ? statusInfo.passengerName : status === 'LOCKED' ? 'Ghế đang bảo trì' : 'Ghế trống - Click để khóa'}
          className={`w-14 h-12 flex items-center justify-center rounded-lg border-2 text-[13px] font-bold cursor-pointer transition-all ${uiConfig[status as keyof typeof uiConfig]}`}
        >
          {status === 'LOCKED' && <div className="absolute w-full h-[2px] bg-slate-300 -rotate-45"></div>}
          {seatId}
        </div>
      );
    };

    return (
      <div className="space-y-6 pb-20">
        {/* HEADER */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#EF5222] hover:border-[#EF5222] hover:bg-orange-50 transition-colors"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-800 text-[18px] uppercase">
                <span>{trip?.from}</span>
                <span className="text-slate-400">→</span>
                <span>{trip?.to}</span>
              </div>
              
              {/* 🟢 HIỂN THỊ ĐẦY ĐỦ GIỜ, NGÀY THÁNG, TÀI XẾ & BIỂN SỐ */}
              <div className="flex items-center gap-3 mt-1.5 text-[13px] font-medium text-slate-500">
                <span className="bg-[#EF5222] text-white px-2.5 py-0.5 rounded-md font-bold shadow-sm">
                  {new Date(trip?.departDate).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                </span>
                <span className="text-[#EF5222] font-black tracking-wide">
                  Ngày {new Date(trip?.departDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="bg-orange-50 text-[#EF5222] px-2 py-0.5 rounded uppercase font-bold text-[10px]">{trip?.busType}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                
                {/* Lấy tên tài xế và biển số xe từ relation object */}
                <span className="flex items-center gap-1 font-bold">
                  <User size={14} className="text-[#EF5222]"/> {trip?.driver?.name || 'Chưa phân công'}
                </span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 border border-slate-200 rounded uppercase font-bold text-[10px]">
                  {trip?.bus?.plateNumber || 'Chưa có xe'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingOpen(true)} // 🟢 MỞ MODAL KHI CLICK
              className="px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cài đặt chuyến
            </button>
          </div>
        </div>

        {/* SƠ ĐỒ GHẾ VÀ DANH SÁCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CỘT TRÁI: SƠ ĐỒ */}
          <div className="lg:col-span-5 bg-white p-8 rounded-2xl border border-slate-200 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-[16px] flex items-center gap-2">
                <span className="text-[#EF5222]">◷</span> SƠ ĐỒ GHẾ
              </h2>
              <div className="flex gap-4 text-[12px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 border-2 border-slate-200 rounded-[4px]"></div> Trống</span>
                <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-[#EF5222] rounded-[4px]"></div> Đã đặt</span>
                <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-slate-200 border-2 border-slate-300 rounded-[4px]"></div> Khóa</span>
              </div>
            </div>

            <div className="flex flex-row justify-center gap-12 w-full">
              <div className="flex flex-col items-center">
                <h3 className="text-slate-400 font-bold text-[13px] tracking-widest mb-6 relative w-full text-center">
                  <span className="bg-white px-3 relative z-10">TẦNG DƯỚI</span>
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-100 -z-0"></div>
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {tangDuoi.map(seat => renderSeat(seat))}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <h3 className="text-slate-400 font-bold text-[13px] tracking-widest mb-6 relative w-full text-center">
                  <span className="bg-white px-3 relative z-10">TẦNG TRÊN</span>
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-100 -z-0"></div>
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {tangTren.map(seat => renderSeat(seat))}
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: DANH SÁCH */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-fit">
            <div className="flex border-b border-slate-100 px-2 bg-slate-50/50">
              <button onClick={() => setActiveTab('PASSENGERS')} className={`flex items-center gap-2 px-6 py-4 text-[13px] font-bold transition-colors ${activeTab === 'PASSENGERS' ? 'text-[#EF5222] border-b-2 border-[#EF5222]' : 'text-slate-500 hover:text-slate-700'}`}>
                <Users size={16} /> Hành khách
              </button>
              <button onClick={() => setActiveTab('LOGS')} className={`flex items-center gap-2 px-6 py-4 text-[13px] font-bold transition-colors ${activeTab === 'LOGS' ? 'text-[#EF5222] border-b-2 border-[#EF5222]' : 'text-slate-500 hover:text-slate-700'}`}>
                <FileText size={16} /> Nhật ký chuyến
              </button>
              {/* 🟢 NÚT XUẤT EXCEL HIỆN TẠI TAB HÀNH KHÁCH */}
            {activeTab === 'PASSENGERS' && (
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-500 border border-emerald-100 hover:bg-emerald-100 rounded-xl text-[12px] font-bold transition-all shadow-sm"
              >
                📥 Xuất Excel
              </button>
            )}
            </div>

            {activeTab === 'PASSENGERS' && (
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-4">Ghế</th>
                      <th className="p-4">Khách hàng</th>
                      <th className="p-4">Liên hệ</th>
                      <th className="p-4">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px] font-medium text-slate-700">
                    {Object.keys(seatStatus).filter(k => seatStatus[k].status === 'BOOKED').map((seatId, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer">
                        <td className="p-4"><span className="bg-orange-50 text-[#EF5222] font-bold px-2.5 py-1 rounded-md">{seatId}</span></td>
                        <td className="p-4 flex items-center gap-2"><User size={14} className="text-slate-400" /> {seatStatus[seatId].passengerName}</td>
                        <td className="p-4"><span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {seatStatus[seatId].phone}</span></td>
                        <td className="p-4"><span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 size={14}/> Đã thanh toán</span></td>
                      </tr>
                    ))}
                    {Object.keys(seatStatus).filter(k => seatStatus[k].status === 'BOOKED').length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">Chưa có khách đặt vé</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab !== 'PASSENGERS' && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                <Package size={40} className="mb-3 opacity-20" />
                <p className="font-medium text-[14px]">Tính năng đang phát triển</p>
              </div>
            )}
          </div>
        </div>

        {/* 🔴 MODAL CHỌN DANH SÁCH (CẤP ĐỘ 2) */}
        <AnimatePresence>
          {isSettingOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 uppercase tracking-tight">Cài đặt vận hành</h3>
                  <button onClick={() => setIsSettingOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="p-6 space-y-5">
                  {/* Chọn Tài xế */}
                  {/* 🟢 CUSTOM SEARCHABLE DROPDOWN: Chọn Tài xế */}
                  <div className="space-y-2 relative">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Phân công Tài xế</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#EF5222] transition-colors z-10">
                        <BadgeCheck size={18} strokeWidth={2.5} />
                      </div>
                      
                      {/* Ô Input để Gõ tìm kiếm */}
                      <input 
                        type="text"
                        placeholder="Gõ tên, SĐT hoặc mã để tìm..."
                        value={driverSearch}
                        onChange={(e) => {
                          setDriverSearch(e.target.value);
                          setShowDriverDropdown(true);
                        }}
                        onFocus={() => setShowDriverDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDriverDropdown(false), 200)} // Delay để kịp click chọn item
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-4 focus:ring-[#EF5222]/10 transition-all"
                      />
                      
                      {/* Nút Xóa (Clear) */}
                      {editData.driverId && (
                        <button 
                          onClick={() => {
                            setEditData({...editData, driverId: ''});
                            setDriverSearch('');
                          }}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-red-500 z-10"
                        >
                          ✕
                        </button>
                      )}

                      {/* Bảng Danh sách xổ xuống */}
                      <AnimatePresence>
                        {showDriverDropdown && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar"
                          >
                            {drivers.filter(d => 
                              d.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
                              d.phone.includes(driverSearch) ||
                              d.driverCode.toLowerCase().includes(driverSearch.toLowerCase())
                            ).length === 0 ? (
                              <div className="p-4 text-center text-sm text-slate-500 font-medium">Không tìm thấy tài xế nào</div>
                            ) : (
                              drivers.filter(d => 
                                d.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
                                d.phone.includes(driverSearch) ||
                                d.driverCode.toLowerCase().includes(driverSearch.toLowerCase())
                              ).map(d => (
                                <div 
                                  key={d.id}
                                  onClick={() => {
                                    // 🟢 CẬP NHẬT GÁN ID TÀI XẾ VÀ ID XE (NẾU CÓ) VÀO FORM
                                    setEditData({
                                      ...editData, 
                                      driverId: d.id,
                                      busId: d.defaultBusId ? String(d.defaultBusId) : editData.busId 
                                    });
                                    setDriverSearch(`[${d.driverCode}] ${d.name} • ${d.phone}`);
                                    setShowDriverDropdown(false);
                                  }}
                                  className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors flex flex-col"
                                >
                                  <span className="text-[13px] font-bold text-slate-800 flex justify-between">
    <span>{d.name}</span>
    <span className="text-[#EF5222]">[{d.driverCode}]</span> {/* Vẫn giữ chuẩn màu cam sáng của bạn */}
  </span>
  <span className="text-[11px] font-medium text-slate-500">
    Khu vực: {d.baseLocation} • SĐT: {d.phone}
  </span>
                                </div>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Chọn Xe */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Điều xe (Biển số)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#EF5222] transition-colors">
                        <CarFront size={18} strokeWidth={2.5} />
                      </div>
                      <select value={editData.busId} onChange={(e) => setEditData({...editData, busId: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-4 focus:ring-[#EF5222]/10 transition-all appearance-none cursor-pointer">
                        <option value="">-- Click để điều xe --</option>
                        {buses.map(b => <option key={b.id} value={b.id}>{b.plateNumber} • {b.busType}</option>)}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">▾</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Giá vé */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Giá vé cơ bản</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#EF5222] transition-colors">
                          <CircleDollarSign size={18} strokeWidth={2.5} />
                        </div>
                        <input type="number" value={editData.price} onChange={(e) => setEditData({...editData, price: Number(e.target.value)})} className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-4 focus:ring-[#EF5222]/10 transition-all" />
                      </div>
                    </div>

                    {/* Trạng thái */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Trạng thái</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#EF5222] transition-colors">
                          <Activity size={18} strokeWidth={2.5} />
                        </div>
                        <select value={editData.status} onChange={(e) => setEditData({...editData, status: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#EF5222] focus:ring-4 focus:ring-[#EF5222]/10 transition-all appearance-none cursor-pointer">
                          <option value="PUBLISHED">🟢 Mở bán</option>
                          <option value="DRAFT">🟡 Tạm dừng</option>
                          <option value="CANCELLED">🔴 Đã hủy</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">▾</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button onClick={() => setIsSettingOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700">Hủy bỏ</button>
                  <button onClick={handleUpdateTrip} className="flex-1 py-2.5 bg-[#EF5222] text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-[#D93814] transition-all">Lưu thay đổi</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }