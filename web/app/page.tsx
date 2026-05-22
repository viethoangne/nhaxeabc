"use client";

import SearchCard from "@components/home/SearchCard";
import HeroBanner from "@components/home/HeroBanner";
import PopularRoutes from "@components/home/PopularRoutes"; 
import AIFeatureSection from '@/components/home/AIFeatureSection';
import AmbientParticles from '@/components/home/AmbientParticles';
import BrandTrustBadges from '@/components/home/BrandTrustBadges';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import { useTripSearch } from "@hooks/useTripSearch";
import { useTranslations } from "next-intl"; 

export default function HomePage() {
  const { searchParams: _, ...searchCardProps } = useTripSearch();
  const t = useTranslations(); 

  return (
    <div className="flex flex-col w-full relative overflow-hidden bg-[#F5F5F5] dark:bg-[#020617] transition-colors duration-500">
      
      {/* 1. Ambient Slow Drifting Glow Particles in Background */}
      <AmbientParticles />

      {/* Banner */}
      <div className="relative w-full z-10">
        <HeroBanner />
      </div>

      {/* Thanh tìm kiếm chìm vào banner một nửa (Cô lập hoàn toàn, z-index 50) */}
      <div className="relative w-full z-50 -mt-24 md:-mt-32 mx-auto max-w-5xl px-4">
        <SearchCard {...searchCardProps} />
      </div>

      {/* 2. Khối Cam Kết Chất Lượng 5 Sao (Lùi xuống dưới hoàn toàn, tránh đè lên banner ở mọi kích thước màn hình) */}
      <div className="relative w-full z-40 mt-20 md:mt-32 lg:mt-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BrandTrustBadges />
      </div>

      {/* 
        3. Khung chứa các phần nội dung chính tiếp theo (PopularRoutes, Bento AI, Testimonials):
        Cách Khối Cam Kết một khoảng executive breathing room rộng rãi (64px - 80px)
      */}
      <div className="relative w-full z-40 mt-16 md:mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-20 md:gap-28 pb-16 md:pb-24">
        <PopularRoutes />
        <AIFeatureSection />
        <TestimonialsSection />
      </div>
    </div>
  );
}