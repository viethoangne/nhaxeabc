'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Calendar, 
  User, 
  Clock, 
  ArrowRight, 
  X, 
  BookOpen, 
  Tag, 
  Sparkles,
  Search,
  Bell,
  Compass,
  Briefcase,
  Newspaper,
  ChevronRight
} from 'lucide-react';

interface Article {
  id: number;
  title: string;
  excerpt: string;
  content: string[];
  category: 'khuyenmai' | 'thongbao' | 'huongdan' | 'camnang' | 'tuyendung';
  categoryLabel: string;
  date: string;
  author: string;
  readTime: string;
  image: string;
}

export default function NewsPage() {
  const t = useTranslations('newsPage');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // Mapped scroll values for Parallax Background effects
  const { scrollY } = useScroll();
  
  const bgY = useTransform(scrollY, [0, 1000], [0, 180]);
  const gridY = useTransform(scrollY, [0, 1000], [0, 80]);
  const blob1Y = useTransform(scrollY, [0, 1000], [0, 130]);
  const blob1Scale = useTransform(scrollY, [0, 800], [1, 1.25]);
  const blob2Y = useTransform(scrollY, [0, 1000], [0, -110]);
  const blob2Scale = useTransform(scrollY, [0, 800], [0.95, 1.15]);

  const categories = [
    { id: 'all', label: t('catAll'), icon: <Newspaper size={14} /> },
    { id: 'khuyenmai', label: t('catKhuyenMai'), icon: <Tag size={14} />, color: 'hover:border-rose-500/30 dark:hover:border-rose-500/20' },
    { id: 'thongbao', label: t('catThongBao'), icon: <Bell size={14} />, color: 'hover:border-orange-500/30 dark:hover:border-orange-500/20' },
    { id: 'huongdan', label: t('catHuongDan'), icon: <BookOpen size={14} />, color: 'hover:border-blue-500/30 dark:hover:border-blue-500/20' },
    { id: 'camnang', label: t('catCamNang'), icon: <Compass size={14} />, color: 'hover:border-emerald-500/30 dark:hover:border-emerald-500/20' },
    { id: 'tuyendung', label: t('catTuyenDung'), icon: <Briefcase size={14} />, color: 'hover:border-purple-500/30 dark:hover:border-purple-500/20' }
  ];

  const articles: Article[] = [
    {
      id: 1,
      title: t('art1Title'),
      excerpt: t('art1Excerpt'),
      content: [
        t('art1Content0'),
        t('art1Content1'),
        t('art1Content2')
      ],
      category: 'thongbao',
      categoryLabel: t('art1Cat'),
      date: "18/05/2026",
      author: t('art1Author'),
      readTime: t('art1ReadTime'),
      image: "/brand/AI1.png"
    },
    {
      id: 2,
      title: t('art2Title'),
      excerpt: t('art2Excerpt'),
      content: [
        t('art2Content0'),
        t('art2Content1'),
        t('art2Content2')
      ],
      category: 'camnang',
      categoryLabel: t('art2Cat'),
      date: "15/05/2026",
      author: t('art2Author'),
      readTime: t('art2ReadTime'),
      image: "/brand/dalat.jpg"
    },
    {
      id: 3,
      title: t('art3Title'),
      excerpt: t('art3Excerpt'),
      content: [
        t('art3Content0'),
        t('art3Content1'),
        t('art3Content2')
      ],
      category: 'khuyenmai',
      categoryLabel: t('art3Cat'),
      date: "12/05/2026",
      author: t('art3Author'),
      readTime: t('art3ReadTime'),
      image: "/brand/banner1.png"
    },
    {
      id: 4,
      title: t('art4Title'),
      excerpt: t('art4Excerpt'),
      content: [
        t('art4Content0'),
        t('art4Content1'),
        t('art4Content2')
      ],
      category: 'thongbao',
      categoryLabel: t('art4Cat'),
      date: "08/05/2026",
      author: t('art4Author'),
      readTime: t('art4ReadTime'),
      image: "/brand/banner2.png"
    },
    {
      id: 5,
      title: t('art5Title'),
      excerpt: t('art5Excerpt'),
      content: [
        t('art5Content0'),
        t('art5Content1'),
        t('art5Content2')
      ],
      category: 'huongdan',
      categoryLabel: t('art5Cat'),
      date: "05/05/2026",
      author: t('art5Author'),
      readTime: t('art5ReadTime'),
      image: "/brand/banner3.png"
    },
    {
      id: 6,
      title: t('art6Title'),
      excerpt: t('art6Excerpt'),
      content: [
        t('art6Content0'),
        t('art6Content1'),
        t('art6Content2')
      ],
      category: 'tuyendung',
      categoryLabel: t('art6Cat'),
      date: "01/05/2026",
      author: t('art6Author'),
      readTime: t('art6ReadTime'),
      image: "/brand/banner4.jpg"
    }
  ];

  // Helper to map category to color palettes
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'khuyenmai':
        return {
          glow: 'bg-rose-500/10',
          hoverBorder: 'hover:border-rose-500/40 dark:hover:border-rose-500/30',
          badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10',
          button: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-100/30 group-hover:bg-rose-500 group-hover:text-white'
        };
      case 'thongbao':
        return {
          glow: 'bg-orange-500/10',
          hoverBorder: 'hover:border-orange-500/40 dark:hover:border-orange-500/30',
          badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/10',
          button: 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 border-orange-100/30 group-hover:bg-[#EF5222] group-hover:text-white'
        };
      case 'huongdan':
        return {
          glow: 'bg-blue-500/10',
          hoverBorder: 'hover:border-blue-500/40 dark:hover:border-blue-500/30',
          badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10',
          button: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-100/30 group-hover:bg-blue-500 group-hover:text-white'
        };
      case 'camnang':
        return {
          glow: 'bg-emerald-500/10',
          hoverBorder: 'hover:border-emerald-500/40 dark:hover:border-emerald-500/30',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10',
          button: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100/30 group-hover:bg-emerald-500 group-hover:text-white'
        };
      case 'tuyendung':
        return {
          glow: 'bg-purple-500/10',
          hoverBorder: 'hover:border-purple-500/40 dark:hover:border-purple-500/30',
          badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/10',
          button: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 border-purple-100/30 group-hover:bg-purple-500 group-hover:text-white'
        };
      default:
        return {
          glow: 'bg-orange-500/10',
          hoverBorder: 'hover:border-orange-500/40 dark:hover:border-orange-500/30',
          badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/10',
          button: 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 border-orange-100/30 group-hover:bg-[#EF5222] group-hover:text-white'
        };
    }
  };

  const filteredArticles = articles.filter(art => {
    const matchesCategory = activeCategory === 'all' || art.category === activeCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-24 transition-colors duration-500 relative overflow-hidden text-slate-700 dark:text-slate-300 font-sans">
      
      {/* 🛣️ Scenic Highway Image Background with Scroll Parallax */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          className="absolute inset-0 bg-cover bg-center scale-105 filter blur-[4px] opacity-12 dark:opacity-18"
          style={{ 
            backgroundImage: 'url("/brand/2.jpg")',
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
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-500/10 dark:bg-orange-600/5 rounded-full blur-[130px] pointer-events-none z-0" 
      />
      <motion.div 
        style={{ y: blob2Y, scale: blob2Scale }}
        className="absolute bottom-[10%] right-[-10%] w-[550px] h-[550px] bg-amber-500/10 dark:bg-amber-600/5 rounded-full blur-[130px] pointer-events-none z-0" 
      />

      {/* BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-2 relative z-10">
        <Breadcrumb items={[{ label: t('breadcrumb') }]} />
      </div>

      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
        >
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-2.5 text-[9px] font-black tracking-[0.2em] text-[#EF5222] uppercase bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-100/50 dark:border-orange-900/30">
              <Sparkles size={11} className="text-orange-500 animate-spin" />
              {t('tagline')}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              {t('heading1')} <span className="text-[#EF5222]">{t('heading2')}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('subHeading')}
            </p>
          </div>

          {/* Search box inside header */}
          <motion.div 
            animate={{ 
              scale: isSearchFocused ? 1.015 : 1,
              boxShadow: isSearchFocused ? "0 10px 25px -5px rgba(239, 82, 34, 0.08)" : "0 4px 6px -1px rgba(0,0,0,0.02)"
            }}
            className="relative w-full lg:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 transition-all duration-300 overflow-hidden"
          >
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-transparent pl-11 pr-10 py-3 text-sm outline-none font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600"
            />
            <Search 
              className={`absolute left-3.5 top-3.5 transition-colors duration-300 ${isSearchFocused ? 'text-[#EF5222]' : 'text-slate-400'}`} 
              size={18} 
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 h-6.5 w-6.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90 transition-transform pointer-events-auto"
              >
                <X size={13} />
              </button>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* CATEGORY FILTER BAR */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-12 relative z-10 overflow-x-auto no-scrollbar">
        <div className="flex gap-3 pb-2 min-w-max">
          {categories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`relative flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 border ${
                  active 
                    ? 'text-white border-transparent shadow-lg shadow-orange-500/10' 
                    : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 hover:text-[#EF5222] dark:hover:text-orange-400 hover:border-orange-500/20 shadow-sm active:scale-95'
                }`}
                style={active ? { backgroundColor: '#EF5222' } : {}}
              >
                {/* Custom sliding background pill using layoutId */}
                {active && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 bg-[#EF5222] rounded-2xl -z-10 shadow-lg shadow-orange-500/15"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ARTICLES GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        <AnimatePresence mode="popLayout">
          {filteredArticles.length > 0 ? (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredArticles.map((art, idx) => {
                const colors = getCategoryStyles(art.category);
                
                return (
                  <motion.div
                    key={art.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.3) }}
                    whileHover={{ y: -8, scale: 1.012 }}
                    onClick={() => setSelectedArticle(art)}
                    className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col h-[460px] relative ${colors.hoverBorder}`}
                  >
                    {/* Ambient light glow inside news card */}
                    <div className={`absolute -right-10 -bottom-10 w-32 h-32 ${colors.glow} rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none`} />

                    {/* Article cover image */}
                    <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-950 overflow-hidden border-b border-slate-155 dark:border-slate-800/80 shrink-0">
                      <img 
                        src={art.image} 
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <span className={`absolute top-4 left-4 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1 shrink-0 ${colors.badge}`}>
                        <Sparkles size={9} />
                        {art.categoryLabel}
                      </span>
                    </div>

                    {/* Article body */}
                    <div className="p-6 flex flex-col flex-grow justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-3">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            {art.date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-400" />
                            {art.readTime}
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-slate-850 dark:text-white mb-2.5 leading-snug group-hover:text-[#EF5222] transition-colors line-clamp-2">
                          {art.title}
                        </h3>

                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                          {art.excerpt}
                        </p>
                      </div>

                      {/* Highly compact & elegant action button row */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 mt-4">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse" />
                          {art.author}
                        </span>
                        
                        <span className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border shadow-sm active:scale-95 ${colors.button}`}>
                          <span>{t('readButton')}</span>
                          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <BookOpen className="w-14 h-14 text-slate-350 dark:text-slate-700 mx-auto mb-4 animate-pulse" />
              <p className="text-slate-400 dark:text-slate-500 font-bold">{t('notFound')}</p>
              <p className="text-xs text-slate-350 dark:text-slate-600 mt-1.5 font-medium">{t('notFoundSub')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* FULL ARTICLE IMMERSIVE DRAWER / MODAL */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-end">
            {/* Dark glass backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="absolute inset-0 bg-slate-955/40 backdrop-blur-sm"
            />

            {/* Immersive slide-over article reader */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-2xl h-full bg-white dark:bg-slate-900 border-l border-slate-200/50 dark:border-slate-800 shadow-2xl flex flex-col animate-none"
            >
              {/* Header inside drawer */}
              <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-955/20">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-[9px] font-black text-[#EF5222] border border-orange-100 dark:border-orange-900/10 uppercase tracking-widest">
                    {selectedArticle.categoryLabel}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{t('detailTitle')}</span>
                </div>

                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Article Content */}
              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                
                {/* Visual Header */}
                <div className="space-y-4">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                    {selectedArticle.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase pb-4 border-b border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <User size={14} className="text-slate-400" />
                      {selectedArticle.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      {selectedArticle.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      {selectedArticle.readTime}
                    </span>
                  </div>
                </div>

                {/* Big article hero cover */}
                <div className="relative h-64 md:h-80 w-full bg-slate-50 dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                  <img 
                    src={selectedArticle.image} 
                    alt={selectedArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Paragraphs */}
                <div className="space-y-4.5 text-sm text-slate-650 dark:text-slate-355 leading-relaxed font-semibold">
                  {selectedArticle.content.map((para, pIdx) => (
                    <p key={pIdx}>
                      {para}
                    </p>
                  ))}
                </div>

                {/* Footer disclaimer badge */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-center">
                  {t('detailFooter')}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
