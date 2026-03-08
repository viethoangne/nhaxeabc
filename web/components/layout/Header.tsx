"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "@components/ui/ThemeToggle";
import { NAV_ITEMS } from "@lib/constants";

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="relative">
        {/* HEADER ORANGE */}
        <div
          className={[
            "relative text-white",
            "bg-gradient-to-b from-[#FF8A2A] via-[#F56A19] to-[#E24D12]",
            scrolled ? "shadow-[0_18px_60px_rgba(2,6,23,0.25)]" : "",
          ].join(" ")}
        >
          {/* Polygon pattern rõ theo mảng (không chặn click) */}
          <div className="pointer-events-none absolute inset-0 opacity-45">
            <div className="absolute inset-0 [background:linear-gradient(135deg,rgba(255,255,255,0.22)_0%,transparent_42%)]" />
            <div className="absolute inset-0 [background:linear-gradient(225deg,rgba(0,0,0,0.16)_0%,transparent_48%)]" />
            <div className="absolute inset-0 [background:radial-gradient(900px_circle_at_10%_10%,rgba(255,255,255,0.25),transparent_58%)]" />
            <div className="absolute inset-0 [background:radial-gradient(900px_circle_at_82%_38%,rgba(0,0,0,0.18),transparent_60%)]" />
          </div>

          {/* ===== ROW 1 ===== */}
          <div className="relative z-10 mx-auto max-w-6xl px-4">
            <div
              className={[
                "flex items-center justify-between gap-3",
                scrolled ? "py-2" : "py-3",
                "transition-all duration-300",
              ].join(" ")}
            >
              {/* Left */}
              <div className="flex items-center gap-2 text-sm text-white/95">
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 hover:bg-white/12 active:scale-[0.99] transition"
                >
                  VI
                </button>
                <span className="opacity-60">|</span>
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 hover:bg-white/12 active:scale-[0.99] transition"
                >
                  Tải ứng dụng
                </button>
              </div>

              {/* Center: Plate hình thang trắng */}
              <div className="relative flex-1 flex justify-center">
                {/* glow dưới plate */}
                <div className="pointer-events-none absolute -bottom-4 left-1/2 h-12 w-[440px] -translate-x-1/2 blur-2xl bg-black/25 opacity-45" />

                <Link href="/" className="relative">
                  <motion.div
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    className={[
                      "relative",
                      "px-9 py-3.5",
                      "bg-white text-slate-900",
                      "shadow-[0_22px_60px_rgba(2,6,23,0.22)]",
                      "ring-1 ring-black/10",
                      "select-none",
                    ].join(" ")}
                    style={{
                      clipPath:
                        "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
                      borderRadius: "18px",
                    }}
                  >
                    {/* notch top */}
                    <span
                      className="pointer-events-none absolute -top-[10px] left-1/2 h-7 w-44 -translate-x-1/2 bg-white ring-1 ring-black/10"
                      style={{
                        clipPath:
                          "polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%)",
                        borderRadius: "16px",
                      }}
                    />

                    <div className="flex items-center gap-4">
                      {/* Logo to + dịu */}
                      <motion.div
                        whileHover={{ rotate: -1 }}
                        className={[
                          "relative grid place-items-center",
                          "h-14 w-14 md:h-16 md:w-16",
                          "rounded-2xl bg-white",
                          "ring-1 ring-slate-200",
                          "shadow-[0_12px_30px_rgba(2,6,23,0.10)]",
                        ].join(" ")}
                      >
                        {/* glow cam dịu */}
                        <span className="pointer-events-none absolute inset-0 rounded-2xl [box-shadow:0_0_0_6px_rgba(249,115,22,0.18)]" />
                        <Image
                          src="/brand/ABC.png"
                          alt="ABC Logo"
                          width={58}
                          height={58}
                          className="object-contain"
                          priority
                        />
                      </motion.div>

                      {/* Text */}
                      <div className="leading-tight text-center">
                        <div className="font-extrabold text-[18px] md:text-[20px] tracking-[0.06em] text-slate-900">
                          NHÀ XE ABC
                        </div>

                        <div className="mt-1 text-[11px] md:text-[12px] tracking-[0.28em] text-orange-600 font-extrabold">
                          CHẤT LƯỢNG LÀ DANH DỰ
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </div>

              {/* Right: Login/User + theme */}
              <div className="flex items-center gap-2">
                {session?.user ? (
                  <>
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-orange-700 shadow-[0_14px_35px_rgba(2,6,23,0.16)] ring-1 ring-black/10">
                        {session.user.image ? (
                          <Image
                            src={session.user.image}
                            alt={session.user.name ?? ""}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-orange-50 ring-1 ring-orange-200">👤</span>
                        )}
                        <span className="max-w-[100px] truncate">{session.user.name ?? session.user.email}</span>
                      </div>
                    </motion.div>
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/30 transition"
                        type="button"
                      >
                        Đăng xuất
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
                    <Link
                      href="/login"
                      className={[
                        "inline-flex items-center gap-2",
                        "rounded-full bg-white px-4 py-2",
                        "text-sm font-extrabold text-orange-700",
                        "shadow-[0_14px_35px_rgba(2,6,23,0.16)]",
                        "ring-1 ring-black/10",
                        "hover:bg-white/95 transition",
                      ].join(" ")}
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-orange-50 ring-1 ring-orange-200">
                        👤
                      </span>
                      Đăng nhập/Đăng ký
                    </Link>
                  </motion.div>
                )}

                <div className="rounded-full bg-white/15 px-1.5 py-1.5 hover:bg-white/20 transition">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>

          {/* ===== ROW 2 menu (cam) ===== */}
          <div className="relative z-10 border-t border-white/18">
            <div className="mx-auto max-w-6xl px-2 md:px-4">
              <nav className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                {NAV_ITEMS.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname?.startsWith(item.href);

                  return (
                    <motion.div
                      key={item.href}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      className="flex-1"
                    >
                      <Link
                        href={item.href}
                        className={[
                          "relative block whitespace-nowrap text-center",
                          "py-3 text-[13px] font-extrabold tracking-wide",
                          active
                            ? "text-white"
                            : "text-white/90 hover:text-white",
                          "transition",
                        ].join(" ")}
                      >
                        {item.label}

                        {/* underline trắng dài */}
                        <AnimatePresence>
                          {active && (
                            <motion.div
                              layoutId="nav-underline"
                              className="absolute left-1/2 bottom-0 h-[3px] -translate-x-1/2 rounded-full bg-white"
                              style={{ width: "62%" }}
                              transition={{
                                type: "spring",
                                stiffness: 520,
                                damping: 36,
                              }}
                            />
                          )}
                        </AnimatePresence>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* ĐUÔI kéo dài xuống để tạo cảm giác “đè” (em sẽ dùng ở banner bằng -mt) */}
          <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-b from-[#E24D12]/70 to-transparent" />
        </div>
      </div>
    </header>
  );
}