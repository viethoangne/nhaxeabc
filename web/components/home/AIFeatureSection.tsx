'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Bot, MessageSquareText, Sparkles, Clock4, ArrowRight } from 'lucide-react';

export default function AIFeatureSection() {
  const t = useTranslations('aiFeatureSection');

  return (
    <section className="py-16 md:py-24 bg-transparent relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-orange-400 rounded-full blur-[100px] opacity-20"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-400 rounded-full blur-[100px] opacity-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12 md:mb-16">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 text-xs font-black tracking-[0.2em] text-[#F56A19] uppercase bg-orange-100/80 rounded-full"
          >
            {t('badge')}
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase"
          >
            {t('title')} <span className="text-[#F56A19]">{t('titleHighlight')}</span>
          </motion.h2>
          <motion.div className="w-16 h-1.5 bg-gradient-to-r from-[#EF5222] to-[#ff7e54] mx-auto rounded-full mt-3" />
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium text-sm md:text-base"
          >
            {t('subtitle')}
          </motion.p>
        </div>

        {/* Bento Grid Layout - Nâng chiều cao từ 460px lên 500px để mở rộng không gian đứng */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[500px]">
          
          {/* Card 1: Khối chính (Main Feature) - Thiết kế dạng Khung Mockup Thiết Bị Cực Kỳ Sang Trọng */}
          <motion.div 
            initial={{ opacity: 0, y: 60, scale: 0.94, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 50, damping: 16, mass: 1.1 }}
            whileHover={{ y: -6 }}
            className="relative md:col-span-1 md:row-span-2 bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden group shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col justify-between cursor-pointer"
          >
            {/* Vùng ảnh: Chiếm 92% chiều rộng của thẻ, to lớn hoành tráng, hiển thị trọn vẹn 100% */}
            <div className="p-6 pb-0 shrink-0 flex items-center justify-center">
              <div className="relative w-[92%] aspect-square rounded-[1.75rem] overflow-hidden shadow-lg border-[3px] border-slate-50 dark:border-slate-800 bg-white group-hover:scale-103 transition-transform duration-500">
                <Image 
                  src="/brand/AI1.png" 
                  alt="AI Booking" 
                  fill 
                  className="object-contain p-1 pointer-events-none select-none" 
                /> 
              </div>
            </div>
            {/* Vùng chữ: Trình bày thanh lịch phía dưới, shrink-0 đảm bảo không bao giờ bị khuất */}
            <div className="p-6 pt-0 flex flex-col gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/20 text-[#F56A19] text-[10px] font-black uppercase tracking-wider self-start shadow-sm border border-orange-100/30">
                <span className="w-1.5 h-1.5 bg-[#F56A19] rounded-full animate-pulse shadow-[0_0_8px_rgba(245,106,25,0.5)]" />
                {t('card1Tag')}
              </div>
              <h3 className="text-slate-800 dark:text-slate-100 font-black text-base tracking-tight uppercase">
                {t('card1Title')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed">
                {t('card1Desc')}
              </p>
            </div>
          </motion.div>
 
          {/* Card 2: Khối ngang phía trên - Chiếm 2 cột (Layout chia hai cột song song cực xịn) */}
          <motion.div 
            initial={{ opacity: 0, y: 60, scale: 0.94, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 50, damping: 16, mass: 1.1, delay: 0.1 }}
            whileHover={{ y: -6 }}
            className="relative md:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-8 overflow-hidden shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6 group cursor-pointer"
          >
            {/* Vùng bên trái: Tiêu đề và Mô tả */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/20 rounded-xl flex items-center justify-center border border-orange-100/30">
                  <MessageSquareText className="text-[#F56A19] w-5 h-5" />
                </div>
                <span className="font-black text-slate-800 dark:text-slate-100 tracking-tight text-lg">{t('card2Title')}</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold leading-relaxed mb-4">
                {t('card2Desc1Prefix')} <span className="font-bold text-[#F56A19]">"{t('card2Input')}"</span>.
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold leading-relaxed">
                {t('card2Desc2')}
              </p>
            </div>
            
            {/* Vùng bên phải: Khung chat mô phỏng (Hiển thị đầy đủ 100% không lo bị khuất) */}
            <div className="flex-1 w-full">
              <div className="bg-slate-50/50 dark:bg-slate-800/40 p-4.5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-inner flex flex-col gap-3">
                
                {/* Tin nhắn từ Khách hàng */}
                <motion.div 
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="flex gap-2 items-end"
                >
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-950/40 rounded-full shrink-0 flex items-center justify-center border border-orange-200/50 dark:border-orange-500/20 shadow-sm">
                    <span className="text-[10px] font-black text-orange-600 dark:text-orange-400">MC</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-[1.25rem] rounded-bl-sm text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100/50 dark:border-slate-800/80 max-w-[85%] leading-normal">
                    {t('card2InputMock')}
                  </div>
                </motion.div>
                
                {/* Phản hồi từ Trợ lý AI */}
                <motion.div 
                  initial={{ opacity: 0, x: 15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.0, duration: 0.5 }}
                  className="flex gap-2 flex-row-reverse items-end"
                >
                  <div className="w-8 h-8 bg-orange-500 rounded-full shrink-0 flex items-center justify-center shadow-md shadow-orange-500/30">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-[#EF5222] text-white px-3.5 py-2.5 rounded-[1.25rem] rounded-br-sm text-[11px] font-semibold shadow-md shadow-orange-500/10 max-w-[85%] leading-normal">
                    {t('card2ReplyMock')}
                  </div>
                </motion.div>
 
              </div>
            </div>
          </motion.div>
 
          {/* Card 3: Khối nhỏ bên dưới (Gợi ý lộ trình) */}
          <motion.div 
            initial={{ opacity: 0, y: 60, scale: 0.94, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 50, damping: 16, mass: 1.1, delay: 0.2 }}
            whileHover={{ y: -6 }}
            className="bg-gradient-to-br from-[#F56A19] to-[#E24D12] rounded-[2rem] p-8 text-white shadow-xl shadow-orange-500/25 relative overflow-hidden group cursor-pointer"
          >
            {/* Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>
            
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 border border-white/20">
                  <Sparkles className="w-5 h-5 text-orange-200" />
                </div>
                <h3 className="text-xl font-black mb-2 tracking-tight">{t('card3Title')}</h3>
                <p className="text-orange-50/80 text-sm font-medium leading-relaxed">
                  {t('card3Desc')}
                </p>
              </div>
            </div>
          </motion.div>
 
          {/* Card 4: Khối nhỏ bên dưới (Hỗ trợ nhanh) */}
          <motion.div 
            initial={{ opacity: 0, y: 60, scale: 0.94, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 50, damping: 16, mass: 1.1, delay: 0.3 }}
            whileHover={{ y: -6 }}
            className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700/80">
                <Clock4 className="w-5 h-5 text-slate-700 dark:text-slate-350" />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-800 dark:text-slate-100 tracking-tight">{t('card4Title')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                {t('card4Desc')}
              </p>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs font-black text-[#F56A19] uppercase tracking-wider flex items-center gap-1.5">
                {t('card4Footer')}
              </span>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/40 text-[#F56A19] group-hover:bg-[#F56A19] group-hover:text-white transition-all duration-300 transform group-hover:translate-x-1">
                <ArrowRight className="w-4.5 h-4.5" />
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}