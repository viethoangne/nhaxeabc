'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Ticket, Bus, Users, Activity, LogOut, ShieldCheck, CarFront, Gift } from 'lucide-react';
import AdminChatAI from '@/components/layout/AdminChatAI';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /// Danh sách các menu chức năng của Admin
  const navItems = [
    { name: 'Trạm điều khiển', href: '/admin', icon: LayoutDashboard },
    { name: 'Đơn hàng & Vé', href: '/admin/orders', icon: Ticket },
    { name: 'Quản lý Chuyến xe', href: '/admin/trips', icon: Bus },
    { name: 'Quản lý Tài xế', href: '/admin/drivers', icon: CarFront }, 
    { name: 'Khách hàng', href: '/admin/customers', icon: Users },
    // 🟢 THÊM MENU QUẢN LÝ LOYALTY VÀO ĐÂY
    { name: 'Điểm & Quà tặng', href: '/admin/loyalty', icon: Gift }, 
    { name: 'Nhật ký hệ thống', href: '/admin/audit-logs', icon: Activity },
  ];

  return (
    <div className="flex min-h-screen w-full bg-[#F4F5F7] font-sans">
      
      {/* 🔴 MENU SIDEBAR RIÊNG DÀNH CHO ADMIN */}
      <aside className="w-[260px] bg-white/95 backdrop-blur-xl border-r border-slate-200/80 flex flex-col fixed h-full z-40 shadow-sm">
        {/* Logo Admin */}
        <div className="p-6 border-b border-slate-100/80 flex items-center gap-3.5">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#ea580c] to-[#EF5222] rounded-2xl flex items-center justify-center text-white shadow-[0_8px_20px_rgba(234,88,12,0.3)]">
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white border-2 border-orange-500 shadow-2xs"></span>
            </span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">ABC ADMIN</h1>
            <p className="text-[10px] font-black text-[#ea580c] mt-1.5 uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-pulse"></span>
              Portal Quản trị
            </p>
          </div>
        </div>

        {/* Danh sách Link */}
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            // Sửa chữa triệt để lỗi Active trùng lặp thưa Admin
            const isActive = item.href === '/admin' 
              ? pathname === '/admin' 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-extrabold transition-all duration-300 group cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#ea580c] to-[#EF5222] text-white shadow-[0_8px_20px_rgba(234,88,12,0.25)] translate-x-1' 
                    : 'text-slate-500 hover:bg-orange-50/80 hover:text-[#ea580c]'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : 'group-hover:scale-110'} transition-transform`} strokeWidth={isActive ? 2.7 : 2.2} />
                  <span className="tracking-tight">{item.name}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Nút Đăng xuất */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 backdrop-blur-md">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })} 
            className="flex items-center justify-center gap-2.5 w-full px-4 py-3.5 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white text-sm font-extrabold rounded-2xl transition-all duration-300 group cursor-pointer border border-rose-100 shadow-xs"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" strokeWidth={2.7} />
            <span>Đăng xuất an toàn</span>
          </button>
        </div>
      </aside>

      {/* 🔴 KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH CỦA ADMIN (Được đẩy sang phải để chừa chỗ cho Menu) */}
      <main className="flex-1 ml-[260px] p-6 lg:p-10 transition-all duration-300">
        {children}
      </main>

      {/* 🔮 TRỢ LÝ AI ĐIỀU HÀNH ĐẶC QUYỀN CHO ADMIN */}
      <AdminChatAI />
      
    </div>
  );
}