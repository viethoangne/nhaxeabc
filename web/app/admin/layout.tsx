'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
// 🟢 ĐÃ THÊM ICON `Gift` VÀO ĐÂY
import { LayoutDashboard, Ticket, Bus, Users, Activity, LogOut, ShieldCheck, CarFront, Gift } from 'lucide-react';

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
      <aside className="w-[260px] bg-white border-r border-slate-200 flex flex-col fixed h-full z-40 shadow-sm">
        {/* Logo Admin */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ea580c] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">ABC ADMIN</h1>
            <p className="text-[10px] font-bold text-[#ea580c] mt-1 uppercase tracking-widest">Portal Quản trị</p>
          </div>
        </div>

        {/* Danh sách Link */}
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isActive 
                    ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/20' 
                    : 'text-slate-500 hover:bg-orange-50 hover:text-[#ea580c]'
                }`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Nút Đăng xuất */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })} 
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-rose-500 text-sm font-bold rounded-xl hover:bg-rose-100 transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={2.5} />
            Đăng xuất an toàn
          </button>
        </div>
      </aside>

      {/* 🔴 KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH CỦA ADMIN (Được đẩy sang phải để chừa chỗ cho Menu) */}
      <main className="flex-1 ml-[260px] p-6 lg:p-10 transition-all duration-300">
        {children}
      </main>
      
    </div>
  );
}