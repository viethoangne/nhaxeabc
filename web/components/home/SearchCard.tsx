// Refactored SearchCard component
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import { MAX_TICKETS, MIN_TICKETS } from '@lib/constants';
import { useTripSearch } from '@hooks/useTripSearch';

type SearchCardProps = Omit<ReturnType<typeof useTripSearch>, 'searchParams' | 'setIsLoading'>;

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
  const handleTicketChange = (increment: boolean) => {
    const newValue = increment ? tickets + 1 : tickets - 1;
    if (newValue >= MIN_TICKETS && newValue <= MAX_TICKETS) {
      setTickets(newValue);
    }
  };

  return (
    <section className="mt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative rounded-[28px] bg-white/90 shadow-[0_26px_80px_rgba(2,6,23,0.12)] ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/90 dark:ring-white/10"
      >
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-primary-200/60 dark:ring-primary-500/30" />

        {/* Top strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => {
                setTripType('oneway');
                setReturnDate(''); // Clear return date for one-way trips
              }}
              variant={tripType === 'oneway' ? 'primary' : 'secondary'}
              size="sm"
            >
              <span
                className={[
                  'grid h-5 w-5 place-items-center rounded-full border transition',
                  tripType === 'oneway'
                    ? 'border-white/50 bg-white/15'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800',
                ].join(' ')}
              >
                {tripType === 'oneway' ? '✓' : ''}
              </span>
              Một chiều
            </Button>

            <Button
              type="button"
              onClick={() => setTripType('round')}
              variant={tripType === 'round' ? 'primary' : 'secondary'}
              size="sm"
            >
              <span
                className={[
                  'grid h-5 w-5 place-items-center rounded-full border transition',
                  tripType === 'round'
                    ? 'border-white/50 bg-white/15'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800',
                ].join(' ')}
              >
                {tripType === 'round' ? '✓' : ''}
              </span>
              Khứ hồi
            </Button>
          </div>

          <a
            href="#"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition dark:text-primary-400 dark:hover:text-primary-300"
          >
            Hướng dẫn mua vé →
          </a>
        </div>

        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />

        {/* Body */}
        <div className="px-6 pb-6 pt-5">
          <div className="relative grid gap-4 md:grid-cols-12">
            {/* FROM */}
            <div className="md:col-span-4">
              <Input
                label="Điểm đi"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="VD: Đà Lạt"
                icon="🚌"
                clearable={!!from}
                onClear={() => setFrom('')}
              />

              <AnimatePresence>
                {fromSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="mt-2 flex flex-wrap gap-2"
                  >
                    {fromSuggestions.map((suggestion) => (
                      <motion.button
                        key={suggestion}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ y: -1 }}
                        onClick={() => setFrom(suggestion)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SWAP desktop */}
            <div className="hidden md:block md:col-span-1">
              <div className="h-full flex items-end justify-center">
                <motion.button
                  type="button"
                  onClick={swap}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98, rotate: -2 }}
                  className="mb-[2px] grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  title="Đổi điểm"
                >
                  <span className="text-lg">⇄</span>
                </motion.button>
              </div>
            </div>

            {/* TO */}
            <div className="md:col-span-4">
              <Input
                label="Điểm đến"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="VD: TP. Hồ Chí Minh"
                icon="🚌"
                clearable={!!to}
                onClear={() => setTo('')}
              />

              <AnimatePresence>
                {toSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="mt-2 flex flex-wrap gap-2"
                  >
                    {toSuggestions.map((suggestion) => (
                      <motion.button
                        key={suggestion}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ y: -1 }}
                        onClick={() => setTo(suggestion)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* DATE: Ngày đi */}
            <div className="md:col-span-3">
              <Input
                label="Ngày đi"
                type="date"
                value={departDate}
                onChange={(e) => setDepartDate(e.target.value)}
                icon="📅"
              />
            </div>

            {/* ✅ Ngày về chỉ hiện khi khứ hồi */}
            <AnimatePresence>
              {tripType === 'round' && (
                <motion.div
                  key="return-date"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="md:col-span-3"
                >
                  <Input
                    label="Ngày về"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={departDate || undefined}
                    icon="📅"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* MOBILE SWAP */}
            <div className="md:hidden">
              <Button
                type="button"
                onClick={swap}
                variant="outline"
                className="mt-2 w-full"
              >
                ⇄ Đổi điểm
              </Button>
            </div>
          </div>

          {/* Tickets + recent */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Số vé:
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => handleTicketChange(false)}
                  disabled={tickets <= MIN_TICKETS}
                  className="grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-700"
                  aria-label="Giảm số vé"
                >
                  −
                </button>
                <span className="min-w-[2ch] text-center font-bold text-slate-900 dark:text-white">
                  {tickets}
                </span>
                <button
                  type="button"
                  onClick={() => handleTicketChange(true)}
                  disabled={tickets >= MAX_TICKETS}
                  className="grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-700"
                  aria-label="Tăng số vé"
                >
                  +
                </button>
              </div>
            </div>

            <div className="text-sm text-slate-500 dark:text-slate-400">
              Gần đây:{' '}
              <button
                type="button"
                className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Đà Lạt → TP.HCM
              </button>
            </div>
          </div>

          {/* Search button */}
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              onClick={onSearch}
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
              className="min-w-[280px] px-8 py-4 text-base font-bold shadow-[0_20px_60px_rgba(234,88,12,0.45)] hover:shadow-[0_24px_80px_rgba(234,88,12,0.55)]"
            >
              <span className="relative inline-flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Đang tìm chuyến...
                  </>
                ) : (
                  'Tìm chuyến xe'
                )}
              </span>
            </Button>
          </div>

          <div className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Mẹo: Bấm chip gợi ý để điền nhanh điểm đi/đến.
          </div>
        </div>
      </motion.div>
    </section>
  );
}