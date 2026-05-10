'use client';
import { API_BASE } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Gift, Wand2, Plus, Edit, Trash2, X, Search, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';

const API_BASE = '${API_BASE}/admin/loyalty';

export default function AdminLoyaltyPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const [activeTab, setActiveTab] = useState<'users' | 'vouchers'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // States for Modals
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  
  // AI Suggestion State
  const [aiTopic, setAiTopic] = useState('');
  const [aiDiscount, setAiDiscount] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: '', title: '', type: 'percent', value: '', maxAmount: '', costInPoints: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async (q = search) => {
    if (!userId) return;
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await axios.get(`${API_BASE}/users`, { 
          params: { search: q },
          headers: { 'x-user-id': userId }
        });
        setUsers(res.data);
      } else {
        const res = await axios.get(`${API_BASE}/vouchers`, {
          headers: { 'x-user-id': userId }
        });
        setVouchers(res.data);
      }
    } catch (error) {
      console.error("Lỗi lấy dữ liệu:", error);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(search);
  };

  // --- ACTIONS FOR USERS ---
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !adjustAmount || !userId) return;
    try {
      await axios.post(`${API_BASE}/users/${selectedUser.id}/adjust`, {
        pointsToAdd: parseInt(adjustAmount),
        reason: adjustReason
      }, { headers: { 'x-user-id': userId } });
      setShowAdjustModal(false);
      setAdjustAmount('');
      setAdjustReason('');
      fetchData();
      alert('Điều chỉnh điểm thành công!');
    } catch (error) {
      alert('Có lỗi xảy ra khi điều chỉnh điểm.');
    }
  };

  // --- ACTIONS FOR VOUCHERS ---
  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      if (editingVoucher) {
        await axios.put(`${API_BASE}/vouchers/${editingVoucher.id}`, formData, { headers: { 'x-user-id': userId } });
        alert('Cập nhật thành công!');
      } else {
        await axios.post(`${API_BASE}/vouchers`, formData, { headers: { 'x-user-id': userId } });
        alert('Tạo voucher thành công!');
      }
      setShowVoucherModal(false);
      fetchData();
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu Voucher.');
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá voucher này?')) return;
    if (!userId) return;
    try {
      await axios.delete(`${API_BASE}/vouchers/${id}`, { headers: { 'x-user-id': userId } });
      fetchData();
    } catch (error) {
      alert('Không thể xoá voucher.');
    }
  };

  const handleAiSuggest = async () => {
    if (!aiTopic) return alert('Vui lòng nhập chủ đề sự kiện (VD: Lễ 30/4, Sinh nhật)');
    if (!userId) return;
    setIsAiLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/ai-suggest`, {
        topic: aiTopic,
        discountLevel: aiDiscount || '20%'
      }, { headers: { 'x-user-id': userId } });
      const aiData = res.data;
      setFormData({
        code: aiData.code,
        title: aiData.title,
        type: aiData.type || 'percent',
        value: aiData.value?.toString() || '',
        maxAmount: aiData.maxAmount?.toString() || '',
        costInPoints: aiData.costInPoints?.toString() || ''
      });
    } catch (error) {
      alert('Có lỗi khi gọi AI. Vui lòng thử lại.');
    }
    setIsAiLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {/* Header Premium Style */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border-b-4 border-yellow-500 mb-8 mt-2">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ea580c] via-orange-500 to-yellow-500 opacity-90"></div>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]"></div>
        
        <div className="relative p-10 backdrop-blur-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-md">
                Hệ thống Quản lý Loyalty & Voucher
              </h1>
            </div>
            <p className="text-orange-50 font-medium text-lg max-w-2xl">
              Quản trị toàn diện điểm số khách hàng và kho quà tặng sinh động với sự hỗ trợ từ AI.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex space-x-3 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all duration-300 ${
            activeTab === 'users'
              ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/20'
              : 'bg-transparent text-slate-500 hover:bg-orange-50 hover:text-orange-600'
          }`}
        >
          <Users className="w-5 h-5" />
          Khách hàng & Tích điểm
        </button>
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all duration-300 ${
            activeTab === 'vouchers'
              ? 'bg-[#ea580c] text-white shadow-md shadow-orange-500/20'
              : 'bg-transparent text-slate-500 hover:bg-orange-50 hover:text-orange-600'
          }`}
        >
          <Gift className="w-5 h-5" />
          Kho Quà tặng (Vouchers)
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
        
        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h2 className="text-2xl font-black text-slate-800 border-l-4 border-[#ea580c] pl-4">
                Danh sách Điểm Khách hàng
              </h2>
              <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm Tên, SĐT hoặc Email..." 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium"
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                <button type="submit" className="hidden">Tìm</button>
              </form>
            </div>
            
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                    <th className="p-5 font-bold">Khách hàng</th>
                    <th className="p-5 font-bold">Liên hệ</th>
                    <th className="p-5 font-bold text-center">Số chuyến</th>
                    <th className="p-5 font-bold text-center">Điểm hiện tại</th>
                    <th className="p-5 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Không tìm thấy khách hàng nào.</td></tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="hover:bg-orange-50/50 transition-colors group">
                        <td className="p-5">
                          <div className="font-bold text-slate-800 text-base">{user.name || 'Khách vãng lai'}</div>
                          <div className="text-xs text-slate-400 mt-1">ID: {user.id.substring(0,8)}...</div>
                        </td>
                        <td className="p-5">
                          <div className="font-medium text-slate-600">{user.phone || 'Chưa cập nhật'}</div>
                          {user.email && <div className="text-sm text-slate-500">{user.email}</div>}
                        </td>
                        <td className="p-5 text-center font-bold text-slate-700">{user.totalTrips}</td>
                        <td className="p-5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-[#ea580c] font-black">
                            {user.points.toLocaleString()} <span className="text-xs">✨</span>
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => { setSelectedUser(user); setShowAdjustModal(true); }}
                            className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-[#ea580c] hover:text-white transition-all shadow-sm group-hover:shadow-md"
                          >
                            <Edit className="w-4 h-4" />
                            Điều chỉnh
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: VOUCHERS */}
        {activeTab === 'vouchers' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h2 className="text-2xl font-black text-slate-800 border-l-4 border-yellow-500 pl-4 flex items-center gap-2">
                Quản lý Kho Voucher 
              </h2>
              <button 
                onClick={() => { 
                  setEditingVoucher(null); 
                  setFormData({code: '', title: '', type: 'percent', value: '', maxAmount: '', costInPoints: ''});
                  setShowVoucherModal(true); 
                }}
                className="flex items-center gap-2 px-6 py-3 bg-[#ea580c] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:scale-105 transition-all"
              >
                <Plus className="w-5 h-5" /> Thêm Voucher Mới
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10 text-slate-400">Đang tải dữ liệu...</div>
            ) : vouchers.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium text-lg">Chưa có voucher nào trong hệ thống.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vouchers.map(v => (
                  <div key={v.id} className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all group overflow-hidden flex flex-col h-full">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-300 to-orange-500 rounded-bl-full -mr-12 -mt-12 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"></div>
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-black tracking-widest rounded-md mb-2 border border-slate-200">
                          {v.code}
                        </span>
                        <h3 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-[#ea580c] transition-colors line-clamp-2">{v.title}</h3>
                      </div>
                    </div>
                    
                    <div className="mb-6 space-y-2 flex-1">
                      <div className="flex items-center text-sm text-slate-600">
                        <span className="w-20 text-slate-400">Mức giảm:</span> 
                        <strong className="text-rose-500">{v.type === 'percent' ? `${v.value}%` : `${v.value.toLocaleString()}đ`}</strong>
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <span className="w-20 text-slate-400">Tối đa:</span> 
                        <strong>{v.maxAmount ? `${v.maxAmount.toLocaleString()}đ` : 'Không giới hạn'}</strong>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                      <div className="flex items-center gap-1.5 font-black text-slate-800">
                        <span className="text-[#ea580c]">✨</span> {v.costInPoints || 0} đ
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingVoucher(v); setFormData(v); setShowVoucherModal(true); }} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-orange-100 hover:text-orange-600 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteVoucher(v.id)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL ADJUST POINTS --- */}
      {showAdjustModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Điều chỉnh điểm</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-700 bg-white p-1 rounded-full shadow-sm"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAdjustPoints} className="p-6">
              <div className="mb-4 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">Khách hàng</p>
                <p className="font-bold text-slate-800 text-lg">{selectedUser.name}</p>
                <p className="text-sm font-medium text-orange-600 mt-1">Điểm hiện tại: {selectedUser.points.toLocaleString()}</p>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Số điểm (+/-)</label>
                  <input 
                    type="number" required
                    placeholder="VD: 500 hoặc -200"
                    value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Lý do điều chỉnh</label>
                  <textarea 
                    required rows={3}
                    placeholder="VD: Thưởng lễ, Trừ điểm do huỷ đơn..."
                    value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" className="flex-1 py-3 px-4 bg-[#ea580c] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors">Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL VOUCHER (WITH AI) --- */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-xl text-slate-800">{editingVoucher ? 'Sửa Voucher' : 'Tạo Voucher Mới'}</h3>
              <button onClick={() => setShowVoucherModal(false)} className="text-slate-400 hover:text-slate-700 bg-white p-1 rounded-full shadow-sm"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
              
              {/* KHU VỰC AI SUGGESTION */}
              {!editingVoucher && (
                <div className="mb-8 p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-100 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Wand2 className="w-24 h-24" />
                  </div>
                  <h4 className="font-black text-indigo-900 flex items-center gap-2 mb-4 text-lg relative z-10">
                    <Wand2 className="w-5 h-5 text-indigo-500" />
                    AI Tự Động Gợi Ý
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                    <input 
                      type="text" placeholder="Chủ đề (VD: Lễ 2/9, Sinh nhật nhà xe)" 
                      value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                    />
                    <input 
                      type="text" placeholder="Mức giảm (VD: 20%, 50K)" 
                      value={aiDiscount} onChange={e => setAiDiscount(e.target.value)}
                      className="w-full sm:w-32 px-4 py-2.5 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                    />
                    <button 
                      type="button" 
                      onClick={handleAiSuggest} disabled={isAiLoading}
                      className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      {isAiLoading ? 'Đang nghĩ...' : 'Tạo bằng AI'}
                    </button>
                  </div>
                </div>
              )}

              {/* FORM NHẬP THỦ CÔNG / AI ĐIỀN VÀO */}
              <form id="voucher-form" onSubmit={handleSaveVoucher} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mã Code (In hoa, liền không dấu)</label>
                    <input 
                      type="text" required placeholder="VD: SALE50"
                      value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-mono uppercase font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Giá trị quy đổi (Điểm)</label>
                    <input 
                      type="number" required placeholder="VD: 500"
                      value={formData.costInPoints} onChange={e => setFormData({...formData, costInPoints: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-orange-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Tiêu đề (Hiển thị cho khách)</label>
                  <input 
                    type="text" required placeholder="VD: Giảm 50% vé khứ hồi"
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Loại giảm giá</label>
                    <select 
                      value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="percent">Phần trăm (%)</option>
                      <option value="fixed">Tiền mặt (VNĐ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mức giảm</label>
                    <input 
                      type="number" required placeholder={formData.type === 'percent' ? "VD: 20" : "VD: 50000"}
                      value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Giảm tối đa (VNĐ)</label>
                    <input 
                      type="number" required placeholder="VD: 50000"
                      value={formData.maxAmount} onChange={e => setFormData({...formData, maxAmount: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
              <button type="button" onClick={() => setShowVoucherModal(false)} className="py-3 px-6 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">Hủy</button>
              <button type="submit" form="voucher-form" className="py-3 px-8 bg-[#ea580c] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors">Lưu Voucher</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}