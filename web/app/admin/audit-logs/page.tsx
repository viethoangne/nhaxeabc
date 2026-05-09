'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { 
  ShieldAlert, User, Database, Activity, 
  Search, Filter, ChevronDown, Check 
} from 'lucide-react';

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const ActionBadge = ({ action }: { action: string }) => {
  const styles: Record<string, string> = {
    'TRIP_DELETE': 'bg-red-100 text-red-700 border-red-200',
    'TRIP_CREATE': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'TRIP_UPDATE': 'bg-blue-100 text-blue-700 border-blue-200',
    'AUTO_DISPATCH': 'bg-purple-100 text-purple-700 border-purple-200',
    'AUTO_COMPLETED': 'bg-slate-100 text-slate-600 border-slate-200',
    'ASSIGN_RESOURCE': 'bg-orange-100 text-orange-700 border-orange-200',
  };

  const currentStyle = styles[action] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`${currentStyle} px-2.5 py-1 rounded-md text-[10px] font-black tracking-tighter border`}>
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
  
  // 🟢 State và Ref quản lý đóng/mở Custom Dropdown
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const actionOptions = [
    { value: 'ALL', label: 'Tất cả hành động', dotColor: 'bg-slate-400' },
    { value: 'TRIP_CREATE', label: 'Tạo chuyến mới', dotColor: 'bg-emerald-500' },
    { value: 'TRIP_UPDATE', label: 'Cập nhật chuyến', dotColor: 'bg-blue-500' },
    { value: 'TRIP_DELETE', label: 'Xóa chuyến', dotColor: 'bg-red-500' },
    { value: 'ASSIGN_RESOURCE', label: 'Gán Tài xế/Xe (Thủ công)', dotColor: 'bg-[#ea580c]' },
    // 🟢 Chỉnh lại tên nhãn cho đúng với thực tế DB của bạn
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
      try {
        // 🟢 BẠN BỊ THIẾU DÒNG NÀY: Khai báo biến actionQuery dựa vào bộ lọc
        const actionQuery = filterAction !== 'ALL' ? `&action=${filterAction}` : '';
        
        // Bây giờ nhúng actionQuery vào URL sẽ không bị báo lỗi nữa
        const res = await axios.get(`http://localhost:3001/api/admin/audit-logs?limit=100${actionQuery}`, {
          headers: { 'x-user-id': userId }
        });
        
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải Audit Logs:', error);
      }
    };
    
    fetchLogs();
  }, [userId, userRole, filterAction]); // 🟢 Bắt buộc phải có mặt filterAction ở đây

  if (userRole !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-[20px] shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-slate-100">
        <div>
          <h1 className="text-[22px] font-black text-slate-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#ea580c]" /> Nhật ký Hệ thống
          </h1>
          <p className="text-[13px] font-medium text-slate-400 mt-0.5">Giám sát mọi thao tác thay đổi dữ liệu của nhân sự</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          
          {/* 🟢 CUSTOM DROPDOWN BỘ LỌC */}
          <div className="relative w-full sm:w-64" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`w-full flex items-center justify-between pl-4 pr-3 py-2.5 border rounded-xl text-sm transition-all focus:outline-none bg-white
                ${isFilterOpen ? 'border-[#ea580c] ring-4 ring-orange-50' : 'border-slate-200 hover:border-[#ea580c]/50'}
              `}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Filter className={`w-4 h-4 transition-colors ${isFilterOpen || filterAction !== 'ALL' ? 'text-[#ea580c]' : 'text-slate-400'}`} />
                <span className={`font-semibold truncate ${filterAction !== 'ALL' ? 'text-slate-800' : 'text-slate-500'}`}>
                  {actionOptions.find(opt => opt.value === filterAction)?.label || 'Chọn bộ lọc'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ease-in-out ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Menu Dropdown bay ra */}
            {isFilterOpen && (
              <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-[14px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top">
                {actionOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilterAction(option.value);
                      setIsFilterOpen(false); // Chọn xong tự đóng
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-slate-50 group
                      ${filterAction === option.value ? 'bg-orange-50/50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Dấu chấm màu báo hiệu loại Action */}
                      <span className={`w-2 h-2 rounded-full ${option.dotColor} ${filterAction === option.value ? 'ring-2 ring-offset-1 ring-orange-200' : ''}`} />
                      <span className={`font-semibold transition-colors
                        ${filterAction === option.value ? 'text-[#ea580c]' : 'text-slate-600 group-hover:text-slate-900'}
                      `}>
                        {option.label}
                      </span>
                    </div>
                    
                    {/* Icon tick cam nếu đang chọn */}
                    {filterAction === option.value && <Check className="w-4 h-4 text-[#ea580c] animate-in zoom-in" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ô Tìm Kiếm Text */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm theo ID, nhân viên..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#ea580c] focus:ring-4 focus:ring-orange-50 outline-none transition-all" 
            />
          </div>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU */}
      <div className="bg-white rounded-[20px] border border-slate-100 shadow-[0_2px_15px_rgb(0,0,0,0.03)] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <th className="p-5 w-40">Thời gian</th>
              <th className="p-5">Người thao tác</th>
              <th className="p-5">Hành động</th>
              <th className="p-5">Đối tượng (ID)</th>
              <th className="p-5 text-right">Chi tiết</th>
            </tr>
          </thead>
        
          <tbody className="text-sm divide-y divide-slate-50">
            {filteredLogs.map(log => {
              const isSystem = log.adminId === 'SYSTEM' || !log.admin; 
              
              return (
                <React.Fragment key={log.id}>
                  <tr className={`transition-colors ${isSystem ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'} group`}>
                    <td className="p-5">
                      <div className="text-[12px] font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                        {formatTime(log.createdAt)}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        {isSystem ? (
                          <>
                            <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center">
                              <Activity className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="font-black text-purple-700 text-[13px]">HỆ THỐNG (BOT)</span>
                          </>
                        ) : (
                          <>
                            <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-[#ea580c]" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{log.admin?.name}</div>
                              <div className="text-[10px] text-slate-400 font-medium italic">Nhân sự vận hành</div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                         <div className="font-bold text-slate-600 text-[12px] flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-slate-400" /> 
                            {log.entityType} <span className="text-slate-300">|</span> 
                            <span className="text-slate-900 bg-slate-100 px-1.5 rounded">#{log.entityId}</span>
                         </div>
                         {log.details?.reason && (
                           <p className="text-[11px] text-slate-400 italic">Lý do: {log.details.reason}</p>
                         )}
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <button 
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-[#ea580c] bg-orange-50 hover:bg-[#ea580c] hover:text-white transition-all border border-transparent"
                      >
                        {expandedLog === log.id ? 'Đóng' : 'Chi tiết'}
                      </button>
                    </td>
                  </tr>

                  {/* Hiển thị JSON chi tiết */}
                  {expandedLog === log.id && (
                    <tr className="bg-slate-800 text-emerald-400">
                      <td colSpan={5} className="p-4 border-t-0 shadow-inner">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                          Payload / Dữ liệu đầy đủ
                        </div>
                        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all bg-slate-900 p-4 rounded-xl border border-slate-700 max-h-64 overflow-y-auto">
                          {JSON.stringify(log.details || log, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                    <Filter className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">Không tìm thấy dữ liệu</h3>
                  <p className="text-xs text-slate-500 mt-1">Vui lòng thử bộ lọc hoặc từ khóa khác.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}