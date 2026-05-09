'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import html2canvas from 'html2canvas';

export default function VerifyTicketPage() {
  const { orderCode } = useParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await axios.get(`${apiUrl}/payment/verify/${orderCode}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
  
        if (res.data.success) {
          setStatus('success');
          setData(res.data.data);
        } else {
          setData(res.data.data);
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };
    if (orderCode) verify();
  }, [orderCode]);

  // Hàm tải ảnh vé cho khách hàng
  const handleDownloadImage = async () => {
    const element = document.getElementById('ticket-capture-area');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 3, useCORS: true });
    const link = document.createElement('a');
    link.download = `ve-xe-ABC-${orderCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-200 p-6">
      <div id="ticket-capture-area" className="max-w-md w-full relative shadow-2xl rounded-3xl overflow-hidden bg-white">
        {/* Header */}
        <div className="bg-orange-600 p-6 text-white text-center">
          <h1 className="text-2xl font-black italic">NHÀ XE ABC</h1>
          <p className="text-sm opacity-90 tracking-widest uppercase">Vé Xe Điện Tử</p>
          <div className="mt-4 inline-block bg-white/20 px-4 py-1 rounded-full text-xs font-mono">
            #{orderCode}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className={`text-center py-3 rounded-2xl border-2 font-black uppercase ${
            status === 'success' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {status === 'success' ? '● Đã Xác Thực' : '● Chưa Thanh Toán'}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between border-b border-dashed pb-2">
              <span className="text-slate-400 text-sm">Hành khách:</span>
              <span className="font-bold text-slate-800">{data?.customer || '---'}</span>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl">
              <span className="text-orange-400 text-xs block font-bold uppercase">Lộ trình:</span>
              <p className="text-orange-800 font-black">{data?.route || 'Đang cập nhật'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-xl">
                <span className="text-blue-400 text-[10px] block font-bold uppercase">Ghế</span>
                <span className="text-blue-700 font-black text-xl">{data?.seats || '--'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Tổng tiền</span>
                <span className="text-slate-800 font-black text-lg">
                  {Number(data?.price || 0).toLocaleString()}đ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barcode Footer */}
        <div className="p-6 border-t-2 border-dashed border-slate-100 text-center">
          <div className="w-full h-12 bg-[url('https://www.interactiveaccessibility.com/sites/default/files/barcode.png')] bg-contain bg-repeat-x opacity-10 mb-2"></div>
          <p className="text-[10px] text-slate-300 uppercase">Chúc quý khách một chuyến đi bình an</p>
        </div>
      </div>

      {/* Button tải ảnh (Nằm ngoài vùng chụp) */}
      <button 
        onClick={handleDownloadImage}
        className="mt-8 bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-black transition"
      >
        Tải ảnh vé về máy (.PNG)
      </button>
    </div>
  );
}