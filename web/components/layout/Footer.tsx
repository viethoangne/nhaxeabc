"use client"; // 🟢 THÊM DÒNG NÀY LÊN DÒNG 1

import React from "react";
import { FaFacebook, FaYoutube, FaGooglePlay, FaApple } from "react-icons/fa";
import { useTranslations } from "next-intl"; // <-- Đổi thành next-intl
import { usePathname } from "next/navigation"; // 🟢 THÊM IMPORT NÀY

export default function Footer() {
  const pathname = usePathname(); // 🟢 LẤY ĐƯỜNG DẪN
  const t = useTranslations('footer');

  // 🟢 ẨN FOOTER NẾU Ở TRANG ADMIN
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="bg-[#F5F5F5] pt-12 pb-6 font-sans border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Cột 1: Thông tin tổng đài & Công ty */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              {t('callCenter')} {/* <-- Đã bỏ chữ 'footer.' vì đã khai báo ở trên */}
            </h3>
            <p className="text-4xl font-black text-[#F56A19]">0565655360</p>
            
            <div className="pt-4 space-y-2">
              <h4 className="text-sm font-extrabold uppercase text-[#00803D]">
                {t('companyName')}
              </h4>
              <p className="text-[13px] leading-relaxed text-slate-600">
                {t('addressLabel')} {t('address')}
              </p>
              <p className="text-[13px] text-slate-600">
                Email: <span className="text-[#F56A19] font-medium">hoanglop10237zz@gmail.com</span>
              </p>
              <div className="flex gap-10 text-[13px] text-slate-600">
                <p>{t('phone')} 0565655360</p>
                <p>Fax: 0565655360</p>
              </div>
            </div>
          </div>

          {/* Cột 2: Danh mục */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">ABC Bus Lines</h3>
            <ul className="space-y-3 text-[14px] text-slate-600">
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('aboutUs')}
              </li>
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('schedule')}
              </li>
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('recruitment')}
              </li>
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('news')}
              </li>
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('officeNetwork')}
              </li>
            </ul>
          </div>

          {/* Cột 3: Hỗ trợ khách hàng */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">{t('support')}</h3>
            <ul className="space-y-3 text-[14px] text-slate-600">
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('lookupTicket')}
              </li>
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('terms')}
              </li>
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('faq')}
              </li>
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('webGuide')}
              </li>
              <li className="hover:text-[#F56A19] cursor-pointer flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span> {t('appGuide')}
              </li>
            </ul>
          </div>

          {/* Cột 4: Tải app & Kết nối */}
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">{t('downloadApp')}</h3>
              <div className="flex flex-col gap-3">
                <button className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-slate-800 transition-all">
                  <FaGooglePlay size={20} />
                  <div className="text-left">
                    <p className="text-[10px] leading-none">Get it on</p>
                    <p className="text-sm font-bold">Google Play</p>
                  </div>
                </button>
                <button className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-slate-800 transition-all">
                  <FaApple size={22} />
                  <div className="text-left">
                    <p className="text-[10px] leading-none">Download on the</p>
                    <p className="text-sm font-bold">App Store</p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">{t('connect')}</h3>
              <div className="flex gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#3B5998] text-white cursor-pointer hover:scale-110 transition-transform">
                  <FaFacebook size={20} />
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#FF0000] text-white cursor-pointer hover:scale-110 transition-transform">
                  <FaYoutube size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Phần Logo các đối tác --- */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 border-t border-slate-200 pt-8 opacity-70 grayscale hover:grayscale-0 transition-all">
           <div className="flex items-center gap-2 font-black text-[#00803D]">ABC Bus Lines</div>
           <div className="flex items-center gap-2 font-black text-red-600">ABC Express</div>
           <div className="flex items-center gap-2 font-black text-orange-500">ABC Advertising</div>
        </div>

        {/* --- Bản quyền --- */}
        <div className="mt-8 bg-[#006132] -mx-4 px-4 py-4 text-center">
          <p className="text-[13px] font-medium text-white">
            © 2026 | {t('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}