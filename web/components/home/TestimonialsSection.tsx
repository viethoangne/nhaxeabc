'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Star, Quote, Award } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';

interface Testimonial {
  name: string;
  picture: string;
  role: string;
  feedback: string;
  rating: number;
}

export default function TestimonialsSection() {
  const t = useTranslations('testimonials');
  const [reviews, setReviews] = useState<Testimonial[]>([]);

  const fallbackReviews: Testimonial[] = [
    {
      name: 'Mai Cao',
      picture: '/brand/avatar1.png',
      role: t('review1Role'),
      feedback: t('review1Feedback'),
      rating: 5,
    },
    {
      name: 'Nguyễn Văn Hùng',
      role: t('review2Role'),
      picture: '/brand/avatar2.png',
      feedback: t('review2Feedback'),
      rating: 5,
    },
    {
      name: 'Trần Thị Thu Trang',
      role: t('review3Role'),
      picture: '/brand/avatar3.png',
      feedback: t('review3Feedback'),
      rating: 5,
    },
  ];

  const getLocalizedFeedback = (feedback: string) => {
    if (feedback.includes('đặt vé limousine qua Trợ lý AI') || feedback.includes('limousine via the AI Assistant')) {
      return t('review1Feedback');
    }
    if (feedback.includes('tích hợp công nghệ đỉnh cao') || feedback.includes('bus line integrate such cutting-edge')) {
      return t('review2Feedback');
    }
    if (feedback.includes('Hủy chuyến hay đổi giờ đều') || feedback.includes('rescheduling is processed instantly')) {
      return t('review3Feedback');
    }
    return feedback;
  };

  const getLocalizedRole = (role: string) => {
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('quản trị') || lowerRole.includes('admin')) {
      return t('roleAdmin');
    }
    if (lowerRole.includes('kim cương') || lowerRole.includes('diamond')) {
      return t('roleDiamond');
    }
    if (lowerRole.includes('thân thiết') || lowerRole.includes('gold')) {
      return t('roleGold');
    }
    if (lowerRole.includes('vip') || lowerRole.includes('elite')) {
      return t('roleElite');
    }
    if (lowerRole.includes('bạc') || lowerRole.includes('silver')) {
      return t('roleSilver');
    }
    return role;
  };

  useEffect(() => {
    async function loadTestimonials() {
      try {
        const res = await fetch(`${API_BASE}/public/testimonials`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setReviews(data);
            return;
          }
        }
        setReviews(fallbackReviews);
      } catch (err) {
        setReviews(fallbackReviews);
      }
    }
    loadTestimonials();
  }, []);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 60, scale: 0.94, filter: 'blur(4px)' },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      filter: 'blur(0px)',
      transition: { type: "spring" as const, stiffness: 50, damping: 16 } 
    },
  };

  return (
    <section className="py-16 md:py-24 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 text-xs font-black tracking-[0.2em] text-[#F56A19] uppercase bg-orange-100/80 rounded-full"
          >
            {t('sectionTitle')}
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase"
          >
            {t('mainTitle')}
          </motion.h2>
          <motion.div className="w-16 h-1.5 bg-gradient-to-r from-[#EF5222] to-[#ff7e54] mx-auto rounded-full mt-3" />
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium text-sm md:text-base"
          >
            {t('subTitle')}
          </motion.p>
        </div>

        {/* Grid Testimonials */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {(reviews.length > 0 ? reviews : fallbackReviews).map((test, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 relative flex flex-col justify-between group cursor-pointer"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-8 text-slate-100 dark:text-slate-800/60 group-hover:text-orange-100 dark:group-hover:text-orange-950/20 transition-colors duration-300 pointer-events-none">
                <Quote className="w-10 h-10 transform rotate-180" />
              </div>

              <div>
                {/* Stars */}
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(test.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Feedback text */}
                <p className="text-slate-600 dark:text-slate-350 text-[13px] font-semibold leading-relaxed mb-6 italic relative z-10">
                  "{getLocalizedFeedback(test.feedback)}"
                </p>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                {/* Avatar Photo or Initial Badge */}
                <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                  {test.picture && !test.picture.includes('avatar') ? (
                    <img 
                      src={test.picture} 
                      alt={test.name}
                      className="w-11 h-11 rounded-full object-cover shadow-md border border-orange-500/20 z-10" 
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        const fallbackDiv = e.currentTarget.parentElement?.querySelector('.initials-badge');
                        if (fallbackDiv) {
                          fallbackDiv.classList.remove('hidden');
                        }
                      }}
                    />
                  ) : null}
                  <div className={`initials-badge ${test.picture && !test.picture.includes('avatar') ? 'hidden' : ''} w-11 h-11 rounded-full bg-gradient-to-br from-[#F56A19] to-[#E24D12] flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/20 select-none`}>
                    {test.name.split(' ').pop()?.substring(0, 2).toUpperCase()}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-800 dark:text-slate-100 font-bold text-sm truncate">{test.name}</h4>
                  <p className="text-[#F56A19] text-[11px] font-bold tracking-tight flex items-center gap-1 mt-0.5">
                    <Award className="w-3.5 h-3.5" />
                    {getLocalizedRole(test.role)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
