"use client";

import SearchCard from "@components/home/SearchCard";
import HeroBanner from "@components/home/HeroBanner";
// 1. IMPORT COMPONENT TUYẾN PHỔ BIẾN VÀO ĐÂY (Đường dẫn tùy vào nơi bạn lưu file)
import PopularRoutes from "@components/home/PopularRoutes"; 
import AIFeatureSection from '@/components/home/AIFeatureSection'; // Import component mới
import { useTripSearch } from "@hooks/useTripSearch";

// Sửa lại import: Dùng next-intl cho đồng bộ với RootLayout thay vì react-i18next
import { useTranslations } from "next-intl"; 

export default function HomePage() {
  const { searchParams: _, ...searchCardProps } = useTripSearch();
  // Sửa lại cách gọi hook của next-intl
  const t = useTranslations(); 

  return (
    <div className="flex flex-col w-full relative">

      {/* Banner */}
      <div className="relative w-full z-10">
        <HeroBanner />
      </div>

      {/* Thanh tìm kiếm chìm vào banner một nửa */}
      <div className="relative w-full z-50 -mt-24 md:-mt-32 mx-auto max-w-5xl px-4">
        <SearchCard {...searchCardProps} />
      </div>

      {/* 2. ĐẶT COMPONENT TUYẾN PHỔ BIẾN Ở ĐÂY */}
      {/* Cách mt-16 để đẩy nó cách xa khung tìm kiếm ở trên một chút cho thoáng */}
      <div className="relative w-full z-40 mt-16 md:mt-24">
        <PopularRoutes />
        <AIFeatureSection />
      </div>
    </div>
  );
}