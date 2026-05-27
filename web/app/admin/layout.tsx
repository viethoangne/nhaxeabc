'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Ticket, Bus, Users, Activity,
  LogOut, ShieldCheck, CarFront, Gift,
} from 'lucide-react';
import AdminChatAI from '@/components/layout/AdminChatAI';
import { useState, useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const navItems = [
    { name: 'Trạm điều khiển', href: '/admin', icon: LayoutDashboard },
    { name: 'Đơn hàng & Vé',   href: '/admin/orders',     icon: Ticket },
    { name: 'Quản lý Chuyến',  href: '/admin/trips',      icon: Bus },
    { name: 'Quản lý Tài xế',  href: '/admin/drivers',    icon: CarFront },
    { name: 'Khách hàng',      href: '/admin/customers',  icon: Users },
    { name: 'Điểm & Quà tặng', href: '/admin/loyalty',    icon: Gift },
    { name: 'Nhật ký hệ thống',href: '/admin/audit-logs', icon: Activity },
  ];

  /* ─── Sidebar nội dung dùng chung cho desktop & mobile drawer ─── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-slate-100">
        <div className="relative shrink-0">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#ea580c] to-[#F59E0B] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          {/* Đèn xanh online */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white shadow" />
          </span>
        </div>
        <div>
          <h1 className="text-[15px] font-black text-slate-800 tracking-tight leading-none">ABC ADMIN</h1>
          <p className="text-[9px] font-black text-[#ea580c] mt-1 uppercase tracking-widest">Portal Quản trị</p>
        </div>
      </div>

      {/* ── Divider label ── */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">Menu chức năng</p>
      </div>

      {/* ── Nav items ── */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`relative flex items-center gap-3 px-4 h-[44px] rounded-2xl transition-all duration-300 cursor-pointer group ${
                  isActive
                    ? 'text-white font-extrabold shadow-lg shadow-orange-500/25'
                    : 'text-slate-600 hover:text-[#ea580c] hover:bg-orange-50/60 font-bold'
                }`}
                style={isActive ? { backgroundImage: 'linear-gradient(135deg, #EF5222, #F59E0B)' } : {}}
              >
                {/* Thanh nhấn mạnh bên trái khi active */}
                {isActive && (
                  <div className="absolute left-2 w-1 h-5 bg-white/50 rounded-r-full" />
                )}
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-transform duration-300 ${
                    isActive ? '' : 'text-slate-500 group-hover:text-[#ea580c] group-hover:scale-110'
                  }`}
                  strokeWidth={isActive ? 2.7 : 2.2}
                />
                <span className="text-[11px] uppercase tracking-wider truncate">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ── Đăng xuất ── */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white hover:bg-rose-500 text-rose-500 hover:text-white text-[11px] font-extrabold uppercase tracking-wider rounded-2xl transition-all duration-300 cursor-pointer border border-rose-100 hover:border-rose-500 shadow-sm group"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.7} />
          Đăng xuất an toàn
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-[#F4F5F7] font-sans">

      {/* ══════ DESKTOP SIDEBAR ══════ */}
      <aside className="hidden md:flex w-[240px] bg-white/96 backdrop-blur-xl border-r border-slate-200/70 flex-col fixed h-full z-40 shadow-[2px_0_20px_rgba(0,0,0,0.04)]">
        <SidebarContent />
      </aside>

      {/* ══════ MOBILE TOP NAVBAR ══════ */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[80] bg-white/98 backdrop-blur-xl border-b border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-4 h-[52px]">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#ea580c] to-[#F59E0B] rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <ShieldCheck size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[13px] font-black text-slate-800 leading-none tracking-tight">ABC ADMIN</p>
              <p className="text-[8px] font-black text-[#ea580c] uppercase tracking-widest mt-0.5">Portal Quản trị</p>
            </div>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-orange-50 active:text-[#ea580c] active:scale-90 transition-all"
            aria-label="Mở menu"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" x2="21" y1="6"  y2="6"  />
              <line x1="3" x2="21" y1="12" y2="12" />
              <line x1="3" x2="21" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ══════ MOBILE BACKDROP ══════ */}
      <div
        className={`md:hidden fixed inset-0 z-[85] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* ══════ MOBILE DRAWER ══════ */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-[270px] z-[90] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Nút đóng */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 transition-all z-10 active:scale-90"
          aria-label="Đóng menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>

        <SidebarContent />
      </div>

      {/* ══════ MAIN CONTENT ══════ */}
      <main className="flex-1 ml-0 md:ml-[240px] pt-[52px] md:pt-0 p-3 md:p-6 lg:p-10 transition-all duration-300 min-w-0 relative z-0">
        {children}
      </main>

      {/* 🔮 AI ADMIN ASSISTANT */}
      <AdminChatAI />

    </div>
  );
}