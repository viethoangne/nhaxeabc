'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Lấy userId từ hệ thống Auth của bạn
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payment/history/${userId}`);
        setBookings(res.data);
      } catch (err) {
        console.error("Lỗi tải lịch sử:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  if (loading) return <div className="p-10 text-center">Đang tải lịch sử vé...</div>;
  if (!userId) return <div className="p-10 text-center">Vui lòng đăng nhập để xem lịch sử đặt vé.</div>;

  return (
    <div className="max-w-4xl mx-auto my-10 p-6">
      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Lịch sử đặt vé</h1>
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
          {bookings.length} vé đã mua
        </span>
      </div>
      
      {bookings.length === 0 ? (
        <div className="bg-gray-50 p-16 text-center rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500 mb-4">Bạn chưa có chuyến đi nào hoàn tất thanh toán.</p>
          <Link href="/" className="text-orange-600 font-semibold hover:underline">
            Đặt vé ngay ➔
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((item: any) => (
            <div key={item.id} className="relative bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition group">
              {/* Phần trang trí giống cuống vé */}
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-orange-500"></div>
              <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-400 font-mono uppercase">Mã vé:</span>
                    <span className="font-bold text-gray-700">#{item.orderCode}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {item.from} ➔ {item.to}
                  </h3>
                  
                  <div className="flex gap-4 text-sm text-gray-500">
                    <p>📅 {new Date(item.date).toLocaleDateString('vi-VN')}</p>
                    <p>💺 Ghế: <span className="text-orange-600 font-semibold">{item.seats?.map((s: any) => s.seatNumber).join(', ')}</span></p>
                  </div>
                </div>
                
                <div className="w-full md:w-auto text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0">
                  <p className="text-2xl font-black text-gray-900 mb-3">
                    {Number(item.amount).toLocaleString()}đ
                  </p>
                  <Link 
                    href={`/verify/${item.orderCode}`} 
                    className="inline-block w-full md:w-auto text-center bg-gray-900 text-white px-6 py-2.5 rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
                  >
                    Xem vé điện tử
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}