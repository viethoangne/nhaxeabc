"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; 
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "@components/ui/ThemeToggle";
import { NAV_ITEMS } from "@lib/constants";
import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  HiOutlineHome,
  HiOutlineCalendar,
  HiOutlineSearch,
  HiOutlineNewspaper,
  HiOutlineLogout,
  HiOutlineUserCircle,
  HiOutlineChevronLeft,
  HiOutlineMail,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineMenu,
  HiOutlineX,
} from "react-icons/hi";

// Return standard sizes for icons
const getNavIcon = (href: string) => {
  const iconClass = "w-[20px] h-[20px]";
  if (href === "/") return <HiOutlineHome className={iconClass} />;
  if (href.includes("schedule")) return <HiOutlineCalendar className={iconClass} />;
  if (href.includes("lookup")) return <HiOutlineSearch className={iconClass} />;
  if (href.includes("news")) return <HiOutlineNewspaper className={iconClass} />;
  if (href.includes("history")) return <HiOutlineClock className={iconClass} />;
  if (href.includes("contact")) return <HiOutlineMail className={iconClass} />;
  if (href.includes("about")) return <HiOutlineUser className={iconClass} />;
  return <HiOutlineSearch className={iconClass} />;
};

// Translate navigation labels
const getNavLabel = (href: string, t: (key: string) => string) => {
  if (href === "/") return t("home");
  if (href.includes("schedule")) return t("schedule");
  if (href.includes("lookup")) return t("ticket_lookup");
  if (href.includes("news")) return t("news");
  if (href.includes("history")) return t("purchase_history");
  if (href.includes("contact")) return t("contact");
  if (href.includes("about")) return t("about");
  return "";
};

