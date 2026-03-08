"use client";

import { useScroll, useTransform } from "framer-motion";
import HeroBanner from "@components/home/HeroBanner";
import SearchCard from "@components/home/SearchCard";
import { useTripSearch } from "@hooks/useTripSearch";

export default function HomePage() {
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 300], [1, 1.05]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.9]);

  // searchParams và setIsLoading dùng nội bộ hook, không cần truyền xuống SearchCard
  const { searchParams: _, setIsLoading: __, ...searchCardProps } = useTripSearch();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <HeroBanner scale={scale} opacity={opacity} />
      <SearchCard {...searchCardProps} />
    </div>
  );
}