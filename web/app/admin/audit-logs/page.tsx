'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { 
  ShieldAlert, User, Database, Activity, 
  Search, Filter, ChevronDown, Check, Mail, Loader2, FileText
} from 'lucide-react';

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const ActionBadge = ({ action }: { action: string }) => {
  const styles: Record<string, string> = {
    'TRIP_DELETE': 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-red-500 shadow-sm',
    'TRIP_CREATE': 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-500 shadow-sm',
    'TRIP_UPDATE': 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-500 shadow-sm',
    'AUTO_DISPATCH': 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-purple-500 shadow-sm animate-pulse',
    'AUTO_COMPLETED': 'bg-gradient-to-r from-slate-600 to-slate-800 text-white border-slate-700 shadow-sm',
    'ASSIGN_RESOURCE': 'bg-gradient-to-r from-amber-500 to-[#ea580c] text-white border-amber-600 shadow-sm',
    'UPDATE_SALARY': 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-500 shadow-sm',
  };

  const currentStyle = styles[action] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`${currentStyle} px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
      {action}
    </span>
  );
};

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;

  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State và Ref quản lý đóng/mở Custom Dropdown
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const actionOptions = [
    { value: 'ALL', label: 'Tất cả hành động', dotColor: 'bg-slate-400' },
    { value: 'UPDATE_SALARY', label: 'Cập nhật Lương Tài xế', dotColor: 'bg-emerald-500' },
    { value: 'TRIP_CREATE', label: 'Tạo chuyến mới', dotColor: 'bg-emerald-500' },
    { value: 'TRIP_UPDATE', label: 'Cập nhật chuyến', dotColor: 'bg-blue-500' },
    { value: 'TRIP_DELETE', label: 'Xóa chuyến', dotColor: 'bg-red-500' },
    { value: 'ASSIGN_RESOURCE', label: 'Gán Tài xế/Xe (Thủ công)', dotColor: 'bg-[#ea580c]' },
    { value: 'AUTO_DISPATCH', label: 'Bot Gán Tài/Xe (AUTO_DISPATCH)', dotColor: 'bg-indigo-500' },
    { value: 'AUTO_DEPART', label: 'Bot Xuất bến (AUTO_DEPART)', dotColor: 'bg-purple-500' }, 
    { value: 'AUTO_COMPLETED', label: 'Bot Cập bến (AUTO_COMPLETED)', dotColor: 'bg-slate-600' },
  ];

  // Xử lý click ra ngoài để đóng Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!userId || userRole !== 'ADMIN') return;
      setIsLoading(true);
      try {
        const actionQuery = filterAction !== 'ALL' ? `&action=${filterAction}` : '';
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await axios.get(`${apiBase}/admin/audit-logs?limit=100${actionQuery}`, {
          headers: { 'x-user-id': userId }
        });
        
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải Audit Logs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLogs();
  }, [userId, userRole, filterAction]);

  if (userRole !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-black text-slate-800">Khu vực hạn chế</h2>
        <p className="text-slate-500 mt-2">Chỉ tài khoản Quản trị viên cấp cao (ADMIN) mới được phép truy cập Nhật ký hệ thống.</p>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.includes(searchTerm);
      
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;

    return matchesSearch && matchesAction;
  });

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      alert('Không có dữ liệu để xuất file.');
      return;
    }

    let csvContent = '\uFEFF'; 
    csvContent += 'Thời Gian,Người Thao Tác,Hành Động,Loại Đối Tượng,ID Đối Tượng,Lý Do / Chi Tiết\n';

    filteredLogs.forEach(log => {
      const isSystem = log.adminId === 'SYSTEM' || !log.admin;
      const operator = isSystem ? '"HỆ THỐNG (BOT)"' : `"${log.admin?.name || 'Nhân sự Ẩn danh'}"`;
      const action = `"${log.action}"`;
      const entityType = `"${log.entityType}"`;
      const entityId = `"${log.entityId}"`;
      const reason = `"${log.details?.reason || ''}"`;
      const time = `"${formatTime(log.createdAt)}"`;

      csvContent += `${time},${operator},${action},${entityType},${entityId},${reason}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Nhat_Ky_He_Thong_${filterAction}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Premium VIP Style */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg mb-6 mt-1 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-500/20">
        {/* Ambient Lighting Orbs */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-500/15 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-[#ea580c]/10 rounded-full blur-2xl pointer-events-none"></div>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:20px_20px]"></div>
        
        <div className="relative p-6 lg:px-8 lg:py-6 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="bg-gradient-to-tr from-[#ea580c] to-[#EF5222] p-2.5 rounded-xl shadow-[0_4px_12px_rgba(234,88,12,0.3)] border border-orange-400/30">
                <Activity className="w-6 h-6 text-white animate-pulse" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                <span>Nhật ký Hệ thống</span>
                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent text-[11px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 shadow-inner">SECURITY AUDIT HUD</span>
              </h1>
            </div>
            <p className="text-slate-300 font-medium text-sm max-w-2xl leading-relaxed">
              Giám sát bảo mật, theo dõi mọi thao tác thay đổi trạng thái tự động từ Bot AI và nhân sự điều hành theo thời gian thực.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] overflow-visible">
        <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex gap-4 items-center justify-between flex-wrap">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-2xl w-full">
            {/* CUSTOM DROPDOWN BỘ LỌC */}
            <div className="relative w-full sm:w-64 shrink-0" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`w-full flex items-center justify-between pl-4 pr-3 py-3 border rounded-xl text-sm font-bold transition-all focus:outline-none bg-white shadow-inner cursor-pointer
                  ${isFilterOpen ? 'border-[#ea580c] ring-4 ring-orange-50' : 'border-slate-200 hover:border-[#ea580c]/50'}
                `}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Filter className={`w-4 h-4 transition-colors ${isFilterOpen || filterAction !== 'ALL' ? 'text-[#ea580c]' : 'text-slate-400'}`} />
                  <span className={`truncate ${filterAction !== 'ALL' ? 'text-slate-800' : 'text-slate-500'}`}>
                    {actionOptions.find(opt => opt.value === filterAction)?.label || 'Chọn bộ lọc'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ease-in-out ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-[14px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top">
                  {actionOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterAction(option.value);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-slate-50 group cursor-pointer
                        ${filterAction === option.value ? 'bg-orange-50/50' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${option.dotColor} ${filterAction === option.value ? 'ring-2 ring-offset-1 ring-orange-200' : ''}`} />
                        <span className={`font-semibold transition-colors
                          ${filterAction === option.value ? 'text-[#ea580c]' : 'text-slate-600 group-hover:text-slate-900'}
                        `}>
                          {option.label}
                        </span>
                      </div>
                      {filterAction === option.value && <Check className="w-4 h-4 text-[#ea580c] animate-in zoom-in" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ô Tìm Kiếm Text */}
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm theo ID, nhân viên..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#ea580c] focus:ring-2 focus:ring-orange-50 outline-none transition-all shadow-inner" 
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100/80 rounded-xl font-black text-xs border border-emerald-200/50 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-md"
              title="Xuất danh sách nhật ký hiển thị ra file CSV / Excel"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>📥 Xuất Nhật Ký (CSV)</span>
            </button>

            <div className="text-xs font-black text-slate-400 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
              Hiển thị: <span className="text-[#ea580c]">{filteredLogs.length}</span> log
            </div>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <th className="p-5 w-48">Thời gian</th>
              <th className="p-5">Người thao tác</th>
              <th className="p-5">Hành động</th>
              <th className="p-5">Đối tượng (ID)</th>
              <th className="p-5 text-right">Chi tiết</th>
            </tr>
          </thead>
        
          <tbody className="text-sm divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 font-extrabold">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#ea580c] mb-3" />
                  Đang tải nhật ký hệ thống...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                    <Filter className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-black text-slate-700">Không tìm thấy dữ liệu nhật ký</h3>
                  <p className="text-xs text-slate-500 mt-1">Vui lòng thử bộ lọc hoặc từ khóa khác.</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const isSystem = log.adminId === 'SYSTEM' || !log.admin; 
                
                return (
                  <React.Fragment key={log.id}>
                    <tr className={`transition-all duration-300 group hover:-translate-y-0.5 ${isSystem ? 'bg-indigo-50/20 hover:bg-indigo-50/50' : 'hover:bg-orange-50/60'}`}>
                      <td className="p-5">
                        <div className="text-xs font-black text-slate-500 group-hover:text-[#ea580c] transition-colors">
                          {formatTime(log.createdAt)}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          {isSystem ? (
                            <>
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-black flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(168,85,247,0.3)] border border-purple-400/20">
                                <Activity className="w-5 h-5 animate-pulse" />
                              </div>
                              <div>
                                <div className="font-black text-purple-700 text-base tracking-tight">HỆ THỐNG (BOT)</div>
                                <div className="text-[11px] font-bold text-slate-400">Tự động hóa AI</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-black flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(234,88,12,0.3)] border border-orange-400/20">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-black text-slate-800 text-base tracking-tight group-hover:text-[#ea580c] transition-colors">{log.admin?.name || 'Nhân sự Ẩn danh'}</div>
                                <div className="text-[11px] font-bold text-slate-400 italic">Quản trị vận hành</div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-5">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1.5 max-w-md">
                           <div className="font-black text-slate-700 text-xs flex items-center gap-2">
                              <Database className="w-3.5 h-3.5 text-[#ea580c]" /> 
                              <span>{log.entityType}</span>
                              <span className="text-slate-300">|</span> 
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono text-[11px]">#{log.entityId}</span>
                           </div>
                           {log.details?.reason && (
                             <p className="text-xs text-slate-500 font-medium italic bg-slate-50/80 p-2 rounded-xl border border-slate-100 leading-relaxed">
                               💡 {log.details.reason}
                             </p>
                           )}
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <button 
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-[#ea580c] bg-orange-50 hover:bg-gradient-to-r hover:from-[#ea580c] hover:to-amber-500 hover:text-white transition-all duration-300 border border-orange-200/60 hover:border-transparent shadow-2xs hover:shadow-md cursor-pointer active:scale-95"
                        >
                          {expandedLog === log.id ? 'Đóng' : 'Chi tiết'}
                        </button>
                      </td>
                    </tr>

                    {/* Hiển thị JSON chi tiết */}
                    {expandedLog === log.id && (
                      <tr className="bg-slate-900 text-emerald-400 animate-in fade-in duration-300">
                        <td colSpan={5} className="p-6 border-t-0 shadow-inner">
                          <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Payload / Cấu trúc dữ liệu ghi nhận
                          </div>
                          <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-black/50 p-5 rounded-2xl border border-slate-800 max-h-72 overflow-y-auto leading-relaxed shadow-2xl">
                            {JSON.stringify(log.details || log, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}