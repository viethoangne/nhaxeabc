'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  Bus, 
  FilterX, 
  Sparkles,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Gem
} from 'lucide-react';
import { useTranslations } from 'next-intl';

type FilterState = {
  times: string[];
  busTypes: string[];
};

type Props = {
  className?: string;
  onFilterChange?: (filters: FilterState) => void;
};

export default function SearchTripFilter({ className = '', onFilterChange }: Props) {
  const t = useTranslations('SearchTrip');

  const [filters, setFilters] = useState<FilterState>({
    times: [],
    busTypes: [],
  });

  const timeOptions = [
    { label: t('earlyMorning'), range: '00:00 - 06:00', value: '00-06', icon: Sunrise },
    { label: t('morning'), range: '06:00 - 12:00', value: '06-12', icon: Sun },
    { label: t('afternoon'), range: '12:00 - 18:00', value: '12-18', icon: Sunset },
    { label: t('evening'), range: '18:00 - 24:00', value: '18-24', icon: Moon },
  ];

  const busOptions = [
    { label: 'Limousine', desc: t('vipCabin'), value: 'Limousine', icon: Gem },
  ];

  useEffect(() => {
    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  const toggleFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const handleClear = () => {
    setFilters({ times: [], busTypes: [] });
  };

  return (
    // 'sticky' được hỗ trợ bởi thẻ aside bọc ngoài ở page.tsx
    <div className={`w-full rounded-[32px] border border-white/40 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(234,88,12,0.08)] ${className}`}>
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ea580c] text-white shadow-lg shadow-orange-200">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-800">{t('filterTitle')}</h3>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t('filterSubtitle')}</p>
          </div>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#ea580c] transition-all hover:bg-orange-50 active:scale-95"
        >
          <FilterX size={14} />
          {t('clearFilter')}
        </button>
      </div>

      <div className="space-y-8">
        {/* Section: Giờ khởi hành */}
        <section>
          <div className="mb-4 flex items-center gap-2 text-slate-800">
            <Clock size={18} className="text-[#ea580c]" />
            <h4 className="font-bold text-sm uppercase tracking-widest">{t('departureTime')}</h4>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {timeOptions.map((item) => {
              const Icon = item.icon;
              const isActive = filters.times.includes(item.value);
              return (
                <button
                  key={item.value}
                  onClick={() => toggleFilter('times', item.value)}
                  className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border p-3.5 transition-all duration-300 ${
                    isActive 
                    ? 'border-[#ea580c] bg-orange-50/50 ring-1 ring-[#ea580c]' 
                    : 'border-slate-100 bg-slate-50/30 hover:border-orange-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-[#ea580c] text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${isActive ? 'text-orange-900' : 'text-slate-700'}`}>{item.label}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{item.range}</p>
                    </div>
                  </div>
                  <div className={`h-2 w-2 rounded-full transition-all duration-500 ${isActive ? 'bg-[#ea580c] scale-125' : 'bg-slate-200 opacity-0'}`} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Section: Loại xe */}
        <section>
          <div className="mb-4 flex items-center gap-2 text-slate-800 border-t border-slate-100 pt-6">
            <Bus size={18} className="text-[#ea580c]" />
            <h4 className="font-bold text-sm uppercase tracking-widest">{t('busType')}</h4>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {busOptions.map((item) => {
              const Icon = item.icon;
              const isActive = filters.busTypes.includes(item.value);
              return (
                <button
                  key={item.value}
                  onClick={() => toggleFilter('busTypes', item.value)}
                  className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border p-3.5 transition-all duration-300 ${
                    isActive 
                    ? 'border-[#ea580c] bg-orange-50/50 ring-1 ring-[#ea580c]' 
                    : 'border-slate-100 bg-slate-50/30 hover:border-orange-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-[#ea580c] text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${isActive ? 'text-orange-900' : 'text-slate-700'}`}>{item.label}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{item.desc}</p>
                    </div>
                  </div>
                  <div className={`h-2 w-2 rounded-full transition-all duration-500 ${isActive ? 'bg-[#ea580c] scale-125' : 'bg-slate-200 opacity-0'}`} />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-2xl bg-orange-50 p-3 text-center">
         <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ea580c]">{t('smartSystem')}</p>
      </div>
    </div>
  );
}