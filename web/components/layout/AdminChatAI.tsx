'use client';

import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { 
  SendHorizonal, 
  X, 
  Maximize2, 
  Minimize2, 
  Sparkles,
  ArrowDown,
  Trash2,
  Terminal
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_MESSAGE: Message = { 
  role: 'assistant', 
  content: 'Xin kính chào thưa Quản trị viên! Tôi là Trợ lý Vận hành AI đặc quyền của Nhà xe ABC. Tôi có thể hỗ trợ Ngài:\n\n' +
           '👉 🚌 **Xóa chuyến xe rảnh rỗi:** Gõ "Xóa chuyến" hoặc "Tôi muốn xóa chuyến" để hệ thống tự động lọc ra danh sách chuyến chưa có ai đặt vé và xóa an toàn bằng ID!\n' +
           '👉 📊 **Báo cáo doanh thu:** "Thống kê doanh thu tuần này" hoặc "Báo cáo hôm nay"\n' +
           '👉 💡 **Cố vấn điều hành:** Đưa ra phương án xử lý phàn nàn, hỏng xe, tối ưu chuyến...\n\n' +
           'Tôi có quyền truy vấn dữ liệu thời gian thực để lập báo cáo trực quan cho Ngài. Xin mời Ngài ra lệnh!'
};

const SUGGESTIONS = [
  { icon: '💵', label: 'Doanh thu hôm nay', query: 'thống kê hôm nay' },
  { icon: '📅', label: 'Thống kê tháng này', query: 'thống kê tháng này' },
  { icon: '🚌', label: 'Chuyến xe trống', query: 'xóa chuyến' },
  { icon: '🧑‍✈️', label: 'Trạng thái bác tài', query: 'tài xế' },
  { icon: '💎', label: 'Khách hàng VIP', query: 'khách hàng' },
  { icon: '🎟️', label: 'Mã khuyến mãi', query: 'khuyến mãi' },
  { icon: '🛡️', label: 'Kiểm toán an ninh', query: 'nhật ký' },
  { icon: '🔄', label: 'Đồng bộ hệ thống', query: 'đồng bộ' },
];

export default function AdminChatAI() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([DEFAULT_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- 1. ĐỒNG BỘ LỊCH SỬ CHAT ADMIN ---
  useEffect(() => {
    if (status === 'authenticated' && userId && userRole === 'ADMIN') {
      axios.get(`${API_BASE}/admin/chat/history`, {
        headers: { 'x-user-id': userId }
      })
      .then(response => {
        if (response.data?.success && response.data?.data?.length > 0) {
          setMessages([DEFAULT_MESSAGE, ...response.data.data]);
        }
      })
      .catch(error => console.error("Lỗi fetch lịch sử chat Admin:", error));
    } else {
      setMessages([DEFAULT_MESSAGE]);
    }
  }, [status, userId, userRole]);

  // --- HÀM XÓA LỊCH SỬ CHAT ADMIN ---
  const handleDeleteHistory = async () => {
    if (!userId) return;
    
    const isConfirm = window.confirm('Thưa Admin, Ngài có chắc chắn muốn dọn dẹp toàn bộ lịch sử trò chuyện vận hành này? Hành động này không thể phục hồi.');
    if (!isConfirm) return;

    try {
      await axios.delete(`${API_BASE}/admin/chat/history`, {
        headers: { 'x-user-id': userId }
      });
      setMessages([DEFAULT_MESSAGE]);
    } catch (error) {
      console.error("Lỗi xóa lịch sử chat Admin:", error);
      alert("Không thể xóa lịch sử lúc này, thưa Admin.");
    }
  };

  // --- 2. LOGIC CUỘN MƯỢT ---
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
      setShowScrollButton(false);
    }
  }, []);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceToBottom > 150);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollToBottom('smooth');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading, isOpen, scrollToBottom]);

  // --- 3. XỬ LÝ GỬI TIN NHẮN ---
  const sendDirectMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
  
    try {
      const res = await axios.post(`${API_BASE}/admin/chat`, { 
        message: text,
        history: messages.slice(-10) // Gửi 10 tin nhắn gần nhất làm ngữ cảnh
      }, {
        headers: { 'x-user-id': userId }
      });
  
      if (res.data?.success && res.data?.data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.data.reply }]);
        
        // 🟢 NẾU XOÁ CHUYẾN XE QUA AI THÀNH CÔNG -> PHÁT SỰ KIỆN ĐỂ REFRESH TRANG DASHBOARD LẬP TỨC
        const replyText = res.data.data.reply;
        if (replyText.includes('THÀNH CÔNG') && (text.toLowerCase().includes('xóa') || text.toLowerCase().includes('xoa'))) {
          window.dispatchEvent(new CustomEvent('trip-deleted'));
        }
      }
    } catch (error) {
      console.error("Lỗi gửi tin nhắn AI Admin:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Báo cáo Admin: Hệ thống gặp sự cố kết nối tới máy chủ AI hoặc Ngài không đủ thẩm quyền.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await sendDirectMessage(text);
  };

  // CHỈ HIỂN THỊ KHI ĐANG ĐỨNG TRONG GIAO DIỆN ADMIN VÀ LÀ ADMIN THỰC THỤ
  if (!pathname.startsWith('/admin') || userRole !== 'ADMIN') {
    return null;
  }

  const ChatWindow = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 30 }}
      transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      className={`flex flex-col bg-[#0B0F19]/95 backdrop-blur-2xl rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-slate-800/80 overflow-hidden ring-1 ring-white/5 antialiased relative z-50 transition-all duration-300 ${
        isExpanded 
        ? 'w-[90vw] h-[85vh] max-w-[1200px]' 
        : 'w-[360px] h-[520px]'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* --- HEADER (TÔNG CAM THƯƠNG HIỆU SANG TRỌNG) --- */}
      <div className="relative px-5 py-3.5 flex justify-between items-center shrink-0 border-b border-slate-800/60 bg-[#0B0F19]/90">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 to-amber-600/5 pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-[#EF5222] to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 border border-orange-500/20">
              <Sparkles size={18} className="text-white absolute top-1.5 right-1.5 opacity-50 w-3 h-3 animate-pulse" />
              <Terminal size={20} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,82,34,0.7)]"></span>
            </div>
          </div>
          <div>
            <h3 className="font-extrabold text-[15px] text-white tracking-wide leading-none mb-1 flex items-center gap-2">
              Trợ lý Vận hành AI
              <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">ADMIN</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              🟢 Sẵn sàng
            </p>
          </div>
        </div>

        {/* --- CÁC NÚT ĐIỀU KHIỂN --- */}
        <div className="flex items-center gap-1 relative z-10">
          {messages.length > 1 && (
            <button 
              onClick={handleDeleteHistory} 
              title="Dọn dẹp lịch sử chat"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
            >
              <Trash2 size={16} strokeWidth={2.5} />
            </button>
          )}

          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200">
            {isExpanded ? <Minimize2 size={16} strokeWidth={2.5} /> : <Maximize2 size={16} strokeWidth={2.5} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* --- BODY CHAT (GIAO DIỆN CARBON SẪM CHỮ RÕ RÀNG) --- */}
      <div 
        ref={chatContainerRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#080B13]/60 scrollbar-thin scrollbar-thumb-orange-500/10 scrollbar-track-transparent relative"
      >
        {messages.map((msg, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={index} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2.5`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[#131A2E] flex items-center justify-center shrink-0 border border-slate-800 shadow-md mb-0.5">
                <Terminal size={12} className="text-orange-400" />
              </div>
            )}
            
            <div className={`max-w-[85%] px-4 py-3 text-[14px] md:text-[14.5px] leading-[1.6] tracking-wide shadow-lg border ${
              msg.role === 'user' 
              ? 'bg-[#EF5222] text-white rounded-[18px] rounded-br-[4px] shadow-orange-500/5 font-semibold border-orange-500/20' 
              : 'bg-[#131A2E]/90 text-slate-100 rounded-[18px] rounded-bl-[4px] border-slate-800/80 shadow-black/30 font-normal'
            }`}>
              <div className="whitespace-pre-wrap break-words">
                <ReactMarkdown 
                  components={{
                    a: ({node, href, children, ...props}: any) => {
                      if (href && href.startsWith('https://delete-trip/')) {
                        const tripId = href.replace('https://delete-trip/', '');
                        const handleClick = (e: React.MouseEvent) => {
                          e.preventDefault();
                          const isConfirmed = window.confirm(`Thưa Admin, Ngài có chắc chắn muốn ra lệnh xóa chuyến xe ID ${tripId} này khỏi hệ thống không?`);
                          if (isConfirmed) {
                            sendDirectMessage(`Xóa chuyến xe ID ${tripId}`);
                          }
                        };
                        return (
                          <button 
                            onClick={handleClick} 
                            className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 text-[11px] font-bold cursor-pointer transition-all duration-200"
                          >
                            {children}
                          </button>
                        );
                      }
                      return (
                        <a {...props} href={href} className="text-orange-400 font-extrabold underline decoration-orange-400/30 hover:decoration-orange-400 transition-colors" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      );
                    },
                    strong: ({node, ...props}: any) => (
                      <strong {...props} className="font-extrabold text-orange-400" />
                    ),
                    p: ({node, ...props}: any) => (
                      <p {...props} className="mb-1.5 last:mb-0" />
                    ),
                    code: ({node, ...props}: any) => (
                      <code {...props} className="bg-slate-950/90 text-orange-400 font-mono text-[13px] px-1.5 py-0.5 rounded border border-orange-500/10" />
                    ),
                    ul: ({node, ...props}: any) => (
                      <ul {...props} className="list-disc pl-4 space-y-1 mb-1.5" />
                    ),
                    ol: ({node, ...props}: any) => (
                      <ol {...props} className="list-decimal pl-4 space-y-1 mb-1.5" />
                    ),
                    li: ({node, ...props}: any) => (
                      <li {...props} className="mb-0.5 last:mb-0" />
                    )
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start items-end gap-2.5">
             <div className="w-7 h-7 rounded-full bg-[#131A2E] flex items-center justify-center shrink-0 border border-slate-800">
                <Terminal size={12} className="text-orange-400" />
              </div>
            <div className="bg-[#131A2E]/90 px-4 py-3 rounded-[18px] rounded-bl-[4px] border border-slate-800/80 shadow-md flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-400/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-orange-400/70 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* --- NÚT CUỘN NHANH --- */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 10 }}
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-20 right-1/2 translate-x-1/2 w-8 h-8 bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-[0_4px_15px_rgba(0,0,0,0.5)] rounded-full flex items-center justify-center text-orange-400 hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
          >
            <ArrowDown size={16} strokeWidth={2.5} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-orange-500 border-2 border-[#0B0F19] rounded-full animate-pulse"></span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* --- FOOTER INPUT --- */}
      <div className="p-4 bg-[#0B0F19]/95 border-t border-slate-800/60 shrink-0 relative z-10">
        
        {/* --- DÃY BONG BÓNG GỢI Ý ĐOẠN CHAT (QUICK SUGGESTIONS - HORIZONTAL SCROLL) --- */}
        <div className="flex flex-row flex-nowrap gap-1.5 mb-3 overflow-x-auto whitespace-nowrap pb-2 pr-1 scrollbar-thin scrollbar-thumb-orange-500/20 scrollbar-track-transparent">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => sendDirectMessage(s.query)}
              className="inline-flex bg-[#161F38] hover:bg-[#1E2B4E] border border-slate-800/80 hover:border-orange-500/40 text-slate-200 hover:text-orange-400 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 cursor-pointer items-center gap-1 shrink-0 active:scale-95"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="relative flex items-center gap-2.5 bg-[#0E1527] hover:bg-[#121B32] rounded-[14px] p-1.5 focus-within:bg-[#0E1527] focus-within:ring-[3px] focus-within:ring-orange-500/10 transition-all duration-300 border border-slate-800/80 focus-within:border-orange-500/50 shadow-inner">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Gõ hoặc chọn gợi ý bên trái để tra cứu..."
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            className="flex-1 bg-transparent px-3 py-1.5 text-[14px] md:text-[14.5px] outline-none font-medium text-slate-100 placeholder:text-slate-500 tracking-wide"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-300 ${
              input.trim() && !isLoading 
              ? 'bg-[#EF5222] text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 hover:scale-105 active:scale-95 cursor-pointer' 
              : 'bg-slate-800/45 text-slate-600 cursor-not-allowed'
            }`}
          >
            <SendHorizonal size={16} className={input.trim() && !isLoading ? 'translate-x-[-0.5px] translate-y-[0.5px]' : ''} />
          </button>
        </div>
        <div className="text-center mt-2.5">
          <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Cơ sở dữ liệu Vận hành độc quyền Nhà Xe ABC</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <style>{`
        @keyframes rotate-gradient-orange {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-border-rotate-orange { animation: rotate-gradient-orange 4s linear infinite; }
        .scrollbar-thin::-webkit-scrollbar { width: 5px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: rgba(249, 115, 22, 0.2); border-radius: 20px; }
      `}</style>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] bg-slate-950/60 flex items-center justify-center p-4 md:p-10"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <div className={isExpanded ? "fixed inset-0 flex items-center justify-center pointer-events-none" : "mb-6 origin-bottom-right pointer-events-auto"}>
              <div className={isExpanded ? "pointer-events-auto" : ""}>
                {ChatWindow}
              </div>
            </div>
          )}
        </AnimatePresence>

        <motion.div className="relative pointer-events-auto" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          {!isOpen && (
            <div className="absolute inset-[-6px] rounded-full overflow-hidden opacity-70">
               <div className="absolute inset-[-100%] animate-border-rotate-orange bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#EF5222_360deg)]"></div>
               <div className="absolute inset-[-100%] animate-border-rotate-orange [animation-delay:2s] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#F97316_360deg)]"></div>
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative w-16 h-16 rounded-full shadow-[0_10px_40px_rgba(239,82,34,0.3)] flex items-center justify-center transition-all duration-500 border-4 border-slate-900 z-10 cursor-pointer ${
              isOpen ? 'bg-slate-800 text-slate-400 rotate-90 shadow-none' : 'bg-gradient-to-br from-[#EF5222] to-orange-500 text-white hover:shadow-[0_15px_50px_rgba(239,82,34,0.5)] border-slate-900'
            }`}
          >
            {isOpen ? <X size={28} strokeWidth={2.5} className="-rotate-90 transition-transform" /> : (
              <div className="relative flex items-center justify-center">
                <Sparkles size={24} className="absolute -top-3 -right-3 text-yellow-300 w-4 h-4 animate-pulse" />
                <Terminal size={26} strokeWidth={2.5} />
              </div>
            )}
          </button>
        </motion.div>
      </div>
    </>
  );
}
