'use client';

import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation'; // 🟢 THÊM DÒNG NÀY
import { useTranslations, useLocale } from 'next-intl';
import { 
  SendHorizonal, 
  Bot, 
  X, 
  Maximize2, 
  Minimize2, 
  Loader2, 
  MessageSquareText,
  Sparkles,
  ArrowDown,
  Trash2 // <--- IMPORT THÊM ICON THÙNG RÁC
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatAI() {
  const pathname = usePathname(); // 🟢 LẤY ĐƯỜNG DẪN
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role; // 🟢 THÊM DÒNG NÀY ĐỂ LẤY ROLE
  const t = useTranslations('chatAI');
  const locale = useLocale();

  const defaultMessage: Message = { 
    role: 'assistant', 
    content: t('defaultWelcome')
  };

  const suggestions = [
    { label: t('sug1Label'), query: t('sug1Query') },
    { label: t('sug2Label'), query: t('sug2Query') },
    { label: t('sug3Label'), query: t('sug3Query') },
    { label: t('sug4Label'), query: t('sug4Query') },
    { label: t('sug5Label'), query: t('sug5Query') },
    { label: t('sug6Label'), query: t('sug6Query') }
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- TỰ ĐỘNG MỞ CHAT KHI CÓ SỰ KIỆN TỪ SIDEBAR ---
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener("open-ai-chat", handleOpenChat);
    return () => window.removeEventListener("open-ai-chat", handleOpenChat);
  }, []);
  
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- 1. ĐỒNG BỘ LỊCH SỬ ---
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated' && userId) {
      axios.get(`${API_BASE}/chat/history?userId=${userId}`)
        .then(response => {
          if (response.data && response.data.length > 0) {
            // response.data đã trả về 'asc' (cũ trên, mới dưới) từ Backend
            setMessages([defaultMessage, ...response.data]);
          } else {
            setMessages([defaultMessage]);
          }
        })
        .catch(error => {
          console.error("Lỗi fetch lịch sử:", error);
          setMessages([defaultMessage]);
        });
    } else {
      setMessages([defaultMessage]);
    }
  }, [status, userId, defaultMessage.content]);

  // --- HÀM XÓA LỊCH SỬ CHAT ---
  const handleDeleteHistory = async () => {
    if (!userId) return;
    
    // Cảnh báo người dùng trước khi xóa
    const isConfirm = window.confirm(t('confirmDeleteHistory'));
    if (!isConfirm) return;

    try {
      await axios.delete(`${API_BASE}/chat/history?userId=${userId}`);
      // Xóa thành công thì reset UI về tin nhắn mặc định
      setMessages([defaultMessage]);
    } catch (error) {
      console.error("Lỗi xóa lịch sử:", error);
      alert(t('deleteHistoryError'));
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
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', content: input };
    // Nối thêm tin nhắn vào cuối mảng -> Sẽ hiển thị ở dưới cùng
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
  
    try {
      const res = await axios.post(`${API_BASE}/chat`, { 
        message: input,
        history: messages,
        userId: userId,
        locale: locale
      });
  
      if (res.data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      }
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: t('networkError') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendDirectMessage = async (query: string) => {
    if (isLoading) return;
    const userMsg: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
  
    try {
      const res = await axios.post(`${API_BASE}/chat`, { 
        message: query,
        history: messages,
        userId: userId,
        locale: locale
      });
  
      if (res.data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      }
    } catch (error) {
      console.error("Lỗi gửi tin nhắn trực tiếp:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: t('networkError') }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🟢 ĐIỀU KIỆN CHẶN HIỂN THỊ CHAT
  // Ẩn nếu là trang login, hoặc user có role là ADMIN/STAFF, hoặc đang đứng ở route /admin
  if (
    pathname === '/login' || 
    pathname === '/auth-check' || 
    pathname.startsWith('/admin') || // Chặn luôn toàn bộ các trang bắt đầu bằng /admin cho chắc ăn
    userRole === 'ADMIN' || 
    userRole === 'STAFF'
  ) {
    return null; 
  }

  const ChatWindow = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 30 }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
      className={`flex flex-col bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_20px_50px_rgba(239,82,34,0.15)] border border-gray-100 overflow-hidden ring-1 ring-black/[0.03] antialiased relative z-50 transition-all duration-300 ${
        isExpanded 
        ? 'w-[90vw] h-[85vh] max-w-[1200px]' 
        : 'w-[360px] h-[520px]'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* --- HEADER --- */}
      <div className="relative px-5 py-3.5 flex justify-between items-center shrink-0 border-b border-gray-100/50 bg-white/80">
        <div className="absolute inset-0 bg-gradient-to-r from-[#EF5222]/5 to-[#ff7e5a]/5 pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-[#EF5222] to-[#D93814] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles size={18} className="text-white absolute top-1.5 right-1.5 opacity-50 w-3 h-3" />
              <Bot size={20} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
            </div>
          </div>
          <div>
            <h3 className="font-extrabold text-[15px] text-gray-900 tracking-tight leading-none mb-1">
              {t('assistantTitle')}
            </h3>
            <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
              {userId ? t('statusSynced') : t('statusGuest')}
            </p>
          </div>
        </div>

        {/* --- CÁC NÚT ĐIỀU KHIỂN --- */}
        <div className="flex items-center gap-1 relative z-10">
          {userId && messages.length > 1 && (
            <button 
              onClick={handleDeleteHistory} 
              title={t('deleteHistoryTooltip')}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <Trash2 size={16} strokeWidth={2.5} />
            </button>
          )}

          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg transition-all duration-200">
            {isExpanded ? <Minimize2 size={16} strokeWidth={2.5} /> : <Maximize2 size={16} strokeWidth={2.5} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* --- BODY CHAT --- */}
      <div 
        ref={chatContainerRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFAFC]/50 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent relative"
      >
        {messages.map((msg, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={index} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2.5`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center shrink-0 border border-orange-100 shadow-sm mb-0.5">
                <Bot size={14} className="text-[#EF5222]" />
              </div>
            )}
            
            <div className={`max-w-[85%] px-4 py-3 text-[14px] md:text-[14.5px] leading-[1.6] tracking-tight shadow-sm ${
              msg.role === 'user' 
              ? 'bg-gradient-to-br from-[#EF5222] to-[#E64115] text-white rounded-[18px] rounded-br-[4px] shadow-orange-500/20 font-medium' 
              : 'bg-white text-gray-700 rounded-[18px] rounded-bl-[4px] border border-gray-100 shadow-gray-200/20'
            }`}>
              <div className="whitespace-pre-wrap break-words">
                <ReactMarkdown 
                  components={{
                    a: ({node, ...props}: any) => (
                      <a {...props} className="text-[#EF5222] font-semibold underline decoration-[#EF5222]/30 hover:decoration-[#EF5222] transition-colors" target="_blank" rel="noopener noreferrer" />
                    ),
                    strong: ({node, ...props}: any) => (
                      <strong {...props} className={`font-bold ${msg.role === 'user' ? 'text-white' : 'text-gray-900'}`} />
                    ),
                    p: ({node, ...props}: any) => (
                      <p {...props} className="mb-1.5 last:mb-0" />
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
             <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center shrink-0 border border-orange-100">
                <Bot size={14} className="text-[#EF5222]" />
              </div>
            <div className="bg-white px-4 py-3 rounded-[18px] rounded-bl-[4px] border border-gray-100 shadow-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#EF5222]/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-[#EF5222]/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-[#EF5222] rounded-full animate-bounce"></span>
            </div>
          </motion.div>
        )}

        {/* THẺ ĐỊNH VỊ ĐÁY SCROLL */}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* --- NÚT CUỘN XUỐNG DƯỚI CÙNG --- */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 10 }}
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-20 right-1/2 translate-x-1/2 w-8 h-8 bg-white/95 backdrop-blur-md border border-gray-200 shadow-[0_4px_15px_rgba(0,0,0,0.15)] rounded-full flex items-center justify-center text-[#EF5222] hover:bg-orange-50 hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
          >
            <ArrowDown size={16} strokeWidth={2.5} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* --- FOOTER INPUT --- */}
      <div className="p-4 bg-white/90 backdrop-blur-xl border-t border-gray-100/50 shrink-0 relative z-10">
        
        {/* --- DÃY BONG BÓNG GỢI Ý ĐOẠN CHAT (QUICK SUGGESTIONS - HORIZONTAL SCROLL) --- */}
        <div className="flex flex-row flex-nowrap gap-1.5 mb-3 overflow-x-auto whitespace-nowrap pb-2 pr-1 scrollbar-thin scrollbar-thumb-orange-500/20 scrollbar-track-transparent">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => sendDirectMessage(s.query)}
              className="inline-flex bg-white hover:bg-orange-50/50 border border-gray-200/80 hover:border-[#EF5222]/40 text-gray-700 hover:text-[#EF5222] rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 cursor-pointer items-center shrink-0 active:scale-95"
            >
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="relative flex items-center gap-2.5 bg-gray-50/80 hover:bg-gray-50 rounded-[14px] p-1.5 focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#EF5222]/10 transition-all duration-300 border border-gray-200/80 focus-within:border-[#EF5222]/30 shadow-inner">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('inputPlaceholder')}
            className="flex-1 bg-transparent px-3 py-1.5 text-[14px] outline-none font-medium text-gray-700 placeholder:text-gray-400 tracking-tight"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-300 ${
              input.trim() && !isLoading 
              ? 'bg-gradient-to-br from-[#EF5222] to-[#D93814] text-white shadow-md shadow-orange-500/20 hover:scale-105 active:scale-95 cursor-pointer' 
              : 'bg-gray-200/50 text-gray-400 cursor-not-allowed'
            }`}
          >
            <SendHorizonal size={16} className={input.trim() && !isLoading ? 'translate-x-[-0.5px] translate-y-[0.5px]' : ''} />
          </button>
        </div>
        <div className="text-center mt-2.5">
          <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">{t('poweredBy')}</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <style>{`
        @keyframes rotate-gradient {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-border-rotate { animation: rotate-gradient 4s linear infinite; }
        .scrollbar-thin::-webkit-scrollbar { width: 5px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; }
      `}</style>

      {/* Lớp Overlay */}
      <AnimatePresence>
        {isOpen && isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] bg-slate-900/30 flex items-center justify-center p-4 md:p-10"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Khung chat góc phải */}
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

        {/* Nút bật tắt chat */}
        <motion.div className="relative pointer-events-auto" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          {!isOpen && (
            <div className="absolute inset-[-6px] rounded-full overflow-hidden opacity-70">
               <div className="absolute inset-[-100%] animate-border-rotate bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#EF5222_360deg)]"></div>
               <div className="absolute inset-[-100%] animate-border-rotate [animation-delay:2s] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#fbbf24_360deg)]"></div>
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative w-16 h-16 rounded-full shadow-[0_10px_40px_rgba(239,82,34,0.3)] flex items-center justify-center transition-all duration-500 border-4 border-white z-10 cursor-pointer ${
              isOpen ? 'bg-gray-100 text-gray-500 rotate-90 shadow-none' : 'bg-gradient-to-br from-[#EF5222] to-[#D93814] text-white hover:shadow-[0_15px_50px_rgba(239,82,34,0.4)]'
            }`}
          >
            {isOpen ? <X size={28} strokeWidth={2.5} className="-rotate-90 transition-transform" /> : (
              <div className="relative flex items-center justify-center">
                <Sparkles size={24} className="absolute -top-3 -right-3 text-yellow-300 w-4 h-4 animate-pulse" />
                <Bot size={28} strokeWidth={2} />
              </div>
            )}
          </button>
        </motion.div>
      </div>
    </>
  );
}