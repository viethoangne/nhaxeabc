'use client';

import { useTranslations } from 'next-intl';
import { API_BASE } from '@/lib/api';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Bus, 
  Users, 
  ShieldCheck, 
  Award, 
  Target, 
  TrendingUp, 
  Heart,
  ChevronRight,
  Sparkles,
  Zap,
  Compass
} from 'lucide-react';

interface StatsData {
  drivers: number;
  buses: number;
  trips: number;
  customers: number;
}

// PREMIUM COMPONENT: Animated Counter rolling up smoothly when loaded
function AnimatedCounter({ value, duration = 1.8 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalMiliseconds = duration * 1000;
    const stepTime = Math.max(Math.floor(totalMiliseconds / end), 16);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / stepTime));
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export default function AboutPage() {
  const t = useTranslations('aboutPage');

  const [stats, setStats] = useState<StatsData>({
    drivers: 120,
    buses: 45,
    trips: 1980,
    customers: 5400
  });
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Mapped scroll values for Parallax Background effects
  const { scrollY } = useScroll();
  
  const bgY = useTransform(scrollY, [0, 1000], [0, 180]);
  const gridY = useTransform(scrollY, [0, 1000], [0, 80]);
  const blob1Y = useTransform(scrollY, [0, 1000], [0, 150]);
  const blob1Scale = useTransform(scrollY, [0, 800], [1, 1.25]);
  const blob2Y = useTransform(scrollY, [0, 1000], [0, -100]);
  const blob2Scale = useTransform(scrollY, [0, 800], [0.95, 1.15]);

  useEffect(() => {
    axios.get(`${API_BASE}/public/stats`)
      .then(res => {
        if (res.data) {
          setStats(res.data);
        }
      })
      .catch(err => console.error("Lỗi lấy thống kê About Us:", err))
      .finally(() => setLoading(false));
  }, []);

  const statsCards = [
    {
      id: 1,
      value: stats.trips,
      label: t('safeTrips'),
      badgeText: t('safeTripsBadge'),
      badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/10",
      icon: <Compass size={24} />,
      iconColor: "text-[#EF5222] bg-orange-500/10 dark:bg-orange-500/20",
      glowColor: "bg-orange-500/10 group-hover:bg-orange-500/20",
      borderColor: "hover:border-orange-500/40 dark:hover:border-orange-500/30",
      hoverImage: "/brand/vechungtoi2.jpeg", // Actual Yellow Bus with happy crew jumping in front
      isLiveBadge: true
    },
    {
      id: 2,
      value: stats.buses,
      label: t('vipLimousines'),
      badgeText: t('vipLimousinesBadge'),
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10",
      icon: <Bus size={24} />,
      iconColor: "text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20",
      glowColor: "bg-blue-500/10 group-hover:bg-blue-500/20",
      borderColor: "hover:border-blue-500/40 dark:hover:border-blue-500/30",
      hoverImage: "/brand/vechungtoi1.jpeg", // Actual Limousine Executive interior double cabin beds
      isLiveBadge: false
    },
    {
      id: 3,
      value: stats.drivers,
      label: t('proDrivers'),
      badgeText: t('proDriversBadge'),
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10",
      icon: <Users size={24} />,
      iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20",
      glowColor: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
      borderColor: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
      hoverImage: "/brand/vechungtoi3.jpeg", // Actual Limousine high-tech interior cabin with LCD displays
      isLiveBadge: false
    },
    {
      id: 4,
      value: stats.customers,
      label: t('loyalMembers'),
      badgeText: t('loyalMembersBadge'),
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/10",
      icon: <Heart size={24} />,
      iconColor: "text-purple-650 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/20",
      glowColor: "bg-purple-500/10 group-hover:bg-purple-500/20",
      borderColor: "hover:border-purple-500/40 dark:hover:border-purple-500/30",
      hoverImage: "/brand/banner3.png", // VIP Loyalty rewards banner
      isLiveBadge: false
    }
  ];

  const coreValues = [
    {
      icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
      title: t('value1Title'),
      desc: t('value1Desc')
    },
    {
      icon: <Award className="w-8 h-8 text-orange-500" />,
      title: t('value2Title'),
      desc: t('value2Desc')
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-500" />,
      title: t('value3Title'),
      desc: t('value3Desc')
    }
  ];

  const timelineEvents = [
    {
      year: "2020",
      title: t('timelineEvent1Title'),
      desc: t('timelineEvent1Desc')
    },
    {
      year: "2022",
      title: t('timelineEvent2Title'),
      desc: t('timelineEvent2Desc')
    },
    {
      year: "2024",
      title: t('timelineEvent3Title'),
      desc: t('timelineEvent3Desc')
    },
    {
      year: "2026",
      title: t('timelineEvent4Title'),
      desc: t('timelineEvent4Desc')
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-24 transition-colors duration-500 relative overflow-hidden text-slate-700 dark:text-slate-300 font-sans">
      
      {/* 🌲 Scenic Image Background with Scroll Parallax */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          className="absolute inset-0 bg-cover bg-center scale-105 filter blur-[4px] opacity-15 dark:opacity-20"
          style={{ 
            backgroundImage: 'url("/brand/dalat.jpg")',
            y: bgY
          }}
        />
        {/* Soft masking gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC]/40 via-[#F8FAFC]/85 to-[#F8FAFC] dark:from-[#020617]/40 dark:via-[#020617]/85 dark:to-[#020617]" />
      </div>

      {/* Decorative tech grid pattern with scroll parallax */}
      <motion.div 
        style={{ y: gridY }}
        className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" 
      />

      {/* Dynamic Parallax ambient blurred blobs */}
      <motion.div 
        style={{ y: blob1Y, scale: blob1Scale }}
        className="absolute top-[-10%] right-[-10%] w-[650px] h-[650px] bg-orange-500/10 dark:bg-orange-600/5 rounded-full blur-[140px] pointer-events-none z-0" 
      />
      <motion.div 
        style={{ y: blob2Y, scale: blob2Scale }}
        className="absolute bottom-[5%] left-[-15%] w-[700px] h-[700px] bg-amber-500/10 dark:bg-amber-600/5 rounded-full blur-[140px] pointer-events-none z-0" 
      />

      {/* BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-2 relative z-10">
        <Breadcrumb items={[{ label: t('breadcrumb') }]} />
      </div>

      {/* HERO BANNER SECTION */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mb-4 text-[10px] font-black tracking-[0.2em] text-[#EF5222] uppercase bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100/50 dark:border-orange-900/20 shadow-sm">
            <Sparkles size={12} className="animate-spin text-orange-500" />
            {t('tagline')}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-4">
            {t('heading')} <br className="hidden md:inline" />
            <span className="text-[#EF5222]">ABC BUS LINES</span>
          </h1>
          <div className="w-16 h-1 bg-[#EF5222] rounded-full mx-auto mb-6"></div>
          <p className="text-base text-slate-500 dark:text-slate-400 font-bold leading-relaxed italic">
            "{t('subHeading')}"
          </p>
        </motion.div>

        {/* DATABASE-CONNECTED REALTIME STATISTICS GRID */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24"
        >
          {statsCards.map((card) => {
            const isHovered = hoveredCard === card.id;

            return (
              <motion.div 
                key={card.id}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                whileHover={{ y: -10, scale: 1.05 }}
                className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-[215px] cursor-pointer ${card.borderColor}`}
              >
                {/* 🌟 High-Definition Dynamic Hover Background Image Effect */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="absolute inset-0 bg-cover bg-center z-0"
                      style={{ backgroundImage: `url("${card.hoverImage}")` }}
                    >
                      {/* Premium glass dark overlay on hover to make image colors rich & text pop in pure white */}
                      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ambient glow inside the card */}
                <div className={`absolute -right-10 -bottom-10 w-32 h-32 ${card.glowColor} rounded-full blur-2xl transition-all duration-300 pointer-events-none z-0 ${isHovered ? 'opacity-0' : 'opacity-100'}`} />
                
                <div className="flex justify-between items-start relative z-10">
                  {/* Soft floating bobbing icon */}
                  <motion.div 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 3.5 + card.id * 0.3, ease: "easeInOut" }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isHovered 
                        ? 'bg-white/20 text-white shadow-md' 
                        : card.iconColor
                    }`}
                  >
                    {card.icon}
                  </motion.div>
                  
                  {card.isLiveBadge && (
                    /* Live blinking green indicator badge */
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm shrink-0 transition-all duration-300 ${
                      isHovered 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-emerald-50/85 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/20'
                    }`}>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider">{t('live')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 relative z-10">
                  <h4 className={`text-3xl font-black leading-none tracking-tight transition-all duration-300 ${
                    isHovered ? 'text-white drop-shadow-sm' : 'text-slate-900 dark:text-white'
                  }`}>
                    {loading ? "..." : <AnimatedCounter value={card.value} />}+
                  </h4>
                  <p className={`text-xs font-black uppercase tracking-widest mt-2 transition-all duration-300 ${
                    isHovered ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'
                  }`}>{card.label}</p>
                  
                  {/* Beautiful micro-badge subtext to eliminate text cut-off */}
                  <div className="mt-3.5">
                    <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest border transition-all duration-300 ${
                      isHovered 
                        ? 'bg-white/10 text-white border-white/20' 
                        : card.badgeColor
                    }`}>
                      {card.badgeText}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CORE VALUES SECTION */}
        <div className="mb-28">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              {t('coreValuesTitle')} <span className="text-[#EF5222]">{t('coreValuesHighlight')}</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{t('coreValuesSub')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {coreValues.map((val, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -6, scale: 1.01 }}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 p-8 rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-lg hover:border-[#EF5222]/20 dark:hover:border-orange-500/10 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-slate-100 dark:bg-slate-950/20 rounded-full blur-xl pointer-events-none" />
                
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-6 group transition-all shrink-0">
                  {val.icon}
                </div>
                <h3 className="text-lg font-extrabold text-slate-850 dark:text-white mb-3">{val.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">{val.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* LỊCH SỬ PHÁT TRIỂN (TIMELINE) */}
        <div>
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              {t('timelineTitle')} <span className="text-[#EF5222]">{t('timelineHighlight')}</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{t('timelineSub')}</p>
          </div>

          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 max-w-4xl mx-auto pl-6 md:pl-10 space-y-12">
            {timelineEvents.map((evt, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative group"
              >
                {/* Timeline dot */}
                <div className="absolute -left-[35px] md:-left-[51px] top-1.5 w-6 h-6 rounded-full bg-white dark:bg-[#020617] border-4 border-[#EF5222] flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-125 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-[#EF5222] rounded-full"></div>
                </div>

                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-all duration-300 hover:border-[#EF5222]/20 dark:hover:border-orange-500/10 group-hover:shadow-md">
                  <span className="text-xs font-black text-[#EF5222] uppercase tracking-[0.2em]">{evt.year}</span>
                  <h3 className="text-lg font-black text-slate-850 dark:text-white mt-1.5 mb-2.5 flex items-center gap-1.5">
                    {evt.title}
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">{evt.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
