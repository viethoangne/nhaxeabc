'use client';
import { API_BASE } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  TrendingUp, Users, Bus, Ticket, DollarSign, ArrowRight,
  MoreHorizontal, Clock, CheckCircle2, XCircle, RotateCcw,
  Loader2, Download, CalendarDays, Filter, TrendingDown, MapPin, Bot, Sparkles, 
  Gift // 🟢 THÊM ICON GIFT Ở ĐÂY
} from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} - ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'PAID': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest shadow-sm"><CheckCircle2 className="w-3 h-3" /> Đã thu tiền</span>;
    case 'PENDING': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-orange-200 bg-orange-50 text-[#ea580c] text-[10px] font-black uppercase tracking-widest shadow-sm"><Clock className="w-3 h-3" /> Chờ xử lý</span>;
    case 'FAILED':
    case 'CANCELLED': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-200 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest shadow-sm"><XCircle className="w-3 h-3" /> Đã huỷ</span>;
    case 'REFUNDED': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest shadow-sm"><RotateCcw className="w-3 h-3" /> Hoàn tiền</span>;
    default: return <span className="text-[10px] font-bold text-gray-500">{status}</span>;
  }
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterMode, setFilterMode] = useState<'preset' | 'custom'>('preset');
  const [timeRange, setTimeRange] = useState('7days'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(true);

  // Gọi API AI khi load trang
  useEffect(() => {
    if (userId) {
      setIsAiLoading(true);
      axios.get('${API_BASE}/admin/dashboard/ai-insights', { headers: { 'x-user-id': userId } })
        .then(res => setAiInsights(res.data))
        .catch(err => console.error(err))
        .finally(() => setIsAiLoading(false));
    }
  }, [userId]);

  const fetchDashboardData = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      let url = `${API_BASE}/admin/dashboard?timeRange=${timeRange}`;
      if (filterMode === 'custom' && startDate && endDate) {
        url = `${API_BASE}/admin/dashboard?startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await axios.get(url, { headers: { 'x-user-id': userId } });
      if (response.data.success) setData(response.data.data);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (filterMode === 'preset') fetchDashboardData();
  }, [timeRange, filterMode, userId]);

  const generateChartLabels = (dataLength: number, range: string) => {
    if (data?.chartLabels) return data.chartLabels; 
    const labels = [];
    for (let i = 0; i < dataLength; i++) {
      if (range === 'today' || range === 'yesterday') labels.push(`${i * 2}h`); 
      else if (range === '7days') labels.push(`Ngày ${i + 1}`); 
      else if (range === 'thisMonth') labels.push(`Tuần ${i + 1}`); 
      else labels.push(`Phiên ${i + 1}`);
    }
    return labels;
  };

  const chartDataArray = data?.chartData || [0, 0, 0, 0, 0, 0, 0];
  const chartLabels = generateChartLabels(chartDataArray.length, timeRange);
  const maxChartValue = Math.max(...chartDataArray, 1);
  const gridLines = [4, 3, 2, 1, 0];

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative min-h-screen pb-10">
      
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-slate-50/50 backdrop-blur-sm flex items-center justify-center rounded-[32px]">
          <div className="flex flex-col items-center gap-3">
             <div className="w-12 h-12 border-4 border-[#ea580c]/20 border-t-[#ea580c] rounded-full animate-spin"></div>
             <p className="text-sm font-bold text-slate-500 animate-pulse">Đang đồng bộ dữ liệu...</p>
          </div>
        </div>
      )}

      {/* HEADER & BỘ LỌC */}
      <div className="bg-white p-5 md:p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#ea580c]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-3 h-12 bg-gradient-to-b from-[#ea580c] to-orange-400 rounded-full shadow-inner"></div>
          <div>
            <h1 className="text-2xl md:text-[26px] font-black text-slate-800 tracking-tight">Trạm Điều Khiển</h1>
            <p className="text-[13px] font-medium text-slate-500 mt-0.5">Giám sát tổng quan hiệu suất kinh doanh</p>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-3 xl:justify-end">
          <div className="flex items-center bg-slate-100/80 p-1 rounded-[14px] border border-slate-200/60">
            <button onClick={() => setFilterMode('preset')} className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all duration-300 ${filterMode === 'preset' ? 'bg-white text-[#ea580c] shadow-[0_2px_10px_rgb(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-800'}`}>Kỳ báo cáo</button>
            <button onClick={() => setFilterMode('custom')} className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all duration-300 ${filterMode === 'custom' ? 'bg-white text-[#ea580c] shadow-[0_2px_10px_rgb(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-800'}`}>Tự chọn</button>
          </div>

          {filterMode === 'preset' ? (
            <div className="relative">
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 text-[13px] font-bold rounded-[14px] pl-4 pr-10 py-2.5 outline-none focus:border-[#ea580c] focus:ring-4 focus:ring-orange-50 cursor-pointer transition-all min-w-[150px] shadow-sm">
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="7days">7 ngày qua</option>
                <option value="thisMonth">Tháng này</option>
              </select>
              <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[14px] p-1 shadow-sm">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-[13px] font-bold text-slate-700 outline-none cursor-pointer pl-3 py-1.5" />
              <span className="text-slate-300 font-black">➔</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-[13px] font-bold text-slate-700 outline-none cursor-pointer pr-3 py-1.5" />
              <button 
                onClick={fetchDashboardData}
                disabled={!startDate || !endDate}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl text-[12px] font-bold hover:bg-slate-900 disabled:bg-slate-200 transition-colors"
              >
                Áp dụng
              </button>
            </div>
          )}

          <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

          <button onClick={() => alert('Đang xuất báo cáo Excel...')} className="bg-[#ea580c] hover:bg-[#d94e0a] text-white px-5 py-2.5 rounded-[14px] text-[13px] font-bold shadow-[0_4px_15px_rgba(234,88,12,0.25)] hover:shadow-[0_6px_20px_rgba(234,88,12,0.4)] transition-all flex items-center gap-2 active:scale-95">
            <Download className="w-4 h-4" /> Xuất Báo cáo
          </button>
        </div>
      </div>

      {/* 🟢 ĐÃ ĐỔI GRID THÀNH xl:grid-cols-5 ĐỂ CHỨA VỪA 5 THẺ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgb(234,88,12,0.08)] hover:border-orange-100 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={80} /></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Tổng Doanh thu</p>
              <h3 className="text-2xl font-black text-slate-800">{data ? formatCurrency(data.stats.revenue) : '0đ'}</h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center text-[#ea580c] shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <DollarSign className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 relative z-10">
             <div className={`flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg ${data?.stats.revenueGrowth >= 0 ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>
              {data?.stats.revenueGrowth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{data?.stats.revenueGrowth > 0 ? '+' : ''}{data?.stats.revenueGrowth || 0}%</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400">so với kỳ trước</span>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgb(59,130,246,0.08)] hover:border-blue-100 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Ticket size={80} /></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Vé đã chốt</p>
              <h3 className="text-2xl font-black text-slate-800">{data?.stats.ticketsSold || 0} <span className="text-sm font-bold text-slate-400">vé</span></h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
              <Ticket className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 relative z-10">
            <span className="text-[12px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">Đã thanh toán thành công</span>
          </div>
        </div>

        <div onClick={() => router.push('/admin/trips')} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgb(168,85,247,0.08)] hover:border-purple-100 transition-all duration-300 group relative overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Bus size={80} /></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Đang vận hành</p>
              <h3 className="text-2xl font-black text-slate-800">{data?.stats.activeTrips || 0} <span className="text-sm font-bold text-slate-400">chuyến</span></h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner group-hover:scale-110 group-hover:translate-x-1 transition-transform duration-300">
              <Bus className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 relative z-10 text-[12px] font-bold text-purple-600 hover:text-purple-700 transition-colors">
            Quản lý chuyến xe <ArrowRight size={14} />
          </div>
        </div>

        <div onClick={() => router.push('/admin/customers')} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgb(20,184,166,0.08)] hover:border-teal-100 transition-all duration-300 group relative overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={80} /></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Khách hàng mới</p>
              <h3 className="text-2xl font-black text-slate-800">{data?.stats.newCustomers || 0} <span className="text-sm font-bold text-slate-400">người</span></h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <Users className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 relative z-10 text-[12px] font-bold text-teal-600 hover:text-teal-700 transition-colors">
            Xem danh sách <ArrowRight size={14} />
          </div>
        </div>

        {/* 🟢 THÊM THẺ QUẢN LÝ ĐIỂM & QUÀ TẶNG VÀO ĐÂY */}
        <div onClick={() => router.push('/admin/loyalty')} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgb(234,179,8,0.08)] hover:border-yellow-100 transition-all duration-300 group relative overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Gift size={80} /></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">CT Loyalty</p>
              <h3 className="text-2xl font-black text-slate-800">{data?.stats.activeVouchers || 0} <span className="text-sm font-bold text-slate-400">Voucher</span></h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <Gift className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 relative z-10 text-[12px] font-bold text-yellow-600 hover:text-yellow-700 transition-colors">
            Quản lý kho quà <ArrowRight size={14} />
          </div>
        </div>

      </div>

      {/* =========================================================
          🤖 TRẠM CỐ VẤN AI (AI DIRECTOR) - ĐÃ SỬA VỊ TRÍ
          ========================================================= */}
      <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50/30 rounded-[24px] p-6 md:p-8 border border-orange-200 shadow-[0_8px_30px_rgb(239,82,34,0.06)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-[#EF5222]/20 to-transparent rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
        
        <div className="flex flex-col xl:flex-row gap-8 relative z-10">
          <div className="xl:w-[280px] shrink-0 border-r border-orange-100/50 pr-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#EF5222] to-[#D93814] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 relative">
                <Sparkles className="text-white absolute w-4 h-4 animate-pulse top-2 right-2 opacity-60" />
                <Bot size={26} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">AI Director</h3>
            </div>
            <p className="text-[13px] font-bold text-slate-500 leading-relaxed">
              Hệ thống tự động phân tích dữ liệu bán vé và đưa ra chiến lược tối ưu lợi nhuận cho nhà xe.
            </p>
            
            {!isAiLoading && aiInsights?.metrics && (
              <div className="mt-5 space-y-3">
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-black text-slate-400 uppercase">Chuyến ế (48h)</span>
                  <span className="text-sm font-black text-rose-500">{aiInsights.metrics.emptyTrips}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[11px] font-black text-slate-400 uppercase">Hủy vé (7 ngày)</span>
                  <span className="text-sm font-black text-amber-500">{aiInsights.metrics.cancelRate}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-5 shadow-inner">
            {isAiLoading ? (
              <div className="flex items-center gap-3 h-full text-[#EF5222] font-bold text-sm animate-pulse">
                <Loader2 className="animate-spin" size={20} />
                Hệ thống đang xử lý dữ liệu hàng triệu chuyến xe...
              </div>
            ) : (
              <div className="text-[14px] leading-loose text-slate-700 font-medium whitespace-pre-wrap">
                {aiInsights?.insightText}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* BIỂU ĐỒ DOANH THU */}
        <div className="lg:col-span-2 bg-white rounded-[24px] p-6 md:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-800">Biểu đồ doanh thu</h3>
              <p className="text-[13px] font-medium text-slate-400 mt-1">Trực quan hoá dòng tiền theo {filterMode === 'preset' ? 'kỳ báo cáo' : 'tuỳ chọn'}</p>
            </div>
            <button className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors border border-slate-100">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 relative mt-auto">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {gridLines.map((line, i) => {
                const lineValue = (maxChartValue / 4) * line;
                const formattedValue = lineValue >= 1000000 
                  ? `${(lineValue / 1000000).toFixed(1)}M` 
                  : lineValue >= 1000 
                    ? `${Math.round(lineValue / 1000)}K` 
                    : Math.round(lineValue);

                return (
                  <div key={i} className="w-full flex items-center gap-3">
                    <span className="w-10 text-right text-[10px] font-bold text-slate-300">
                      {formattedValue}
                    </span>
                    <div className="flex-1 border-b border-dashed border-slate-200"></div>
                  </div>
                )
              })}
            </div>

            <div className="absolute inset-0 left-14 flex items-end justify-between pt-2 pb-[1px] px-2 sm:px-6">
              {chartDataArray.map((val: number, i: number) => {
                const heightPercent = maxChartValue > 0 ? (val / maxChartValue) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 z-20 pointer-events-none flex flex-col items-center">
                       <div className="bg-slate-800 text-white text-[12px] font-black py-1.5 px-3 rounded-lg whitespace-nowrap shadow-xl">
                         {formatCurrency(val)}
                       </div>
                       <div className="w-2 h-2 bg-slate-800 rotate-45 -mt-1"></div>
                    </div>

                    <div className="w-[40%] sm:w-[60%] max-w-[40px] relative h-full flex items-end z-10">
                      <div 
                        className="w-full bg-gradient-to-t from-orange-200 to-[#ea580c] rounded-t-lg opacity-80 group-hover:opacity-100 group-hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] transition-all duration-500 ease-out cursor-pointer"
                        style={{ height: `${heightPercent}%`, minHeight: heightPercent > 0 ? '4px' : '0' }}
                      ></div>
                    </div>

                    <span className="absolute -bottom-6 text-[10px] sm:text-[11px] font-black text-slate-400 group-hover:text-[#ea580c] transition-colors whitespace-nowrap text-center">
                      {chartLabels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DANH SÁCH GIAO DỊCH MỚI */}
        <div className="bg-white rounded-[24px] p-0 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col h-full max-h-[450px] lg:max-h-none">
          <div className="p-6 md:p-8 border-b border-slate-50 bg-white sticky top-0 z-10 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-slate-800">Giao dịch mới</h3>
              <p className="text-[13px] font-medium text-slate-400 mt-1">Real-time cập nhật</p>
            </div>
            <button onClick={() => router.push('/admin/orders')} className="w-10 h-10 flex items-center justify-center bg-orange-50 hover:bg-[#ea580c] text-[#ea580c] hover:text-white rounded-xl transition-all duration-300 group shadow-sm">
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 p-2">
            {(!data?.recentOrders || data.recentOrders.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3 opacity-50"><Filter className="w-8 h-8" /></div>
                <span className="text-[13px] font-bold">Chưa có giao dịch nào</span>
              </div>
            ) : (
              data.recentOrders.map((order: any, idx: number) => (
                <div 
                  key={order.id} 
                  onClick={() => router.push(`/admin/orders`)}
                  className="bg-white m-2 p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="pr-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[12px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-orange-50 group-hover:text-[#ea580c] transition-colors">{order.id}</span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/> {formatTime(order.createdAt)}</span>
                    </div>
                    <p className="text-[13px] font-black text-slate-700 mb-1 truncate flex items-center gap-1.5"><Users size={12} className="text-slate-400"/> {order.customer}</p>
                    <p className="text-[11px] font-bold text-slate-500 truncate flex items-center gap-1.5"><MapPin size={12} className="text-[#ea580c]"/> {order.route}</p>
                  </div>
                  
                  <div className="text-right flex flex-col items-end shrink-0 gap-2">
                    <p className="text-[15px] font-black text-slate-800">{formatCurrency(order.amount)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}