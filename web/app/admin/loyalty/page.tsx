'use client';
import { API_BASE } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Gift, Wand2, Plus, Edit, Trash2, X, Search, ShieldCheck, Crown, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';


export default function AdminLoyaltyPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const LOYALTY_API = `${API_BASE}/admin/loyalty`;

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
        const res = await axios.get(`${LOYALTY_API}/users`, { 
          params: { search: q },
          headers: { 'x-user-id': userId }
        });
        setUsers(res.data);
      } else {
        const res = await axios.get(`${LOYALTY_API}/vouchers`, {
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
      await axios.post(`${LOYALTY_API}/users/${selectedUser.id}/adjust`, {
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
        await axios.put(`${LOYALTY_API}/vouchers/${editingVoucher.id}`, formData, { headers: { 'x-user-id': userId } });
        alert('Cập nhật thành công!');
      } else {
        await axios.post(`${LOYALTY_API}/vouchers`, formData, { headers: { 'x-user-id': userId } });
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
        await axios.delete(`${LOYALTY_API}/vouchers/${id}`, { headers: { 'x-user-id': userId } });
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
      const res = await axios.post(`${LOYALTY_API}/ai-suggest`, {
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
      {/* Header Premium Style - Thu gọn theo tỷ lệ chuẩn thưa Admin */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg mb-6 mt-1 bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 border border-orange-500/20">
        {/* Ambient Lighting Orbs */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#ea580c]/15 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:20px_20px]"></div>
        
        <div className="relative p-6 lg:px-8 lg:py-6 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="bg-gradient-to-tr from-[#ea580c] to-[#EF5222] p-2.5 rounded-xl shadow-[0_4px_12px_rgba(234,88,12,0.3)] border border-orange-400/30">
                <ShieldCheck className="w-6 h-6 text-white animate-pulse" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                <span>Hệ thống Quản lý Loyalty & Voucher</span>
                <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent text-[11px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 shadow-inner">AI Empowered</span>
              </h1>
            </div>
            <p className="text-slate-300 font-medium text-sm max-w-2xl leading-relaxed">
              Quản trị toàn diện điểm số khách hàng và kho quà tặng sinh động với động cơ phân tích dữ liệu AI thông minh.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Menu - Thiết kế tinh gọn, hiệu ứng pha lê cao cấp thưa Admin */}
      <div className="flex space-x-2 mb-6 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-100 w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`group flex items-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-[#ea580c] to-[#EF5222] text-white shadow-[0_4px_12px_rgba(234,88,12,0.3)] scale-[1.02]'
              : 'bg-transparent text-slate-500 hover:bg-orange-50 hover:text-[#ea580c]'
          }`}
        >
          <Crown className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'users' ? 'animate-bounce text-amber-300' : 'group-hover:rotate-12'}`} strokeWidth={2.5} />
          <span>Khách hàng & Tích điểm</span>
          {activeTab === 'users' && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>}
        </button>
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`group flex items-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${
            activeTab === 'vouchers'
              ? 'bg-gradient-to-r from-[#ea580c] to-[#EF5222] text-white shadow-[0_4px_12px_rgba(234,88,12,0.3)] scale-[1.02]'
              : 'bg-transparent text-slate-500 hover:bg-orange-50 hover:text-[#ea580c]'
          }`}
        >
          <Gift className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'vouchers' ? 'animate-pulse text-amber-300' : 'group-hover:scale-110'}`} strokeWidth={2.5} />
          <span>Kho Quà tặng (Vouchers)</span>
          {activeTab === 'vouchers' && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>}
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-2xl rounded-[32px] shadow-[0_15px_50px_rgba(234,88,12,0.06)] border border-white p-6 sm:p-8">
        
        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <span>Danh sách Điểm Khách hàng</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm"></span>
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-1">Cập nhật tự động sau mỗi chuyến xe hoàn tất</p>
              </div>
              <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm Tên, SĐT hoặc Email..." 
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-bold text-sm shadow-inner"
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
                <button type="submit" className="hidden">Tìm</button>
              </form>
            </div>
            
            <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-100">
                    <th className="p-5">Khách hàng</th>
                    <th className="p-5">Liên hệ</th>
                    <th className="p-5 text-center">Số chuyến</th>
                    <th className="p-5 text-center">Điểm hiện tại</th>
                    <th className="p-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-extrabold">Đang tải dữ liệu...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-extrabold">Không tìm thấy khách hàng nào.</td></tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="hover:bg-orange-50/60 transition-all duration-300 group hover:-translate-y-0.5">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-black shadow-[0_4px_10px_rgba(234,88,12,0.3)] shrink-0 overflow-hidden border border-orange-400/20">
                              {user.picture ? (
                                <img src={user.picture} alt={user.name || 'Avatar'} className="w-full h-full object-cover" />
                              ) : (
                                (user.name || 'K')[0].toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-black text-slate-900 text-base tracking-tight flex items-center gap-2">
                                <span className="group-hover:text-[#ea580c] transition-colors">{user.name || 'Khách vãng lai'}</span>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-extrabold text-slate-500 border border-slate-200">ID: {user.id.substring(0,6)}</span>
                              </div>
                              <div className="text-[11px] font-extrabold text-slate-400 mt-0.5">Thành viên hệ thống ABC</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{user.phone || 'Chưa cập nhật'}</span>
                          </div>
                          {user.email ? (
                            <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg w-fit mt-1 border border-indigo-100 shadow-2xs">
                              {user.email}
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-slate-400 italic mt-1">Chưa có email</div>
                          )}
                        </td>
                        <td className="p-5 text-center font-black text-slate-700 text-base">{user.totalTrips}</td>
                        <td className="p-5 text-center">
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-[#ea580c] text-white font-black shadow-[0_6px_15px_rgba(234,88,12,0.35)] group-hover:scale-110 transition-all duration-300">
                            <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
                            <span className="text-base tracking-tight">{user.points.toLocaleString()}</span>
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Điểm</span>
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => { setSelectedUser(user); setShowAdjustModal(true); }}
                            className="inline-flex items-center gap-2 text-xs px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-extrabold rounded-xl hover:bg-[#ea580c] hover:text-white hover:border-orange-500 transition-all shadow-2xs hover:shadow-md cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Điều chỉnh</span>
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
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <span>Quản lý Kho Voucher</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-sm"></span>
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-1">Phát hành và quản trị các chiến dịch ưu đãi</p>
              </div>
              <button 
                onClick={() => { 
                  setEditingVoucher(null); 
                  setFormData({code: '', title: '', type: 'percent', value: '', maxAmount: '', costInPoints: ''});
                  setShowVoucherModal(true); 
                }}
                className="group relative flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-[#ea580c] via-orange-500 to-amber-500 text-white font-black text-sm rounded-2xl shadow-[0_10px_30px_rgba(234,88,12,0.4)] hover:shadow-[0_15px_40px_rgba(234,88,12,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden border border-orange-400/50"
              >
                {/* Dải sáng lướt qua (Shine overlay) */}
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shine_1s_ease-in-out] skew-x-12 pointer-events-none"></div>
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md group-hover:rotate-90 transition-transform duration-500 shadow-inner">
                  <Plus className="w-5 h-5 text-white" strokeWidth={3} /> 
                </div>
                <div className="flex flex-col text-left">
                  <span className="tracking-tight leading-none mb-1 text-base">Thêm Voucher Mới</span>
                  <span className="text-[10px] text-orange-100 font-extrabold uppercase tracking-widest leading-none opacity-90 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-spin text-amber-200" /> Tích Hợp AI
                  </span>
                </div>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 font-extrabold">Đang tải dữ liệu...</div>
            ) : vouchers.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/80 rounded-3xl border border-dashed border-slate-200 shadow-inner">
                <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4 animate-bounce" />
                <p className="text-slate-500 font-extrabold text-lg">Chưa có voucher nào trong hệ thống.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vouchers.map(v => (
                  <div key={v.id} className="relative bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_35px_rgba(234,88,12,0.1)] hover:border-orange-200 transition-all duration-300 group overflow-hidden flex flex-col h-full hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-amber-300/30 to-orange-500/30 rounded-bl-[40px] -mr-10 -mt-10 opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <span className="inline-block px-3 py-1 bg-gradient-to-r from-orange-50 to-amber-50 text-[#ea580c] text-xs font-black tracking-widest rounded-xl mb-2.5 border border-orange-100 shadow-2xs">
                          {v.code}
                        </span>
                        <h3 className="font-extrabold text-lg text-slate-800 leading-tight group-hover:text-[#ea580c] transition-colors line-clamp-2 tracking-tight">{v.title}</h3>
                      </div>
                    </div>
                    
                    <div className="mb-6 space-y-2.5 flex-1 relative z-10">
                      <div className="flex items-center justify-between text-sm border-b border-slate-50 pb-2">
                        <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">Mức giảm:</span> 
                        <strong className="text-rose-600 font-black text-base">{v.type === 'percent' ? `${v.value}%` : `${v.value.toLocaleString()}đ`}</strong>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">Giảm tối đa:</span> 
                        <strong className="text-slate-700 font-extrabold">{v.maxAmount ? `${v.maxAmount.toLocaleString()}đ` : 'Không giới hạn'}</strong>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto relative z-10">
                      <div className="flex items-center gap-1.5 font-black text-slate-800 text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <span className="text-[#ea580c]">✨</span> {v.costInPoints || 0} điểm
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingVoucher(v); setFormData(v); setShowVoucherModal(true); }} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-orange-50 hover:text-[#ea580c] hover:border-orange-200 transition-all shadow-xs hover:shadow-sm cursor-pointer">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteVoucher(v.id)} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-xs hover:shadow-sm cursor-pointer">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-extrabold text-xl text-slate-800 tracking-tight">Điều chỉnh điểm số</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-xl border border-slate-100 shadow-2xs cursor-pointer hover:bg-slate-50 transition-colors">
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
            <form onSubmit={handleAdjustPoints} className="p-8">
              <div className="mb-6 p-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl shadow-inner">
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Khách hàng</p>
                <p className="font-black text-slate-800 text-xl tracking-tight">{selectedUser.name}</p>
                <p className="text-xs font-black text-[#ea580c] mt-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#ea580c] animate-pulse"></span>
                  Điểm hiện tại: {selectedUser.points.toLocaleString()} ✨
                </p>
              </div>
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Số điểm (+/-)</label>
                  <input 
                    type="number" required
                    placeholder="VD: 500 hoặc -200"
                    value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-base shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Lý do điều chỉnh</label>
                  <textarea 
                    required rows={3}
                    placeholder="VD: Thưởng lễ, Trừ điểm do huỷ đơn..."
                    value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none resize-none font-medium text-sm shadow-inner"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 py-4 px-4 bg-slate-100 text-slate-600 font-extrabold rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer">Hủy thao tác</button>
                <button type="submit" className="flex-1 py-4 px-4 bg-gradient-to-tr from-[#ea580c] to-[#EF5222] text-white font-extrabold rounded-2xl shadow-[0_8px_20px_rgba(234,88,12,0.3)] hover:shadow-[0_10px_25px_rgba(234,88,12,0.5)] transition-all cursor-pointer">Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL VOUCHER (WITH AI) --- */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white shrink-0">
              <h3 className="font-extrabold text-xl text-slate-800 tracking-tight">{editingVoucher ? 'Sửa Voucher' : 'Tạo Voucher Mới'}</h3>
              <button onClick={() => setShowVoucherModal(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-xl border border-slate-100 shadow-2xs cursor-pointer hover:bg-slate-50 transition-colors">
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-8 flex-1 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
              
              {/* KHU VỰC AI SUGGESTION */}
              {!editingVoucher && (
                <div className="mb-8 p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-[24px] border border-indigo-500/30 shadow-2xl relative overflow-hidden text-white">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Wand2 className="w-32 h-32" />
                  </div>
                  <h4 className="font-black text-amber-400 flex items-center gap-2.5 mb-4 text-lg relative z-10 tracking-tight">
                    <Wand2 className="w-5 h-5 animate-spin" />
                    <span>AI Tự Động Thiết Kế Chiến Dịch</span>
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                    <input 
                      type="text" placeholder="Chủ đề (VD: Lễ 2/9, Sinh nhật nhà xe)" 
                      value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                      className="flex-1 px-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-amber-400 outline-none text-sm text-white placeholder:text-slate-400 font-bold backdrop-blur-md"
                    />
                    <input 
                      type="text" placeholder="Mức giảm (VD: 20%, 50K)" 
                      value={aiDiscount} onChange={e => setAiDiscount(e.target.value)}
                      className="w-full sm:w-36 px-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-amber-400 outline-none text-sm text-white placeholder:text-slate-400 font-bold backdrop-blur-md"
                    />
                    <button 
                      type="button" 
                      onClick={handleAiSuggest} disabled={isAiLoading}
                      className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-[#ea580c] text-white font-extrabold rounded-2xl hover:from-amber-600 hover:to-[#ea580c] transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isAiLoading ? 'Đang suy luận...' : 'Tạo bằng AI'}
                    </button>
                  </div>
                </div>
              )}

              {/* FORM NHẬP THỦ CÔNG / AI ĐIỀN VÀO */}
              <form id="voucher-form" onSubmit={handleSaveVoucher} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Mã Code (In hoa liền không dấu)</label>
                    <input 
                      type="text" required placeholder="VD: SALE50"
                      value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-mono uppercase font-black text-base shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Giá trị quy đổi (Điểm)</label>
                    <input 
                      type="number" required placeholder="VD: 500"
                      value={formData.costInPoints} onChange={e => setFormData({...formData, costInPoints: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-black text-base text-orange-600 shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Tiêu đề (Hiển thị cho khách)</label>
                  <input 
                    type="text" required placeholder="VD: Giảm 50% vé khứ hồi"
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Loại giảm giá</label>
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, type: 'percent'})}
                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
                          formData.type === 'percent'
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md scale-[1.02]'
                            : 'text-slate-600 hover:text-slate-900 bg-transparent'
                        }`}
                      >
                        Phần trăm (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, type: 'fixed'})}
                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
                          formData.type === 'fixed'
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md scale-[1.02]'
                            : 'text-slate-600 hover:text-slate-900 bg-transparent'
                        }`}
                      >
                        Tiền mặt (VNĐ)
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Mức giảm</label>
                    <input 
                      type="number" required placeholder={formData.type === 'percent' ? "VD: 20" : "VD: 50000"}
                      value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Giảm tối đa (VNĐ)</label>
                    <input 
                      type="number" required placeholder="VD: 50000"
                      value={formData.maxAmount} onChange={e => setFormData({...formData, maxAmount: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm shadow-inner"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-8 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-4">
              <button type="button" onClick={() => setShowVoucherModal(false)} className="py-4 px-6 bg-white border border-slate-200 text-slate-600 font-extrabold rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer">Hủy thao tác</button>
              <button type="submit" form="voucher-form" className="py-4 px-8 bg-gradient-to-tr from-[#ea580c] to-[#EF5222] text-white font-extrabold rounded-2xl shadow-[0_8px_20px_rgba(234,88,12,0.3)] hover:shadow-[0_10px_25px_rgba(234,88,12,0.5)] transition-all cursor-pointer">Lưu Voucher</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}