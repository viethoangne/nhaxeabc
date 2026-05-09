'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function ChairPage() {
  const searchParams = useSearchParams();

  // LẤY THÔNG TIN TỪ URL
  const price = Number(searchParams.get('price') || '0'); 
  const tickets = Number(searchParams.get('tickets') || '1');
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';
  const outboundTripId = Number(searchParams.get('outboundTripId') || '0');
  const tripType = (searchParams.get('tripType') as 'oneway' | 'round') || 'oneway';

  // FIX LỖI HYDRATION
  const [isMounted, setIsMounted] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const seatsA = useMemo(() => Array.from({ length: 11 }, (_, i) => ({ id: `A${i+1 < 10 ? '0'+(i+1) : i+1}`, booked: [3, 7].includes(i+1) })), []);
  const seatsB = useMemo(() => Array.from({ length: 11 }, (_, i) => ({ id: `B${i+1 < 10 ? '0'+(i+1) : i+1}`, booked: [2].includes(i+1) })), []);

  const toggleSeat = (id: string, booked: boolean) => {
    if (booked) return;
    if (selectedSeats.includes(id)) {
      setSelectedSeats(selectedSeats.filter(s => s !== id));
    } else {
      if (selectedSeats.length >= tickets) {
        alert(`Bạn chỉ được chọn tối đa ${tickets} ghế`);
        return;
      }
      setSelectedSeats([...selectedSeats, id]);
    }
  };

  const handlePayment = async () => {
    if (selectedSeats.length < tickets) {
      alert(`Vui lòng chọn đủ ${tickets} ghế`);
      return;
    }
    if (!customerInfo.email) {
      alert('Vui lòng nhập Email để nhận vé');
      return;
    }

    try {
      setLoading(true);
      // Gửi đầy đủ thông tin sang API Route
      const response = await axios.post('/api/payment/momo', {
        tripType,
        tickets,
        from,
        to,
        date,
        price, // TRUYỀN GIÁ THỰC TẾ XUỐNG BACKEND
        outboundTripId,
        outboundSeats: selectedSeats,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
      });

      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi tạo thanh toán');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl px-4 py-6 bg-slate-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-6 border-l-4 border-orange-500 pl-3">Sơ đồ phòng Cabin VIP</h2>
            <div className="grid grid-cols-2 gap-8">
              {[ { label: 'Tầng dưới', data: seatsA }, { label: 'Tầng trên', data: seatsB } ].map((floor, idx) => (
                <div key={idx} className="space-y-3">
                  <p className="text-center font-bold text-slate-400 text-xs uppercase italic">{floor.label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {floor.data.map(seat => (
                      <motion.button
                        key={seat.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleSeat(seat.id, seat.booked)}
                        className={`py-3 rounded-xl border-2 font-bold transition-colors ${seat.booked ? 'bg-slate-100 border-slate-200 text-slate-300' : selectedSeats.includes(seat.id) ? 'bg-orange-500 border-orange-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-700'}`}
                      >
                        {seat.id}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h2 className="text-xl font-bold mb-4">Thông tin liên hệ nhận vé</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Họ và tên" className="p-3 border rounded-xl outline-none" onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})} />
                <input type="text" placeholder="Số điện thoại" className="p-3 border rounded-xl outline-none" onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})} />
                <input type="email" placeholder="Email (Nhận vé tự động)" className="p-3 border rounded-xl outline-none md:col-span-2" onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})} />
             </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-orange-100 sticky top-6">
            <h2 className="font-bold text-lg mb-4 text-slate-800">Chi tiết thanh toán</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Tuyến:</span><span className="font-bold">{from} → {to}</span></div>
              <div className="flex justify-between"><span>Số ghế:</span><span className="font-bold text-orange-600">{selectedSeats.join(', ') || 'Chưa chọn'}</span></div>
              <div className="flex justify-between"><span>Đơn giá:</span><span className="font-bold">{price.toLocaleString('vi-VN')}đ</span></div>
              <hr className="border-dashed" />
              <div className="flex justify-between items-center">
                <span className="text-base font-bold">Tổng cộng:</span>
                <span className="text-2xl font-black text-orange-600">{(selectedSeats.length * price).toLocaleString('vi-VN')}đ</span>
              </div>
              <button 
                onClick={handlePayment}
                disabled={loading}
                className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl mt-4 hover:bg-orange-600 shadow-lg active:scale-95 disabled:opacity-50"
              >
                {loading ? 'ĐANG XỬ LÝ...' : 'THANH TOÁN QUA MOMO'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.main>
  );
}