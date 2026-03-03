"use client";

import { AnimatePresence, motion } from "framer-motion";

type TripType = "oneway" | "round";

type Props = {
  tripType: TripType;
  setTripType: (v: TripType) => void;

  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;

  departDate: string;
  setDepartDate: (v: string) => void;

  returnDate: string;
  setReturnDate: (v: string) => void;

  tickets: number;
  setTickets: (v: number | ((prev: number) => number)) => void;

  fromSuggestions: string[];
  toSuggestions: string[];

  swap: () => void;

  isLoading: boolean;
  onSearch: () => void;
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
}: Props) {
  return (
    <section className="mt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative rounded-[28px] bg-white/90 shadow-[0_26px_80px_rgba(2,6,23,0.12)] ring-1 ring-black/5 backdrop-blur"
      >
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-orange-200/60" />

        {/* Top strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTripType("oneway");
                setReturnDate(""); // ✅ về 1 chiều thì xoá ngày về
              }}
              className={[
                "group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                tripType === "oneway"
                  ? "bg-orange-600 text-white shadow-[0_14px_36px_rgba(234,88,12,0.35)]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-5 w-5 place-items-center rounded-full border transition",
                  tripType === "oneway"
                    ? "border-white/50 bg-white/15"
                    : "border-slate-300 bg-white",
                ].join(" ")}
              >
                {tripType === "oneway" ? "✓" : ""}
              </span>
              Một chiều
            </button>

            <button
              type="button"
              onClick={() => setTripType("round")}
              className={[
                "group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                tripType === "round"
                  ? "bg-orange-600 text-white shadow-[0_14px_36px_rgba(234,88,12,0.35)]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-5 w-5 place-items-center rounded-full border transition",
                  tripType === "round"
                    ? "border-white/50 bg-white/15"
                    : "border-slate-300 bg-white",
                ].join(" ")}
              >
                {tripType === "round" ? "✓" : ""}
              </span>
              Khứ hồi
            </button>
          </div>

          <a
            href="#"
            className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition"
          >
            Hướng dẫn mua vé →
          </a>
        </div>

        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Body */}
        <div className="px-6 pb-6 pt-5">
          <div className="relative grid gap-4 md:grid-cols-12">
            {/* FROM */}
            <div className="md:col-span-4">
              <label className="text-sm font-semibold text-slate-800">
                Điểm đi
              </label>

              <div className="group mt-2 relative">
                <div className="relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition group-focus-within:border-orange-300 group-focus-within:ring-4 group-focus-within:ring-orange-100">
                  <span className="text-slate-500">🚌</span>
                  <input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full bg-transparent text-[16px] font-semibold outline-none placeholder:text-slate-400"
                    placeholder="VD: Đà Lạt"
                  />
                  {from && (
                    <button
                      type="button"
                      onClick={() => setFrom("")}
                      className="rounded-full px-2 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                      aria-label="Xoá điểm đi"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {(fromSuggestions?.length ?? 0) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="mt-2 flex flex-wrap gap-2"
                    >
                      {fromSuggestions.map((s) => (
                        <motion.button
                          key={s}
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          whileHover={{ y: -1 }}
                          onClick={() => setFrom(s)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                        >
                          {s}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* SWAP desktop */}
            <div className="hidden md:block md:col-span-1">
              <div className="h-full flex items-end justify-center">
                <motion.button
                  type="button"
                  onClick={swap}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98, rotate: -2 }}
                  className="mb-[2px] grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition"
                  title="Đổi điểm"
                >
                  <span className="text-lg">⇄</span>
                </motion.button>
              </div>
            </div>

            {/* TO */}
            <div className="md:col-span-4">
              <label className="text-sm font-semibold text-slate-800">
                Điểm đến
              </label>

              <div className="group mt-2 relative">
                <div className="relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition group-focus-within:border-orange-300 group-focus-within:ring-4 group-focus-within:ring-orange-100">
                  <span className="text-slate-500">🚌</span>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-transparent text-[16px] font-semibold outline-none placeholder:text-slate-400"
                    placeholder="VD: TP. Hồ Chí Minh"
                  />
                  {to && (
                    <button
                      type="button"
                      onClick={() => setTo("")}
                      className="rounded-full px-2 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                      aria-label="Xoá điểm đến"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {(toSuggestions?.length ?? 0) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="mt-2 flex flex-wrap gap-2"
                    >
                      {toSuggestions.map((s) => (
                        <motion.button
                          key={s}
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          whileHover={{ y: -1 }}
                          onClick={() => setTo(s)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                        >
                          {s}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* DATE: Ngày đi */}
            <div className="md:col-span-3">
              <label className="text-sm font-semibold text-slate-800">
                Ngày đi
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100 transition">
                <span className="text-slate-500">📅</span>
                <input
                  className="w-full bg-transparent text-[15px] font-semibold outline-none"
                  type="date"
                  value={departDate}
                  onChange={(e) => setDepartDate(e.target.value)}
                />
              </div>
            </div>

            {/* ✅ Ngày về chỉ hiện khi khứ hồi */}
            <AnimatePresence>
              {tripType === "round" && (
                <motion.div
                  key="return-date"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="md:col-span-3"
                >
                  <label className="text-sm font-semibold text-slate-800">
                    Ngày về
                  </label>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100 transition">
                    <span className="text-slate-500">📅</span>
                    <input
                      className="w-full bg-transparent text-[15px] font-semibold outline-none"
                      type="date"
                      value={returnDate}
                      min={departDate || undefined}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MOBILE SWAP */}
            <div className="md:hidden">
              <motion.button
                type="button"
                onClick={swap}
                whileTap={{ scale: 0.99 }}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                ⇄ Đổi điểm
              </motion.button>
            </div>
          </div>

          {/* Tickets + recent */}
          <div className="mt-6 grid gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <div className="text-sm font-semibold text-slate-800">Số vé</div>
              <div className="mt-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <span>🎫</span>
                  <span className="text-sm font-semibold">Vé</span>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTickets((t) => Math.max(1, t - 1))}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                  >
                    −
                  </motion.button>

                  <input
                    className="w-14 text-center text-[15px] font-extrabold text-slate-800 outline-none"
                    type="number"
                    min={1}
                    value={tickets}
                    onChange={(e) =>
                      setTickets(Math.max(1, Number(e.target.value || 1)))
                    }
                  />

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTickets((t) => Math.min(20, t + 1))}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                  >
                    +
                  </motion.button>
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Gợi ý: tối đa 20 vé/lần.
              </div>
            </div>

            <div className="md:col-span-8">
              <div className="text-sm font-semibold text-slate-800">
                Tìm kiếm gần đây
              </div>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setFrom("Đà Lạt");
                    setTo("TP. Hồ Chí Minh");
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:border-slate-300 hover:shadow-[0_10px_30px_rgba(2,6,23,0.08)] transition"
                >
                  <div className="font-extrabold text-slate-800">
                    Đà Lạt - TP. Hồ Chí Minh
                  </div>
                  <div className="mt-1 text-sm text-slate-500">09/09/2025</div>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setFrom("ANHUU");
                    setTo("TP. Hồ Chí Minh");
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:border-slate-300 hover:shadow-[0_10px_30px_rgba(2,6,23,0.08)] transition"
                >
                  <div className="font-extrabold text-slate-800">
                    ANHUU - TP. Hồ Chí Minh
                  </div>
                  <div className="mt-1 text-sm text-slate-500">09/09/2025</div>
                </motion.button>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-7 flex justify-center">
            <motion.button
              type="button"
              onClick={onSearch}
              disabled={isLoading}
              whileTap={{ scale: 0.99 }}
              whileHover={isLoading ? undefined : { y: -1 }}
              className={[
                "relative w-full max-w-xl overflow-hidden rounded-full px-8 py-4 text-base font-extrabold text-white transition",
                "shadow-[0_18px_55px_rgba(234,88,12,0.35)]",
                isLoading
                  ? "bg-orange-400 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-500",
              ].join(" ")}
            >
              <span className="relative inline-flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Đang tìm chuyến...
                  </>
                ) : (
                  "Tìm chuyến xe"
                )}
              </span>
            </motion.button>
          </div>

          <div className="mt-3 text-center text-xs text-slate-500">
            Mẹo: Bấm chip gợi ý để điền nhanh điểm đi/đến.
          </div>
        </div>
      </motion.div>
    </section>
  );
}