const LANGUAGES = [
  {
    code: "vi",
    label: "Tiếng Việt",
    shortLabel: "VI",
    flag: (className: string) => (
      <svg viewBox="0 0 30 20" className={className}>
        <rect width="30" height="20" fill="#DA251D" />
        <polygon points="15,4 16.18,7.63 20,7.63 16.91,9.88 18.09,13.5 15,11.25 11.91,13.5 13.09,9.88 10,7.63 13.82,7.63" fill="#FFFF00" />
      </svg>
    ),
  },
  {
    code: "en",
    label: "English",
    shortLabel: "EN",
    flag: (className: string) => (
      <svg viewBox="0 0 30 20" className={className}>
        <rect width="30" height="20" fill="#012169" />
        <path stroke="#FFF" strokeWidth="3" d="M0 0l30 20M30 0L0 20" />
        <path stroke="#C8102E" strokeWidth="1" d="M0 0l30 20M30 0L0 20" />
        <path stroke="#FFF" strokeWidth="5" d="M15 0v20M0 10h30" />
        <path stroke="#C8102E" strokeWidth="3" d="M15 0v20M0 10h30" />
      </svg>
    ),
  },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter(); 
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const brandColor = "#EF5222";
  const [isMounted, setIsMounted] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("#lang-selector-container")) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // --- LOYALTY POINTS STATE ---
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    const savedLang = localStorage.getItem("lang");
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang); 
    }
  }, []);

  // --- FETCH POINTS FROM BACKEND ---
  useEffect(() => {
    const fetchPoints = async () => {
      const userId = (session?.user as any)?.id;
      if (userId) {
        try {
          const res = await axios.get(`${API_BASE}/loyalty?userId=${userId}`);
          setUserPoints(res.data.points || 0);
        } catch (error) {
          console.error("Lỗi lấy điểm Loyalty:", error);
        }
      }
    };

    if (session?.user) {
      fetchPoints();
    }
  }, [session]);

  const changeLanguage = (lang: "vi" | "en") => {
    if (lang === i18n.language) return;
    
    i18n.changeLanguage(lang);
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
    localStorage.setItem("lang", lang); 
    router.refresh(); 
  };

  // Exit conditions for Admin pages / authentication
  if (pathname === '/login' || pathname === '/auth-check' || pathname?.startsWith('/admin')) {
    return null; 
  }

  if (!isMounted) return null;

  return (
    <>

      {/* 📱 MOBILE HEADER TOP BAR */}
      <div className="lg:hidden sticky top-0 left-0 w-full h-[60px] bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md border-b border-slate-100 dark:border-[#121824]/40 flex items-center justify-between px-4 z-[999] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        {/* Brand Logo and Name */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/ABC.png"
            alt="ABC Logo"
            width={36}
            height={28}
            className="object-contain dark:invert dark:mix-blend-screen"
          />
          <span className="font-black text-[12px] tracking-[0.12em] uppercase bg-gradient-to-r from-[#EF5222] to-[#F59E0B] bg-clip-text text-transparent">
            ABC BUS LINE
          </span>
        </Link>

        {/* Right actions: ThemeToggle and Hamburger Button */}
        <div className="flex items-center gap-3">
          <ThemeToggle isCollapsed={true} />
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#EF5222] hover:border-orange-500/20 active:scale-95 transition-all cursor-pointer"
          >
            {isMenuOpen ? (
              <HiOutlineX className="w-5 h-5" />
            ) : (
              <HiOutlineMenu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* 📱 MOBILE MENU DRAWER OVERLAY */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[998]"
            />

            {/* Slide-in Menu Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-[60px] bottom-0 left-0 w-[280px] bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-r border-slate-100 dark:border-[#121824]/40 z-[998] flex flex-col p-4 shadow-2xl overflow-y-auto no-scrollbar"
            >
              {/* Navigation Items */}
              <nav className="flex flex-col gap-1.5">
                {NAV_ITEMS.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} className="w-full">
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3.5 px-4 h-[44px] rounded-2xl transition-all duration-300 ${
                          active
                            ? "text-white font-extrabold shadow-lg shadow-orange-500/25"
                            : "text-slate-500 dark:text-slate-400 hover:text-[#EF5222] dark:hover:text-orange-400 hover:bg-orange-50/50 dark:hover:bg-slate-900/40 font-bold"
                        }`}
                        style={active ? { backgroundImage: "linear-gradient(135deg, #EF5222, #F59E0B)" } : {}}
                      >
                        <div className="shrink-0">
                          {getNavIcon(item.href)}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider">
                          {getNavLabel(item.href, t)}
                        </span>
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>

              {/* VIP Member or Login Section */}
              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800/45 flex flex-col gap-4">
                {session?.user ? (
                  <div className="w-full">
                    <Link href="/loyalty" className="block w-full">
                      <div className="relative overflow-hidden bg-gradient-to-br from-[#CF9E41] via-[#F6E3B8] to-[#9F7425] text-slate-955 rounded-2xl p-3 shadow-md">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 shrink-0 rounded-full border-2 border-[#9F7425]/30 p-0.5 overflow-hidden flex items-center justify-center bg-white shadow-sm">
                            <img
                              src={session.user.image || "/default-avatar.png"}
                              alt="User"
                              className="rounded-full object-cover w-full h-full"
                            />
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wider truncate max-w-[150px] leading-tight text-slate-950">
                              {session.user.name}
                            </p>
                            <p className="text-[7.5px] font-black uppercase tracking-widest text-[#694c13] leading-none mt-0.5">
                              GOLD MEMBER
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-955/10 flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#694c13]">
                            LOYALTY VIP
                          </span>
                          <span className="text-[11px] font-black bg-slate-955/10 px-2 py-0.5 rounded-lg">
                            {userPoints} ⭐
                          </span>
                        </div>
                      </div>
                    </Link>

                    <button
                      onClick={() => signOut()}
                      className="flex items-center justify-center w-full mt-3 py-2 text-red-500 hover:bg-red-50/60 dark:hover:bg-red-950/20 rounded-xl transition-all duration-200 text-[10px] font-black uppercase tracking-wider"
                    >
                      <HiOutlineLogout className="w-4 h-4 mr-1 shrink-0" />
                      {t("logout")}
                    </button>
                  </div>
                ) : (
                  <div className="w-full border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-3 text-center shadow-md">
                    <span className="text-[9px] font-black text-[#EF5222] dark:text-orange-400 uppercase tracking-widest block mb-2 leading-none">
                      LOTUSMILES VIP
                    </span>
                    <Link href="/login" className="block w-full">
                      <button className="w-full py-2 rounded-xl bg-gradient-to-r from-[#EF5222] to-[#F59E0B] text-white text-[10.5px] font-black uppercase tracking-widest transition-all cursor-pointer">
                        {t("login")}
                      </button>
                    </Link>
                  </div>
                )}

                {/* Mobile Language Selector */}
                <div className="relative">
                  <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="w-full flex items-center justify-between gap-2 rounded-2xl bg-slate-50/80 dark:bg-slate-950 p-2.5 border border-slate-200/60 dark:border-slate-800/65 shadow-inner select-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {i18n.language === "vi" ? (
                        <>
                          <svg viewBox="0 0 30 20" className="w-5 h-3.5 rounded-sm object-cover shadow-sm">
                            <rect width="30" height="20" fill="#DA251D" />
                            <polygon points="15,4 16.18,7.63 20,7.63 16.91,9.88 18.09,13.5 15,11.25 11.91,13.5 13.09,9.88 10,7.63 13.82,7.63" fill="#FFFF00" />
                          </svg>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tiếng Việt</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 30 20" className="w-5 h-3.5 rounded-sm object-cover shadow-sm">
                            <rect width="30" height="20" fill="#012169" />
                            <path stroke="#FFF" strokeWidth="3" d="M0 0l30 20M30 0L0 20" />
                            <path stroke="#C8102E" strokeWidth="1" d="M0 0l30 20M30 0L0 20" />
                            <path stroke="#FFF" strokeWidth="5" d="M15 0v20M0 10h30" />
                            <path stroke="#C8102E" strokeWidth="3" d="M15 0v20M0 10h30" />
                          </svg>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">English</span>
                        </>
                      )}
                    </div>
                    <svg 
                      className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isLangOpen ? "rotate-180" : ""}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {isLangOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-[#090D1A] border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-1.5 z-[999] flex flex-col gap-0.5"
                      >
                        {LANGUAGES.map((lang) => {
                          const isActive = i18n.language === lang.code;
                          return (
                            <button
                              key={lang.code}
                              onClick={() => {
                                changeLanguage(lang.code as any);
                                setIsLangOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                isActive
                                  ? "bg-orange-50/50 dark:bg-orange-950/20 text-[#EF5222] dark:text-orange-400 font-extrabold"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                              }`}
                            >
                              {lang.flag("w-5 h-3.5 rounded-sm object-cover shadow-sm")}
                              <span>{lang.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🔮 MODERN GLASSMORPHIC SIDEBAR - BRAND ACCENT ORANGE */}
      <header
        className={`hidden lg:flex sticky top-0 left-0 h-screen bg-white/90 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-r border-slate-100 dark:border-[#121824]/40 flex flex-col z-[999] transition-all duration-500 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_40px_rgba(0,0,0,0.2)] ${
          isCollapsed ? "w-[72px]" : "w-[215px]"
        }`}
      >
        {/* Sleek Collapse Toggle Button */}
        <button
          onClick={() => { setIsCollapsed(!isCollapsed); setIsLangOpen(false); }}
          className="absolute -right-3 top-10 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-md hover:text-[#EF5222] hover:border-orange-500/20 active:scale-95 transition-all duration-300 cursor-pointer"
        >
          <HiOutlineChevronLeft
            className={`w-3.5 h-3.5 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </button>

        {/* Brand Logo Area - Crisp and Clear original image */}
        <div
          className={`relative flex flex-col items-center pt-6 pb-4 shrink-0 transition-all duration-500 ${
            isCollapsed ? "px-1" : "px-4"
          }`}
        >
          <Link href="/" className="flex flex-col items-center w-full group">
            {/* Elegant Floating Bobbing Logo */}
            <motion.div
              animate={{ 
                y: [0, -4, 0],
                scale: isCollapsed ? 1.05 : 1
              }}
              transition={{ 
                y: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                scale: { duration: 0.5 }
              }}
              className="relative flex items-center justify-center"
            >
              {/* Backside Glowing Aura */}
              <div className="absolute w-10 h-10 bg-orange-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
              
              <Image
                src="/brand/ABC.png"
                alt="ABC Logo"
                width={isCollapsed ? 58 : 92}
                height={isCollapsed ? 45 : 75}
                className="relative transition-all duration-500 object-contain drop-shadow-md dark:invert dark:mix-blend-screen group-hover:rotate-2 group-hover:scale-105"
                priority
              />
            </motion.div>

            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.3 }}
                className="text-center mt-2.5"
              >
                {/* Glowing Premium Sunset Brand Title */}
                <h1
                  className="font-black text-[13px] tracking-[0.16em] uppercase leading-none bg-gradient-to-r from-[#EF5222] via-[#F59E0B] to-[#EF5222] bg-[length:200%_auto] bg-clip-text text-transparent group-hover:bg-[100%_0] transition-all duration-500"
                >
                  ABC BUS LINE
                </h1>

                <div className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 leading-none">
                  {i18n.language === "vi" ? "Chất Lượng Là Danh Dự" : "Quality is Honor"}
                </div>

                {/* Flowing Laser Highlight Divider Line with Sunset Gold */}
                <div className="relative h-[1px] w-28 mx-auto mt-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <motion.div 
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 3.2, ease: "linear" }}
                    className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent"
                  />
                </div>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Scrollable Navigation List - Clean Brand Orange Highlights */}
        <div className="flex-1 px-3 mt-2 overflow-y-auto no-scrollbar">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

              return (
                <Link key={item.href} href={item.href} className="w-full">
                  <motion.div
                    whileHover={{ x: isCollapsed ? 0 : 5 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center transition-all duration-300 group cursor-pointer ${
                      isCollapsed ? "justify-center h-[42px] rounded-xl" : "gap-3.5 px-4 h-[42px] rounded-2xl"
                    } ${
                      active
                        ? "text-white font-extrabold shadow-lg shadow-orange-500/25"
                        : "text-slate-500 dark:text-slate-400 hover:text-[#EF5222] dark:hover:text-orange-400 hover:bg-orange-50/50 dark:hover:bg-slate-900/40 font-bold"
                    }`}
                    style={active ? { backgroundImage: "linear-gradient(135deg, #EF5222, #F59E0B)" } : {}}
                  >
                    <div className="shrink-0 transition-transform duration-300 group-hover:scale-110">
                      {getNavIcon(item.href)}
                    </div>

                    {!isCollapsed && (
                      <span className="text-[11px] font-black uppercase tracking-wider truncate">
                        {getNavLabel(item.href, t)}
                      </span>
                    )}

                    {/* Active dynamic visual badge inside expanded nav items */}
                    {active && !isCollapsed && (
                      <div className="absolute left-1.5 w-1 h-5 bg-white rounded-r-full shadow-inner" />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 👤 GUEST LOGIN / VIP MEMBER CARD LOUNGE */}
        <div className="mt-auto p-3 shrink-0 transition-all duration-300">
          {session?.user ? (
            /* --- IF LOGGED IN: LOTUSMILES GOLD MEMBER CARD --- */
            <div className="w-full">
              {!isCollapsed ? (
                <Link href="/loyalty" className="block w-full group">
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#CF9E41] via-[#F6E3B8] to-[#9F7425] text-slate-955 rounded-2xl p-3 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                    {/* Animated Light Sweep Reflection Shimmer */}
                    <motion.div 
                      animate={{ x: ["-150%", "250%"] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 1 }}
                      className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                    />
                    
                    <div className="flex items-center gap-2 relative.z-10">
                      <div className="w-8 h-8 shrink-0 rounded-full border-2 border-[#9F7425]/30 p-0.5 overflow-hidden flex items-center justify-center bg-white shadow-sm">
                        <img
                          src={session.user.image || "/default-avatar.png"}
                          alt="User"
                          className="rounded-full object-cover w-full h-full"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-wider truncate leading-tight text-slate-950">
                          {session.user.name}
                        </p>
                        <p className="text-[7.5px] font-black uppercase tracking-widest text-[#694c13] leading-none mt-0.5">
                          GOLD MEMBER
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-slate-950/10 flex justify-between items-center relative z-10">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#694c13]">
                        LOYALTY VIP
                      </span>
                      <span className="text-[11px] font-black bg-slate-950/10 px-2 py-0.5 rounded-lg border border-slate-950/5 shadow-inner">
                        {userPoints} ⭐
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                /* Collapsed Gold Avatar Frame */
                <Link href="/loyalty">
                  <div className="mx-auto w-9 h-9 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 p-0.5 flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all">
                    <img
                      src={session.user.image || "/default-avatar.png"}
                      alt="User"
                      className="rounded-full object-cover w-full h-full border border-slate-950/10"
                    />
                  </div>
                </Link>
              )}

              {/* Collapsed logout link or small footer log out */}
              {!isCollapsed && (
                <button
                  onClick={() => signOut()}
                  className="flex items-center justify-center w-full mt-3 py-1.5 text-red-500 hover:bg-red-50/60 dark:hover:bg-red-950/20 rounded-xl transition-all duration-200 text-[10px] font-black uppercase tracking-wider"
                >
                  <HiOutlineLogout className="w-3.5 h-3.5 mr-1 shrink-0" />
                  {t("logout")}
                </button>
              )}
            </div>
          ) : (
            /* --- IF GUEST: LOTUSMILES LOUNGE GUEST SIGN IN --- */
            <div className="w-full">
              {!isCollapsed ? (
                <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-3 text-center shadow-md">
                  <span className="text-[9px] font-black text-[#EF5222] dark:text-orange-400 uppercase tracking-widest block mb-2 leading-none">
                    LOTUSMILES VIP
                  </span>
                  <Link href="/login" className="block w-full">
                    <button className="w-full py-2 rounded-xl bg-gradient-to-r from-[#EF5222] to-[#F59E0B] hover:brightness-110 text-white text-[10.5px] font-black uppercase tracking-widest transition-all shadow-sm shadow-orange-500/15 cursor-pointer">
                      {t("login")}
                    </button>
                  </Link>
                </div>
              ) : (
                /* Collapsed Guest Login User Circle */
                <Link href="/login">
                  <div className="mx-auto w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-250 dark:border-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#EF5222] active:scale-95 transition-all cursor-pointer shadow-md">
                    <HiOutlineUserCircle className="w-5 h-5" />
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Bottom Row containing Version, Language Switcher and Theme Switcher */}
          <div className="flex flex-col gap-2 mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/40">
            {isCollapsed ? (
              <button
                onClick={() => changeLanguage(i18n.language === "vi" ? "en" : "vi")}
                className="mx-auto w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all duration-300 overflow-hidden relative group"
                title={i18n.language === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}
              >
                {i18n.language === "vi" ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shadow-inner relative">
                    <svg viewBox="0 0 30 20" className="w-10 h-7 object-cover absolute">
                      <rect width="30" height="20" fill="#DA251D" />
                      <polygon points="15,4 16.18,7.63 20,7.63 16.91,9.88 18.09,13.5 15,11.25 11.91,13.5 13.09,9.88 10,7.63 13.82,7.63" fill="#FFFF00" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shadow-inner relative">
                    <svg viewBox="0 0 30 20" className="w-10 h-7 object-cover absolute">
                      <rect width="30" height="20" fill="#012169" />
                      <path stroke="#FFF" strokeWidth="3" d="M0 0l30 20M30 0L0 20" />
                      <path stroke="#C8102E" strokeWidth="1" d="M0 0l30 20M30 0L0 20" />
                      <path stroke="#FFF" strokeWidth="5" d="M15 0v20M0 10h30" />
                      <path stroke="#C8102E" strokeWidth="3" d="M15 0v20M0 10h30" />
                    </svg>
                  </div>
                )}
              </button>
            ) : (
              <div id="lang-selector-container" className="relative">
                <AnimatePresence>
                  {isLangOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.94 }}
                      transition={{ type: "spring", damping: 18, stiffness: 220 }}
                      className="absolute bottom-full left-0 w-full mb-2 bg-white/95 dark:bg-[#090D1A]/95 backdrop-blur-xl border border-slate-250/60 dark:border-slate-800/80 shadow-[0_15px_35px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_50px_rgba(0,0,0,0.5)] rounded-2xl p-2 z-50 flex flex-col gap-1"
                    >
                      <div className="px-2.5 pt-1 pb-1.5 flex flex-col gap-0.5">
                        <span className="text-[7.5px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] leading-none">
                          {i18n.language === "vi" ? "CHỌN NGÔN NGỮ" : "SELECT LANGUAGE"}
                        </span>
                        <div className="h-[1px] bg-gradient-to-r from-slate-200/50 via-slate-200 to-slate-200/50 dark:from-slate-800/30 dark:via-slate-800/80 dark:to-slate-800/30 mt-1" />
                      </div>
                      
                      {LANGUAGES.map((lang) => {
                        const isActive = i18n.language === lang.code;
                        return (
                          <motion.button
                            key={lang.code}
                            whileHover={{ x: 4, backgroundColor: "rgba(0, 0, 0, 0.02)" }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              changeLanguage(lang.code as any);
                              setIsLangOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer select-none ${
                              isActive
                                ? "bg-orange-50/50 dark:bg-orange-950/20 text-[#EF5222] dark:text-orange-400 font-extrabold"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                          >
                            <motion.div 
                              className="shrink-0"
                              whileHover={{ scale: 1.1 }}
                              transition={{ duration: 0.2 }}
                            >
                              {lang.flag("w-5 h-3.5 rounded-sm object-cover shadow-sm pointer-events-none")}
                            </motion.div>
                            <span>{lang.label}</span>
                            {isActive && (
                              <motion.div 
                                layoutId="activeLangDot"
                                className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#EF5222] to-amber-500 shadow-sm shadow-orange-500/50"
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className={`w-full flex items-center justify-between gap-2 rounded-2xl bg-slate-50/80 dark:bg-slate-950 p-2 border border-slate-200/60 dark:border-slate-800/65 shadow-inner hover:bg-slate-100/60 dark:hover:bg-slate-900/40 transition-all duration-300 active:scale-[0.98] select-none cursor-pointer ${
                    isLangOpen ? "ring-2 ring-[#EF5222]/20 dark:ring-orange-500/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {i18n.language === "vi" ? (
                      <>
                        <svg viewBox="0 0 30 20" className="w-5 h-3.5 rounded-sm object-cover shadow-sm pointer-events-none">
                          <rect width="30" height="20" fill="#DA251D" />
                          <polygon points="15,4 16.18,7.63 20,7.63 16.91,9.88 18.09,13.5 15,11.25 11.91,13.5 13.09,9.88 10,7.63 13.82,7.63" fill="#FFFF00" />
                        </svg>
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tiếng Việt</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 30 20" className="w-5 h-3.5 rounded-sm object-cover shadow-sm pointer-events-none">
                          <rect width="30" height="20" fill="#012169" />
                          <path stroke="#FFF" strokeWidth="3" d="M0 0l30 20M30 0L0 20" />
                          <path stroke="#C8102E" strokeWidth="1" d="M0 0l30 20M30 0L0 20" />
                          <path stroke="#FFF" strokeWidth="5" d="M15 0v20M0 10h30" />
                          <path stroke="#C8102E" strokeWidth="3" d="M15 0v20M0 10h30" />
                        </svg>
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">English</span>
                      </>
                    )}
                  </div>
                  <svg 
                    className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isLangOpen ? "rotate-180" : ""}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            )}

            <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
              {!isCollapsed && <span className="text-[8px] text-slate-400 dark:text-slate-550 font-black uppercase tracking-widest">v2.1.0</span>}
              <ThemeToggle isCollapsed={isCollapsed} />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}