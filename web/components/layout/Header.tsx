"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; 
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "@components/ui/ThemeToggle";
import { NAV_ITEMS } from "@lib/constants";
import { useState, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useUserStore } from "../../src/store/useUserStore";
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
} from "react-icons/hi";

// Hàm này trả về icon dựa trên href
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

// Hàm này trả về nhãn cho các mục điều hướng
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

export default function Header() {
  const pathname = usePathname();
  const router = useRouter(); 
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t, i18n } = useTranslation();

  const brandColor = "#EF5222";
  const [isMounted, setIsMounted] = useState(false);
  
  // --- STATE LƯU TRỮ ĐIỂM SỐ LOYALTY ---
  const [userPoints, setUserPoints] = useState(0);
  const points = useUserStore((state) => state.points);

  useEffect(() => {
    setIsMounted(true);
    const savedLang = localStorage.getItem("lang");
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang); 
    }
  }, []);

  // --- LOGIC LẤY ĐIỂM TỪ BACKEND KHI ĐÃ ĐĂNG NHẬP ---
  useEffect(() => {
    const fetchPoints = async () => {
      const userId = (session?.user as any)?.id;
      if (userId) {
        try {
          const res = await axios.get(`http://localhost:3001/api/loyalty?userId=${userId}`);
          setUserPoints(res.data.points || 0);
          // Gợi ý nhỏ: Nếu muốn đồng bộ mượt với Loyalty Page, bạn có thể gọi setPoints(res.data.points) của useUserStore ở đây.
        } catch (error) {
          console.error("Lỗi lấy điểm Loyalty:", error);
        }
      }
    };

    if (session?.user) {
      fetchPoints();
    }
  }, [session]);
  // -------------------------------------------------

  const changeLanguage = (lang: "vi" | "en") => {
    if (lang === i18n.language) return;
    
    i18n.changeLanguage(lang);
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
    localStorage.setItem("lang", lang); 
    router.refresh(); 
  };

  // 🟢 2. ĐỂ CÁC LỆNH IF / THOÁT SỚM NẰM BÊN DƯỚI HOOK
  if (pathname === '/login' || pathname === '/auth-check' || pathname?.startsWith('/admin')) {
    return null; 
  }

  if (!isMounted) return null;

  return (
    <>
      {/* Chuyển ngôn ngữ */}
      <div className="absolute top-4 right-4 z-[1000] hidden">
        <div className="flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-1">
          <button
            onClick={() => changeLanguage("vi")}
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-300 ${
              i18n.language === "vi"
                ? "bg-[#0E7490] text-white shadow-md"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] shadow-sm">
              🇻🇳
            </span>
            <span>VI</span>
          </button>

          <button
            onClick={() => changeLanguage("en")}
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-300 ${
              i18n.language === "en"
                ? "bg-[#0E7490] text-white shadow-md"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] shadow-sm">
              🇺🇸
            </span>
            <span>EN</span>
          </button>
        </div>
      </div>
      
      <header
        className={`sticky top-0 left-0 h-screen bg-white border-r border-slate-100 flex flex-col z-[999] transition-all duration-500 ease-in-out shadow-xl ${
          isCollapsed ? "w-[100px]" : "w-[200px]"
        }`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ backgroundColor: brandColor }}
          className="absolute -right-5 top-14 z-50 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg hover:scale-110 transition-transform"
        >
          <HiOutlineChevronLeft
            className={`w-8 h-6 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </button>

        <div
          className={`relative flex flex-col items-center pt-0 pb-6 shrink-0 transition-all duration-500 ${
            isCollapsed ? "px-1" : "px-10"
          }`}
        >
          <Link href="/" className="flex flex-col items-center w-full">
            <motion.div
              animate={{ scale: isCollapsed ? 1.1 : 1 }}
              transition={{ duration: 0.5 }}
              className="relative group"
            >
              <Image
                src="/brand/ABC.png"
                alt="ABC Logo"
                width={isCollapsed ? 85 : 120}
                height={isCollapsed ? 60 : 100}
                className="relative transition-all duration-500 object-contain drop-shadow-sm"
                priority
              />
            </motion.div>

            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <h1
                  style={{ color: "#333" }}
                  className="font-black text-[14px] tracking-[0.1em] uppercase leading-none"
                >
                  ABC BUS LINE
                </h1>

                <div className="mt-1 text-sm font-medium text-slate-700">
                  {i18n.language === "vi" ? "Chất Lượng Là Danh Dự" : "English"}
                </div>

                <div
                  style={{ backgroundColor: brandColor }}
                  className="h-[2px] w-full mx-auto mt-1 rounded-full"
                />
              </motion.div>
            )}
          </Link>
        </div>

        <div className="flex-1 px-3 mt-4 overflow-y-auto no-scrollbar">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

              return (
                <Link key={item.href} href={item.href} className="w-full">
                  <div
                    className={`relative flex items-center rounded-xl transition-all duration-300 group ${
                      isCollapsed ? "justify-center h-12" : "gap-3 px-3 h-[45px]"
                    } ${
                      active
                        ? "text-white shadow-md shadow-orange-200"
                        : "text-slate-500 hover:bg-orange-50 hover:text-[#EF5222]"
                    }`}
                    style={active ? { backgroundColor: brandColor } : {}}
                  >
                    <div className="shrink-0 transition-transform duration-300 group-hover:scale-110">
                      {getNavIcon(item.href)}
                    </div>

                    {!isCollapsed && (
                      <span className="text-[14px] font-bold uppercase tracking-wide">
                        {getNavLabel(item.href, t)}
                      </span>
                    )}

                    {active && !isCollapsed && (
                      <div className="absolute left-0 w-1.5 h-6 bg-white rounded-r-full" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* VÙNG AUTH VÀ THÔNG TIN NGƯỜI DÙNG TẠI ĐÂY */}
        <div className="mt-auto p-1 transition-all duration-300">
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-150">
            {session?.user ? (
              <div className="flex flex-col gap-3">
                <div className={`flex items-center gap-2 ${isCollapsed ? "justify-center" : ""}`}>
                  <div
                    style={{ borderColor: brandColor }}
                    className="w-11 h-11 shrink-0 rounded-full border-2 p-0.5 overflow-hidden flex items-center justify-center bg-white shadow-sm"
                  >
                    <Image
                      src={session.user.image || "/default-avatar.png"}
                      alt="User"
                      width={40}
                      height={40}
                      className="rounded-full object-cover w-full h-full"
                    />
                  </div>

                  {!isCollapsed && (
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 truncate leading-none">
                        {session.user.name}
                      </p>
                      <p
                        style={{ color: brandColor }}
                        className="text-[10px] font-bold mt-1 uppercase tracking-tighter"
                      >
                        {t("customer")}
                      </p>
                    </div>
                  )}
                </div>

                {/* --- BOX HIỂN THỊ ĐIỂM LOYALTY ĐÃ ĐƯỢC BỌC LINK --- */}
                <Link href="/loyalty" className="block w-full transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  {!isCollapsed ? (
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg p-2.5 text-white flex items-center justify-between shadow-sm cursor-pointer hover:brightness-110">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-[11px] font-bold uppercase tracking-wider">Điểm:</span>
                      </div>
                      <span className="text-sm font-black">{userPoints}</span>
                    </div>
                  ) : (
                    <div 
                      title={`Điểm tích luỹ: ${userPoints} - Nhấn để đổi quà`} 
                      className="mx-auto w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center cursor-pointer shadow-inner border border-orange-200 hover:bg-orange-200 transition-colors"
                    >
                      <svg className="w-5 h-5 absolute" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-[9px] font-black mt-0.5 z-10 text-orange-800 drop-shadow-md">{userPoints > 99 ? '99+' : userPoints}</span>
                    </div>
                  )}
                </Link>
                {/* -------------------------------------- */}

                <button
                  onClick={() => signOut()}
                  className="flex items-center justify-center w-full py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-bold"
                >
                  <HiOutlineLogout className="w-4 h-4 mr-1" />
                  {!isCollapsed && t("logout")}
                </button>
              </div>
            ) : (
              <Link href="/login">
                <button
                  style={{ backgroundColor: brandColor }}
                  className={`flex items-center justify-center w-full text-white rounded-xl shadow-lg hover:brightness-110 transition-all ${
                    isCollapsed ? "h-12" : "h-12 gap-1 text-sm font-black tracking-widest"
                  }`}
                >
                  <HiOutlineUserCircle className="w-4 h-4" />
                  {!isCollapsed && t("login")}
                </button>
              </Link>
            )}

            <div className="flex items-center justify-between mt-4">
              {!isCollapsed && <span className="text-[10px] text-slate-400 font-bold uppercase">v2.1.0</span>}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}