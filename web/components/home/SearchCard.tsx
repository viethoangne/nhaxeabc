'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MAX_TICKETS, MIN_TICKETS } from '@lib/constants';
import { useTripSearch } from '@hooks/useTripSearch';
import { useTranslations } from 'next-intl';

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
  minDate 
}: { 
  selectedDate: string; 
  onSelect: (date: string) => void;
  minDate?: string;
}) => {
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

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  return (
    <div className="absolute left-0 bottom-full z-50 mb-4 min-w-[300px] rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
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
        <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
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
    <section className="relative z-10 w-full max-w-6xl mx-auto -mt-20 md:-mt-28 lg:-mt-25 px-0" ref={containerRef}>
      
      {/* 1. TABS: One Way / Round Trip */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <button
          type="button"
          onClick={() => { setTripType('oneway'); setReturnDate(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
            tripType === 'oneway' 
              ? 'bg-orange-500 text-white shadow-orange-500/30' 
              : 'bg-white/80 text-slate-700 hover:bg-white backdrop-blur-md'
          }`}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${tripType === 'oneway' ? 'border-white' : 'border-slate-400'}`}>
            {tripType === 'oneway' && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
          Một chiều
        </button>

        <button
          type="button"
          onClick={() => setTripType('round')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
            tripType === 'round' 
              ? 'bg-orange-500 text-white shadow-orange-500/30' 
              : 'bg-white/80 text-slate-700 hover:bg-white backdrop-blur-md'
          }`}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${tripType === 'round' ? 'border-white' : 'border-slate-400'}`}>
            {tripType === 'round' && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
          Khứ hồi
        </button>
      </div>

      {/* 2. MAIN SEARCH BAR */}
      <div className="relative p-2 md:p-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-stretch gap-2 border border-white/50 transition-all duration-500">
        
        {/* Điểm Đi */}
        <div className="relative flex-1 min-w-[160px] transition-all duration-500">
          <div 
            onClick={() => setActiveDropdown('from')} 
            className="group h-full flex flex-col justify-center px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-orange-50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">📍</span>
              <span className="text-xs font-medium text-slate-500">Điểm đi</span>
            </div>
            <span className={`text-base font-bold truncate pl-6 pr-8 ${!from ? 'text-slate-400 font-normal' : 'text-slate-900 dark:text-white'}`}>
              {from || 'Chọn điểm đi'}
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
                className="absolute left-0 bottom-full z-50 mb-4 w-full min-w-[280px] rounded-2xl bg-white p-3 shadow-2xl dark:bg-slate-800"
              >
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">📌 Chọn điểm đi</div>
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
        <div className="absolute left-[50%] top-[45px] md:static md:flex items-center justify-center shrink-0 -translate-x-1/2 md:-translate-x-0 z-10 hidden">
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
            className="relative group h-full flex flex-col justify-center px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-orange-50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">📍</span>
              <span className="text-xs font-medium text-slate-500">Điểm đến</span>
            </div>
            <span className={`text-base font-bold truncate pl-6 pr-8 ${!to ? 'text-slate-400 font-normal' : 'text-slate-900 dark:text-white'}`}>
              {to || 'Chọn điểm đến'}
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
                className="absolute left-0 bottom-full z-50 mb-4 w-full min-w-[280px] rounded-2xl bg-white p-3 shadow-2xl dark:bg-slate-800"
              >
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">📌 Chọn điểm đến</div>
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

        {/* Khối Ngày Tháng (Được gộp để xử lý hiệu ứng trượt mượt mà) */}
        <div className="flex flex-col md:flex-row gap-2 shrink-0">
          
          {/* Ngày Đi */}
          <div className="relative w-full md:w-[170px] shrink-0">
            <div 
              onClick={() => setActiveDropdown('departDate')} 
              className="group h-full flex flex-col justify-center px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-orange-50 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">📅</span>
                <span className="text-xs font-medium text-slate-500">Ngày đi</span>
              </div>
              <span className={`text-base font-bold pl-6 ${!departDate ? 'text-slate-400 font-normal' : 'text-slate-900 dark:text-white'}`}>
                {departDate ? formatDateToVN(departDate) : 'Chọn ngày'}
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
                // SỬA DÒNG CLASSNAME NÀY: Mở khóa overflow khi active
                className={`shrink-0 origin-left ${activeDropdown === 'returnDate' ? 'overflow-visible' : 'overflow-hidden'}`}
              >
                {/* Fixed width inner container to prevent text squeezing */}
                <div className="relative w-full md:w-[170px] h-full">
                  <div 
                    onClick={() => setActiveDropdown('returnDate')} 
                    className="group h-full flex flex-col justify-center px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-orange-50 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">📅</span>
                      <span className="text-xs font-medium text-slate-500">Ngày về</span>
                    </div>
                    <span className={`text-base font-bold pl-6 ${!returnDate ? 'text-slate-400 font-normal' : 'text-slate-900 dark:text-white'}`}>
                      {returnDate ? formatDateToVN(returnDate) : 'Chọn ngày'}
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
        <div className="relative flex-1 md:max-w-[160px]">
          <div 
            onClick={() => setActiveDropdown('tickets')} 
            className="group h-full flex flex-col justify-center px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-orange-50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-orange-500">👥</span>
              <span className="text-xs font-medium text-slate-500">Hành khách</span>
            </div>
            <span className="text-base font-bold text-slate-900 pl-6 dark:text-white">
              {tickets} Người
            </span>
          </div>
          <AnimatePresence>
            {activeDropdown === 'tickets' && (
              <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 bottom-full z-50 mb-4 w-64 rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800"
            >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Số lượng vé</span>
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
          className="flex md:w-[72px] shrink-0 items-center justify-center rounded-2xl bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-lg shadow-orange-500/40 p-4 md:p-0"
        >
          {isLoading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <motion.svg whileHover={{ scale: 1.1 }} className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </motion.svg>
          )}
          <span className="ml-2 font-bold md:hidden">Tìm Chuyến</span>
        </button>
      </div>
    </section>
  );
}