'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion'; 
import { useTranslations } from 'next-intl';

interface RouteData {
  from: string;
  to: string;
  busType: string;
  distanceKm: number;
  durationMinutes: number;
  price: number;
}

function ImageSlideshow({ images, alt }: { images: string[], alt: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      {images.map((img, index) => {
        const isActive = index === currentIndex;
        return (
          <div 
            key={index} 
            className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <Image
              src={img}
              alt={`${alt} - ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className={`object-cover transform transition-transform ease-out ${
                isActive ? 'scale-110 duration-[7000ms]' : 'scale-100 duration-1000'
              }`}
            />
          </div>
        );
      })}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-20 pointer-events-none"></div>
    </div>
  );
}

export default function PopularRoutes() {
  const t = useTranslations('PopularRoutes');

  const [groupedRoutes, setGroupedRoutes] = useState<Record<string, RouteData[]>>({
    "TP. Hồ Chí Minh": [],
    "Đà Lạt": [],
    "Đà Nẵng": [] 
  });
  const [loading, setLoading] = useState(true);

  const fixedLocations = [
    {
      displayName: "TP. Hồ Chí Minh",
      searchKey: "hồ chí minh", 
      images: ["/brand/2.jpg", "/brand/2.1.jpg", "/brand/2.2.jpg"],
    },
    {
      displayName: "Đà Lạt",
      searchKey: "đà lạt",
      images: ["/brand/dalat.jpg", "/brand/dalat1.jpg", "/brand/dalat2.jpg"],
    },
    {
      displayName: "Đà Nẵng",
      searchKey: "đà nẵng", 
      images: ["/brand/danang.jpg", "/brand/danang1.jpg", "/brand/danang2.jpg"],
    }
  ];

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await axios.get(`${API_BASE}/schedule/routes`);
        const allRoutes: RouteData[] = response.data;
        const newGrouped: Record<string, RouteData[]> = {
          "TP. Hồ Chí Minh": [], "Đà Lạt": [], "Đà Nẵng": [] 
        };

        allRoutes.forEach(route => {
          const fromLower = route.from.toLowerCase();
          if (fromLower.includes("hồ chí minh")) newGrouped["TP. Hồ Chí Minh"].push(route);
          else if (fromLower.includes("đà lạt")) newGrouped["Đà Lạt"].push(route);
          else if (fromLower.includes("đà nẵng")) newGrouped["Đà Nẵng"].push(route);
        });
        setGroupedRoutes(newGrouped);
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-slate-50">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-[#EF5222] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 60, scale: 0.94, filter: 'blur(4px)' },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      filter: 'blur(0px)',
      transition: { type: "spring", stiffness: 50, damping: 16, mass: 1.1 } 
    }
  };

  return (
    // Đã đổi thành bg-transparent để hòa nhập 100% không để lộ vết cắt
    <section className="py-16 bg-transparent relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#EF5222]/5 to-transparent blur-3xl" />
        <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-[#00613D]/5 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Margin bottom giảm từ mb-16 -> mb-12 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          {/* Chữ nhỏ hơn một chút */}
          <h2 className="text-[32px] md:text-[40px] font-extrabold text-[#EF5222] uppercase tracking-tight relative inline-block">
            {t('title')}
            <span className="absolute -bottom-2 left-1/2 w-16 h-1.5 bg-gradient-to-r from-[#EF5222] to-[#ff7e54] transform -translate-x-1/2 rounded-full"></span>
          </h2>
          <p className="text-[#EF5222] mt-4 font-medium text-[15px] md:text-[16px] tracking-wide">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Giảm khoảng cách gap giữa các cột */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {fixedLocations.map((loc, idx) => {
            const routesForThisCard = groupedRoutes[loc.displayName].slice(0, 3);

            return (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                whileHover={{ y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="group flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(239,82,34,0.15)] transition-all duration-500 overflow-hidden border border-slate-100 dark:border-slate-800 relative cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#EF5222]/0 to-[#EF5222]/0 group-hover:from-[#EF5222]/5 group-hover:to-transparent transition-colors duration-500 pointer-events-none z-10" />

                {/* THU GỌN CHIỀU CAO ẢNH: h-[240px] -> h-[200px] */}
                <div className="relative h-[200px] w-full overflow-hidden">
                  <ImageSlideshow images={loc.images} alt={`Tuyến xe từ ${loc.displayName}`} />
                  
                  {/* Glowing active hub indicator */}
                  <div className="absolute top-4 left-4 z-30">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white/95 text-[10px] font-black uppercase tracking-wider shadow-sm">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_#f97316]" />
                      {t('depart_from')}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-5 z-30 right-5">
                    {/* Chữ tên thành phố trên ảnh nhỏ lại một chút và có bóng mờ */}
                    <h3 className="text-[28px] font-black text-white tracking-wide drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)] leading-tight">
                      {loc.displayName}
                    </h3>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col p-3.5 relative z-20 bg-white dark:bg-slate-900 gap-1.5">
                  {routesForThisCard.length > 0 ? (
                    routesForThisCard.map((route, index) => (
                      <Link 
                        key={index} 
                        href={`/search-trip?from=${encodeURIComponent(loc.displayName)}&to=${encodeURIComponent(route.to)}&date=${defaultDate}&tickets=1&tripType=oneway`}
                        className="group/item relative flex items-center justify-between p-3.5 rounded-[1.25rem] hover:bg-orange-500/5 dark:hover:bg-orange-500/10 border border-transparent hover:border-orange-500/10 transition-all duration-300 overflow-hidden"
                      >
                        {/* Soft left brand line on hover */}
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-orange-500 rounded-r opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative z-10 w-full flex justify-between items-center">
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 group-hover/item:text-orange-500 transition-colors duration-300 flex items-center gap-2">
                              {route.to}
                            </h4>
                            
                            {/* Premium colorized tags */}
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/30 px-2.5 py-0.5 rounded-md border border-orange-100/30">
                                <svg className="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                {route.distanceKm}km
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/30 px-2.5 py-0.5 rounded-md border border-teal-100/30">
                                <svg className="w-3 h-3 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {`${Math.floor(route.durationMinutes / 60)}h${route.durationMinutes % 60 !== 0 ? (route.durationMinutes % 60) + 'p' : ''}`}
                              </span>
                            </div>
                          </div>
                          
                          {/* Price & Book now sliding arrow */}
                          <div className="flex items-center gap-3">
                            <div className="text-right flex flex-col items-end">
                              <span className="text-orange-500 dark:text-orange-400 font-black text-lg group-hover/item:scale-105 transition-transform duration-300">
                                {route.price ? `${route.price.toLocaleString()}đ` : t('updating')}
                              </span>
                              <span className="text-[10px] font-black text-[#EF5222]/80 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 uppercase tracking-wider">
                                {t('book_now')}
                              </span>
                            </div>
                            
                            {/* Slide-in glowing arrow circle button */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/25 transition-all duration-300 transform scale-0 -translate-x-2 opacity-0 group-hover/item:scale-100 group-hover/item:translate-x-0 group-hover/item:opacity-100 group-hover/item:rotate-45">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 opacity-60">
                      <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      <p className="text-slate-500 font-medium text-[14px]">{t('updating_routes')}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}