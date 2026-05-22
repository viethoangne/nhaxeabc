"use client";

import { motion } from "framer-motion";
import { useTheme } from "@hooks/useTheme";

export default function ThemeToggle({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const { theme, toggleTheme, isDark, mounted } = useTheme();

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        className={
          isCollapsed
            ? "w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 bg-white/70 text-slate-500 shadow-sm"
            : [
                "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold",
                "border border-slate-200 bg-white/70 text-slate-500",
                "shadow-sm",
              ].join(" ")
        }
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
      className={
        isCollapsed
          ? "w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-white dark:hover:bg-white/15 shadow-sm transition select-none cursor-pointer text-base"
          : [
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold cursor-pointer",
              "transition shadow-sm select-none",
              // Light mode (nền sáng)
              "border border-slate-200 bg-white/70 text-slate-800 hover:bg-white",
              // Dark mode (khi html có class dark)
              "dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
            ].join(" ")
      }
      aria-label="Theme Toggle"
    >
      {isCollapsed ? (
        <span>{isDark ? "🌙" : "☀️"}</span>
      ) : (
        <>
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
        </>
      )}
    </motion.button>
  );
}