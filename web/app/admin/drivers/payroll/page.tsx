'use client';
import { API_BASE } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { 
  FileSpreadsheet, Sparkles, ChevronLeft, ChevronRight, ChevronDown, Calendar, DollarSign, Navigation, 
  MapPin, Settings, AlertCircle, Edit2, ShieldAlert, Award, Clock, ArrowLeft, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function DriverPayrollPage() {
  const { data: session } = useSession();
  
  // Thời gian mặc định: Tháng hiện tại
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });

  const [payrollData, setPayrollData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeDriverConfig, setActiveDriverConfig] = useState<any>(null);
  const [configFormData, setConfigFormData] = useState({ baseSalary: 5000000, salaryPerKm: 2000 });
  const [isConfigSaving, setIsConfigSaving] = useState(false);

  const [sortBy, setSortBy] = useState('salary_desc'); // Mặc định xếp theo lương cao -> thấp theo yêu cầu

  // States & Refs for Custom Month Picker and Sort Dropdown
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => {
    const [year] = selectedMonth.split('-');
    return Number(year);
  });
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const monthPickerRef = React.useRef<HTMLDivElement>(null);
  const sortDropdownRef = React.useRef<HTMLDivElement>(null);

  // Sync year in month picker when selectedMonth changes
  useEffect(() => {
    const [year] = selectedMonth.split('-');
    if (year) {
      setPickerYear(Number(year));
    }
  }, [selectedMonth]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const MONTHS = [
    { label: 'Tháng 1', value: '01' },
    { label: 'Tháng 2', value: '02' },
    { label: 'Tháng 3', value: '03' },
    { label: 'Tháng 4', value: '04' },
    { label: 'Tháng 5', value: '05' },
    { label: 'Tháng 6', value: '06' },
    { label: 'Tháng 7', value: '07' },
    { label: 'Tháng 8', value: '08' },
    { label: 'Tháng 9', value: '09' },
    { label: 'Tháng 10', value: '10' },
    { label: 'Tháng 11', value: '11' },
    { label: 'Tháng 12', value: '12' },
  ];

  const SORT_OPTIONS = [
    { value: 'salary_desc', label: 'Lương từ nhiều ➔ ít', icon: '💰' },
    { value: 'salary_asc', label: 'Lương từ ít ➔ nhiều', icon: '💰' },
    { value: 'name_asc', label: 'Tên tài xế (A-Z)', icon: '🔠' },
    { value: 'distance_desc', label: 'Tổng số Km chạy giảm dần', icon: '🛣️' },
    { value: 'trips_desc', label: 'Số chuyến chạy giảm dần', icon: '🚌' }
  ];

  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [activeDriverLogs, setActiveDriverLogs] = useState<any>(null);

  // Sắp xếp dữ liệu bảng lương động ở phía Client
  const sortedPayroll = React.useMemo(() => {
    if (!payrollData || !payrollData.payroll) return [];
    const list = [...payrollData.payroll];
    if (sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    } else if (sortBy === 'salary_desc') {
      list.sort((a, b) => b.totalSalary - a.totalSalary);
    } else if (sortBy === 'salary_asc') {
      list.sort((a, b) => a.totalSalary - b.totalSalary);
    } else if (sortBy === 'distance_desc') {
      list.sort((a, b) => b.totalDistance - a.totalDistance);
    } else if (sortBy === 'trips_desc') {
      list.sort((a, b) => b.tripCount - a.tripCount);
    }
    return list;
  }, [payrollData, sortBy]);


  // Gọi API tải bảng lương
  const fetchPayroll = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const token = (session as any)?.accessToken || (session?.user as any)?.token || '';
      const userId = (session?.user as any)?.id;

      // Xác định ngày bắt đầu và kết thúc của tháng đã chọn
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).toISOString();

      const res = await axios.get(`${API_BASE}/admin/payroll`, {
        params: { startDate, endDate },
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId 
        }
      });
      setPayrollData(res.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi tải dữ liệu bảng lương!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchPayroll();
    }
  }, [selectedMonth, session]);

  // Cập nhật cấu hình lương của tài xế
  const handleOpenConfigModal = (driver: any) => {
    setActiveDriverConfig(driver);
    setConfigFormData({
      baseSalary: driver.baseSalary,
      salaryPerKm: driver.salaryPerKm
    });
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!activeDriverConfig) return;
    setIsConfigSaving(true);
    try {
      const token = (session as any)?.accessToken || (session?.user as any)?.token || '';
      const userId = (session?.user as any)?.id;
      await axios.put(
        `${API_BASE}/admin/payroll/config/${activeDriverConfig.driverId}`,
        configFormData,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'x-user-id': userId
          }
        }
      );
      setIsConfigModalOpen(false);
      fetchPayroll(); // Tải lại bảng lương mới
    } catch (err: any) {
      alert('❌ Lỗi: ' + (err.response?.data?.message || 'Không thể cập nhật cấu hình lương!'));
    } finally {
      setIsConfigSaving(false);
    }
  };

  // Xem chi tiết lịch trình của một tài xế
  const handleOpenLogsModal = (driver: any) => {
    setActiveDriverLogs(driver);
    setIsLogsModalOpen(true);
  };

  // Xuất file báo cáo Excel bảng lương VIP
  const handleExportExcel = () => {
    if (!payrollData || !sortedPayroll.length) return;

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta charset="utf-8" /><style>table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ddd; padding: 10px; text-align: left; font-family: Tahoma, sans-serif; font-size: 13px; } th { background-color: #EF5222; color: white; font-weight: bold; } .text-right { text-align: right; } .text-center { text-align: center; } .font-bold { font-weight: bold; }</style></head><body>`;
    html += `<h2 style="color: #EF5222; font-family: Tahoma, sans-serif;">BẢNG QUYẾT TOÁN LƯƠNG TÀI XẾ CHI TIẾT - ABC BUS LINES</h2>`;
    html += `<p style="font-family: Tahoma, sans-serif; font-size: 12px; color: #666;">Tháng thanh toán: ${selectedMonth} | Xuất bản: ${new Date().toLocaleDateString('vi-VN')} lúc ${new Date().toLocaleTimeString('vi-VN')}</p>`;
    html += `<table>`;
    html += `<thead><tr>`;
    html += `<th>STT</th>`;
    html += `<th>Mã Tài Xế</th>`;
    html += `<th>Họ và Tên</th>`;
    html += `<th>Số Điện Thoại</th>`;
    html += `<th>Bằng Lái</th>`;
    html += `<th>Khu Vực</th>`;
    html += `<th>Lương Cơ Bản (VND)</th>`;
    html += `<th>Đơn Giá / Km (VND)</th>`;
    html += `<th>Số Chuyến Chạy</th>`;
    html += `<th>Tổng Km Chạy</th>`;
    html += `<th>Lương Chuyến (VND)</th>`;
    html += `<th>Tổng Thực Lĩnh (VND)</th>`;
    html += `</tr></thead><tbody>`;

    sortedPayroll.forEach((d: any, idx: number) => {

      html += `<tr>`;
      html += `<td class="text-center">${idx + 1}</td>`;
      html += `<td class="font-bold" style="color: #EF5222;">${d.driverCode}</td>`;
      html += `<td class="font-bold">${d.name}</td>`;
      html += `<td>${d.phone}</td>`;
      html += `<td>${d.licenseNo}</td>`;
      html += `<td>${d.baseLocation}</td>`;
      html += `<td class="text-right">${d.baseSalary.toLocaleString('vi-VN')}</td>`;
      html += `<td class="text-right">${d.salaryPerKm.toLocaleString('vi-VN')}</td>`;
      html += `<td class="text-center font-bold">${d.tripCount}</td>`;
      html += `<td class="text-right font-bold" style="color: #3b82f6;">${d.totalDistance} Km</td>`;
      html += `<td class="text-right">${d.distanceSalary.toLocaleString('vi-VN')}</td>`;
      html += `<td class="text-right font-bold" style="color: #10b981;">${d.totalSalary.toLocaleString('vi-VN')}</td>`;
      html += `</tr>`;
    });

    // Thêm dòng tổng cộng hệ thống
    html += `<tr style="background-color: #f8fafc; font-weight: bold;">`;
    html += `<td colspan="6" class="text-right">TỔNG CỘNG HỆ THỐNG:</td>`;
    html += `<td colspan="2"></td>`;
    html += `<td class="text-center">${payrollData.stats.totalTripsCompleted} chuyến</td>`;
    html += `<td class="text-right">${payrollData.stats.totalDistanceRun.toLocaleString('vi-VN')} Km</td>`;
    html += `<td></td>`;
    html += `<td class="text-right" style="color: #10b981;">${payrollData.stats.totalSalaryPaid.toLocaleString('vi-VN')}đ</td>`;
    html += `</tr>`;

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bang_Luong_Tai_Xe_ABC_Thang_${selectedMonth}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/admin/drivers" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors">
            <ArrowLeft size={16} strokeWidth={2.5} />
          </Link>
          <div className="w-2.5 h-10 bg-gradient-to-b from-[#EF5222] to-orange-400 rounded-full shadow-sm"></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Quyết Toán Lương Tài Xế</h1>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Hệ thống tự động đồng bộ hóa csdl chuyến chạy thực tế dựa theo độ dài Km
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc tháng */}
          <div className="relative" ref={monthPickerRef}>
            <button
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Calendar size={14} className="text-[#EF5222]" />
              <span>{`Tháng ${selectedMonth.split('-')[1]} / ${selectedMonth.split('-')[0]}`}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isMonthPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 origin-top-right"
                >
                  {/* Picker Header */}
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <button
                      onClick={() => setPickerYear(y => y - 1)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-black text-slate-800 tracking-tight">{pickerYear}</span>
                    <button
                      onClick={() => setPickerYear(y => y + 1)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Months Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {MONTHS.map(month => {
                      const isActive = selectedMonth === `${pickerYear}-${month.value}`;
                      return (
                        <button
                          key={month.value}
                          onClick={() => {
                            setSelectedMonth(`${pickerYear}-${month.value}`);
                            setIsMonthPickerOpen(false);
                          }}
                          className={`py-2 px-1 text-[11px] rounded-xl transition-all cursor-pointer text-center ${
                            isActive
                              ? 'bg-gradient-to-br from-[#EF5222] to-orange-500 text-white font-black shadow-md shadow-orange-500/20'
                              : 'hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-bold border border-transparent hover:border-slate-100'
                          }`}
                        >
                          {month.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Picker Footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => {
                        const d = new Date();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const curMonth = `${d.getFullYear()}-${mm}`;
                        setPickerYear(d.getFullYear());
                        setSelectedMonth(curMonth);
                        setIsMonthPickerOpen(false);
                      }}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-[10px] font-black rounded-lg transition-all text-center cursor-pointer border border-slate-200/50"
                    >
                      Tháng hiện tại 📅
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sắp xếp bảng lương */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sắp xếp:</span>
              <span className="text-slate-800">{SORT_OPTIONS.find(o => o.value === sortBy)?.icon} {SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isSortDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 origin-top-right"
                >
                  <div className="space-y-1">
                    {SORT_OPTIONS.map(option => {
                      const isActive = sortBy === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs rounded-xl transition-all cursor-pointer ${
                            isActive
                              ? 'bg-slate-900 text-white font-black'
                              : 'hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-bold'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                          </div>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          <button 
            onClick={handleExportExcel}
            disabled={!payrollData}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-emerald-400" />
            <span>Xuất Bảng Lương Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Widget (HUD) */}
      {payrollData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Tổng chi phí lương */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-850 p-5 rounded-2xl border border-slate-800 relative overflow-hidden shadow-md text-white">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tr from-[#EF5222]/20 to-orange-500/10 rounded-full blur-xl pointer-events-none translate-x-4 translate-y-4"></div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng chi trả lương</span>
              <span className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center">
                <DollarSign size={16} />
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-emerald-400">
              {payrollData.stats.totalSalaryPaid.toLocaleString('vi-VN')}đ
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Đã bao gồm Lương cứng + Công chuyến</p>
          </div>

          {/* Card 2: Tổng Km đã phục vụ */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tổng Km đã chạy</span>
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-200/60 flex items-center justify-center">
                <Navigation size={16} />
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-blue-600">
              {payrollData.stats.totalDistanceRun.toLocaleString('vi-VN')} Km
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Trung bình: <strong className="text-slate-600">{payrollData.stats.averageDistancePerDriver} Km</strong> / tài xế</p>
          </div>

          {/* Card 3: Số chuyến hoàn thành */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Số chuyến hoàn thành</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
                <Clock size={16} strokeWidth={2.5} />
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight mt-2 text-emerald-600">
              {payrollData.stats.totalTripsCompleted} chuyến
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1">
              Trạng thái điều phối: <strong className="text-slate-600">100% Khớp CSDL</strong>
            </p>
          </div>

          {/* Card 4: Top tài xế chạy nhiều nhất */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bác tài vô địch</span>
              <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-200/60 flex items-center justify-center">
                <Award size={16} />
              </span>
            </div>
            <h3 className="text-base font-black tracking-tight mt-2.5 text-slate-800 truncate">
              {payrollData.stats.topDriverName}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              Cống hiến chạy: <strong className="text-[#EF5222]">{payrollData.stats.topDriverKm.toLocaleString('vi-VN')} Km</strong>
            </p>
          </div>

        </div>
      )}

      {/* 3. Main Data Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
        
        {/* Tiêu đề & Cảnh báo */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[#EF5222]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Chi tiết bảng quyết toán lương theo tài xế</h2>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[10px] font-bold text-amber-700">
            <AlertCircle size={12} className="shrink-0" />
            <span>Mỗi km tài xế lái thực tế được quy đổi thành tiền công chuyến tương ứng.</span>
          </div>
        </div>

        {/* Bảng Dữ Liệu - Desktop */}
        <div className="hidden md:block overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-4 border-[#EF5222]/20 border-t-[#EF5222] rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tính toán bảng lương...</p>
            </div>
          ) : errorMsg ? (
            <div className="py-16 text-center">
              <ShieldAlert className="text-red-500 mx-auto mb-3" size={32} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{errorMsg}</h3>
              <button 
                onClick={fetchPayroll}
                className="mt-3 px-4 py-2 bg-[#EF5222] text-white text-xs font-black rounded-lg hover:bg-[#D93814] transition-colors"
              >
                Tải lại trang
              </button>
            </div>
          ) : payrollData && payrollData.payroll.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Calendar size={36} className="text-slate-300 mb-3" />
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Không có chuyến chạy nào hoàn thành trong tháng này</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Lương thực lĩnh của các tài xế sẽ chỉ bao gồm Lương cứng cơ bản.</p>
            </div>
          ) : (
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 text-[10px] font-black uppercase tracking-wider text-left">
                  <th className="py-4 pl-6 pr-3">STT</th>
                  <th className="py-4 px-3">Hồ sơ tài xế</th>
                  <th className="py-4 px-3 text-right">Lương cơ bản</th>
                  <th className="py-4 px-3 text-right">Đơn giá / Km</th>
                  <th className="py-4 px-3 text-center">Số chuyến</th>
                  <th className="py-4 px-3 text-right">Tổng Km chạy</th>
                  <th className="py-4 px-3 text-right">Lương chuyến chạy</th>
                  <th className="py-4 px-3 text-right">Tổng thực lĩnh</th>
                  <th className="py-4 pr-6 pl-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-semibold">
                {sortedPayroll.map((d: any, idx: number) => (
                  <tr key={d.driverId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4.5 pl-6 pr-3 text-slate-400 font-bold">{idx + 1}</td>

                    <td className="py-4.5 px-3">
                      <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <span>{d.name}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black border border-slate-200">{d.driverCode}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-0.5">
                          <span>SĐT: {d.phone}</span>
                          <span>|</span>
                          <span className="flex items-center gap-0.5"><MapPin size={9} /> {d.baseLocation}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4.5 px-3 text-right text-slate-800 font-bold">
                      {d.baseSalary.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-4.5 px-3 text-right text-slate-500 font-bold">
                      {d.salaryPerKm.toLocaleString('vi-VN')}đ/Km
                    </td>
                    <td className="py-4.5 px-3 text-center">
                      <button 
                        onClick={() => handleOpenLogsModal(d)}
                        className="font-black text-slate-700 bg-slate-100 hover:bg-orange-50 hover:text-[#EF5222] hover:border-[#EF5222]/30 px-2 py-1 rounded border border-slate-200 transition-colors"
                        title="Bấm để xem lịch trình chi tiết chuyến chạy"
                      >
                        {d.tripCount} chuyến 🔍
                      </button>
                    </td>
                    <td className="py-4.5 px-3 text-right text-blue-600 font-black">
                      {d.totalDistance.toLocaleString('vi-VN')} Km
                    </td>
                    <td className="py-4.5 px-3 text-right text-slate-800">
                      {d.distanceSalary.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-4.5 px-3 text-right text-emerald-600 font-black text-sm">
                      {d.totalSalary.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-4.5 pr-6 pl-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenConfigModal(d)}
                          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 hover:border-orange-200 rounded-lg border border-slate-200 transition-all font-bold cursor-pointer"
                          title="Sửa cấu hình định mức lương"
                        >
                          <Settings size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-slate-100 bg-slate-50/20">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-6 h-6 border-4 border-[#EF5222]/20 border-t-[#EF5222] rounded-full animate-spin mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đang tính toán bảng lương...</p>
            </div>
          ) : errorMsg ? (
            <div className="py-12 text-center">
              <ShieldAlert className="text-red-500 mx-auto mb-2" size={24} />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">{errorMsg}</h3>
            </div>
          ) : payrollData && payrollData.payroll.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Calendar size={28} className="text-slate-300 mb-2" />
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-tight">Không có chuyến chạy nào</h3>
            </div>
          ) : (
            sortedPayroll.map((d: any, idx: number) => (
              <div key={d.driverId} className="p-4 bg-white hover:bg-slate-50/50 transition-colors space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                    <span className="font-extrabold text-slate-800 text-xs">{d.name}</span>
                    <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-black border border-slate-200">{d.driverCode}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenConfigModal(d)}
                      className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-orange-600 bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                      title="Sửa định mức"
                    >
                      <Settings size={12} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                  <div className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100/65">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">Lương cơ bản</span>
                    <span className="text-slate-800 font-black mt-0.5">{d.baseSalary.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100/65">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">Định mức Km</span>
                    <span className="text-slate-800 font-black mt-0.5">{d.salaryPerKm.toLocaleString('vi-VN')}đ/Km</span>
                  </div>
                  <div className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100/65">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">Tổng Km chạy</span>
                    <span className="text-blue-600 font-black mt-0.5">{d.totalDistance.toLocaleString('vi-VN')} Km</span>
                  </div>
                  <div className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100/65">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">Lương chuyến</span>
                    <span className="text-slate-800 font-black mt-0.5">{d.distanceSalary.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100/60">
                  <button 
                    onClick={() => handleOpenLogsModal(d)}
                    className="inline-flex items-center gap-1 text-[9px] font-black text-[#EF5222] bg-orange-50 border border-orange-200/50 hover:bg-orange-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Xem {d.tripCount} chuyến</span>
                    <Clock size={10} />
                  </button>

                  <div className="text-right">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase block">Thực lĩnh</span>
                    <span className="text-emerald-600 font-black text-xs">{d.totalSalary.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. MODAL: SỬA ĐỊNH MỨC LƯƠNG TÀI XẾ (SALARY CONFIG MODAL) */}
      <AnimatePresence>
        {isConfigModalOpen && activeDriverConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }} 
              transition={{ duration: 0.18 }}
              className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-100"
            >
              {/* Header Modal */}
              <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#EF5222]/20 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-center gap-2 relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#EF5222]">
                    <Settings size={16} />
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-tight">Cấu hình lương</h2>
                    <p className="text-[9px] text-slate-400 mt-0.5">{activeDriverConfig.name} | {activeDriverConfig.driverCode}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsConfigModalOpen(false)} 
                  className="text-slate-400 hover:text-white transition-colors font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <div className="p-5 space-y-3.5 bg-slate-50/50">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Lương cứng cơ bản (VND/tháng)</label>
                  <input 
                    type="number"
                    value={configFormData.baseSalary}
                    onChange={(e) => setConfigFormData({ ...configFormData, baseSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all text-xs shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Đơn giá tiền công (VND / mỗi Km)</label>
                  <input 
                    type="number"
                    value={configFormData.salaryPerKm}
                    onChange={(e) => setConfigFormData({ ...configFormData, salaryPerKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-[#EF5222] focus:ring-4 focus:ring-orange-50 transition-all text-xs shadow-sm"
                  />
                </div>

                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/60 text-[9px] text-amber-700 font-semibold leading-relaxed">
                  <p className="font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">⚠️ LƯU Ý QUYẾT TOÁN:</p>
                  <p>Mọi thay đổi định mức sẽ lập tức cập nhật bảng lương tháng này và các tháng sau.</p>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                <button 
                  onClick={() => setIsConfigModalOpen(false)}
                  className="flex-1 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all text-xs text-center cursor-pointer"
                >
                  Đóng
                </button>
                <button 
                  onClick={handleSaveConfig}
                  disabled={isConfigSaving}
                  className="flex-[2] py-2 bg-[#EF5222] text-white rounded-lg font-black shadow-md hover:bg-[#D93814] transition-all text-xs text-center cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isConfigSaving && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                  <span>Lưu định mức</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL: XEM LOGS CHI TIẾT CHUYẾN CHẠY (TRIPS LOG MODAL) */}
      <AnimatePresence>
        {isLogsModalOpen && activeDriverLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }} 
              transition={{ duration: 0.18 }}
              className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-slate-100"
            >
              {/* Header Modal */}
              <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#EF5222]/20 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-center gap-2 relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#EF5222]">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-tight">Nhật ký hành trình</h2>
                    <p className="text-[9px] text-slate-400 mt-0.5">{activeDriverLogs.name} | Quyết toán: {selectedMonth}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsLogsModalOpen(false)} 
                  className="text-slate-400 hover:text-white transition-colors font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Logs Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-inner max-h-[45vh] overflow-y-auto p-1">
                  {/* Desktop Table View */}
                  <table className="hidden md:table w-full border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider text-left sticky top-0">
                        <th className="py-2.5 px-4">STT</th>
                        <th className="py-2.5 px-3">Tuyến chạy</th>
                        <th className="py-2.5 px-3 text-right">Khoảng cách</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                        <th className="py-2.5 px-4 text-center">Giờ xuất phát</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-bold">
                      {activeDriverLogs.tripsLog.map((log: any, i: number) => (
                        <tr key={log.assignmentId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 text-slate-400">{i + 1}</td>
                          <td className="py-3 px-3">
                            <span className="text-slate-800">{log.from}</span>
                            <span className="text-slate-400 mx-1">➔</span>
                            <span className="text-slate-800">{log.to}</span>
                          </td>
                          <td className="py-3 px-3 text-right text-blue-600 font-extrabold">{log.distanceKm} Km</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-extrabold">{log.earnedAmount.toLocaleString('vi-VN')}đ</td>
                          <td className="py-3 px-4 text-center text-[10px] text-slate-400">
                            {log.departDate ? new Date(log.departDate).toLocaleDateString('vi-VN') : 'Chưa chạy'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile Simple List View */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {activeDriverLogs.tripsLog.map((log: any, i: number) => (
                      <div key={log.assignmentId} className="p-3 flex items-center justify-between text-xs font-bold text-slate-700 bg-white">
                        <div>
                          <div className="flex items-center gap-1 text-slate-800">
                            <span>{log.from}</span>
                            <span className="text-slate-400 text-[10px]">➔</span>
                            <span>{log.to}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                            {log.departDate ? new Date(log.departDate).toLocaleDateString('vi-VN') : 'Chưa chạy'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-blue-600 font-extrabold text-[11px]">{log.distanceKm} Km</div>
                          <div className="text-emerald-600 font-extrabold text-[11px]">{log.earnedAmount.toLocaleString('vi-VN')}đ</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl flex flex-col justify-center shadow-xs">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Tổng Km thực chạy</span>
                    <strong className="text-base text-blue-600 font-black mt-0.5">{activeDriverLogs.totalDistance.toLocaleString('vi-VN')} Km</strong>
                  </div>
                  <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl flex flex-col justify-center shadow-xs">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Lương chuyến cộng thêm</span>
                    <strong className="text-base text-emerald-600 font-black mt-0.5">{activeDriverLogs.distanceSalary.toLocaleString('vi-VN')}đ</strong>
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="p-4 bg-white border-t border-slate-100 text-center shrink-0">
                <button 
                  onClick={() => setIsLogsModalOpen(false)}
                  className="w-full py-2.5 font-black text-white bg-slate-900 hover:bg-slate-800 rounded-lg text-xs text-center cursor-pointer"
                >
                  Xác nhận đối soát hoàn tất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
