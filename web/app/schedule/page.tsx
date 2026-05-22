'use client';

import { useTranslations } from 'next-intl';
import { API_BASE } from '@/lib/api';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Clock, 
  Search, 
  Ticket, 
  Compass, 
  ArrowRight, 
  ChevronRight,
  TrendingUp,
  HelpCircle,
  Bus,
  Map,
  ShieldCheck
} from 'lucide-react';

interface RouteItem {
  id: string | number;
  from: string;
  to: string;
  busType?: string;
  distanceKm: number;
  durationMinutes: number;
  price: number;
}

export default function RouteList() {
  const t = useTranslations('schedulePage');
  const router = useRouter();
  const [allRoutes, setAllRoutes] = useState<RouteItem[]>([]);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/schedule/routes`)
      .then(res => setAllRoutes(res.data || []))
      .catch(err => console.error("Lỗi lấy dữ liệu:", err))
      .finally(() => setLoading(false));
  }, []);

  const normalizeText = (text: string) => {
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

  // Nhóm tuyến xuất phát theo Điểm đi
  const groupedRoutes = filteredRoutes.reduce((acc: Record<string, RouteItem[]>, route) => {
    if (!acc[route.from]) acc[route.from] = [];
    acc[route.from].push(route);
    return acc;
  }, {});

  const handleBookingRedirect = (from: string, to: string) => {
    // Chuyển hướng sang trang kết quả tìm kiếm với tham số tương ứng
    const today = new Date().toISOString().split('T')[0];
    const query = new URLSearchParams({
      from,
      to,
      date: today,
      tickets: '1',
      tripType: 'oneway'
    });
    router.push(`/search-trip?${query.toString()}`);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full blur-xl bg-orange-500/20 animate-pulse"></div>
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">{t('loading')}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-24 transition-colors duration-500 relative overflow-hidden text-slate-700 dark:text-slate-300">
      
      {/* Premium ambient decorative glowing elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-500/5 dark:bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-amber-500/5 dark:bg-amber-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-2 relative z-10">
        <Breadcrumb items={[{ label: t('breadcrumb') }]} />
      </div>

      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <span className="inline-block px-3 py-1 mb-2.5 text-[9px] font-black tracking-[0.2em] text-[#EF5222] uppercase bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-100/50 dark:border-orange-900/30">
              {t('tagline')}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight leading-none flex items-center gap-2">
              {t('heading1')} <span className="text-[#EF5222]">{t('heading2')}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">
              "{t('subHeading')}"
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm w-fit text-xs font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>{t('priceUpdate')}</span>
          </div>
        </motion.div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-10 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-none"
        >
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="shrink-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/20 flex items-center justify-center text-[#EF5222] shadow-sm">
                <Search size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-850 dark:text-white text-sm">{t('searchTitle')}</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{t('searchSub')}</p>
              </div>
            </div>

            <div className="flex-grow w-full grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-200/40 dark:border-slate-850">
              
              {/* Điểm đi */}
              <div className="flex items-center gap-3 px-4 py-2 hover:bg-white dark:hover:bg-slate-900/60 rounded-xl transition-all duration-200 group">
                <MapPin className="text-slate-400 group-hover:text-[#EF5222] transition-colors shrink-0" size={18} />
                <div className="flex-grow flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('searchFrom')}</span>
                  <input 
                    type="text"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                    className="bg-transparent border-none outline-none p-0 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 mt-0.5 w-full"
                    placeholder={t('searchFromPlaceholder')}
                  />
                </div>
              </div>

              {/* Điểm đến */}
              <div className="flex items-center gap-3 px-4 py-2 hover:bg-white dark:hover:bg-slate-900/60 rounded-xl transition-all duration-200 group border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-slate-800/80">
                <Compass className="text-slate-400 group-hover:text-[#EF5222] transition-colors shrink-0" size={18} />
                <div className="flex-grow flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('searchTo')}</span>
                  <input 
                    type="text"
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value)}
                    className="bg-transparent border-none outline-none p-0 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 mt-0.5 w-full"
                    placeholder={t('searchToPlaceholder')}
                  />
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>

      {/* ROUTE LIST TABLE HEADER (FOR DESKTOP RENDER) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-4 relative z-10 hidden md:block">
        <div className="px-8 py-3 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
          <span className="text-left">{t('tblFromTo')}</span>
          <span>{t('tblBusType')}</span>
          <span>{t('tblDistance')}</span>
          <span>{t('tblDuration')}</span>
          <span className="text-right pr-4">{t('tblPrice')}</span>
        </div>
      </div>

      {/* GROUPED ROUTES CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 space-y-12">
        {Object.keys(groupedRoutes).length > 0 ? (
          Object.keys(groupedRoutes).map((fromName, groupIdx) => (
            <motion.div 
              key={fromName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(groupIdx * 0.1, 0.5) }}
              className="space-y-4"
            >
              {/* Group Title Badge */}
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#EF5222]"></span>
                </div>
                <h2 className="text-base font-extrabold text-[#EF5222] uppercase tracking-wide">
                  {t('groupTitle')} <span className="underline decoration-2 decoration-orange-300 dark:decoration-orange-950 underline-offset-4">{fromName}</span>
                </h2>
              </div>

              {/* Grid of Route Cards */}
              <div className="grid gap-4">
                {groupedRoutes[fromName].map((route, routeIdx) => (
                  <motion.div 
                    key={route.id || routeIdx}
                    whileHover={{ y: -4, scale: 1.008 }}
                    onClick={() => handleBookingRedirect(route.from, route.to)}
                    className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] dark:shadow-none transition-all duration-300 cursor-pointer flex flex-col md:grid md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] items-center gap-5 text-center group hover:border-[#EF5222]/30 dark:hover:border-orange-500/20 hover:shadow-[0_12px_30px_-5px_rgba(239,82,34,0.04)] dark:hover:shadow-orange-950/5"
                  >
                    {/* 1. Lộ trình */}
                    <div className="flex items-center gap-3.5 w-full md:w-auto text-left col-span-1 border-b md:border-none pb-4 md:pb-0">
                      <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-[#EF5222] flex items-center justify-center shrink-0 shadow-sm border border-orange-100/30 dark:border-orange-900/10">
                        <Bus size={18} className="group-hover:animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-base">
                          <span className="group-hover:text-[#EF5222] transition-colors">{route.from}</span>
                          <span className="text-slate-300 dark:text-slate-600 font-light">➔</span>
                          <span className="group-hover:text-[#EF5222] transition-colors">{route.to}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">{t('officialRoute')}</p>
                      </div>
                    </div>

                    {/* 2. Loại xe */}
                    <div className="col-span-1">
                      <span className="px-3.5 py-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl text-[9px] font-black text-[#EF5222] border border-orange-100 dark:border-orange-900/20 uppercase tracking-widest">
                        {route.busType || 'LIMOUSINE VIP'}
                      </span>
                    </div>

                    {/* 3. Khoảng cách */}
                    <div className="col-span-1 flex flex-row md:flex-col items-center md:justify-center gap-2 md:gap-0.5">
                      <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-wider">{t('distance')}</span>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Map size={14} className="text-slate-400 shrink-0" />
                        {route.distanceKm} km
                      </span>
                    </div>

                    {/* 4. Thời gian */}
                    <div className="col-span-1 flex flex-row md:flex-col items-center md:justify-center gap-2 md:gap-0.5">
                      <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-wider">{t('duration')}</span>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400 shrink-0" />
                        {Math.floor(route.durationMinutes / 60)}{t('h')}{route.durationMinutes % 60}{t('m')}
                      </span>
                    </div>

                    {/* 5. Giá vé & Nút CTA */}
                    <div className="col-span-1 flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-none pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <div className="text-xl font-black text-[#EF5222] leading-none">
                          {route.price?.toLocaleString()}đ
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1 block">{t('priceSub')}</span>
                      </div>

                      {/* Interactive Button */}
                      <button 
                        className="flex items-center justify-center h-10 w-10 md:h-11 md:w-11 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/10 group-hover:bg-[#EF5222] group-hover:shadow-lg group-hover:shadow-[#EF5222]/20 active:scale-90 transition-all duration-200"
                        title={t('bookBtn')}
                      >
                        <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <Compass className="w-14 h-14 text-slate-350 dark:text-slate-700 mx-auto mb-4 animate-bounce" />
            <p className="text-slate-400 dark:text-slate-500 font-bold">{t('notFound')}</p>
            <p className="text-xs text-slate-350 dark:text-slate-600 mt-1.5 font-medium">{t('notFoundSub')}</p>
          </div>
        )}
      </div>

    </div>
  );
}