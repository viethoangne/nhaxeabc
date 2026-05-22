"use client"; // 🟢 THÊM DÒNG NÀY LÊN DÒNG 1

import React from "react";
import { FaFacebook, FaYoutube, FaGooglePlay, FaApple } from "react-icons/fa";
import { useTranslations } from "next-intl"; // <-- Đổi thành next-intl
import { usePathname } from "next/navigation"; // 🟢 THÊM IMPORT NÀY
import { motion } from "framer-motion";
import Link from "next/link";

export default function Footer() {
  const pathname = usePathname(); // 🟢 LẤY ĐƯỜNG DẪN
  const t = useTranslations('footer');

  // 🟢 ẨN FOOTER NẾU Ở TRANG ADMIN
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="bg-white dark:bg-[#0B0F19] text-slate-600 dark:text-slate-400 pt-16 pb-4 font-sans border-t border-slate-100 dark:border-slate-900/60 transition-all duration-500 relative overflow-hidden">
      {/* Subtle Top Border Glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#EF5222]/20 to-transparent pointer-events-none" />

      <div className="mx-auto max-w-7xl px-5 relative z-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Cột 1: Thông tin tổng đài & Công ty */}
          <div className="space-y-6">
            {/* Glowing VIP Hotline Card Dashboard */}
            <div className="bg-gradient-to-br from-[#EF5222]/5 via-orange-500/0 to-transparent border border-orange-500/10 dark:border-orange-500/15 rounded-2xl p-5 relative overflow-hidden group hover:border-orange-500/30 transition-all duration-300 shadow-sm dark:shadow-black/10">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#EF5222]/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
              <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block mb-1.5">
                {t('callCenter')}
              </span>
              <a 
                href="tel:0565655360" 
                className="text-3xl font-black text-slate-800 dark:text-white hover:text-[#EF5222] dark:hover:text-[#EF5222] transition-colors duration-300 flex items-center gap-2 tracking-wide"
              >
                0565 655 360
              </a>
            </div>
            
            <div className="pt-2 space-y-3.5">
              <h4 className="text-[13px] font-black uppercase tracking-wider text-[#EF5222] dark:text-[#F59E0B] leading-snug">
                {t('companyName')}
              </h4>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                📍 <span className="font-bold text-slate-800 dark:text-slate-350">{t('addressLabel')}</span> {t('address')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ✉️ <span className="font-bold text-slate-800 dark:text-slate-350">Email:</span> <a href="mailto:hoanglop10237zz@gmail.com" className="text-orange-600 dark:text-orange-400 hover:text-orange-550 transition-colors font-semibold">hoanglop10237zz@gmail.com</a>
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <p>📞 <span className="font-bold text-slate-800 dark:text-slate-350">{t('phone')}</span> 0565655360</p>
                <p>fax: <span className="font-bold text-slate-800 dark:text-slate-350">Fax:</span> 0565655360</p>
              </div>
            </div>
          </div>

          {/* Cột 2: Danh mục */}
          <div className="space-y-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-850 dark:text-white relative pb-3 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-[2px] after:bg-gradient-to-r after:from-[#EF5222] after:to-[#F59E0B]">
              ABC Bus Lines
            </h3>
            <ul className="space-y-3.5 text-[13.5px] font-bold">
              <Link href="/about" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('aboutUs')}
                </li>
              </Link>
              <Link href="/schedule" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('schedule')}
                </li>
              </Link>
              <Link href="#" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('recruitment')}
                </li>
              </Link>
              <Link href="/news" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('news')}
                </li>
              </Link>
              <Link href="#" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('officeNetwork')}
                </li>
              </Link>
            </ul>
          </div>

          {/* Cột 3: Hỗ trợ khách hàng */}
          <div className="space-y-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-850 dark:text-white relative pb-3 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-[2px] after:bg-gradient-to-r after:from-[#EF5222] after:to-[#F59E0B]">
              {t('support')}
            </h3>
            <ul className="space-y-3.5 text-[13.5px] font-bold">
              <Link href="/lookup" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('lookupTicket')}
                </li>
              </Link>
              <Link href="/huong-dan-huy-ve" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('cancelGuide')}
                </li>
              </Link>
              <Link href="#" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('terms')}
                </li>
              </Link>
              <Link href="#" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('faq')}
                </li>
              </Link>
              <Link href="#" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('webGuide')}
                </li>
              </Link>
              <Link href="#" className="block">
                <li className="text-slate-500 hover:text-[#EF5222] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1.5 flex items-center gap-2 group">
                  <span className="text-[#EF5222] text-md transition-transform group-hover:translate-x-0.5">›</span> {t('appGuide')}
                </li>
              </Link>
            </ul>
          </div>

          {/* Cột 4: Tải app & Kết nối */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-855 dark:text-white relative pb-3 mb-4 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-[2px] after:bg-gradient-to-r after:from-[#EF5222] after:to-[#F59E0B]">
                {t('downloadApp')}
              </h3>
              <div className="flex flex-col gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02, border: "1px solid rgba(239, 82, 34, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-white transition-all border border-slate-900 shadow-md cursor-pointer"
                >
                  <FaGooglePlay size={18} className="text-orange-400" />
                  <div className="text-left">
                    <p className="text-[9px] leading-none text-slate-500 uppercase font-black tracking-wider">Get it on</p>
                    <p className="text-xs font-black tracking-wide mt-1">Google Play</p>
                  </div>
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.02, border: "1px solid rgba(245, 158, 11, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-white transition-all border border-slate-900 shadow-md cursor-pointer"
                >
                  <FaApple size={20} className="text-orange-400" />
                  <div className="text-left">
                    <p className="text-[9px] leading-none text-slate-500 uppercase font-black tracking-wider">Download on the</p>
                    <p className="text-xs font-black tracking-wide mt-1">App Store</p>
                  </div>
                </motion.button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-855 dark:text-white relative pb-3 mb-4 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-[2px] after:bg-gradient-to-r after:from-[#EF5222] after:to-[#F59E0B]">
                {t('connect')}
              </h3>
              <div className="flex gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 cursor-pointer hover:bg-[#3B5998] hover:border-transparent hover:text-white hover:scale-110 hover:shadow-[0_0_12px_rgba(59,89,152,0.4)] transition-all duration-300">
                  <FaFacebook size={18} />
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 cursor-pointer hover:bg-[#FF0000] hover:border-transparent hover:text-white hover:scale-110 hover:shadow-[0_0_12px_rgba(255,0,0,0.4)] transition-all duration-300">
                  <FaYoutube size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Phần Logo các đối tác - Elegant Outline Pills on light/dark mode --- */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-4 border-t border-slate-100 dark:border-slate-900/60 pt-10 pb-6">
           <div className="px-5 py-2 rounded-full border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/40 text-[#EF5222] hover:border-[#EF5222]/30 transition-all font-black text-[11px] uppercase tracking-widest shadow-sm cursor-default">
             ABC Bus Lines
           </div>
           <div className="px-5 py-2 rounded-full border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/40 text-red-500 hover:border-red-500/30 transition-all font-black text-[11px] uppercase tracking-widest shadow-sm cursor-default">
             ABC Express
           </div>
           <div className="px-5 py-2 rounded-full border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/40 text-[#F59E0B] hover:border-[#F59E0B]/30 transition-all font-black text-[11px] uppercase tracking-widest shadow-sm cursor-default">
             ABC Advertising
           </div>
        </div>

        {/* --- Sleek Minimalist Copyright --- */}
        <div className="mt-6 border-t border-slate-100 dark:border-slate-900/60 py-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-550">
          <p className="tracking-wide">
            © 2026 | {t('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}