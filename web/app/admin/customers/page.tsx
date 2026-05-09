'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Mail, Phone, Star, ShieldCheck, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

export default function AdminCustomersPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Gọi API lấy dữ liệu khách hàng
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        // Có truyền thêm searchTerm để DB tự tìm kiếm
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
        const res = await axios.get(`http://localhost:3001/api/admin/customers${query}`, {
          headers: { 'x-user-id': userId }
        });
        
        if (res.data.success) {
          setCustomers(res.data.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách Khách hàng:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce tìm kiếm (chờ user gõ xong 500ms mới gọi API cho đỡ lag)
    const timeoutId = setTimeout(() => {
      fetchCustomers();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [userId, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Khách hàng & User</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý tài khoản, điểm Loyalty và phân quyền.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm theo tên, email, sđt..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#ea580c] focus:ring-2 focus:ring-orange-50 outline-none transition-all" 
            />
          </div>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th className="p-4">Khách hàng</th>
              <th className="p-4">Liên hệ</th>
              <th className="p-4 text-center">Chuyến đi</th>
              <th className="p-4 text-center">Điểm Loyalty</th>
              <th className="p-4 text-right">Phân quyền</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#ea580c] mb-2" />
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-500">
                  Không tìm thấy khách hàng nào.
                </td>
              </tr>
            ) : (
              customers.map(user => (
                <tr key={user.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-[#ea580c] font-bold flex items-center justify-center shrink-0">
                      {user.avatar ? <Image src={user.avatar} alt="avt" width={40} height={40} className="rounded-full" /> : (user.name ? user.name.charAt(0).toUpperCase() : '?')}
                    </div>
                    <div className="font-bold text-gray-900">{user.name || 'Người dùng Ẩn danh'}</div>
                  </td>
                  <td className="p-4 text-gray-600 space-y-1">
                    <div className="flex items-center gap-2 text-xs"><Mail className="w-3 h-3 text-gray-400" /> {user.email}</div>
                    <div className="flex items-center gap-2 text-xs"><Phone className="w-3 h-3 text-gray-400" /> {user.phone}</div>
                  </td>
                  <td className="p-4 text-center font-bold text-gray-800">{user.trips}</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 font-bold border border-yellow-200">
                      <Star className="w-3 h-3 fill-yellow-400" /> {user.points}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {user.role === 'ADMIN' ? (
                       <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-200"><ShieldCheck className="w-3 h-3"/> ADMIN</span>
                    ) : (
                       <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">CUSTOMER</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}