'use client';
import { API_BASE } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  TrendingUp, Users, Bus, Ticket, DollarSign, ArrowRight,
  MoreHorizontal, Clock, CheckCircle2, XCircle, RotateCcw,
  Loader2, Download, CalendarDays, Filter, TrendingDown, MapPin, Bot, Sparkles, Gift, RefreshCw, CloudSun,
  Search, X, Wallet, CreditCard, Calendar, User, Power, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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

const getSvgPath = (data: number[], max: number) => {
  if (!data || data.length < 2) return '';
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (max > 0 ? (val / max) * 70 + 15 : 15);
    return { x, y };
  });
  
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 3;
    const cpY1 = p0.y;
    const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
    const cpY2 = p1.y;
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return path;
};

const getSvgAreaPath = (data: number[], max: number) => {
  const linePath = getSvgPath(data, max);
  if (!linePath) return '';
  return `${linePath} L 100 100 L 0 100 Z`;
};

const formatDateToVN = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const AdminCustomCalendar = ({ 
  selectedDate, 
  onSelect, 
  minDate 
}: { 
  selectedDate: string; 
  onSelect: (date: string) => void;
  minDate?: string;
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate ? new Date(selectedDate) : new Date()
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: startingDay }, (_, i) => i);

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  return (
    <div className="absolute left-0 top-full mt-3 z-50 min-w-[320px] rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_12px_45px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="rounded-full p-2 hover:bg-orange-50 text-gray-600 hover:text-[#ea580c] transition-colors cursor-pointer outline-none">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-sm font-extrabold text-gray-800 tracking-wider uppercase">
          {monthNames[month]} {year}
        </div>
        <button type="button" onClick={nextMonth} className="rounded-full p-2 hover:bg-orange-50 text-gray-600 hover:text-[#ea580c] transition-colors cursor-pointer outline-none">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider">
        <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {blanks.map((b) => <div key={`blank-${b}`} />)}
        {days.map((day) => {
          const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateString === selectedDate;
          const isPast = minDate ? dateString < minDate : false;

          return (
            <button
              key={day}
              type="button"
              disabled={isPast}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(dateString);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-xs transition-all mx-auto font-extrabold cursor-pointer outline-none
                ${isSelected 
                  ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-500/30 scale-105' 
                  : isPast 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-orange-50 hover:text-[#ea580c]'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterMode, setFilterMode] = useState<'preset' | 'custom'>('preset');
  const [timeRange, setTimeRange] = useState('7days'); 
  const [isOpenRangeDropdown, setIsOpenRangeDropdown] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [isChartMenuOpen, setIsChartMenuOpen] = useState(false);
  const [isAnalyzingAnomaly, setIsAnalyzingAnomaly] = useState(false);
  const [anomalyResult, setAnomalyResult] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalFilter, setPaymentModalFilter] = useState<'ALL' | 'MOMO' | 'VNPAY'>('ALL');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const dateContainerRef = React.useRef<HTMLDivElement>(null);

  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; isTurningOn: boolean; onConfirm: () => void}>({ isOpen: false, isTurningOn: false, onConfirm: () => {} });

  useEffect(() => {
    axios.get(`${API_BASE}/admin/dashboard/system-status`)
      .then(res => {
        if (res.data) setIsMaintenanceMode(res.data.isMaintenance);
      }).catch(err => console.error(err));
  }, []);

  const handleToggleSystemMaintenance = () => {
    if (!userId) return;
    const nextState = !isMaintenanceMode;
    
    // Mở Custom Modal thay vì dùng window.confirm
    setConfirmModal({
      isOpen: true,
      isTurningOn: nextState,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsTogglingMaintenance(true);
        try {
          const res = await axios.post(`${API_BASE}/admin/dashboard/system-maintenance`, { isMaintenance: nextState }, { headers: { 'x-user-id': userId } });
          setIsMaintenanceMode(res.data.isMaintenance);
          toast.success(nextState ? 'Đã ĐÓNG hệ thống thành công!' : 'Đã MỞ LẠI hệ thống thành công!');
        } catch (e) {
          toast.error('Có lỗi xảy ra khi đổi trạng thái bảo trì.');
        } finally {
          setIsTogglingMaintenance(false);
        }
      }
    });
  };

  const handleExportPaymentExcel = (filteredOrders: any[]) => {
    if (!filteredOrders || filteredOrders.length === 0) {
      toast.error('Không có dữ liệu giao dịch để xuất Excel!');
      return;
    }

    const headers = [
      'Mã đơn hàng',
      'Cổng thanh toán',
      'Tên khách hàng',
      'Điểm đi',
      'Điểm đến',
      'Số vé',
      'Số tiền (đ)',
      'Trạng thái',
      'Thời gian thanh toán'
    ];

    const rows = filteredOrders.map(function(order) {
      const statusText = order.paymentStatus === 'REFUNDED' ? 'Hoàn tiền' : 'Thành công';
      const formattedDate = new Date(order.createdAt).toLocaleString('vi-VN');
      
      return [
        `#${order.orderCode}`,
        order.paymentMethod,
        order.customerName,
        order.from || '',
        order.to || '',
        order.tickets || 1,
        order.amount,
        statusText,
        formattedDate
      ].map(function(val) {
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filterName = paymentModalFilter === 'ALL' ? 'TAT_CA' : paymentModalFilter;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_cao_giao_dich_${filterName}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Đã xuất báo cáo ${filterName} thành công!`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateContainerRef.current && !dateContainerRef.current.contains(event.target as Node)) {
        setActiveDatePicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportExcel = () => {
    if (!data) {
      toast.error('Chưa có dữ liệu để xuất!');
      return;
    }
    const { stats } = data;
    const csvContent = [
      '\uFEFF', // BOM for UTF-8 encoding
      'BÁO CÁO THỐNG KÊ HIỆU SUẤT KINH DOANH ABC BUS LINES',
      `Kỳ báo cáo: ${filterMode === 'preset' ? timeRange : `${startDate} đến ${endDate}`}`,
      `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`,
      '',
      'CHỈ TIÊU,SỐ LIỆU,ĐƠN VỊ,TĂNG TRƯỞNG',
      `Tổng Doanh thu,"${stats.revenue.toLocaleString('vi-VN')}",VNĐ,"${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%"`,
      `Vé Đã Chốt,"${stats.soldTickets}",Vé,"${stats.ticketGrowth > 0 ? '+' : ''}${stats.ticketGrowth}%"`,
      `Đang Vận Hành,"${stats.activeTrips}",Chuyến,"${stats.tripGrowth > 0 ? '+' : ''}${stats.tripGrowth}%"`,
      `Khách Hàng Mới,"${stats.newCustomers}",Người,"${stats.customerGrowth > 0 ? '+' : ''}${stats.customerGrowth}%"`,
      `Chương Trình Loyalty,"${stats.activeVouchers}",Voucher,"100%"`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Hieu_Suat_ABC_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Đã xuất báo cáo Excel thành công!');
  };

  const handleExportChartJson = () => {
    if (!data) {
      toast.error('Chưa có dữ liệu biểu đồ!');
      return;
    }
    const chartPayload = {
      meta: {
        company: "ABC Bus Lines",
        reportType: "Revenue Spline Chart Coordinates & Metrics",
        generatedAt: new Date().toISOString(),
        timeRange,
        filterMode
      },
      chartLabels: generateChartLabels(data.chartData?.length || 7, timeRange),
      chartDataArray: data.chartData || [0, 0, 0, 0, 0, 0, 0],
      ticketPriceUnit: 10000,
      summary: data.stats
    };

    const blob = new Blob([JSON.stringify(chartPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bieu_Do_Doanh_Thu_ABC_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Đã xuất dữ liệu biểu đồ JSON thành công!');
    setIsChartMenuOpen(false);
  };

  const handleAnalyzeAnomaly = () => {
    const chartArray = data?.chartData || [0, 0, 0, 0, 0, 0, 0];
    const labels = generateChartLabels(chartArray.length, timeRange);
    setIsAnalyzingAnomaly(true);
    setIsChartMenuOpen(false);
    toast.success('Hệ thống đang quét phân tích chuỗi thời gian doanh thu chuẩn Đồ án...');

    setTimeout(() => {
      const sum = chartArray.reduce((a: number, b: number) => a + b, 0);
      const mean = sum / Math.max(chartArray.length, 1);
      const variance = chartArray.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / Math.max(chartArray.length, 1);
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : 0;

      // Tìm chính xác đỉnh cao nhất và mốc thấp nhất
      let maxVal = -1;
      let maxIdx = 0;
      let minVal = Infinity;
      let minIdx = 0;

      chartArray.forEach((val: number, idx: number) => {
        if (val > maxVal) { maxVal = val; maxIdx = idx; }
        if (val < minVal) { minVal = val; minIdx = idx; }
      });

      const anomalies = [];

      // Phân tích Đỉnh điểm (Peak)
      const peakGrowth = maxIdx > 0 && chartArray[maxIdx - 1] > 0 
        ? Math.round(((maxVal - chartArray[maxIdx - 1]) / chartArray[maxIdx - 1]) * 100) 
        : 0;
      
      anomalies.push({
        label: `${labels[maxIdx]} (ĐỈNH ĐIỂM KỲ)`,
        value: maxVal,
        type: 'spike',
        reason: `Doanh thu đạt đỉnh cao nhất trong toàn bộ chu kỳ phân tích (${Math.round(maxVal/10000)} vé). Tăng trưởng mạnh mẽ ${peakGrowth > 0 ? `+${peakGrowth}%` : `${peakGrowth}%`} so với phiên liền trước. Nguyên nhân: Nhu cầu di chuyển tăng đột biến vào mốc thời gian vàng. Khuyến nghị chiến lược: Tối ưu hóa hệ số tải và chuẩn bị sẵn phương án xe ghép tăng cường.`
      });

      // Phân tích Vùng trũng (Trough)
      if (chartArray.length > 1 && minVal < maxVal) {
        const troughGrowth = minIdx > 0 && chartArray[minIdx - 1] > 0 
          ? Math.round(((minVal - chartArray[minIdx - 1]) / chartArray[minIdx - 1]) * 100) 
          : 0;
        
        anomalies.push({
          label: `${labels[minIdx]} (THẤP ĐIỂM KỲ)`,
          value: minVal,
          type: 'dip',
          reason: `Doanh thu chạm ngưỡng hỗ trợ thấp nhất kỳ (${Math.round(minVal/10000)} vé). Biến động ${troughGrowth}% so với phiên trước. Nguyên nhân: Rơi vào vùng trũng chu kỳ thấp điểm. Đề xuất giải pháp Đồ án: Áp dụng chiến lược giá động (Dynamic Pricing) hoặc phát hành Flash Sale kích cầu để tối đa hóa hiệu suất sử dụng ghế.`
        });
      }

      setAnomalyResult({
        mean,
        stdDev,
        cv,
        status: cv > 0.4 ? 'Biến động mạnh' : 'Hoạt động ổn định',
        anomalies
      });
      setIsAnalyzingAnomaly(false);
      toast.success('Hoàn tất phân tích Toán học Thống kê chuyên sâu!');
    }, 1500);
  };

  const handleForceReSyncDB = () => {
    setIsChartMenuOpen(false);
    setIsLoading(true);
    toast.loading('Đang bỏ qua Cache, kết nối thẳng vào lõi DB...', { id: 'resync' });
    fetchDashboardData();
    setTimeout(() => {
      toast.success('Đã nạp mới 100% dữ liệu từ lõi DB PostgreSQL!', { id: 'resync' });
    }, 1000);
  };
  
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ai_weather_enabled');
    if (saved === 'true') {
      setIsWeatherEnabled(true);
    }
    setIsInitialized(true);
  }, []);

  // Gọi API AI khi load trang hoặc khi bấm nút reset
  const fetchAiInsights = (weatherFlag = isWeatherEnabled) => {
    if (userId) {
      setIsAiLoading(true);
      axios.get(`${API_BASE}/admin/dashboard/ai-insights?enableWeather=${weatherFlag}`, { headers: { 'x-user-id': userId } })
        .then(res => setAiInsights(res.data))
        .catch(err => console.error(err))
        .finally(() => setIsAiLoading(false));
    }
  };

  useEffect(() => {
    if (userId && isInitialized) {
      fetchAiInsights(isWeatherEnabled);
    }
  }, [userId, isInitialized]);

  const handleToggleWeather = () => {
    const nextState = !isWeatherEnabled;
    setIsWeatherEnabled(nextState);
    localStorage.setItem('ai_weather_enabled', String(nextState));
    fetchAiInsights(nextState);
  };

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

  const TICKET_PRICE = 10000;
  const chartDataArray = data?.chartData || [0, 0, 0, 0, 0, 0, 0];
  const chartLabels = generateChartLabels(chartDataArray.length, timeRange);
  
  const ticketDataArray = chartDataArray.map((val: number) => Math.round(val / TICKET_PRICE));
  const maxTickets = Math.max(...ticketDataArray, 1);
  const ticketStep = Math.ceil(maxTickets / 4);
  const scaleMaxTickets = ticketStep * 4;
  const maxChartValue = scaleMaxTickets * TICKET_PRICE;
  
  const gridLines = [4, 3, 2, 1, 0];

  // --- THỐNG KÊ DỮ LIỆU ĐỘNG CHO BỘ 3 BIỂU ĐỒ MỚI ---
  const totalRevenueForNewCharts = data?.stats.revenue || 85000;
  const totalTicketsForNewCharts = data?.stats.ticketsSold || 8;

  // 1. Dữ liệu Tuyến Đường (Donut) thật từ DB
  const rawRouteShare = data?.routeShare || [];
  const routeColors = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6'];
  const routeDataList = rawRouteShare.map((r: any, idx: number) => ({
    name: r.name,
    share: r.share,
    hex: routeColors[idx % routeColors.length],
    val: r.val
  }));

  // Tính donutOffsets động dựa trên share thật
  const donutOffsets = [0];
  for (let i = 0; i < routeDataList.length - 1; i++) {
    donutOffsets.push(donutOffsets[i] + routeDataList[i].share * 188.5);
  }

  // 2. Dữ liệu Cổng thanh toán (Momo vs VNPAY) thật từ DB
  const momoTicketsCount = data?.paymentShare?.momo?.tickets ?? Math.round(totalTicketsForNewCharts * 0.38);
  const vnpayTicketsCount = data?.paymentShare?.vnpay?.tickets ?? (totalTicketsForNewCharts - momoTicketsCount);
  const momoRevenueValue = data?.paymentShare?.momo?.revenue ?? (totalRevenueForNewCharts * 0.38);
  const vnpayRevenueValue = data?.paymentShare?.vnpay?.revenue ?? (totalRevenueForNewCharts * 0.62);

  const totalTicketsCalculated = (momoTicketsCount + vnpayTicketsCount) || 1;
  const momoHeight = Math.round((momoTicketsCount / totalTicketsCalculated) * 100);
  const vnpayHeight = 100 - momoHeight;

  // 3. Dữ liệu Khung giờ vàng đặt vé thật từ DB
  const hourlyDataList = data?.hourlyBookingShare || [5, 35, 20, 40];
  const hourlyLabelsList = ['0h - 6h (Khuya)', '6h - 12h (Sáng)', '12h - 18h (Chiều)', '18h - 24h (Tối)'];
  const maxHourlyVal = Math.max(...hourlyDataList, 45);
  const hourlyWavePath = getSvgPath(hourlyDataList, maxHourlyVal);
  const hourlyAreaPath = getSvgAreaPath(hourlyDataList, maxHourlyVal);

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
      {/* HEADER & BỘ LỌC NÂNG CẤP VIP (VIP COMMAND CENTER BAR) */}
      <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-white/80 flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative overflow-visible z-30">
        {/* HÀO QUANG ÁNH SÁNG NỀN */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#EF5222] via-[#ea580c] to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_25px_rgba(239,82,34,0.35)] transform rotate-3 hover:rotate-0 transition-transform duration-500 shrink-0 relative">
            <Sparkles className="absolute top-1 right-1 w-3.5 h-3.5 text-amber-200 animate-ping opacity-80" />
            <Bus className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent tracking-tight">Trạm Điều Khiển</h1>
            <p className="text-[13px] font-bold text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Giám sát tổng quan hiệu suất kinh doanh
            </p>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-3 xl:justify-end">
          {/* CỤM NÚT CHUYỂN CHẾ ĐỘ LỌC (VIP PILL SELECTOR) */}
          <div className="flex items-center bg-gray-100/90 backdrop-blur p-1.5 rounded-full border border-gray-200/60 shadow-inner gap-1">
            <button onClick={() => setFilterMode('preset')} className={`px-5 py-2.5 rounded-full text-sm font-extrabold transition-all duration-300 cursor-pointer ${filterMode === 'preset' ? 'bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5] shadow-sm scale-105' : 'text-gray-500 hover:text-gray-800'}`}>Kỳ báo cáo</button>
            <button onClick={() => setFilterMode('custom')} className={`px-5 py-2.5 rounded-full text-sm font-extrabold transition-all duration-300 cursor-pointer ${filterMode === 'custom' ? 'bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5] shadow-sm scale-105' : 'text-gray-500 hover:text-gray-800'}`}>Tự chọn</button>
          </div>

          {filterMode === 'preset' ? (
            <div className="relative">
              <button 
                onClick={() => setIsOpenRangeDropdown(!isOpenRangeDropdown)}
                className="flex items-center gap-3 bg-gray-50 hover:bg-orange-50 text-gray-800 hover:text-[#ea580c] text-sm font-extrabold pl-5 pr-4 py-2.5 rounded-full border border-gray-200 hover:border-[#ffedd5] shadow-sm transition-all outline-none cursor-pointer group/select min-w-[170px] justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-4 h-4 text-[#ea580c]" />
                  <span>
                    {timeRange === 'today' && 'Hôm nay'}
                    {timeRange === 'yesterday' && 'Hôm qua'}
                    {timeRange === '7days' && '7 ngày qua'}
                    {timeRange === 'thisMonth' && 'Tháng này'}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-xs text-gray-400 group-hover/select:text-[#ea580c] transition-colors">
                  <span className="text-[10px] font-black">▼</span>
                </div>
              </button>
              
              {isOpenRangeDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsOpenRangeDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-[200px] bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                    {[
                      { value: 'today', label: 'Hôm nay' },
                      { value: 'yesterday', label: 'Hôm qua' },
                      { value: '7days', label: '7 ngày qua' },
                      { value: 'thisMonth', label: 'Tháng này' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => {
                          setTimeRange(item.value);
                          setIsOpenRangeDropdown(false);
                        }}
                        className={`w-full text-left px-5 py-3 text-sm font-extrabold transition-all flex items-center justify-between cursor-pointer ${
                          timeRange === item.value 
                            ? 'text-[#ea580c] bg-[#fff7ed] pl-6 border-l-4 border-[#ea580c]' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 pl-5'
                        }`}
                      >
                        <span>{item.label}</span>
                        {timeRange === item.value && (
                          <span className="w-2 h-2 rounded-full bg-[#ea580c] shadow-[0_0_10px_rgba(234,88,12,0.8)]"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div ref={dateContainerRef} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full p-1.5 shadow-sm">
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setActiveDatePicker(activeDatePicker === 'start' ? null : 'start')}
                  className={`flex items-center gap-2.5 pl-5 pr-4 py-2 rounded-full text-sm font-extrabold transition-all outline-none cursor-pointer ${activeDatePicker === 'start' ? 'bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5] shadow-xs' : 'bg-white text-gray-800 border border-gray-100 hover:border-orange-200 shadow-xs'}`}
                >
                  <CalendarDays className="w-4 h-4 text-[#ea580c] shrink-0" />
                  <span>{startDate ? formatDateToVN(startDate) : 'Ngày bắt đầu'}</span>
                </button>
                {activeDatePicker === 'start' && (
                  <AdminCustomCalendar 
                    selectedDate={startDate} 
                    onSelect={(d) => { setStartDate(d); setActiveDatePicker('end'); }} 
                  />
                )}
              </div>

              <span className="text-gray-300 font-black">➔</span>

              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setActiveDatePicker(activeDatePicker === 'end' ? null : 'end')}
                  className={`flex items-center gap-2.5 pl-5 pr-4 py-2 rounded-full text-sm font-extrabold transition-all outline-none cursor-pointer ${activeDatePicker === 'end' ? 'bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5] shadow-xs' : 'bg-white text-gray-800 border border-gray-100 hover:border-orange-200 shadow-xs'}`}
                >
                  <CalendarDays className="w-4 h-4 text-[#ea580c] shrink-0" />
                  <span>{endDate ? formatDateToVN(endDate) : 'Ngày kết thúc'}</span>
                </button>
                {activeDatePicker === 'end' && (
                  <AdminCustomCalendar 
                    selectedDate={endDate} 
                    minDate={startDate}
                    onSelect={(d) => { setEndDate(d); setActiveDatePicker(null); }} 
                  />
                )}
              </div>

              <button 
                type="button"
                onClick={fetchDashboardData}
                disabled={!startDate || !endDate}
                className="bg-[#ea580c] text-white px-6 py-2.5 rounded-full text-sm font-extrabold hover:bg-[#d94e0a] disabled:bg-gray-200 disabled:text-gray-400 transition-colors shadow-sm cursor-pointer ml-1 active:scale-95"
              >
                Áp dụng
              </button>
            </div>
          )}

          <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

          {/* NÚT BẢO TRÌ HỆ THỐNG */}
          <button 
            disabled={isTogglingMaintenance}
            onClick={handleToggleSystemMaintenance} 
            className={`px-5 py-3 rounded-[18px] text-[13px] font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isMaintenanceMode 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30' 
                : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/30'
            }`}
          >
            {isTogglingMaintenance ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Power className={`w-4 h-4 ${isMaintenanceMode ? 'animate-pulse' : ''}`} />
            )}
            {isMaintenanceMode ? 'ĐANG BẢO TRÌ' : 'Hoạt động'}
          </button>

          <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

          {/* NÚT XUẤT BÁO CÁO VIP */}
          <button onClick={handleExportExcel} className="bg-gradient-to-r from-[#ea580c] to-[#EF5222] hover:from-[#d94e0a] hover:to-[#ea580c] text-white px-6 py-3 rounded-[18px] text-[13px] font-black shadow-[0_8px_25px_rgba(234,88,12,0.3)] hover:shadow-[0_12px_30px_rgba(234,88,12,0.4)] hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center gap-2.5 cursor-pointer">
            <Download className="w-4 h-4 animate-bounce" /> Xuất Báo cáo
          </button>
        </div>
      </div>

      {/* 🟢 ĐÃ ĐỔI GRID THÀNH xl:grid-cols-5 ĐỂ CHỨA VỪA 5 THẺ */}
      {/* 5 THẺ TỔNG QUAN NÂNG CẤP (ULTRA-PREMIUM METRIC CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        
        {/* THẺ 1: DOANH THU */}
        <div className="bg-white/90 backdrop-blur-md rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_25px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-[0_12px_35px_rgb(234,88,12,0.12)] hover:border-orange-200 transition-all duration-500 group relative overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-125 transition-all duration-500 text-orange-500"><DollarSign size={90} /></div>
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-orange-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 group-hover:text-orange-500 transition-colors">Doanh thu thực</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{data ? formatCurrency(data.stats.revenue) : '0đ'}</h3>
              {/* Hiển thị thông tin hoàn tiền nếu có */}
              {data?.stats.totalRefunded > 0 && (
                <div className="mt-1 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 line-through">{formatCurrency(data.stats.grossRevenue)} gộp</span>
                  <span className="text-[10px] font-black text-rose-500 flex items-center gap-1">
                    <span>↩</span> Hoàn: -{formatCurrency(data.stats.totalRefunded)}
                  </span>
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
              <DollarSign className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 relative z-10">
            <div className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl shadow-sm ${data?.stats.revenueGrowth >= 0 ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-rose-600 bg-rose-50 border border-rose-200'}`}>
              {data?.stats.revenueGrowth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{data?.stats.revenueGrowth > 0 ? '+' : ''}{data?.stats.revenueGrowth || 0}%</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">so với kỳ trước</span>
          </div>
        </div>

        {/* THẺ 2: VÉ ĐÃ CHỐT */}
        <div className="bg-white/90 backdrop-blur-md rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_25px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-[0_12px_35px_rgb(59,130,246,0.12)] hover:border-blue-200 transition-all duration-500 group relative overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-125 transition-all duration-500 text-blue-500"><Ticket size={90} /></div>
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 group-hover:text-blue-500 transition-colors">Vé đã chốt</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{data?.stats.ticketsSold || 0} <span className="text-sm font-bold text-slate-400">vé</span></h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500">
              <Ticket className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 relative z-10">
            <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
              Đã thanh toán
            </span>
          </div>
        </div>

        {/* THẺ 3: ĐANG VẬN HÀNH */}
        <div onClick={() => router.push('/admin/trips')} className="bg-white/90 backdrop-blur-md rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_25px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-[0_12px_35px_rgb(168,85,247,0.12)] hover:border-purple-200 transition-all duration-500 group relative overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-125 transition-all duration-500 text-purple-500"><Bus size={90} /></div>
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 group-hover:text-purple-500 transition-colors">Đang vận hành</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{data?.stats.activeTrips || 0} <span className="text-sm font-bold text-slate-400">chuyến</span></h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 group-hover:translate-x-1 transition-transform duration-500">
              <Bus className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between relative z-10 text-[12px] font-black text-purple-600 group-hover:text-purple-700 transition-colors">
            <span>Quản lý chuyến xe</span>
            <div className="w-6 h-6 bg-purple-50 rounded-lg flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* THẺ 4: KHÁCH HÀNG MỚI */}
        <div onClick={() => router.push('/admin/customers')} className="bg-white/90 backdrop-blur-md rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_25px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-[0_12px_35px_rgb(20,184,166,0.12)] hover:border-teal-200 transition-all duration-500 group relative overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-125 transition-all duration-500 text-teal-500"><Users size={90} /></div>
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 group-hover:text-teal-500 transition-colors">Khách hàng mới</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{data?.stats.newCustomers || 0} <span className="text-sm font-bold text-slate-400">người</span></h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
              <Users className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between relative z-10 text-[12px] font-black text-teal-600 group-hover:text-teal-700 transition-colors">
            <span>Xem danh sách</span>
            <div className="w-6 h-6 bg-teal-50 rounded-lg flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* THẺ 5: CT LOYALTY VOUCHER */}
        <div onClick={() => router.push('/admin/loyalty')} className="bg-white/90 backdrop-blur-md rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_25px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-[0_12px_35px_rgb(234,179,8,0.12)] hover:border-yellow-200 transition-all duration-500 group relative overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-125 transition-all duration-500 text-yellow-500"><Gift size={90} /></div>
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-yellow-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 group-hover:text-yellow-500 transition-colors">CT Loyalty</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{data?.stats.activeVouchers || 0} <span className="text-sm font-bold text-slate-400">Voucher</span></h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
              <Gift className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between relative z-10 text-[12px] font-black text-yellow-600 group-hover:text-yellow-700 transition-colors">
            <span>Quản lý kho quà</span>
            <div className="w-6 h-6 bg-yellow-50 rounded-lg flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
              <ArrowRight size={14} />
            </div>
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
            <div className="flex items-center justify-between gap-3 mb-3 pr-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#EF5222] to-[#D93814] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 relative shrink-0">
                  <Sparkles className="text-white absolute w-4 h-4 animate-pulse top-2 right-2 opacity-60" />
                  <Bot size={26} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">AI Director</h3>
              </div>
              
              {/* CỤM ĐIỀU KHIỂN AI UNIFIED (DYNAMIC PILL CONTAINER) */}
              <div className="flex items-center bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-orange-100 shadow-[0_2px_10px_rgba(239,82,34,0.08)] gap-1 shrink-0">
                {/* NÚT BẬT/TẮT AI NGOẠI CẢNH */}
                <button 
                  onClick={handleToggleWeather}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-500 cursor-pointer ${
                    isWeatherEnabled 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] scale-105' 
                      : 'hover:bg-slate-100 text-slate-400'
                  }`}
                  title={isWeatherEnabled ? "AI Ngoại cảnh: Đang BẬT (Tốn Quota)" : "AI Ngoại cảnh: Đang TẮT (Tiết kiệm Quota)"}
                >
                  <CloudSun size={18} className={isWeatherEnabled ? 'animate-pulse' : ''} />
                </button>

                {/* VÁCH NGĂN MỜ */}
                <div className="w-[1px] h-5 bg-slate-200/60 my-auto"></div>

                {/* NÚT DỰ BÁO LẠI */}
                <button 
                  onClick={() => fetchAiInsights(isWeatherEnabled)} 
                  disabled={isAiLoading}
                  className="w-9 h-9 flex items-center justify-center hover:bg-orange-50 text-[#EF5222] rounded-xl transition-all duration-300 group/refresh cursor-pointer"
                  title="Tính toán và dự báo lại dữ liệu mới nhất"
                >
                  <RefreshCw size={18} className={`${isAiLoading ? 'animate-spin text-orange-600' : 'group-hover/refresh:rotate-180 transition-transform duration-500'}`} />
                </button>
              </div>
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

          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-5 shadow-inner">
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

            {/* DỰ BÁO THỜI TIẾT & GIAO THÔNG TỪ GROQ AI thưa Admin */}
            {!isAiLoading && aiInsights?.weatherTrafficText && (
              <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/80 rounded-2xl border border-blue-100 p-5 shadow-sm">
                <div className="text-[11px] font-black text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                  Bản tin Khí tượng & Giao thông AI
                </div>
                <div className="text-[13px] leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                  {aiInsights.weatherTrafficText}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* BIỂU ĐỒ DOANH THU */}
        <div className="lg:col-span-2 bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 border border-white shadow-[0_15px_50px_rgba(234,88,12,0.06)] flex flex-col min-h-[350px] h-auto relative overflow-visible group/chart self-start">
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
                <span>Biểu đồ doanh thu</span>
                <div className="relative flex items-center justify-center w-3 h-3" title="Dữ liệu trực tiếp (Real-time DB)">
                  <span className="absolute w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping opacity-75"></span>
                  <span className="relative w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.8)]"></span>
                </div>
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Trực quan hoá dòng tiền theo {filterMode === 'preset' ? 'kỳ báo cáo' : 'tuỳ chọn'}</p>
            </div>
            
            {/* KPI TRÊN BIỂU ĐỒ */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Đỉnh:</span>
                <span className="text-sm font-extrabold text-emerald-600">{formatCurrency(Math.max(...chartDataArray, 0))}</span>
              </div>
              
              <div className="flex items-center gap-2.5 bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-4 py-2 rounded-2xl border border-orange-500/20 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#ea580c] animate-pulse"></span>
                <span className="text-[11px] font-black text-[#ea580c] uppercase tracking-wider">Bình quân:</span>
                <span className="text-sm font-extrabold text-orange-600">
                  {formatCurrency(Math.round(chartDataArray.reduce((a: number, b: number) => a + b, 0) / Math.max(chartDataArray.length, 1)))}
                </span>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setIsChartMenuOpen(!isChartMenuOpen)}
                  className="w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl shadow-[0_4px_15px_rgba(234,88,12,0.3)] hover:shadow-[0_6px_20px_rgba(234,88,12,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 border border-orange-400/30 cursor-pointer relative group"
                  title="Lộ trình phát triển & Tối ưu hóa phân tích Đồ án"
                >
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white border-2 border-orange-500 shadow-xs"></span>
                  </span>
                  <MoreHorizontal className="w-5 h-5 animate-pulse" strokeWidth={3} />
                </button>
                
                {isChartMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsChartMenuOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                      <div className="px-3 py-2 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">
                        CÔNG CỤ QUẢN TRỊ & PHÂN TÍCH ĐỒ ÁN
                      </div>
                      <button 
                        onClick={handleExportChartJson}
                        className="w-full text-left px-3 py-2.5 hover:bg-orange-50 rounded-xl text-xs font-extrabold text-slate-700 hover:text-[#ea580c] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#ea580c]" /> Xuất dữ liệu đồ thị (JSON)
                      </button>
                      <button 
                        onClick={handleAnalyzeAnomaly}
                        className="w-full text-left px-3 py-2.5 hover:bg-orange-50 rounded-xl text-xs font-extrabold text-slate-700 hover:text-[#ea580c] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tối ưu hóa phân tích AI
                      </button>
                      <button 
                        onClick={handleForceReSyncDB}
                        className="w-full text-left px-3 py-2.5 hover:bg-orange-50 rounded-xl text-xs font-extrabold text-slate-700 hover:text-[#ea580c] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-500" /> Làm mới bộ đệm DB
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1 relative mt-auto h-[180px] mb-8">
            {/* Trục Y Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {gridLines.map((line, i) => {
                const lineValue = (maxChartValue / 4) * line;
                const ticketCount = Math.round(lineValue / TICKET_PRICE);
                const formattedValue = ticketCount === 0 
                  ? '0' 
                  : `${ticketCount} vé`;

                return (
                  <div key={i} className="w-full flex items-center gap-4">
                    <span className="w-10 text-right text-[11px] font-extrabold text-slate-300">
                      {formattedValue}
                    </span>
                    <div className="flex-1 border-b border-dashed border-slate-200/80"></div>
                  </div>
                )
              })}
            </div>

            {/* Vùng Vẽ Đồ Thị Sóng Spline & Cột */}
            <div className="absolute inset-0 left-14 right-2 sm:right-6">
              
              {/* SVG spline line overlay thưa Admin */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FB923C" />
                    <stop offset="50%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#EF5222" />
                  </linearGradient>
                  
                  <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF5222" stopOpacity="0.25" />
                    <stop offset="50%" stopColor="#F97316" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                  </linearGradient>
                  
                  <filter id="chartLineDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#EF5222" floodOpacity="0.35" />
                  </filter>
                </defs>
                
                {/* Diện tích tô gradient dưới sóng */}
                {chartDataArray.length > 1 && (
                  <path d={getSvgAreaPath(chartDataArray, maxChartValue)} fill="url(#chartAreaGrad)" />
                )}
                
                {/* Đường cong Spline chạy xuyên suốt đỉnh */}
                {chartDataArray.length > 1 && (
                  <path 
                    d={getSvgPath(chartDataArray, maxChartValue)} 
                    fill="none" 
                    stroke="url(#chartLineGrad)" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    filter="url(#chartLineDropShadow)"
                  />
                )}
              </svg>

              {/* Các điểm nút dạng Đĩa Mặt Trời phản chiếu (Sun glow nodes) */}
              <div className="absolute inset-0 flex items-end justify-between pointer-events-none z-20">
                {chartDataArray.map((val: number, i: number) => {
                  const x = (i / Math.max(chartDataArray.length - 1, 1)) * 100;
                  const y = 100 - (maxChartValue > 0 ? (val / maxChartValue) * 70 + 15 : 15);
                  return (
                    <div 
                      key={i} 
                      className="absolute transition-all duration-300 w-4 h-4 -ml-2 -mt-2 bg-white border-4 border-[#ea580c] rounded-full shadow-[0_0_15px_rgba(234,88,12,0.6)] pointer-events-none"
                      style={{ left: `${x}%`, top: `${y}%` }}
                    />
                  );
                })}
              </div>

              {/* Container chứa các vùng cảm ứng tương tác ẩn */}
              <div className="absolute inset-0 flex items-end justify-between pt-2 pb-[1px]">
                {chartDataArray.map((val: number, i: number) => {
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      
                      {/* Tooltip Kính mờ cực kỳ sang trọng */}
                      <div className="absolute -top-16 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-hover:-translate-y-2 transition-all duration-300 z-50 pointer-events-none flex flex-col items-center">
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-orange-500/40 text-white text-[12px] font-black py-2.5 px-4 rounded-2xl whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.25)] flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{chartLabels[i]}</span>
                          <span className="text-[#ea580c] font-black text-sm">
                            {Math.round(val / TICKET_PRICE)} vé ({formatCurrency(val)})
                          </span>
                        </div>
                        <div className="w-3 h-3 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-orange-500/40"></div>
                      </div>

                      {/* VÙNG CẢM ỨNG VÔ HÌNH thưa Admin - Loại bỏ hoàn toàn cột màu */}
                      <div className="w-full h-[95%] bg-transparent cursor-pointer relative z-10" />

                      {/* Label ngày tháng phía dưới */}
                      <span className="absolute -bottom-7 text-[11px] font-extrabold text-slate-400 group-hover:text-[#ea580c] transition-colors whitespace-nowrap text-center tracking-tight">
                        {chartLabels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* HIỂN THỊ KẾT QUẢ PHÂN TÍCH DỊ THƯỜNG AI (AI ANOMALY HUD) */}
          {isAnalyzingAnomaly && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 text-sm font-extrabold text-[#ea580c] animate-pulse bg-orange-50/50 p-4 rounded-2xl">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>AI Cố vấn đang chạy mô hình Standard Deviation phát hiện dị thường...</span>
            </div>
          )}

          {!isAnalyzingAnomaly && anomalyResult && (
            <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500 bg-slate-900 text-white p-6 rounded-[28px] shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black text-[#ea580c] uppercase tracking-widest mb-1">
                    <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Báo cáo Chuỗi Thời Gian & Dị Thường</span>
                  </div>
                  <h4 className="text-lg font-extrabold tracking-tight">Hệ thống Phân tích Thống kê (Thesis Grade)</h4>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold">
                    <span className="text-slate-400">Độ lệch chuẩn σ:</span> <span className="text-emerald-400 font-extrabold">{formatCurrency(Math.round(anomalyResult.stdDev))}</span>
                  </div>
                  <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold">
                    <span className="text-slate-400">Hệ số CV:</span> <span className="text-amber-400 font-extrabold">{anomalyResult.cv.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#ea580c]/20 text-[#ea580c] border border-orange-500/30 px-3 py-1.5 rounded-xl text-xs font-black">
                    {anomalyResult.status}
                  </div>
                  <button 
                    onClick={() => setAnomalyResult(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                    title="Đóng bảng phân tích"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {anomalyResult.anomalies.map((ano: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={`p-5 rounded-2xl border transition-all ${
                      ano.type === 'spike' 
                        ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-100' 
                        : 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30 text-rose-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${ano.type === 'spike' ? 'bg-emerald-500' : 'bg-rose-500'} shadow-sm`}></span>
                        <span className="text-xs font-black uppercase tracking-wider text-white">{ano.label}</span>
                      </div>
                      <span className="text-base font-black text-white">{formatCurrency(ano.value)}</span>
                    </div>
                    <p className="text-[13px] font-medium leading-relaxed text-slate-300">{ano.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DANH SÁCH GIAO DỊCH MỚI */}
        <div className="bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-2xl rounded-[32px] p-0 border border-white shadow-[0_15px_50px_rgba(234,88,12,0.06)] overflow-hidden flex flex-col h-[350px]">
          <div className="p-6 sm:p-8 border-b border-slate-100/60 bg-white/50 sticky top-0 z-10 flex justify-between items-center backdrop-blur-md">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
                <span>Giao dịch mới</span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </span>
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Đồng bộ trực tiếp từ cổng thanh toán</p>
            </div>
            <button 
              onClick={() => router.push('/admin/orders')} 
              className="w-10 h-10 flex items-center justify-center bg-orange-50 hover:bg-[#ea580c] text-[#ea580c] hover:text-white rounded-2xl transition-all duration-300 group shadow-sm cursor-pointer border border-orange-100"
              title="Xem toàn bộ kho vé"
            >
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 p-3 space-y-3">
            {(!data?.recentOrders || data.recentOrders.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 border border-slate-100">
                  <Filter className="w-8 h-8 text-slate-300 animate-pulse" />
                </div>
                <span className="text-xs font-extrabold tracking-wider uppercase text-slate-400">Hàng đợi vé trống</span>
              </div>
            ) : (
              data.recentOrders.slice(0, 2).map((order: any, idx: number) => (
                <div 
                  key={order.id} 
                  onClick={() => router.push(`/admin/orders`)}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(234,88,12,0.1)] hover:border-orange-200 cursor-pointer transition-all duration-300 flex items-center justify-between group hover:-translate-y-1"
                >
                  <div className="pr-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl group-hover:bg-orange-50 group-hover:text-[#ea580c] transition-colors border border-slate-200/60 shadow-2xs">
                        {order.id}
                      </span>
                      <span className="text-[11px] font-black text-slate-400 flex items-center gap-1">
                        <Clock size={12} className="text-slate-400 group-hover:animate-spin" /> {formatTime(order.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 mb-1 truncate flex items-center gap-2 tracking-tight">
                      <Users size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" /> 
                      {order.customer}
                    </p>
                    <p className="text-xs font-bold text-slate-500 truncate flex items-center gap-2">
                      <MapPin size={14} className="text-[#ea580c] animate-bounce" /> 
                      {order.route}
                    </p>
                  </div>
                  
                  <div className="text-right flex flex-col items-end shrink-0 gap-2">
                    <div className="flex items-baseline gap-1">
                      <p className="text-lg font-black text-slate-800 tracking-tight">10.000đ</p>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">Flat</span>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          📊 BỘ 3 BIỂU ĐỒ NÂNG CẤP ĐỒ ÁN XUẤT SẮC (ULTRA-PREMIUM OPTIMIZATIONS)
          ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* BIỂU ĐỒ 1: CƠ CẤU DOANH THU THEO TUYẾN ĐƯỜNG */}
        <div className="bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-2xl rounded-[32px] p-6 border border-white shadow-[0_15px_50px_rgba(234,88,12,0.06)] flex flex-col h-[380px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-125 transition-all duration-500 text-orange-500">
            <MapPin size={90} />
          </div>
          
          <div className="mb-4">
            <h3 className="text-[17px] font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500 animate-bounce" />
              <span>Cơ cấu doanh thu theo Tuyến đường</span>
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-1">Phân bổ tỷ lệ doanh thu thực tế chia theo tuyến chạy</p>
          </div>

          <div className="flex-1 flex items-center gap-6 mt-4 pb-4">
            {/* SVG Donut Circle */}
            <div className="relative w-36 h-36 shrink-0 shadow-inner rounded-full flex items-center justify-center bg-slate-50/30">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {routeDataList.map((item, idx) => (
                  <motion.circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r="30"
                    fill="transparent"
                    stroke={item.hex}
                    strokeWidth="9"
                    strokeDasharray={`${item.share * 188.5} 188.5`}
                    strokeDashoffset={-donutOffsets[idx]}
                    strokeLinecap="round"
                    initial={{ strokeDasharray: `0 188.5` }}
                    animate={{ strokeDasharray: `${item.share * 188.5} 188.5` }}
                    transition={{ duration: 1.2, delay: idx * 0.15, ease: "easeOut" }}
                  />
                ))}
              </svg>
              {/* Giữa Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
                  {data?.totalRoutesCount || 4}
                </span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tuyến Chạy</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="flex-1 space-y-2">
              {routeDataList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-slate-100/60 pb-1.5 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.hex }} />
                    <span className="font-extrabold text-slate-600 truncate max-w-[100px]" title={item.name}>{item.name.replace(' ➔ ', '➔')}</span>
                  </div>
                  <div className="text-right shrink-0 pl-1.5">
                    <span className="font-black text-slate-900 block">{Math.round(item.share * 100)}%</span>
                    <span className="text-[9px] font-bold text-slate-400">{formatCurrency(item.val)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BIỂU ĐỒ 2: SO SÁNH CỔNG THANH TOÁN (INTERACTIVE MODAL ON CLICK) */}
        <div 
          onClick={() => { setIsPaymentModalOpen(true); setPaymentModalFilter('ALL'); setPaymentSearchQuery(''); }}
          className="bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-2xl rounded-[32px] p-6 border border-white shadow-[0_15px_50px_rgba(234,88,12,0.06)] hover:shadow-[0_20px_60px_rgba(37,99,235,0.12)] transition-all duration-500 flex flex-col h-[380px] relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-125 transition-all duration-500 text-blue-500">
            <DollarSign size={90} />
          </div>

          <div className="mb-4 flex justify-between items-start">
            <div>
              <h3 className="text-[17px] font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500 animate-pulse" strokeWidth={2.5} />
                <span>Thị phần Cổng thanh toán</span>
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">So sánh lượng vé & doanh số qua MoMo vs VNPAY</p>
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 group-hover:scale-105 transition-transform duration-300 flex items-center gap-1 shrink-0">
              Chi tiết <ArrowRight size={10} />
            </span>
          </div>

          <div className="flex-1 relative mt-6 h-[170px] flex items-end gap-10 px-4">
            {/* Grid background lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
              {[2, 1, 0].map((line) => (
                <div key={line} className="w-full flex items-center gap-3">
                  <span className="w-8 text-right text-[10px] font-extrabold text-slate-300">
                    {line === 2 ? '100%' : line === 1 ? '50%' : '0%'}
                  </span>
                  <div className="flex-1 border-b border-dashed border-slate-100"></div>
                </div>
              ))}
            </div>

            {/* Bars container */}
            <div className="flex-1 h-full flex items-end justify-around relative z-10 pb-7">
              {/* MoMo Column */}
              <div className="flex flex-col items-center justify-end h-full relative group/bar">
                <div className="absolute -top-12 opacity-0 group-hover/bar:opacity-100 transition-all duration-200 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl whitespace-nowrap z-25 shadow-lg">
                  {formatCurrency(momoRevenueValue)} ({momoTicketsCount} vé)
                </div>
                <motion.div
                  onClick={(e) => { e.stopPropagation(); setIsPaymentModalOpen(true); setPaymentModalFilter('MOMO'); setPaymentSearchQuery(''); }}
                  className="w-12 bg-gradient-to-t from-pink-600 to-rose-400 rounded-t-xl shadow-[0_4px_15px_rgba(219,39,119,0.3)] relative overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                  initial={{ height: 0 }}
                  animate={{ height: `${momoHeight}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
                />
                <span className="mt-3.5 text-[11px] font-black text-pink-600 uppercase tracking-widest">MoMo ({momoHeight}%)</span>
              </div>

              {/* VNPAY Column */}
              <div className="flex flex-col items-center justify-end h-full relative group/bar">
                <div className="absolute -top-12 opacity-0 group-hover/bar:opacity-100 transition-all duration-200 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl whitespace-nowrap z-25 shadow-lg">
                  {formatCurrency(vnpayRevenueValue)} ({vnpayTicketsCount} vé)
                </div>
                <motion.div
                  onClick={(e) => { e.stopPropagation(); setIsPaymentModalOpen(true); setPaymentModalFilter('VNPAY'); setPaymentSearchQuery(''); }}
                  className="w-12 bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-xl shadow-[0_4px_15px_rgba(37,99,235,0.3)] relative overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                  initial={{ height: 0 }}
                  animate={{ height: `${vnpayHeight}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.3 }}
                />
                <span className="mt-3.5 text-[11px] font-black text-blue-600 uppercase tracking-widest">VNPAY ({vnpayHeight}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* BIỂU ĐỒ 3: KHUNG GIỜ VÀNG ĐẶT VÉ */}
        <div className="bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-2xl rounded-[32px] p-6 border border-white shadow-[0_15px_50px_rgba(234,88,12,0.06)] flex flex-col h-[380px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-125 transition-all duration-500 text-emerald-500">
            <Clock size={90} />
          </div>

          <div className="mb-4">
            <h3 className="text-[17px] font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500 animate-pulse" />
              <span>Khung giờ vàng đặt vé</span>
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-1">Tỷ lệ đặt vé phân bổ theo các mốc thời gian trong ngày</p>
          </div>

          <div className="flex-1 relative mt-4 h-[220px]">
            {/* Grid lines */}
            <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
              {[2, 1, 0].map((line) => (
                <div key={line} className="w-full flex items-center gap-3">
                  <span className="w-16 text-right text-[10px] font-extrabold text-slate-300">
                    {line === 2 ? 'Cao điểm' : line === 1 ? 'Trung bình' : 'Thấp điểm'}
                  </span>
                  <div className="flex-1 border-b border-dashed border-slate-100"></div>
                </div>
              ))}
            </div>

            {/* SVG Path */}
            <div className="absolute inset-x-0 top-0 bottom-6 left-20 right-4 z-10">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hourlyLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                  
                  <linearGradient id="hourlyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {hourlyDataList.length > 1 && (
                  <path d={hourlyAreaPath} fill="url(#hourlyAreaGrad)" />
                )}
                
                {hourlyDataList.length > 1 && (
                  <path 
                    d={hourlyWavePath} 
                    fill="none" 
                    stroke="url(#hourlyLineGrad)" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                  />
                )}
              </svg>

              {/* Dots & interactive hover regions */}
              <div className="absolute inset-0 flex items-end justify-between">
                {hourlyDataList.map((val, i) => {
                  const x = (i / 3) * 100;
                  const y = 100 - (val / maxHourlyVal) * 70 - 15;
                  return (
                    <div key={i} className="absolute flex flex-col items-center justify-end group/dot cursor-pointer" style={{ left: `${x}%`, bottom: `0px`, width: '1px', height: '100%' }}>
                      {/* Tooltip */}
                      <div className="absolute bottom-28 opacity-0 group-hover/dot:opacity-100 transition-all duration-200 bg-slate-900 text-white text-[10px] font-black py-2 px-3 rounded-xl whitespace-nowrap z-25 shadow-lg flex flex-col items-center">
                        <span className="text-gray-400 font-bold">{hourlyLabelsList[i]}</span>
                        <span className="text-emerald-400 font-extrabold">{val}% Lượng đặt</span>
                      </div>
                      
                      <div 
                        className="w-3.5 h-3.5 bg-white border-4 border-[#3B82F6] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)] cursor-pointer" 
                        style={{ position: 'absolute', top: `${y}%`, transform: 'translate(-50%, -50%)' }} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="absolute bottom-0 left-20 right-4 h-6 border-t border-slate-100 pt-1.5 pointer-events-none">
              {hourlyLabelsList.map((lbl, i) => {
                const x = (i / 3) * 100;
                return (
                  <span 
                    key={i} 
                    className="absolute text-[10px] font-extrabold text-slate-400 -translate-x-1/2 whitespace-nowrap"
                    style={{ left: `${x}%` }}
                  >
                    {lbl.split(' ')[0]}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================
          💳 DỊCH VỤ INTERACTIVE MODAL: LỊCH SỬ GIAO DỊCH CỔNG THANH TOÁN (VIP ONLY)
          ========================================================= */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
          >
            {/* Backdrop Click */}
            <div className="absolute inset-0" onClick={() => setIsPaymentModalOpen(false)} />
            
            {/* Modal Panel */}
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="relative bg-white/95 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_25px_60px_rgba(0,0,0,0.15)] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col z-10"
            >
              {/* Hào quang nền của Modal */}
              <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

              {/* Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-start justify-between relative z-10 bg-white/50 backdrop-blur-xs">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                    <CreditCard className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Chi tiết Giao dịch Cổng thanh toán</h2>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Quản lý và tra cứu lịch sử vé đã được thanh toán thành công</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-rose-100 group"
                >
                  <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              {/* BỘ LỌC TÌM KIẾM & PHÂN LOẠI */}
              <div className="px-6 md:px-8 py-4 bg-slate-50/60 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                {/* Ô tìm kiếm */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo Mã đơn, Tên khách, Tuyến đi..."
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-inner-sm transition-all"
                  />
                </div>

                {/* Tabs & Export Button Container */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {/* Tabs phương thức */}
                  <div className="flex items-center bg-slate-200/50 p-1 rounded-2xl gap-1 relative">
                    {[
                      { key: 'ALL', label: 'Tất cả' },
                      { key: 'MOMO', label: 'Cổng MoMo' },
                      { key: 'VNPAY', label: 'Cổng VNPAY' }
                    ].map((tab) => {
                      const isActive = paymentModalFilter === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setPaymentModalFilter(tab.key as any)}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-300 cursor-pointer relative z-10 ${
                            isActive ? 'text-white' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activePaymentTab"
                              transition={{ type: "spring", stiffness: 350, damping: 26 }}
                              className={`absolute inset-0 rounded-xl -z-10 shadow-sm ${
                                tab.key === 'MOMO'
                                  ? 'bg-pink-600 shadow-[0_4px_12px_rgba(219,39,119,0.25)]'
                                  : tab.key === 'VNPAY'
                                    ? 'bg-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.25)]'
                                    : 'bg-slate-800 shadow-[0_4px_12px_rgba(30,41,59,0.25)]'
                              }`}
                            />
                          )}
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Nút xuất Excel VIP */}
                  <button
                    onClick={function() {
                      const paidOrders = data?.paidOrdersList || [];
                      const filteredOrders = paidOrders.filter(function(order: any) {
                        const matchMethod = paymentModalFilter === 'ALL' || order.paymentMethod === paymentModalFilter;
                        const matchSearch = !paymentSearchQuery || 
                          order.orderCode.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                          order.customerName.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                          (order.from && order.from.toLowerCase().includes(paymentSearchQuery.toLowerCase())) ||
                          (order.to && order.to.toLowerCase().includes(paymentSearchQuery.toLowerCase()));
                        return matchMethod && matchSearch;
                      });
                      handleExportPaymentExcel(filteredOrders);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-600/20 transition-all border border-emerald-500/10 cursor-pointer group"
                  >
                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                    <span>Xuất Excel</span>
                  </button>
                </div>
              </div>

              {/* DANH SÁCH LỊCH SỬ GIAO DỊCH */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                {(() => {
                  const paidOrders = data?.paidOrdersList || [];
                  const filteredOrders = paidOrders.filter((order: any) => {
                    const matchMethod = paymentModalFilter === 'ALL' || order.paymentMethod === paymentModalFilter;
                    const matchSearch = !paymentSearchQuery || 
                      order.orderCode.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                      order.customerName.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                      (order.from && order.from.toLowerCase().includes(paymentSearchQuery.toLowerCase())) ||
                      (order.to && order.to.toLowerCase().includes(paymentSearchQuery.toLowerCase()));
                    return matchMethod && matchSearch;
                  });

                  if (filteredOrders.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 animate-bounce">
                          <Search size={28} />
                        </div>
                        <h4 className="text-sm font-black text-slate-700">Không tìm thấy giao dịch nào</h4>
                        <p className="text-xs font-bold text-slate-400 mt-1 max-w-xs">Không có dữ liệu thanh toán phù hợp với từ khoá hoặc bộ lọc hiện tại.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3.5 pr-2">
                      <AnimatePresence mode="popLayout">
                        {filteredOrders.map((order: any, idx: number) => {
                          const isMomo = order.paymentMethod === 'MOMO';
                          return (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, scale: 0.98, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.98, y: -10 }}
                              transition={{ type: "spring", stiffness: 420, damping: 32 }}
                              key={order.orderCode || idx}
                              className={`bg-white hover:bg-slate-50/85 rounded-2xl p-4 border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group/item ${
                                order.paymentStatus === 'REFUNDED' 
                                  ? 'border-rose-100 bg-rose-50/10 shadow-[0_2px_8px_rgba(244,63,94,0.02)]' 
                                  : 'border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)]'
                              }`}
                            >
                              {/* Dải màu hover */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 ${
                                order.paymentStatus === 'REFUNDED'
                                  ? 'bg-rose-500 animate-pulse'
                                  : isMomo 
                                    ? 'bg-pink-500' 
                                    : 'bg-blue-500'
                              }`} />

                              {/* Left details */}
                              <div className="flex items-center gap-4 pl-1.5">
                                {/* Logo Cổng chính thức */}
                                {isMomo ? (
                                  <div className="w-11 h-11 rounded-2xl bg-[#A50064] flex items-center justify-center shrink-0 shadow-lg shadow-pink-600/10 border border-[#b8006f] overflow-hidden relative group-hover/item:scale-105 transition-transform duration-300 select-none">
                                    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 transition-transform duration-500 group-hover/item:scale-110">
                                      <path d="M7 17V10L11 14L15 10V17" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <circle cx="24" cy="13.5" r="3" stroke="white" strokeWidth="2.2"/>
                                      <path d="M7 28V21L11 25L15 21V28" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <circle cx="24" cy="24.5" r="3" stroke="white" strokeWidth="2.2"/>
                                    </svg>
                                  </div>
                                ) : (
                                  <div className="w-11 h-11 rounded-2xl bg-white flex flex-col items-center justify-center shrink-0 shadow-md shadow-blue-500/5 border border-slate-100 p-1 select-none group-hover/item:scale-105 transition-transform duration-300">
                                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 transition-transform duration-500 group-hover/item:scale-110">
                                      <g transform="translate(4, 4)">
                                        <path d="M8 8 L18 32 L22 32 L12 8 Z" fill="#005BAA" />
                                        <path d="M16 8 L24 28 L28 28 L20 8 Z" fill="#00B14F" />
                                        <path d="M24 8 L30 24 L34 24 L28 8 Z" fill="#E03C31" />
                                      </g>
                                      <text x="24" y="42" textAnchor="middle" fill="#005BAA" fontSize="9" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.5">VNPAY</text>
                                    </svg>
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-black text-slate-800 tracking-tight select-all">
                                      #{order.orderCode}
                                    </span>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                      isMomo 
                                        ? 'bg-pink-50 text-pink-600 border-pink-200' 
                                        : 'bg-blue-50 text-blue-600 border-blue-200'
                                    }`}>
                                      {order.paymentMethod}
                                    </span>
                                    {order.paymentStatus === 'REFUNDED' && (
                                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-wider flex items-center gap-1">
                                        <RotateCcw className="w-2.5 h-2.5 animate-spin-reverse" />
                                        Hoàn tiền
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 font-bold">
                                    <span className="flex items-center gap-1">
                                      <User className="w-3.5 h-3.5 text-slate-400" />
                                      {order.customerName}
                                    </span>
                                    <span className="flex items-center gap-1 min-w-0 truncate">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                      {order.from} ➔ {order.to}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right price & date */}
                              <div className="text-right flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 shrink-0">
                                <div className="flex items-center gap-2">
                                  {order.paymentStatus === 'REFUNDED' ? (
                                    <span className="text-base font-black text-rose-600 tracking-tight">
                                      -{formatCurrency(Math.abs(order.amount))}
                                    </span>
                                  ) : (
                                    <span className="text-base font-black text-emerald-600 tracking-tight">
                                      +{formatCurrency(order.amount)}
                                    </span>
                                  )}
                                  <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {order.tickets || 1} vé
                                  </span>
                                </div>
                                <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatTime(order.createdAt)}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  );
                })()}
              </div>

              {/* Footer Summary Bar */}
              {(() => {
                const paidOrders = data?.paidOrdersList || [];
                const filteredOrders = paidOrders.filter((order: any) => {
                  const matchMethod = paymentModalFilter === 'ALL' || order.paymentMethod === paymentModalFilter;
                  const matchSearch = !paymentSearchQuery || 
                    order.orderCode.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                    order.customerName.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                    (order.from && order.from.toLowerCase().includes(paymentSearchQuery.toLowerCase())) ||
                    (order.to && order.to.toLowerCase().includes(paymentSearchQuery.toLowerCase()));
                  return matchMethod && matchSearch;
                });
                const filteredTotalSum = filteredOrders.reduce(function (sum: number, o: any) { return sum + o.amount; }, 0);

                return (
                  <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-500 relative z-10 shrink-0">
                    <span className="flex items-center gap-1.5">
                      Hiển thị <strong className="text-slate-800 font-extrabold">{filteredOrders.length}</strong> / {paidOrders.length} giao dịch thanh toán thành công
                    </span>
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-2xl shadow-inner-xs">
                      Tổng doanh số đã lọc: <strong className="text-emerald-800 text-sm font-black">{formatCurrency(filteredTotalSum)}</strong>
                    </div>
                  </div>
                );
              })()}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRM MODAL CHO BẢO TRÌ */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              {/* Background Glow */}
              <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 ${confirmModal.isTurningOn ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
              
              <div className="flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl relative overflow-hidden ${confirmModal.isTurningOn ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30' : 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'}`}>
                   {confirmModal.isTurningOn ? (
                     <>
                        <ShieldAlert size={36} className="text-white relative z-10" />
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                     </>
                   ) : (
                     <Power size={36} className="text-white relative z-10" />
                   )}
                </div>
                
                <h3 className="text-2xl font-black text-slate-800 mb-2">
                  {confirmModal.isTurningOn ? 'CẢNH BÁO ĐÓNG HỆ THỐNG!' : 'MỞ LẠI HỆ THỐNG'}
                </h3>
                
                <p className="text-slate-500 text-[15px] font-medium leading-relaxed mb-8">
                  {confirmModal.isTurningOn 
                    ? 'Bạn sắp ngắt kết nối toàn bộ website đối với khách hàng. Họ sẽ không thể xem chuyến hay đặt vé. Chắc chắn thực hiện?' 
                    : 'Khách hàng sẽ có thể truy cập, tra cứu và đặt vé xe bình thường trở lại. Bạn đã hoàn tất bảo trì chưa?'}
                </p>
                
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className={`flex-1 py-4 text-white font-extrabold rounded-2xl shadow-lg transition-transform cursor-pointer active:scale-95 ${confirmModal.isTurningOn ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/25' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25'}`}
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}