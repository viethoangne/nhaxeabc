'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Search, 
  ShieldCheck, 
  Clock, 
  HelpCircle, 
  ChevronDown, 
  Ticket, 
  AlertTriangle,
  RefreshCw,
  Mail,
  PhoneCall,
  Info
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function HuongDanHuyVePage() {
  const t = useTranslations('cancelGuidePage');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const steps = [
    {
      num: '01',
      title: t('step1Title'),
      desc: t('step1Desc'),
      icon: <Search className="w-5 h-5 text-[#EF5222] dark:text-orange-400" />
    },
    {
      num: '02',
      title: t('step2Title'),
      desc: t('step2Desc'),
      icon: <Ticket className="w-5 h-5 text-[#EF5222] dark:text-orange-400" />
    },
    {
      num: '03',
      title: t('step3Title'),
      desc: t('step3Desc'),
      icon: <Clock className="w-5 h-5 text-[#EF5222] dark:text-orange-400" />
    },
    {
      num: '04',
      title: t('step4Title'),
      desc: t('step4Desc'),
      icon: <ShieldCheck className="w-5 h-5 text-[#EF5222] dark:text-orange-400" />
    }
  ];

  const refundRules = [
    {
      timeframe: t('rule1Time'),
      rate: '100%',
      fee: t('rule1Fee'),
      note: t('rule1Note'),
      borderColor: 'border-l-emerald-500',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    {
      timeframe: t('rule2Time'),
      rate: '50%',
      fee: t('rule2Fee'),
      note: t('rule2Note'),
      borderColor: 'border-l-amber-500',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    },
    {
      timeframe: t('rule3Time'),
      rate: '0%',
      fee: t('rule3Fee'),
      note: t('rule3Note'),
      borderColor: 'border-l-red-500',
      badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    }
  ];

  const faqs: FAQItem[] = [
    {
      question: t('faq1Q'),
      answer: t('faq1A')
    },
    {
      question: t('faq2Q'),
      answer: t('faq2A')
    },
    {
      question: t('faq3Q'),
      answer: t('faq3A')
    },
    {
      question: t('faq4Q'),
      answer: t('faq4A')
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-24 transition-colors duration-500 relative overflow-hidden text-slate-700 dark:text-slate-300 font-sans">
      
      {/* 🔮 Background Tech Grid & Fluid Glowing Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-[#EF5222]/10 to-orange-500/5 dark:from-[#EF5222]/8 dark:to-transparent rounded-full blur-[130px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-amber-500/8 to-orange-600/5 dark:from-orange-600/3 dark:to-transparent rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 relative z-10">
        <Breadcrumb items={[{ label: t('metaTitle') }]} />
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-12 relative z-10">
        
        {/* HERO BANNER SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mb-4 text-[10px] font-black tracking-[0.2em] text-[#EF5222] uppercase bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100/50 dark:border-orange-900/20 shadow-sm">
            <RefreshCw size={12} className="animate-spin text-[#EF5222]" />
            {t('metaTitle')}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-4">
            {t('titlePart1')} <br className="hidden md:inline" />
            <span className="text-[#EF5222]">{t('titlePart2')}</span>
          </h1>
          <div className="w-16 h-1 bg-[#EF5222] rounded-full mx-auto mb-6"></div>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-semibold leading-relaxed max-w-xl mx-auto">
            {t('subTitle')}
          </p>
        </motion.div>

        {/* 4-STEP PROCESS (Bố cục 4 cột) */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              {t('stepsTitle')} <span className="text-[#EF5222]">{t('stepsTitleHighlight')}</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{t('stepsSub')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 p-7 rounded-3xl shadow-sm hover:shadow-md hover:border-[#EF5222]/30 dark:hover:border-orange-500/20 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-[250px]"
              >
                {/* Visual subtle card background gradient shift on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div>
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-4xl font-black text-slate-200 dark:text-slate-800 group-hover:text-[#EF5222]/20 transition-colors duration-300 leading-none">
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-slate-950 flex items-center justify-center border border-orange-100/30 dark:border-slate-850 shadow-inner shrink-0 group-hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-2 uppercase group-hover:text-[#EF5222] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    {step.desc}
                  </p>
                </div>

                {/* Micro accent block */}
                <div className="w-8 h-[3px] bg-slate-200 dark:bg-slate-800 group-hover:bg-[#EF5222] rounded-full transition-colors duration-300" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* POLICY & WARNING (Bố cục 2 cột) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20 items-stretch">
          
          {/* Cột trái: Bảng quy định hoàn tiền (7/12) */}
          <div className="lg:col-span-7 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 rounded-[2.5rem] p-8 md:p-10 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-slate-950 flex items-center justify-center border border-orange-100/30 dark:border-slate-850 shadow-sm shrink-0">
                  <Info className="w-5 h-5 text-[#EF5222]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {t('policyTitle')}
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{t('policySub')}</p>
                </div>
              </div>

              <div className="space-y-4">
                {refundRules.map((rule, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border-l-4 border-t border-r border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 gap-4 hover:shadow-sm transition-all duration-300 ${rule.borderColor}`}
                  >
                    <div className="max-w-md">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                        {rule.timeframe}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-normal">
                        {rule.note}
                      </p>
                    </div>
                    <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-slate-200/20 pt-3 md:pt-0 shrink-0">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 md:hidden">Refund rate:</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                        {rule.rate}
                      </span>
                      <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border mt-1.5 ${rule.badgeColor}`}>
                        {rule.fee}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 dark:text-slate-500 flex flex-col gap-2">
              <p>{t('disclaimer1')}</p>
              <p>{t('disclaimer2')}</p>
            </div>
          </div>

          {/* Cột phải: Các lưu ý quan trọng (5/12) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-red-600 via-[#EF5222] to-orange-600 text-white rounded-[2.5rem] p-8 md:p-10 shadow-lg flex flex-col justify-between relative overflow-hidden">
            {/* Ambient pattern decorations */}
            <div className="absolute -right-16 -top-16 w-44 h-44 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-44 h-44 bg-black/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight leading-tight">{t('warnTitle')}</h3>
                  <span className="text-[9px] font-black text-orange-200 uppercase tracking-widest">{t('warnSub')}</span>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  t('warn1'),
                  t('warn2'),
                  t('warn3'),
                  t('warn4')
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3.5 text-xs leading-relaxed font-semibold text-orange-50">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white text-[10px] border border-white/20 font-black">
                      {idx + 1}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-extrabold">$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Hotline & Liên hệ */}
            <div className="mt-10 pt-6 border-t border-white/15 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black text-orange-200 uppercase tracking-widest leading-none">{t('warnContact')}</p>
                <a href="tel:0565655360" className="text-2xl font-black hover:text-orange-200 transition-colors block mt-1 tracking-wide">
                  0565 655 360
                </a>
              </div>
              <div className="flex gap-2">
                <a 
                  href="mailto:hoanglop10237zz@gmail.com" 
                  className="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center text-white"
                  title="Send Email"
                >
                  <Mail size={18} />
                </a>
                <a 
                  href="tel:0565655360" 
                  className="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center text-white"
                  title="Call hotline"
                >
                  <PhoneCall size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ SECTION (Bố cục 1 cột rút gọn) */}
        <div className="mb-20 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              {t('faqTitle')} <span className="text-[#EF5222]">{t('faqTitleHighlight')}</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{t('faqSub')}</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;

              return (
                <div 
                  key={idx}
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ${
                    isOpen 
                      ? 'border-[#EF5222]/40 shadow-sm' 
                      : 'border-slate-200/50 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 text-left flex justify-between items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors cursor-pointer"
                  >
                    <span className="font-extrabold text-sm md:text-base text-slate-800 dark:text-slate-100 flex items-center gap-3">
                      <HelpCircle size={18} className={`shrink-0 transition-colors ${isOpen ? 'text-[#EF5222]' : 'text-slate-400'}`} />
                      {faq.question}
                    </span>
                    <ChevronDown 
                      size={18} 
                      className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#EF5222]' : ''}`} 
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <div className="px-6 pb-6 pt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold border-t border-slate-100 dark:border-slate-950/40">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* CALL TO ACTION CARD */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-12 text-center shadow-xl max-w-3xl mx-auto relative overflow-hidden"
        >
          {/* Glowing accents */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#EF5222]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
            {t('ctaTitle')}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed max-w-lg mx-auto mb-8">
            {t('ctaDesc')}
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/lookup"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EF5222] to-orange-500 px-8 py-4 font-black text-white text-xs uppercase tracking-widest shadow-lg shadow-orange-500/10 hover:shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Ticket className="h-5 w-5 shrink-0" />
              {t('ctaBtnLookup')}
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 py-4 font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-widest transition-all hover:bg-slate-50 dark:hover:bg-slate-900 hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('ctaBtnHome')}
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
