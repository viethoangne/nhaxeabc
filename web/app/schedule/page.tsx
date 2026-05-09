'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Breadcrumb } from '@/components/ui/Breadcrumb'; // <-- THÊM IMPORT COMPONENT BREADCRUMB

export default function RouteList() {
  const [allRoutes, setAllRoutes] = useState([]);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:3001/api/schedule/routes')
      .then(res => setAllRoutes(res.data))
      .catch(err => console.error("Lỗi lấy dữ liệu:", err))
      .finally(() => setLoading(false));
  }, []);

  const normalizeText = (text) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  };

  const filteredRoutes = allRoutes.filter(route => {
    const routeFrom = normalizeText(route.from);
    const routeTo = normalizeText(route.to);
    const termFrom = normalizeText(searchFrom);
    const termTo = normalizeText(searchTo);
    return routeFrom.includes(termFrom) && routeTo.includes(termTo);
  });

  const groupedRoutes = filteredRoutes.reduce((acc, route) => {
    if (!acc[route.from]) acc[route.from] = [];
    acc[route.from].push(route);
    return acc;
  }, {});

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#EF5222]"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      
      {/* VÙNG BREADCRUMB - Nằm gọn gàng phía trên */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
        <Breadcrumb 
          items={[
            { label: 'Lịch trình chuyến xe' }
          ]} 
        />
      </div>

      {/* THANH TÌM KIẾM CỐ ĐỊNH - Đã sửa top-[152px] thành top-0 để bám sát lề trên */}
      <div className="sticky top-0 z-[40] bg-white border-y border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div className="shrink-0">
            <h1 className="text-xl font-black text-black uppercase tracking-tight">Lịch trình chuyến xe</h1>
            <p className="text-[#EF5222] text-[10px] font-extrabold tracking-widest uppercase">Chất lượng là danh dự</p>
          </div>

          <div className="flex-1 flex items-center bg-gray-100/80 border border-gray-200 rounded-2xl px-4 py-1.5 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-[#EF5222]/20">
            <div className="flex-1 flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 pl-2 uppercase">Điểm đi</span>
              <input 
                className="bg-transparent outline-none text-sm p-2 font-medium text-gray-800" 
                placeholder="Nhập nơi đi..."
                value={searchFrom}
                onChange={(e) => setSearchFrom(e.target.value)}
                spellCheck="false"
              />
            </div>
            <div className="w-[1px] h-8 bg-gray-300 mx-4 opacity-50"></div>
            <div className="flex-1 flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 pl-2 uppercase">Điểm đến</span>
              <input 
                className="bg-transparent outline-none text-sm p-2 font-medium text-gray-800" 
                placeholder="Nhập nơi đến..."
                value={searchTo}
                onChange={(e) => setSearchTo(e.target.value)}
                spellCheck="false"
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-3 bg-gray-50">
           <div className="grid grid-cols-5 text-[11px] font-black uppercase text-black-700 tracking-wider">
             <span>Tuyến xe</span>
             <span className="text-center">Loại xe</span>
             <span className="text-center">Quãng đường</span>
             <span className="text-center">Thời gian</span>
             <span className="text-right pr-4">Giá vé</span>
           </div>
        </div>
      </div>

      {/* DANH SÁCH TUYẾN XE */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {Object.keys(groupedRoutes).length > 0 ? (
          Object.keys(groupedRoutes).map((from, index) => (
            <div key={index} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-6 w-1 bg-[#EF5222] rounded-full"></div>
                <h2 className="text-lg font-bold text-[#EF5222] uppercase">
                  Tuyến xuất phát từ {from}
                </h2>
              </div>
              
              <div className="grid gap-3">
                {groupedRoutes[from].map((route, idx) => (
                  <div key={idx} className="grid grid-cols-5 items-center p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#EF5222]/30 hover:shadow-xl hover:shadow-gray-200/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#EF5222] text-base">{route.from}</span>
                      <span className="text-gray-400 font-light">→</span>
                      <span className="font-bold text-[#EF5222] text-base">{route.to}</span>
                    </div>
                    
                    <div className="text-center">
                      <span className="px-3 py-1 bg-orange-50 rounded-full text-[10px] font-bold text-[#EF5222] border border-orange-100 uppercase">
                        {route.busType || 'Limousine'}
                      </span>
                    </div>
                    
                    <div className="text-center text-sm font-semibold text-gray-600 italic">
                      {route.distanceKm}km
                    </div>
                    
                    <div className="text-center text-sm font-semibold text-gray-600">
                      {Math.floor(route.durationMinutes / 60)}g{route.durationMinutes % 60}p
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-black text-[#EF5222]">
                        {route.price?.toLocaleString()}đ
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase">Mỗi vé</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">Không tìm thấy tuyến xe phù hợp.</p>
          </div>
        )}
      </div>
    </div>
  );
}