'use client';
import { API_BASE } from '@/lib/api';
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// IMPORT COMPONENT BREADCRUMB VÀO ĐÂY
// (Đổi lại đường dẫn import này cho đúng với thư mục dự án của bạn nếu cần)
import { Breadcrumb } from '@/components/ui/Breadcrumb';

interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  
  // Quản lý lỗi báo đỏ cho từng ô nhập liệu
  const [errors, setErrors] = useState({
    phone: false,
    email: false,
  });

  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  // Tự động ẩn thông báo trạng thái sau 5s
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // Hàm kiểm tra định dạng SDT Việt Nam
  const validatePhone = (phone: string) => {
    const vnf_regex = /^(03|05|07|08|09|01[2|6|8|9])([0-9]{8})$/;
    return vnf_regex.test(phone);
  };

  // Hàm kiểm tra định dạng Email
  const validateEmail = (email: string) => {
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email_regex.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    // Kiểm tra định dạng ngay lập tức để báo đỏ
    if (id === "phone") {
      setErrors(prev => ({ ...prev, phone: value.length > 0 && !validatePhone(value) }));
    }
    if (id === "email") {
      setErrors(prev => ({ ...prev, email: value.length > 0 && !validateEmail(value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatusMsg(null);
  
    // Kiểm tra lại lần cuối trước khi gửi
    if (!validateEmail(formData.email) || !validatePhone(formData.phone)) {
      setErrors({
        email: !validateEmail(formData.email),
        phone: !validatePhone(formData.phone)
      });
      setStatusMsg({ type: 'error', text: "Vui lòng kiểm tra lại các trường báo đỏ!" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Gửi dữ liệu để lưu vào CSDL
      const res = await fetch("${API_BASE}/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          createdAt: new Date().toISOString()
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setFormData({ name: "", phone: "", email: "", message: "" });
      } else {
        setStatusMsg({ type: 'error', text: "Máy chủ từ chối yêu cầu (Lỗi CSDL)." });
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: "Lỗi kết nối Backend hoặc Database!" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:py-6 font-sans min-h-[calc(100vh-80px)] flex flex-col justify-center">
      
      {/* --- COMPONENT BREADCRUMB ĐƯỢC THÊM VÀO ĐÂY --- */}
      <div className="mb-2 w-full">
        <Breadcrumb items={[{ label: 'Liên hệ', href: '/lien-he' }]} />
      </div>

      {/* Tiêu đề */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <span className="inline-block px-4 py-1 mb-2 text-[10px] font-black tracking-[0.2em] text-[#F56A19] uppercase bg-orange-50 rounded-full">
          Hành trình vạn dặm - Phục vụ tận tâm
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl uppercase tracking-tight">
          LIÊN HỆ VỚI <span className="text-[#F56A19]">CHÚNG TÔI</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 italic italic">"Nhà xe ABC - Chất lượng là danh dự"</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10 items-stretch">
        {/* Cột trái: Thông tin */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col justify-center space-y-6 rounded-3xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-black/5">
          <h3 className="text-xl font-bold text-slate-900 border-l-4 border-[#F56A19] pl-3">Thông Tin Trụ Sở</h3>
          <div className="space-y-5">
            <div className="flex items-center gap-4 group">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-[#F56A19] group-hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /></svg>
              </div>
              <p className="text-sm font-bold text-slate-800">123 Đường Nguyễn Huệ, Quận 1, TP. HCM</p>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-[#F56A19] group-hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <p className="text-sm font-bold text-slate-800 underline decoration-[#F56A19] decoration-2 underline-offset-4">1900 123 456</p>
            </div>
          </div>
        </motion.div>

        {/* Cột phải: Form liên hệ */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="relative overflow-hidden rounded-3xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-black/5">
          <AnimatePresence>
            {statusMsg && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-xs font-bold ${statusMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {statusMsg.text}
              </motion.div>
            )}
          </AnimatePresence>

          {submitted ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-bold">Gửi thành công!</h3>
              <p className="text-sm text-slate-500">Yêu cầu của bạn đã được lưu vào hệ thống.</p>
              <button onClick={() => setSubmitted(false)} className="text-sm font-bold text-[#F56A19] hover:underline">Gửi thêm tin nhắn</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Họ tên</label>
                  <input id="name" required type="text" value={formData.name} onChange={handleChange}
                    className="w-full rounded-xl bg-slate-50 px-4 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-[#F56A19] outline-none transition-all" />
                </div>
                
                {/* Số điện thoại báo đỏ */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Số điện thoại</label>
                  <input id="phone" required type="tel" value={formData.phone} onChange={handleChange}
                    className={`w-full rounded-xl px-4 py-2.5 text-sm ring-1 transition-all outline-none ${errors.phone ? "bg-red-50 ring-red-500 focus:ring-red-500" : "bg-slate-50 ring-slate-200 focus:ring-2 focus:ring-[#F56A19]"}`} />
                  {errors.phone && <p className="text-[10px] text-red-500 font-bold ml-1">Số điện thoại không hợp lệ!</p>}
                </div>
              </div>

              {/* Email báo đỏ */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Email</label>
                <input id="email" required type="email" value={formData.email} onChange={handleChange}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm ring-1 transition-all outline-none ${errors.email ? "bg-red-50 ring-red-500 focus:ring-red-500" : "bg-slate-50 ring-slate-200 focus:ring-2 focus:ring-[#F56A19]"}`} />
                {errors.email && <p className="text-[10px] text-red-500 font-bold ml-1">Email sai định dạng!</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Nội dung</label>
                <textarea id="message" required rows={3} value={formData.message} onChange={handleChange}
                  className="w-full resize-none rounded-xl bg-slate-50 px-4 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-[#F56A19] outline-none transition-all"></textarea>
              </div>

              <button type="submit" disabled={isSubmitting || errors.phone || errors.email}
                className="w-full rounded-xl bg-gradient-to-r from-[#FF8A2A] to-[#E24D12] py-4 text-sm font-black text-white shadow-lg shadow-orange-200 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? "ĐANG LƯU DỮ LIỆU..." : "GỬI YÊU CẦU NGAY"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}