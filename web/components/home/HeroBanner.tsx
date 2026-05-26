'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

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

  // 🟢 TỰ ĐỘNG CHUYỂN BANNER SAU MỖI 5 GIÂY KÈM HIỆU ỨNG ZOOM MƯỢT MÀ
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[180px] sm:h-[280px] md:h-[500px] lg:h-[750px] overflow-hidden rounded-b-[1.5rem] md:rounded-b-[2.5rem] bg-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.15)]">

      {/* 1. KHU VỰC HIỂN THỊ ẢNH VÀ HIỆU ỨNG PHÓNG TO (KEN BURNS EFFECT) */}
      {BANNERS.map((banner, index) => (
        <div
          key={banner.id}
          className="absolute inset-0 w-full h-full"
          style={{
            opacity: currentIndex === index ? 1 : 0,
            zIndex: currentIndex === index ? 10 : 0,
            transform: currentIndex === index ? 'scale(1.05)' : 'scale(1.01)',
            transition: 'transform 6000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 1200ms ease-in-out',
          }}
        >
          {/* Ảnh nền */}
          <Image
            src={banner.src}
            alt={banner.alt}
            fill
            priority={index === 0} // Chỉ ưu tiên load nhanh ảnh đầu tiên
            quality={100}
            className="object-cover object-center pointer-events-none select-none"
            sizes="100vw"
          />

          {/* Lớp phủ gradient chìm nhẹ ở phía trên để dãy số dễ đọc và trông sâu hơn */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20 z-10" />
        </div>
      ))}

      {/* 2. THANH ĐIỀU HƯỚNG SỐ CAO CẤP */}
      <div className="absolute top-4 right-4 md:top-10 md:right-10 z-30">
        <div className="flex items-center gap-3 md:gap-8 rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1.5 md:px-6 md:py-2.5 border border-white/10 md:border-white/15 shadow-xl">
          {BANNERS.map((banner, index) => (
            <div
              key={banner.id}
              className="flex items-center group cursor-pointer"
              onClick={() => setCurrentIndex(index)}
            >
              {/* Dãy số phát sáng dịu khi được chọn */}
              <span className={`text-sm md:text-3xl font-bold md:font-black italic tracking-wide transition-all duration-300 ${currentIndex === index
                  ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)] scale-110' // Active state
                  : 'text-white/40 group-hover:text-white/90 group-hover:scale-105' // Normal state
                }`}>
                0{index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}