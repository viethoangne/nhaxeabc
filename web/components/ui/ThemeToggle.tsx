"use client";

import { motion } from "framer-motion";
import { useTheme } from "@hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark, mounted } = useTheme();

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        className={[
          "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold",
          "border border-slate-200 bg-white/70 text-slate-500",
          "shadow-sm",
        ].join(" ")}
        aria-label="Theme"
      >
        …
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold",
        "transition shadow-sm select-none",
        // Light mode (nền sáng)
        "border border-slate-200 bg-white/70 text-slate-800 hover:bg-white",
        // Dark mode (khi html có class dark)
        "dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
      ].join(" ")}
      aria-label="Theme Toggle"
    >
      <span
        className={[
          "grid h-6 w-6 place-items-center rounded-full",
          "bg-slate-900 text-white",
          "dark:bg-white dark:text-slate-900",
        ].join(" ")}
        aria-hidden="true"
      >
        {isDark ? "🌙" : "☀️"}
      </span>

      <span className="whitespace-nowrap">{isDark ? "Dark" : "Light"}</span>
    </motion.button>
  );
}