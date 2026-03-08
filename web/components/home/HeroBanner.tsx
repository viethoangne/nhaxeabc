// Refactored HeroBanner component
'use client';

import Image from 'next/image';
import { motion, MotionValue } from 'framer-motion';
interface HeroBannerProps {
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
}

export default function HeroBanner({ scale, opacity }: HeroBannerProps) {
  return (
    <motion.section
      style={{ scale, opacity }}
      className="relative isolate overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-24 lg:pb-20"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-black/10" />
        <svg
          className="absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="80"
              height="80"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M80 0H0v80"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-primary-200/30 dark:text-primary-700/20"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Left content */}
          <div className="flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-primary-200 backdrop-blur dark:bg-slate-800/80 dark:text-primary-300 dark:ring-primary-700">
                <span className="mr-2">🚌</span>
                Đặt vé xe • Chọn ghế • Vé QR
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
                <span className="block">Đặt vé xe ABC</span>
                <span className="block bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent dark:from-primary-400 dark:to-primary-300">
                  Nhanh chóng & An toàn
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-600 dark:text-slate-300">
                Hơn 500+ chuyến xe mỗi ngày, kết nối hơn 30 tỉnh thành trên cả
                nước. Đặt vé dễ dàng, thanh toán linh hoạt, hỗ trợ 24/7.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-full bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-500/25 hover:bg-primary-500 transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-400"
                >
                  Đặt vé ngay
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-full bg-white px-6 py-3 text-base font-semibold text-slate-800 shadow-lg shadow-slate-200/50 hover:bg-slate-50 ring-1 ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
                >
                  Xem lịch trình
                </motion.button>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    ✓
                  </div>
                  <span>Xe đời mới, có Wi‑Fi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    ✓
                  </div>
                  <span>Hỗ trợ đổi/huỷ vé</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    ✓
                  </div>
                  <span>Thanh toán đa dạng</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative lg:mt-0"
          >
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary-400/20 to-primary-600/20 blur-3xl dark:from-primary-500/10 dark:to-primary-700/10" />
              <div className="relative overflow-hidden rounded-3xl bg-white/80 shadow-2xl ring-1 ring-slate-200/50 backdrop-blur dark:bg-slate-800/80 dark:ring-slate-700/50">
                <Image
                  src="/brand/Nha xe abc.png"
                  alt="ABC Bus"
                  width={600}
                  height={400}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={90}
                  className="h-auto w-full object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent dark:from-black/20" />

                {/* Floating badge */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="absolute -right-4 -top-4 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-3 shadow-xl"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span>⭐</span>
                    <span>4.9/5 (2K+ đánh giá)</span>
                  </div>
                </motion.div>

                {/* Bus animation */}
                <motion.div
                  animate={{ x: [0, 20, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: 'easeInOut',
                  }}
                  className="absolute -bottom-6 left-1/4 rounded-full bg-white p-3 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                >
                  <span className="text-2xl">🚌</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}