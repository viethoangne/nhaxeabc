"use client";

import { useEffect, useMemo, useState } from "react";
import { useScroll, useTransform } from "framer-motion";
import HeroBanner from "../components/home/banner-hero";
import SearchCard from "../components/home/the-tim-kiem";

type TripType = "oneway" | "round";

const POPULAR_FROM = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Lạt",
  "Nha Trang",
  "Cần Thơ",
  "Đà Nẵng",
  "Vũng Tàu",
];

const POPULAR_TO = [
  "Đà Lạt",
  "Nha Trang",
  "Phan Thiết",
  "Đà Nẵng",
  "Cần Thơ",
  "TP. Hồ Chí Minh",
  "Hà Nội",
];

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  const [tripType, setTripType] = useState<TripType>("oneway");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tickets, setTickets] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [departDate, setDepartDate] = useState<string>("");
  
  // ✅ Tạo state cho returnDate
  const [returnDate, setReturnDate] = useState("");

  useEffect(() => {
    setMounted(true);
    setDepartDate(todayISO());
  }, []);

  const { scrollY } = useScroll();
  const bannerY = useTransform(scrollY, [0, 380], [0, -14]);

  const fromSuggestions = useMemo(() => {
    if (!from) return POPULAR_FROM.slice(0, 6);
    const q = normalize(from);
    const merged = Array.from(new Set([...POPULAR_FROM, ...POPULAR_TO]));
    return merged.filter((x) => normalize(x).includes(q)).slice(0, 8);
  }, [from]);

  const toSuggestions = useMemo(() => {
    if (!to) return POPULAR_TO.slice(0, 6);
    const q = normalize(to);
    const merged = Array.from(new Set([...POPULAR_TO, ...POPULAR_FROM]));
    return merged.filter((x) => normalize(x).includes(q)).slice(0, 8);
  }, [to]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  async function onSearch() {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-6">
        <HeroBanner mounted={mounted} bannerY={bannerY} />
        <SearchCard
          tripType={tripType}
          setTripType={setTripType}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          departDate={departDate}
          setDepartDate={setDepartDate}
          
          // ✅ Truyền returnDate và setReturnDate xuống
          returnDate={returnDate} 
          setReturnDate={setReturnDate}
          
          tickets={tickets}
          setTickets={setTickets}
          fromSuggestions={fromSuggestions}
          toSuggestions={toSuggestions}
          swap={swap}
          isLoading={isLoading}
          onSearch={onSearch}
        />
      </div>
    </main>
  );
}