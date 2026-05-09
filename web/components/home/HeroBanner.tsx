'use client';

import { useState } from 'react';
import Image from 'next/image';

// Đã thêm lại 'placeName' để khắc phục lỗi undefined
const BANNERS = [
  { 
    id: 1, 
    src: '/brand/banner1.png', 
    alt: 'Banner 1',
  },
  { 
    id: 2, 
    src: '/brand/banner3.png', 
    alt: 'Banner 2',
  },
  { 
    id: 3, 
    src: '/brand/banner2.png', 
    alt: 'Banner 3',
  },
  { 
    id: 4, 
    src: '/brand/banner4.jpg', 
    alt: 'Banner 4',
  },
];

export default function HeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="relative w-full h-[300px] md:h-[500px] lg:h-[750px] overflow-hidden rounded-b-2xl bg-slate-900">
      
      {/* 1. KHU VỰC HIỂN THỊ ẢNH VÀ THÔNG TIN QUẢNG CÁO */}
      {BANNERS.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
            currentIndex === index ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Ảnh nền */}
          <Image
            src={banner.src}
            alt={banner.alt}
            fill
            priority={index === 0} // Chỉ ưu tiên load nhanh ảnh đầu tiên
            quality={100}
            className="object-cover object-center"
            sizes="100vw"
          />
          
          {/* Lớp phủ gradient nhẹ ở phía trên để dãy số dễ đọc hơn khi ảnh quá sáng */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent z-10"></div>
          
          {/* CHỖ ĐỂ BẠN GẮN THÔNG TIN QUẢNG CÁO TÙY BIẾN CHO TỪNG ẢNH */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 pointer-events-none">
             {/* Ví dụ: <h2 className="text-white text-4xl">{banner.title}</h2> */}
          </div>
        </div>
      ))}

      {/* 2. THANH ĐIỀU HƯỚNG SỐ (Đã thu nhỏ, xếp ngang, đưa lên góc trên phải) */}
      <div className="absolute top-6 right-6 md:top-10 md:right-10 z-30">
        <div className="flex items-center gap-6 md:gap-8 rounded-full bg-black/20 backdrop-blur-md px-6 py-2 border border-white/10 shadow-lg">
          {BANNERS.map((banner, index) => (
            <div 
              key={banner.id} 
              className="flex items-center gap-3 group cursor-pointer" 
              onClick={() => setCurrentIndex(index)}
            >
              {/* Dãy số (Thu nhỏ lại thành text-3xl) */}
              <span className={`text-2xl md:text-3xl font-black italic transition-all duration-300 ${
                currentIndex === index
                  ? 'text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] scale-110' // Trạng thái ĐANG CHỌN 
                  : 'text-white/50 group-hover:text-white/80' // Trạng thái BÌNH THƯỜNG
              }`}>
                0{index + 1}
              </span>
              
              {/* Tên địa điểm tương ứng hiện bên cạnh (Thu nhỏ lại) */}
              <span className={`hidden md:block text-xs md:text-sm font-semibold uppercase tracking-wider transition-all duration-300 ${
                currentIndex === index
                  ? 'text-white' 
                  : 'text-white/40 group-hover:text-white/70'
              }`}>
              </span>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}