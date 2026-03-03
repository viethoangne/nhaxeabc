"use client";

import Image from "next/image";
import { motion, MotionValue } from "framer-motion";

type Props = {
  mounted: boolean;
  bannerY: MotionValue<number>;
  src?: string;
};

export default function HeroBanner({
  mounted,
  bannerY,
  src = "/brand/Nha xe abc.png",
}: Props) {
  return (
    <div className="relative -mt-5 overflow-hidden rounded-2xl bg-[#0B1530] shadow-[0_22px_70px_rgba(2,6,23,0.30)] ring-1 ring-black/10">
      {/* BG blur */}
      <div className="absolute inset-0">
        <Image
          src={src}
          alt="ABC Banner BG"
          fill
          priority
          quality={60}
          sizes="(max-width: 768px) 100vw, 1152px"
          className="object-cover scale-110 blur-2xl opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06122D]/85 via-[#0B1A44]/55 to-[#06122D]/85" />

        {/* gloss */}
        <motion.div
          aria-hidden
          initial={{ x: -40, opacity: 0.55 }}
          animate={{ x: 40, opacity: 0.75 }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -top-24 left-[-20%] h-[180%] w-[55%] rotate-[18deg]
            bg-gradient-to-r from-transparent via-white/14 to-transparent
            blur-[1px] mix-blend-soft-light"
        />
      </div>

      {/* Main image */}
      <motion.div
        style={mounted ? { y: bannerY } : { y: 0 }}
        className="relative h-[210px] md:h-[280px] will-change-transform"
      >
        <Image
          src={src}
          alt="ABC Banner"
          fill
          priority
          quality={90}
          sizes="(max-width: 768px) 100vw, 1152px"
          className="object-contain object-center"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/28 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10" />
    </div>
  );
}
