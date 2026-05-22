'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, Coins, BadgePercent } from 'lucide-react';

export default function BrandTrustBadges() {
  const t = useTranslations('BrandTrustBadges');

  const badges = [
    {
      icon: Sparkles,
      title: t('badge1Title'),
      desc: t('badge1Desc'),
      color: 'from-amber-500 to-orange-500',
      glow: 'rgba(245,158,11,0.15)',
    },
    {
      icon: Coins,
      title: t('badge2Title'),
      desc: t('badge2Desc'),
      color: 'from-orange-500 to-red-500',
      glow: 'rgba(239,68,68,0.15)',
    },
    {
      icon: ShieldCheck,
      title: t('badge3Title'),
      desc: t('badge3Desc'),
      color: 'from-emerald-500 to-teal-500',
      glow: 'rgba(16,185,129,0.15)',
    },
    {
      icon: BadgePercent,
      title: t('badge4Title'),
      desc: t('badge4Desc'),
      color: 'from-blue-500 to-indigo-500',
      glow: 'rgba(59,130,246,0.15)',
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
    >
      {badges.map((badge, idx) => {
        const Icon = badge.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 50, scale: 0.95, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ 
              type: "spring", 
              stiffness: 50, 
              damping: 15, 
              mass: 1.1,
              delay: idx * 0.1 
            }}
            whileHover={{ 
              y: -10, 
              scale: 1.02,
              boxShadow: `0 20px 40px -15px ${badge.glow}`
            }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-800/80 rounded-[2rem] p-7 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300 flex flex-col gap-5 relative overflow-hidden group cursor-pointer"
          >
            {/* Ambient Corner Glow background */}
            <div className={`absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-br ${badge.color} rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-all duration-500`} />
            
            {/* Halo Icon Container with double-layer gradient glow */}
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-950 flex items-center justify-center shadow-inner group-hover:scale-105 transition-all duration-300">
              
              {/* Spinning background gradient ring on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${badge.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100 group-hover:rotate-6 shadow-md`} />
              
              {/* Blur Halo inside */}
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-sm scale-75 group-hover:scale-95 transition-all duration-300" />
              
              <Icon className="w-6 h-6 text-[#F56A19] group-hover:text-white relative z-10 transition-colors duration-300" />
            </div>

            {/* Content text */}
            <div className="flex flex-col gap-2 relative z-10">
              <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight group-hover:text-[#F56A19] transition-colors duration-300 uppercase">
                {badge.title}
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed">
                {badge.desc}
              </p>
            </div>

            {/* Bottom active accent line */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${badge.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
