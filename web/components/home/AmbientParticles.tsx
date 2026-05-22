'use client';

import { motion } from 'framer-motion';

export default function AmbientParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Glow Bubble 1 */}
      <motion.div
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -50, 40, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[20%] left-[10%] w-72 h-72 rounded-full bg-orange-200/20 dark:bg-orange-950/10 blur-[80px]"
      />
      
      {/* Glow Bubble 2 */}
      <motion.div
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 30, -60, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[50%] right-[5%] w-80 h-80 rounded-full bg-pink-100/15 dark:bg-slate-900/40 blur-[90px]"
      />
      
      {/* Glow Bubble 3 */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, 40, -30, 0],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-[10%] left-[15%] w-96 h-96 rounded-full bg-orange-100/15 dark:bg-orange-950/5 blur-[100px]"
      />
    </div>
  );
}
