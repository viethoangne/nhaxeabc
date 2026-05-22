'use client';

import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { ShieldCheck, Zap, Compass, Sparkles } from 'lucide-react';

// --- ĐỒ HỌA XE BUS CHẠY VỚI BÁNH XE QUAY VÀ GIÓ THỔI ---
const DrivingBus = () => {
  return (
    <div className="relative w-full h-28 overflow-hidden mb-8 flex items-center justify-center bg-gradient-to-r from-orange-500/[0.02] via-orange-500/[0.06] to-orange-500/[0.02] rounded-2xl border border-orange-500/10 shadow-inner">
      
      {/* 💨 Gió thổi tốc độ di chuyển ngược chiều */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[25%] left-full w-10 h-[1.5px] bg-gradient-to-r from-transparent via-[#EF5222]/30 to-transparent rounded animate-speed-line-1" />
        <div className="absolute top-[50%] left-full w-14 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent rounded animate-speed-line-2" />
        <div className="absolute top-[75%] left-full w-8 h-[1.5px] bg-gradient-to-r from-transparent via-[#EF5222]/30 to-transparent rounded animate-speed-line-3" />
      </div>

      {/* 🚌 Xe Bus dung rinh chuyển động thực tế */}
      <div className="relative flex flex-col items-center justify-center translate-y-[-4px] animate-ride-vibe">
        
        {/* Thân xe vector SVG cao cấp */}
        <svg className="w-28 h-14 drop-shadow-[0_6px_10px_rgba(239,82,34,0.15)]" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Khung thân xe chính */}
          <path d="M5 25C5 21.6863 7.68629 19 11 19H98C103.523 19 108 23.4772 108 29V44C108 45.1046 107.105 46 106 46H8C6.34315 46 5 44.6569 5 43V25Z" fill="url(#busGrad)" />
          
          {/* Kính lái nghiêng trước */}
          <path d="M98 20.5H102C105 20.5 107.5 22.5 107.5 26.5L104 32H98V20.5Z" fill="#E2E8F0" opacity="0.85" />
          
          {/* Hệ thống kính hành khách */}
          <rect x="14" y="22.5" width="13" height="9" rx="2" fill="#E2E8F0" opacity="0.85" />
          <rect x="31" y="22.5" width="13" height="9" rx="2" fill="#E2E8F0" opacity="0.85" />
          <rect x="48" y="22.5" width="13" height="9" rx="2" fill="#E2E8F0" opacity="0.85" />
          <rect x="65" y="22.5" width="13" height="9" rx="2" fill="#E2E8F0" opacity="0.85" />
          <rect x="82" y="22.5" width="13" height="9" rx="2" fill="#E2E8F0" opacity="0.85" />
          
          {/* Đường Line Trắng Sang Trọng */}
          <rect x="5" y="35" width="103" height="3" fill="#FFFFFF" opacity="0.95" />
          
          {/* Đèn pha LED sáng phía trước */}
          <path d="M107.5 37H111V40H107.5V37Z" fill="#FBBF24" className="animate-pulse" />
          {/* Đèn hậu đỏ */}
          <path d="M5 36H3V39H5V36Z" fill="#EF4444" />
          
          {/* Hốc bánh xe */}
          <circle cx="28" cy="46" r="9.5" fill="#FFFFFF" />
          <circle cx="85" cy="46" r="9.5" fill="#FFFFFF" />
          
          <defs>
            <linearGradient id="busGrad" x1="5" y1="32.5" x2="108" y2="32.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF7E5A" />
              <stop offset="1" stopColor="#EF5222" />
            </linearGradient>
          </defs>
        </svg>

        {/* 🎡 Bánh xe quay tốc độ cực nhanh (Wheels 3D Spokes) */}
        <div className="absolute bottom-0 left-[18.5px] w-[18px] h-[18px] bg-zinc-900 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-spin-fast">
          {/* Căm xe tạo cảm giác quay */}
          <div className="w-[1.5px] h-full bg-zinc-300 absolute" />
          <div className="h-[1.5px] w-full bg-zinc-300 absolute" />
          <div className="w-2 h-2 bg-zinc-600 rounded-full absolute border border-zinc-800" />
        </div>
        
        <div className="absolute bottom-0 right-[15.5px] w-[18px] h-[18px] bg-zinc-900 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-spin-fast">
          {/* Căm xe tạo cảm giác quay */}
          <div className="w-[1.5px] h-full bg-zinc-300 absolute" />
          <div className="h-[1.5px] w-full bg-zinc-300 absolute" />
          <div className="w-2 h-2 bg-zinc-600 rounded-full absolute border border-zinc-800" />
        </div>

      </div>

      {/* 🛣️ Vạch đường di chuyển phía dưới */}
      <div className="absolute bottom-3 left-4 right-4 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
    </div>
  );
};

export default function LoginPage() {
  const t = useTranslations('loginPage');
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    setMsg(null);
    setIsLoading(true);
    
    signIn('google', { callbackUrl: '/auth-check' }).catch((err) => {
      setMsg(t('googleError'));
      setIsLoading(false);
    });
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden bg-gradient-to-br from-[#FFF8F6] via-white to-[#FFF3F0] dark:from-slate-950 dark:via-[#020617] dark:to-slate-900 font-sans transition-colors duration-500">
      
      {/* NHÚNG THƯ VIỆN KEYFRAME HIỆU ỨNG CHUYỂN ĐỘNG TRỰC TIẾP LÊN GPU */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin-fast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ride-vibe {
          0%, 100% { transform: translateY(-4px); }
          50% { transform: translateY(-5.5px); }
        }
        @keyframes speed-line {
          0% { transform: translateX(0); opacity: 0; }
          8% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { transform: translateX(-240px); opacity: 0; }
        }
        .animate-spin-fast {
          animation: spin-fast 0.35s linear infinite;
        }
        .animate-ride-vibe {
          animation: ride-vibe 0.12s ease-in-out infinite;
        }
        .animate-speed-line-1 {
          animation: speed-line 1.0s linear infinite;
        }
        .animate-speed-line-2 {
          animation: speed-line 0.7s linear infinite 0.2s;
        }
        .animate-speed-line-3 {
          animation: speed-line 1.3s linear infinite 0.5s;
        }
      `}} />

      {/* --- GLOWING DECORATIVE BLOBS (HIỆU ỨNG ÁNH SÁNG PHÁT QUANG) --- */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-[#EF5222]/10 to-[#ff7e5a]/10 rounded-full blur-3xl opacity-60 animate-pulse pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-400/10 to-red-500/10 rounded-full blur-3xl opacity-60 animate-pulse delay-1000 pointer-events-none" />
      
      {/* --- GRID OVERLAY (LƯỚI BACKGROUND TIN TẾ) --- */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* --- PREMIUM LOGIN CARD --- */}
      <div className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-[32px] shadow-[0_25px_60px_rgba(239,82,34,0.06)] dark:shadow-none hover:shadow-[0_30px_70px_rgba(239,82,34,0.12)] p-8 md:p-10 w-full max-w-[420px] text-center relative overflow-hidden transition-all duration-500 hover:border-[#EF5222]/20">
        
        {/* Viền màu cam gradient phía trên cùng */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 via-[#EF5222] to-red-600" />

        {/* --- ĐỒ HỌA XE BUS ĐANG CHẠY BÁNH XE QUAY --- */}
        <DrivingBus />

        {/* --- TIÊU ĐỀ CHỮ --- */}
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">{t('title')}</h1>
        <p className="text-[14px] text-gray-500 dark:text-slate-400 font-medium mb-8">
          {t('welcome')} <span className="text-[#EF5222] font-extrabold">Nhà Xe ABC</span>
        </p>

        {/* --- DÒNG NGĂN CÁCH KÈM CHỮ --- */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 tracking-wider uppercase">{t('continueWith')}</span>
          <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
        </div>

        {/* --- NÚT ĐĂNG NHẬP GOOGLE --- */}
        <button 
          onClick={handleGoogleLogin} 
          disabled={isLoading}
          type="button"
          className={`w-full flex items-center justify-center gap-3 px-5 py-4 border border-gray-200/80 dark:border-slate-800 hover:border-[#EF5222]/40 rounded-2xl bg-white dark:bg-slate-950 hover:bg-orange-50/10 dark:hover:bg-slate-900/45 text-gray-700 dark:text-slate-200 hover:text-[#EF5222] text-[15px] font-bold shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 cursor-pointer ${
            isLoading ? 'opacity-70 pointer-events-none' : ''
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-[#EF5222] border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          <span>{isLoading ? t('googleLoading') : t('googleLogin')}</span>
        </button>

        {/* --- THÔNG BÁO LỖI NẾU CÓ --- */}
        {msg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold animate-shake">
            {msg}
          </div>
        )}

        {/* --- HÀNG NHÃN TÍN NHIỆM (TRUST BADGES) --- */}
        <div className="grid grid-cols-3 gap-2 mt-8 pt-6 border-t border-gray-100/80 dark:border-slate-800">
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1" />
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{t('security')}</span>
          </div>
          <div className="flex flex-col items-center">
            <Zap className="w-5 h-5 text-[#EF5222] mb-1 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{t('instant')}</span>
          </div>
          <div className="flex flex-col items-center">
            <Compass className="w-5 h-5 text-blue-500 mb-1" />
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{t('fiveStars')}</span>
          </div>
        </div>

      </div>
    </div>
  );
}