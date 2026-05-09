'use client';

import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

// IMPORT COMPONENT BREADCRUMB VÀO ĐÂY
// (Lưu ý: Đổi lại đường dẫn import này cho đúng với thư mục dự án của bạn nếu cần)
import { Breadcrumb } from '@/components/ui/Breadcrumb';

/**
 * TRANG TRA CỨU VÀ QUẢN LÝ VÉ (LOOKUP PAGE)
 * Bao gồm: Tra cứu thông tin, Hiển thị chi tiết, và Quy trình hủy vé bảo mật.
 */
export default function LookupPage() {
  // --- [1] STATES CHO LOGIC TRA CỨU VÉ ---
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  

  // --- [2] STATES CHO LOGIC HỦY VÉ (MỚI) ---
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(''); 
  const [isAgreed, setIsAgreed] = useState(false);
  const [confirmPhone, setConfirmPhone] = useState(''); // Thêm dòng này
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user; // Để check nhanh đã đăng nhập chưa

  // --- [3] HELPER FUNCTIONS (TIỆN ÍCH) ---
  
  // Định dạng số điện thoại hiển thị: 0123 456 789
  const formatPhone = (p: string) => {
    return p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  // Tính toán chính sách hoàn tiền dựa trên thời gian khởi hành
  const getRefundPolicy = () => {
    if (!ticketInfo) return { canCancel: false, refundPercent: 0, hoursLeft: 0 };
    
    const rawDepartureDate = ticketInfo.outboundDepartDateSnapshot || ticketInfo.date;
    const departureTime = new Date(rawDepartureDate).getTime();
    const now = new Date().getTime();
    
    const timeDiffHours = (departureTime - now) / (1000 * 60 * 60);

    // Chính sách: >24h hoàn 100%, >12h hoàn 50%, còn lại không cho hủy
    if (timeDiffHours >= 24) return { canCancel: true, refundPercent: 100, hoursLeft: timeDiffHours };
    if (timeDiffHours >= 12) return { canCancel: true, refundPercent: 50, hoursLeft: timeDiffHours };
    return { canCancel: false, refundPercent: 0, hoursLeft: timeDiffHours };
  };

  const refundPolicy = getRefundPolicy();

  // --- [4] HANDLERS (XỬ LÝ API) ---

  // Xử lý tra cứu vé
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Loại bỏ ký tự # nếu người dùng nhập vào
    const searchCode = orderCode.replace('#', '').trim();

    try {
      const res = await axios.get(`http://localhost:3001/api/lookup`, {
        params: { 
          orderCode: searchCode, 
          phone: phone.trim() 
        }
      });
      setTicketInfo(res.data);
    } catch (err: any) {
      setError('Thông tin vé không tồn tại hoặc sai số điện thoại. Vui lòng kiểm tra lại!');
      setTicketInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý gửi yêu cầu hủy vé lên Server
  const handleCancelTicket = async () => {
    const emailInput = confirmEmail.trim();
    const phoneInput = confirmPhone.trim();
    const ticketPhone = ticketInfo.customerPhone.replace(/[\s.-]/g, '');
    if (!confirmEmail.trim() || !confirmPhone.trim()) {
      return alert("Vui lòng nhập đầy đủ Email và Số điện thoại xác nhận!");
    }
  
    // Kiểm tra khớp số điện thoại (tùy chọn bảo mật thêm ở Client)
    if (confirmPhone.trim() !== ticketInfo.customerPhone) {
      return alert("Số điện thoại xác nhận không chính xác!");
    }
  
    if (!isAgreed) {
      return alert("Bạn cần đồng ý với điều khoản hủy vé!");
    }
    // 1. Kiểm tra trống
    if (!emailInput || !phoneInput) {
      return alert("Vui lòng nhập đầy đủ thông tin xác nhận!");
    }

    // 1. Kiểm tra Email theo yêu cầu của bạn
    if (isLoggedIn) {
      if (emailInput !== session.user?.email) {
        return alert("Email phải trùng với tài khoản đang đăng nhập!");
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput)) {
        return alert("Email vãng lai không hợp lệ!");
      }
    }

    // 2. Kiểm tra Số điện thoại (Đã chuẩn hóa)
    if (phoneInput !== ticketPhone) {
      return alert("Số điện thoại xác nhận không khớp với thông tin trên vé!");
    }
  
    setCancelLoading(true);
    try {
      const res = await axios.post(`http://localhost:3001/api/cancel-ticket`, {
        orderCode: ticketInfo.orderCode,
        phone: confirmPhone.trim(), // Gửi số điện thoại đã xác nhận
        email: confirmEmail.trim() 
      });
  
      alert(res.data.message || 'Hệ thống đã ghi nhận yêu cầu hủy vé của bạn!');
      setTicketInfo({ ...ticketInfo, bookingStatus: 'CANCELLED' });
      setIsCancelModalOpen(false);
      
      // Reset form
      setConfirmEmail(''); 
      setConfirmPhone(''); // Reset sđt
      setIsAgreed(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể kết nối đến máy chủ.';
      alert(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  // --- [5] GIAO DIỆN (UI) ---
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8 bg-gray-50/50 overflow-hidden relative">
      
      {/* KHỐI WRAPPER CHÍNH (Chứa cả Breadcrumb và Khung hiển thị) */}
      <div className="w-full max-w-6xl flex flex-col h-full">
        
        {/* --- COMPONENT BREADCRUMB ĐƯỢC THÊM VÀO ĐÂY --- */}
        <div className="mb-6 w-full">
          <Breadcrumb items={[{ label: 'Tra cứu vé xe', href: '/tra-cuu' }]} />
        </div>

        {/* Khung nội dung thay đổi layout động dựa trên việc có ticketInfo hay chưa */}
        <div className={`w-full transition-all duration-700 ease-in-out grid grid-cols-1 ${ticketInfo ? 'md:grid-cols-12 gap-8' : 'md:grid-cols-1'}`}>
          
          {/* ============================================================
            CỘT 1: FORM TRA CỨU VÉ
            ============================================================ */}
          <motion.div 
            layout
            className={`${ticketInfo ? 'md:col-span-4' : 'max-w-md mx-auto w-full'}`}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
              <div className="bg-white p-10 text-center border-b border-slate-50">
                <h1 className="text-xl font-black text-black uppercase tracking-tight">Tra cứu vé xe</h1>
                <p className="text-[#EF5222] text-[10px] font-extrabold tracking-widest uppercase">Thông tin chính xác nhất</p>
              </div>

              <form onSubmit={handleLookup} className="p-8 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Số điện thoại</label>
                  <input 
                    type="tel"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#EF5222]/20 font-bold text-gray-700 transition-all"
                    placeholder="Nhập số điện thoại mua vé..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Mã đơn hàng</label>
                  <input 
                    type="text"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#EF5222]/20 font-bold text-gray-700 transition-all"
                    placeholder="Ví dụ: #774588..."
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value)}
                    required
                  />
                </div>

                <button 
                  disabled={loading}
                  className="w-full bg-[#EF5222] text-white font-black rounded-2xl hover:bg-[#d4451b] transition-all shadow-lg shadow-orange-200 uppercase tracking-widest text-sm py-4 mt-2"
                >
                  {loading ? 'Đang kiểm tra...' : 'Kiểm tra ngay'}
                </button>
              </form>

              {error && (
                <motion.p 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[#EF5222] text-center pb-8 text-[11px] font-bold px-4 leading-relaxed"
                >
                  {error}
                </motion.p>
              )}
            </div>
          </motion.div>

          {/* ============================================================
            CỘT 2: HIỂN THỊ THÔNG TIN VÉ CHI TIẾT
            ============================================================ */}
          <AnimatePresence>
            {ticketInfo && (
              <motion.div 
                initial={{ opacity: 0, x: 150 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="md:col-span-8"
              >
                <div className="bg-white p-8 md:p-10 rounded-[3rem] border-2 border-dashed border-orange-200 shadow-sm relative h-full flex flex-col justify-center">
                  
                  <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-8">
                    <div>
                      <h2 className="text-xl font-black text-black uppercase tracking-tight">Thông tin vé của bạn</h2>
                      <p className="text-[#EF5222] text-[10px] font-extrabold tracking-widest uppercase mt-1">Chi tiết hành trình</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                        MÃ VÉ: #{ticketInfo.orderCode}
                      </div>
                      {ticketInfo.bookingStatus === 'CANCELLED' ? (
                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Đã Hủy</span>
                      ) : ticketInfo.bookingStatus === 'COMPLETED' ? (
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Đã hoàn thành</span>
                      ) : (
                        <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Chờ Khởi Hành</span>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-10">
                    {/* Cột trái của vé: Lộ trình */}
                    <div className="space-y-4">
                      <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 h-full">
                        <div className="flex items-center gap-4 mb-6 font-black text-xl text-[#EF5222]">
                          <span>{ticketInfo.outboundFromSnapshot}</span>
                          <div className="flex-grow flex items-center h-px bg-gradient-to-r from-[#EF5222] to-transparent opacity-30 mx-2">
                            <span className="text-[#EF5222] ml-auto">➔</span>
                          </div>
                          <span>{ticketInfo.outboundToSnapshot}</span>
                        </div>

                        <div className="space-y-4 text-sm font-bold">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 uppercase text-[9px]">Xuất bến</span>
                            <span className="text-gray-700">
                              {new Date(ticketInfo.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              <span className="text-gray-300 mx-2">|</span>
                              {new Date(ticketInfo.date).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 uppercase text-[9px]">Dự kiến đến</span>
                            <span className="text-gray-700">
                              {ticketInfo.outboundArrivalTimeSnapshot 
                                ? `${new Date(ticketInfo.outboundArrivalTimeSnapshot).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} | ${new Date(ticketInfo.outboundArrivalTimeSnapshot).toLocaleDateString('vi-VN')}`
                                : '--:--'}
                            </span>
                          </div>

                          <div className="flex justify-between border-t border-gray-200 pt-4 mt-2">
                            <span className="text-gray-400 uppercase text-[9px]">Hành trình</span>
                            <span className="text-[#EF5222]">
                              {ticketInfo.outboundDurationMinutesSnapshot 
                                ? `${Math.floor(ticketInfo.outboundDurationMinutesSnapshot / 60)}h ${ticketInfo.outboundDurationMinutesSnapshot % 60}p` 
                                : '---'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cột phải của vé: Khách hàng & Thanh toán */}
                    <div className="flex flex-col gap-4">
                      <div className="bg-orange-50/30 p-6 rounded-[2rem] border border-orange-100 flex-grow">
                        <div className="mb-4">
                          <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Hành khách</p>
                          <p className="font-black text-gray-800 text-lg uppercase leading-none">{ticketInfo.customerName}</p>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Số điện thoại</p>
                          <p className="font-black text-gray-700 text-sm">{formatPhone(ticketInfo.customerPhone)}</p>
                        </div>

                        <div>
                          <p className="text-[9px] text-gray-400 font-black uppercase mb-2">Vị trí ghế</p>
                          <div className="flex gap-2 flex-wrap">
                            {ticketInfo.seats?.map((s: any) => (
                              <span key={s.id} className="bg-white border-2 border-[#EF5222] text-[#EF5222] px-3.5 py-1 rounded-xl font-black text-xs shadow-sm">
                                {s.seatNumber}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Tổng tiền & Trạng thái thanh toán */}
                      <div className="bg-[#1a1a1a] p-6 rounded-[2rem] shadow-xl flex justify-between items-center text-white">
                        <div>
                          <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Tổng tiền</p>
                          <p className="text-2xl font-black text-[#EF5222] leading-none">
                            {Number(ticketInfo.amount).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                        <div className={`text-[10px] font-black px-4 py-1.5 rounded-xl uppercase ${ticketInfo.paymentStatus === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {ticketInfo.paymentStatus === 'PAID' ? 'Đã Thanh Toán' : 'Chưa trả'}
                        </div>
                      </div>

                      {/* Nút hủy vé (Chỉ hiện nếu trạng thái cho phép) */}
                      {ticketInfo.bookingStatus !== 'CANCELLED' && ticketInfo.bookingStatus !== 'COMPLETED' && (
                        <div className="mt-2 text-center">
                          {refundPolicy.canCancel ? (
                            <button 
                              onClick={() => setIsCancelModalOpen(true)}
                              className="text-red-500 font-bold text-sm underline hover:text-red-700 transition-colors"
                            >
                              Hủy vé & Hoàn tiền
                            </button>
                          ) : (
                            <p className="text-gray-400 text-[10px] font-bold px-4">
                              * Vé sắp khởi hành hoặc đã qua giờ xuất bến, không thể tự hủy trên hệ thống trực tuyến.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================================
            MODAL XÁC NHẬN HỦY VÉ (OVERLAY)
            ============================================================ */}
          <AnimatePresence>
            {isCancelModalOpen && ticketInfo && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                  className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-lg w-full border border-gray-100 relative overflow-hidden"
                >
                  {/* Thanh trang trí phía trên */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>

                  <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight text-center">Xác nhận hủy vé</h3>
                  
                  {/* KHỐI CHÍNH SÁCH HOÀN TIỀN */}
                  <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6 mb-6 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-gray-600 uppercase">Tỷ lệ hoàn tiền</span>
                      <span className="text-xl font-black text-red-600">{refundPolicy.refundPercent}%</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-red-200/30 pt-3">
                      <span className="text-xs font-bold text-gray-600 uppercase">Số tiền nhận lại</span>
                      <span className="text-2xl font-black text-red-600">
                        {((ticketInfo.amount * refundPolicy.refundPercent) / 100).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* ĐIỀU KHOẢN HỦY VÉ */}
                  <div className="mb-6">
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-3 ml-1 tracking-widest">
                      Điều khoản & Quy định hủy vé
                    </label>
                    <div className="bg-gray-50 rounded-2xl p-4 text-[12px] text-gray-600 leading-relaxed border border-gray-100 max-h-32 overflow-y-auto mb-4 custom-scrollbar">
                      <ul className="space-y-2 list-disc pl-4 font-medium">
                        <li>Vé đã hủy <strong>không thể khôi phục</strong> lại dưới bất kỳ hình thức nào.</li>
                        <li>Ghế sẽ được giải phóng ngay lập tức để người khác có thể đặt.</li>
                        <li>Tiền hoàn lại sẽ được chuyển khoản trong vòng <strong>3-5 ngày làm việc</strong>.</li>
                        <li>Tỉ lệ hoàn tiền sẽ theo % của công ty đã quy định.</li>
                        <li>Bạn chịu trách nhiệm về tính chính xác của Email xác nhận bên dưới.</li>
                        <li>Phí hủy vé được tính dựa trên thời điểm bạn nhấn nút xác nhận này.</li>
                        <li>Mọi thông tin chi tiết xin quý khách liên hệ tổng đài 0565600360 để được hỗ trợ tốt nhát.</li>
                      </ul>
                    </div>

                    {/* CHECKBOX ĐỒNG Ý */}
                    <label className="flex items-center gap-3 cursor-pointer group px-2">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="peer appearance-none w-6 h-6 border-2 border-gray-300 rounded-lg checked:bg-red-500 checked:border-red-500 transition-all duration-300"
                          checked={isAgreed}
                          onChange={(e) => setIsAgreed(e.target.checked)}
                        />
                        <svg className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="text-sm font-bold text-gray-700 group-hover:text-red-600 transition-colors">
                        Tôi đã đọc và đồng ý với điều khoản hủy vé
                      </span>
                    </label>
                  </div>

                  {/* XÁC MINH THÔNG TIN BẢO MẬT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
                        Email {isLoggedIn ? "(Khớp với tài khoản)" : "(Email đặt vé)"}
                      </label>
                      <input
                        type="email"
                        className={`w-full bg-gray-50 border ${
                          isLoggedIn && confirmEmail && confirmEmail !== session.user?.email 
                          ? 'border-red-500' 
                          : 'border-gray-200'
                        } rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-500/20 font-bold text-gray-700 transition-all`}
                        placeholder={isLoggedIn ? session.user?.email || "" : "nhanvien@gmail.com"}
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                      />
                      {isLoggedIn && confirmEmail && confirmEmail !== session.user?.email && (
                        <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold italic">* Email không khớp với tài khoản</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Số điện thoại</label>
                      <input
                        type="tel"
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-500/20 font-bold text-gray-700 transition-all"
                        placeholder="Nhập số điện thoại..."
                        value={confirmPhone}
                        onChange={(e) => setConfirmPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* NÚT BẤM ĐIỀU KHIỂN */}
                  <div className="flex gap-4">
                    <button 
                      onClick={() => { setIsCancelModalOpen(false); setConfirmEmail(''); setIsAgreed(false); }}
                      disabled={cancelLoading}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-4 rounded-2xl transition-all uppercase text-xs tracking-widest"
                    >
                      Quay lại
                    </button>
                    <button 
                      onClick={handleCancelTicket}
                      disabled={cancelLoading || !confirmEmail.trim() || !isAgreed}
                      className={`flex-[1.5] font-black py-4 rounded-2xl transition-all shadow-lg uppercase text-xs tracking-widest flex justify-center items-center gap-2
                        ${isAgreed && confirmEmail.trim() 
                          ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200 cursor-pointer' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
                    >
                      {cancelLoading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          Xác nhận hủy vé
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}