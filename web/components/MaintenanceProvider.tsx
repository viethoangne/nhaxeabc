'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { usePathname } from 'next/navigation';
import { Settings, ShieldAlert, Wrench, RefreshCw, Bus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const t = useTranslations('maintenancePage');

  useEffect(() => {
    // Không bao giờ chặn đường dẫn admin
    if (pathname && pathname.startsWith('/admin')) {
      setIsLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/dashboard/system-status`);
        if (res.data?.isMaintenance) {
          setIsMaintenance(true);
        }
      } catch (e) {
        console.error("Lỗi lấy trạng thái bảo trì", e);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [pathname]);

  if (isLoading) {
    return (
       <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#020617] flex items-center justify-center">
         <div className="w-8 h-8 border-4 border-[#EF5222]/30 border-t-[#EF5222] rounded-full animate-spin" />
       </div>
    );
  }

  // Nếu đường dẫn là admin, luôn cho phép render
  if (pathname && pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  if (isMaintenance) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#020617] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Lưới nền tinh tế (Grid background) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>

        {/* Các dải sáng Gradient chuyển động */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#EF5222] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-amber-500 rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }}></div>

        {/* Khung thẻ chính (Glassmorphism Card) */}
        <div className="relative z-10 w-full max-w-2xl bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 p-8 sm:p-12 rounded-[2.5rem] text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col items-center">
          
          {/* Vòng sáng và Icon */}
          <div className="relative flex justify-center items-center mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-[#EF5222] to-amber-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
            <div className="relative w-28 h-28 rounded-[2rem] bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
               <Wrench size={48} className="text-[#EF5222]" />
               <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-700/50 shadow-inner">
                 <Settings size={22} className="text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
               </div>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-5 tracking-tight">{t('title')}</h1>
          
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-10 max-w-lg font-medium">
            {t('desc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
             <button onClick={() => window.location.reload()} className="flex-1 py-4 px-6 bg-gradient-to-r from-[#EF5222] to-[#d94e0a] hover:from-[#d94e0a] hover:to-[#EF5222] text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-[0_8px_25px_rgba(239,82,34,0.35)] hover:shadow-[0_12px_30px_rgba(239,82,34,0.5)] active:scale-95 group">
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" /> {t('retry')}
             </button>
             <a href="tel:19001000" className="flex-1 py-4 px-6 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600/50 hover:border-slate-500 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95">
                <ShieldAlert size={20} className="text-amber-500" /> {t('support')}
             </a>
          </div>
        </div>

        {/* Footer Text */}
        <div className="absolute bottom-8 flex flex-col items-center gap-2 text-slate-500 text-sm font-semibold z-10">
          <div className="flex items-center gap-2">
            <Bus size={18} className="text-slate-600" /> 
            <span>{t('slogan')}</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
