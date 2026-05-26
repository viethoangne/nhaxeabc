'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MAX_TICKETS, MIN_TICKETS } from '@lib/constants';
import { useTripSearch } from '@hooks/useTripSearch';
import { useTranslations, useLocale } from 'next-intl';

type SearchCardProps = Omit<ReturnType<typeof useTripSearch>, 'searchParams' | 'setIsLoading'>;

type RecentTrip = {
  from: string;
  to: string;
  date: string;
};

const formatDateToVN = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const CustomCalendar = ({ 
  selectedDate, 
  onSelect, 
  minDate,
  isInline = false
}: { 
  selectedDate: string; 
  onSelect: (date: string) => void;
  minDate?: string;
  isInline?: boolean;
}) => {
  const locale = useLocale();
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate ? new Date(selectedDate) : new Date()
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: startingDay }, (_, i) => i);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthNames = locale === 'en'
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

  return (
    <div className={isInline 
      ? "w-full max-w-[340px] rounded-2xl bg-transparent p-1 text-slate-800 dark:text-white"
      : "absolute left-0 bottom-full z-50 mb-4 min-w-[300px] rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
    }>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="font-bold text-slate-800 dark:text-white">
          {monthNames[month]} {year}
        </div>
        <button type="button" onClick={nextMonth} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-semibold text-slate-400">
        {locale === 'en' 
          ? <><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div></>
          : <><div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div></>
        }
      </div>

      <div className="grid grid-cols-7 gap-1">
        {blanks.map((b) => <div key={`blank-${b}`} />)}
        {days.map((day) => {
          const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateString === selectedDate;
          const isPast = minDate ? dateString < minDate : dateString < new Date().toISOString().split('T')[0];

          return (
            <button
              key={day}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(dateString)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-all mx-auto
                ${isSelected 
                  ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30' 
                  : isPast 
                    ? 'text-slate-300 cursor-not-allowed dark:text-slate-600' 
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function SearchCard({
  tripType,
  setTripType,
  from,
  setFrom,
  to,
  setTo,
  departDate,
  setDepartDate,
  returnDate,
  setReturnDate,
  tickets,
  setTickets,
  fromSuggestions,
  toSuggestions,
  swap,
  isLoading,
  onSearch,
}: SearchCardProps) {
  const t = useTranslations('search');
  
  const [activeDropdown, setActiveDropdown] = useState<'from' | 'to' | 'departDate' | 'returnDate' | 'tickets' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_futa_trips');
    if (saved) {
      try {
        setRecentTrips(JSON.parse(saved));
      } catch (error) {
        console.error('Lỗi đọc lịch sử:', error);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTicketChange = (increment: boolean) => {
    const newValue = increment ? tickets + 1 : tickets - 1;
    if (newValue >= MIN_TICKETS && newValue <= MAX_TICKETS) {
      setTickets(newValue);
    }
  };

  const handleSelectFrom = (suggestion: string) => {
    setFrom(suggestion);
    setActiveDropdown('to');
  };

  const handleSelectTo = (suggestion: string) => {
    setTo(suggestion);
    setActiveDropdown('departDate');
  };

  const handleSelectDepartDate = (date: string) => {
    setDepartDate(date);
    if (tripType === 'round') {
      setActiveDropdown('returnDate');
      if (returnDate && returnDate < date) setReturnDate('');
    } else {
      setActiveDropdown(null);
    }
  };

  const handleSelectReturnDate = (date: string) => {
    setReturnDate(date);
    setActiveDropdown(null);
  };

  const applyRecentTrip = (trip: RecentTrip) => {
    setFrom(trip.from);
    setTo(trip.to);
    setDepartDate(trip.date);
    setActiveDropdown(null);
  };

  const handleSaveAndSearch = () => {
    if (from && to && departDate) {
      setRecentTrips((prev) => {
        const newTrip = { from, to, date: departDate };
        const filtered = prev.filter(t => !(t.from === from && t.to === to));
        const updated = [newTrip, ...filtered].slice(0, 4);
        localStorage.setItem('recent_futa_trips', JSON.stringify(updated));
        return updated;
      });
    }
    if (onSearch) onSearch();
  };

  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto mt-0 md:-mt-28 lg:-mt-25 px-0 md:px-4" ref={containerRef}>
      
      {/* 1. TABS: One Way / Round Trip */}
      <div className="flex items-center gap-2 mb-3.5 px-2 md:px-0 justify-center md:justify-start">
        <button
          type="button"
          onClick={() => { setTripType('oneway'); setReturnDate(''); }}
          className={`flex items-center gap-1.5 md:gap-2 px-3.5 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 cursor-pointer ${
            tripType === 'oneway' 
              ? 'bg-orange-500 text-white shadow-orange-500/30' 
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white backdrop-blur-md'
          }`}
        >
          <div className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border-2 flex items-center justify-center ${tripType === 'oneway' ? 'border-white' : 'border-slate-400'}`}>
            {tripType === 'oneway' && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full" />}
          </div>
          {t('oneWay')}
        </button>

        <button
          type="button"
          onClick={() => setTripType('round')}
          className={`flex items-center gap-1.5 md:gap-2 px-3.5 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 cursor-pointer ${
            tripType === 'round' 
              ? 'bg-orange-500 text-white shadow-orange-500/30' 
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white backdrop-blur-md'
          }`}
        >
          <div className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border-2 flex items-center justify-center ${tripType === 'round' ? 'border-white' : 'border-slate-400'}`}>
            {tripType === 'round' && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full" />}
          </div>
          {t('roundTrip')}
        </button>
      </div>

      {/* 💻 DESKTOP MAIN SEARCH BAR (Hidden on mobile) */}
      <div className="hidden md:flex relative p-2 md:p-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] shadow-2xl items-stretch gap-2 border border-white/50 dark:border-slate-800 transition-all duration-500">
        
        {/* Điểm Đi */}
        <div className="relative flex-1 min-w-[160px] transition-all duration-500">
          <div 
            onClick={() => setActiveDropdown('from')} 
            className={`group h-full flex flex-col justify-center px-5 py-3 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm border ${
              activeDropdown === 'from'
                ? 'bg-orange-50/40 dark:bg-orange-950/10 border-orange-400 dark:border-orange-500/50 ring-2 ring-orange-500/10'
                : 'bg-white dark:bg-slate-800 border-transparent hover:bg-orange-50/40 dark:hover:bg-slate-700/80 hover:border-orange-100 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">📍</span>
              <span className="text-xs font-medium text-slate-500">{t('from')}</span>
            </div>
            <span className={`text-base font-bold truncate pl-6 pr-8 ${!from ? 'text-slate-400 font-normal' : 'text-slate-900 dark:text-white'}`}>
              {from || t('selectFrom')}
            </span>
            {/* Nút X xoá */}
            {from && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFrom('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <AnimatePresence>
            {activeDropdown === 'from' && fromSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 bottom-full z-50 mb-4 w-full min-w-[280px] rounded-2xl bg-white p-3 shadow-2xl border border-slate-100 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">📌 {t('selectFrom')}</div>
                <ul className="flex flex-col gap-1">
                  {fromSuggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button" onClick={() => handleSelectFrom(suggestion)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nút Đổi Chiều (Swap) */}
        <div className="flex items-center justify-center shrink-0 z-10">
          <motion.button
            type="button" onClick={swap} whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }} transition={{ duration: 0.3 }}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-orange-500 shadow-md border border-orange-100 hover:text-orange-600 hover:bg-orange-50 dark:bg-slate-700 dark:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </motion.button>
        </div>

        {/* Điểm Đến */}
        <div className="relative flex-1 min-w-[160px] transition-all duration-500">
          <div 
            onClick={() => setActiveDropdown('to')} 
            className={`group h-full flex flex-col justify-center px-5 py-3 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm border ${
              activeDropdown === 'to'
                ? 'bg-orange-50/40 dark:bg-orange-950/10 border-orange-400 dark:border-orange-500/50 ring-2 ring-orange-500/10'
                : 'bg-white dark:bg-slate-800 border-transparent hover:bg-orange-50/40 dark:hover:bg-slate-700/80 hover:border-orange-100 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">📍</span>
              <span className="text-xs font-medium text-slate-500">{t('to')}</span>
            </div>
            <span className={`text-base font-bold truncate pl-6 pr-8 ${!to ? 'text-slate-400 font-normal' : 'text-slate-900 dark:text-white'}`}>
              {to || t('selectTo')}
            </span>

            {/* Nút X xoá */}
            {to && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); 
                  setTo('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <AnimatePresence>
            {activeDropdown === 'to' && toSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 bottom-full z-50 mb-4 w-full min-w-[280px] rounded-2xl bg-white p-3 shadow-2xl border border-slate-100 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">📌 {t('selectTo')}</div>
                <ul className="flex flex-col gap-1">
                  {toSuggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button" onClick={() => handleSelectTo(suggestion)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Khối Ngày Tháng */}
        <div className="flex gap-2 shrink-0">
          
          {/* Ngày Đi */}
          <div className="relative w-[170px] shrink-0">
            <div 
              onClick={() => setActiveDropdown('departDate')} 
              className={`group h-full flex flex-col justify-center px-5 py-3 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm border ${
                activeDropdown === 'departDate'
                  ? 'bg-orange-50/40 dark:bg-orange-950/10 border-orange-400 dark:border-orange-500/50 ring-2 ring-orange-500/10'
                  : 'bg-white dark:bg-slate-800 border-transparent hover:bg-orange-50/40 dark:hover:bg-slate-700/80 hover:border-orange-100 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">📅</span>
                <span className="text-xs font-medium text-slate-500">{t('departDate')}</span>
              </div>
              <span className={`text-base font-bold pl-6 ${!departDate ? 'text-slate-400 font-normal' : 'text-slate-900 dark:text-white'}`}>
                {departDate ? formatDateToVN(departDate) : t('selectDate')}
              </span>
            </div>
            <AnimatePresence>
              {activeDropdown === 'departDate' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                  <CustomCalendar selectedDate={departDate} onSelect={handleSelectDepartDate} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Ngày Về (Slide animation) */}
          <AnimatePresence>
            {tripType === 'round' && (
              <motion.div
                key="return-date-container"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`shrink-0 origin-left ${activeDropdown === 'returnDate' ? 'overflow-visible' : 'overflow-hidden'}`}
              >
                <div className="relative w-[170px] h-full">
                  <div 
                    onClick={() => setActiveDropdown('returnDate')} 
                    className={`group h-full flex flex-col justify-center px-5 py-3 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm border ${
                      activeDropdown === 'returnDate'
                        ? 'bg-orange-50/40 dark:bg-orange-950/10 border-orange-400 dark:border-orange-500/50 ring-2 ring-orange-500/10'
                        : 'bg-white dark:bg-slate-800 border-transparent hover:bg-orange-50/40 dark:hover:bg-slate-700/80 hover:border-orange-100 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">📅</span>
                      <span className="text-xs font-medium text-slate-500">{t('returnDate')}</span>
                    </div>
                    <span className={`text-base font-bold pl-6 ${!returnDate ? 'text-slate-400 font-normal' : 'text-slate-900 dark:text-white'}`}>
                      {returnDate ? formatDateToVN(returnDate) : t('selectDate')}
                    </span>
                  </div>
                  <AnimatePresence>
                    {activeDropdown === 'returnDate' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                        <CustomCalendar selectedDate={returnDate} onSelect={handleSelectReturnDate} minDate={departDate} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Số Vé / Hành Khách */}
        <div className="relative flex-1 max-w-[160px]">
          <div 
            onClick={() => setActiveDropdown('tickets')} 
            className={`group h-full flex flex-col justify-center px-5 py-3 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm border ${
              activeDropdown === 'tickets'
                ? 'bg-orange-50/40 dark:bg-orange-950/10 border-orange-400 dark:border-orange-500/50 ring-2 ring-orange-500/10'
                : 'bg-white dark:bg-slate-800 border-transparent hover:bg-orange-50/40 dark:hover:bg-slate-700/80 hover:border-orange-100 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">👥</span>
              <span className="text-xs font-medium text-slate-500">{t('passenger')}</span>
            </div>
            <span className="text-base font-bold text-slate-900 pl-6 dark:text-white truncate">
              {tickets} {t('peopleCount')}
            </span>
          </div>
          <AnimatePresence>
            {activeDropdown === 'tickets' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 bottom-full z-50 mb-4 w-64 rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('ticketQty')}</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => handleTicketChange(false)} disabled={tickets <= MIN_TICKETS} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-600 disabled:opacity-40 transition-colors dark:bg-slate-700 dark:text-slate-300">−</button>
                    <span className="font-bold text-slate-900 dark:text-white w-4 text-center">{tickets}</span>
                    <button type="button" onClick={() => handleTicketChange(true)} disabled={tickets >= MAX_TICKETS} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-600 disabled:opacity-40 transition-colors dark:bg-slate-700 dark:text-slate-300">+</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nút Search */}
        <button
          onClick={handleSaveAndSearch}
          disabled={isLoading}
          className="flex w-[72px] shrink-0 items-center justify-center rounded-2xl bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-lg shadow-orange-500/40 cursor-pointer"
        >
          {isLoading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <motion.svg whileHover={{ scale: 1.1 }} className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </motion.svg>
          )}
        </button>
      </div>

      {/* 📱 MOBILE SEARCH CARD (Only visible on mobile screens) */}
      <div className="block md:hidden bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-slate-100 dark:border-slate-800/80 mx-3 transition-all duration-300">
        
        {/* Route Selector (From & To Grouped together) */}
        <div className="relative border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 overflow-hidden mb-3">
          {/* From Input */}
          <div 
            onClick={() => setActiveDropdown('from')}
            className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/20 text-[#EF5222]">
              <span className="text-lg">📍</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('from')}</span>
              <span className={`block text-sm font-bold truncate ${!from ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                {from || t('selectFrom')}
              </span>
            </div>
          </div>

          {/* Swap Button (Absolute positioned on the right) */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); swap(); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white dark:bg-slate-800 text-[#EF5222] shadow border border-slate-100 dark:border-slate-700 active:scale-90 transition-all duration-200 hover:bg-orange-50"
          >
            <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          {/* To Input */}
          <div 
            onClick={() => setActiveDropdown('to')}
            className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-500">
              <span className="text-lg">📍</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('to')}</span>
              <span className={`block text-sm font-bold truncate ${!to ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                {to || t('selectTo')}
              </span>
            </div>
          </div>
        </div>

        {/* Date and Passenger Layout */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Depart Date */}
          <div 
            onClick={() => setActiveDropdown('departDate')}
            className="flex items-center gap-2 p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/30"
          >
            <span className="text-base">📅</span>
            <div className="min-w-0">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">{t('departDate')}</span>
              <span className="block text-[11px] font-bold text-slate-900 dark:text-white truncate">
                {departDate ? formatDateToVN(departDate) : t('selectDate')}
              </span>
            </div>
          </div>

          {/* Passengers */}
          <div 
            onClick={() => setActiveDropdown('tickets')}
            className="flex items-center gap-2 p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/30"
          >
            <span className="text-base">👥</span>
            <div className="min-w-0">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">{t('passenger')}</span>
              <span className="block text-[11px] font-bold text-slate-900 dark:text-white truncate">
                {tickets} {t('peopleCount')}
              </span>
            </div>
          </div>
        </div>

        {/* Return Date (if roundtrip, spans full width) */}
        {tripType === 'round' && (
          <div 
            onClick={() => setActiveDropdown('returnDate')}
            className="flex items-center gap-2 p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 cursor-pointer hover:bg-slate-105/30 dark:hover:bg-slate-900/30 mb-3"
          >
            <span className="text-base">📅</span>
            <div className="min-w-0">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">{t('returnDate')}</span>
              <span className="block text-[11px] font-bold text-slate-900 dark:text-white truncate">
                {returnDate ? formatDateToVN(returnDate) : t('selectDate')}
              </span>
            </div>
          </div>
        )}

        {/* Mobile Search Button */}
        <button
          onClick={handleSaveAndSearch}
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#EF5222] to-[#F59E0B] hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-orange-500/10 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <span className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>{t('searchTrips')}</span>
            </>
          )}
        </button>
      </div>

      {/* 📱 MOBILE SELECTION MODALS / SHEETS (Only visible on screens below md) */}
      <AnimatePresence>
        {/* 1. Modal for SELECT FROM (Điểm đi) */}
        {activeDropdown === 'from' && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="md:hidden fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-[#0B0F19]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <span className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  {t('selectFrom')}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveDropdown(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Input Search Block */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/10">
              <label className="block text-[11px] font-black uppercase text-[#EF5222] mb-1.5 tracking-wider">
                {t('from')} (Khởi hành)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">🔍</span>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder={`${t('selectFrom')}...`}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#EF5222]/20 focus:border-[#EF5222] transition-all"
                  autoFocus
                />
                {from && (
                  <button
                    type="button"
                    onClick={() => setFrom('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions & Popular Cities Scroll View */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {fromSuggestions.length > 0 ? (
                <div>
                  <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">💡 Địa điểm gợi ý</div>
                  <ul className="flex flex-col gap-1.5">
                    {fromSuggestions.map((suggestion) => (
                      <li key={suggestion}>
                        <button
                          type="button"
                          onClick={() => handleSelectFrom(suggestion)}
                          className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-350 bg-slate-50/50 hover:bg-orange-50/40 dark:bg-slate-900/30 dark:hover:bg-slate-800/50 text-left transition-colors"
                        >
                          <span>📍</span>
                          <span>{suggestion}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-8 text-sm font-semibold text-slate-400">
                  Không tìm thấy địa điểm phù hợp
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 2. Modal for SELECT TO (Điểm đến) */}
        {activeDropdown === 'to' && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="md:hidden fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-[#0B0F19]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <span className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  {t('selectTo')}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveDropdown(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Input Search Block */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/10">
              <label className="block text-[11px] font-black uppercase text-amber-500 mb-1.5 tracking-wider">
                {t('to')} (Điểm đến)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">🔍</span>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder={`${t('selectTo')}...`}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#EF5222]/20 focus:border-[#EF5222] transition-all"
                  autoFocus
                />
                {to && (
                  <button
                    type="button"
                    onClick={() => setTo('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions & Popular Cities Scroll View */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {toSuggestions.length > 0 ? (
                <div>
                  <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">💡 Địa điểm gợi ý</div>
                  <ul className="flex flex-col gap-1.5">
                    {toSuggestions.map((suggestion) => (
                      <li key={suggestion}>
                        <button
                          type="button"
                          onClick={() => handleSelectTo(suggestion)}
                          className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-350 bg-slate-50/50 hover:bg-orange-50/40 dark:bg-slate-900/30 dark:hover:bg-slate-800/50 text-left transition-colors"
                        >
                          <span>📍</span>
                          <span>{suggestion}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-8 text-sm font-semibold text-slate-400">
                  Không tìm thấy địa điểm phù hợp
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 3. Bottom Sheet Modal for DEPART DATE */}
        {activeDropdown === 'departDate' && (
          <div className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50 backdrop-blur-sm">
            {/* Click backdrop to close */}
            <div className="absolute inset-0 z-0" onClick={() => setActiveDropdown(null)} />
            
            {/* Sheet Panel */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full bg-white dark:bg-[#0B0F19] rounded-t-[2rem] p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  {t('departDate')}
                </span>
                <button 
                  type="button" 
                  onClick={() => setActiveDropdown(null)}
                  className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Responsive Calendar inside sheet */}
              <div className="flex justify-center select-none py-2">
                <CustomCalendar selectedDate={departDate} onSelect={handleSelectDepartDate} isInline={true} />
              </div>
            </motion.div>
          </div>
        )}

        {/* 4. Bottom Sheet Modal for RETURN DATE */}
        {activeDropdown === 'returnDate' && (
          <div className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50 backdrop-blur-sm">
            {/* Click backdrop to close */}
            <div className="absolute inset-0 z-0" onClick={() => setActiveDropdown(null)} />
            
            {/* Sheet Panel */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full bg-white dark:bg-[#0B0F19] rounded-t-[2rem] p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  {t('returnDate')}
                </span>
                <button 
                  type="button" 
                  onClick={() => setActiveDropdown(null)}
                  className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Responsive Calendar inside sheet */}
              <div className="flex justify-center select-none py-2">
                <CustomCalendar selectedDate={returnDate} onSelect={handleSelectReturnDate} minDate={departDate} isInline={true} />
              </div>
            </motion.div>
          </div>
        )}

        {/* 5. Bottom Sheet Modal for PASSENGERS (Hành khách) */}
        {activeDropdown === 'tickets' && (
          <div className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50 backdrop-blur-sm">
            {/* Click backdrop to close */}
            <div className="absolute inset-0 z-0" onClick={() => setActiveDropdown(null)} />
            
            {/* Sheet Panel */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full bg-white dark:bg-[#0B0F19] rounded-t-[2rem] p-5 shadow-2xl flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Chọn số hành khách
                </span>
                <button 
                  type="button" 
                  onClick={() => setActiveDropdown(null)}
                  className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Quantity selector inside sheet */}
              <div className="flex items-center justify-between py-4 px-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 rounded-2xl mb-6">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('ticketQty')}</span>
                <div className="flex items-center gap-4">
                  <button 
                    type="button" 
                    onClick={() => handleTicketChange(false)} 
                    disabled={tickets <= MIN_TICKETS} 
                    className="grid h-10 w-10 place-items-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 text-slate-600 hover:bg-orange-100 disabled:opacity-40 select-none cursor-pointer"
                  >
                    −
                  </button>
                  <span className="font-extrabold text-lg text-slate-900 dark:text-white w-6 text-center">{tickets}</span>
                  <button 
                    type="button" 
                    onClick={() => handleTicketChange(true)} 
                    disabled={tickets >= MAX_TICKETS} 
                    className="grid h-10 w-10 place-items-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 text-slate-600 hover:bg-orange-100 disabled:opacity-40 select-none cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={() => setActiveDropdown(null)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#EF5222] to-[#F59E0B] text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md text-center"
              >
                Xác nhận
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}