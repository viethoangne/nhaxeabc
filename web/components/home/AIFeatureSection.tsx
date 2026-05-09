'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Bot, MessageSquareText, Sparkles, Clock4, ArrowRight } from 'lucide-react';

export default function AIFeatureSection() {
  return (
    <section className="py-16 md:py-24 bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-orange-400 rounded-full blur-[100px] opacity-20"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-400 rounded-full blur-[100px] opacity-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12 md:mb-16">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 text-xs font-black tracking-[0.2em] text-[#F56A19] uppercase bg-orange-100/80 rounded-full"
          >
            Đột phá công nghệ
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight uppercase"
          >
            TRẢI NGHIỆM ĐẶT VÉ <span className="text-[#F56A19]">CÙNG AI</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-slate-600 max-w-2xl mx-auto font-medium text-sm md:text-base"
          >
            Quên đi những thao tác tìm kiếm phức tạp. Giờ đây, chỉ với vài dòng tin nhắn hoặc giọng nói, Trợ lý AI của chúng tôi sẽ thiết kế cho bạn hành trình hoàn hảo nhất.
          </motion.p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[400px]">
          
          {/* Card 1: Khối chính (Main Feature) - Chiếm 1 cột, 2 hàng trên desktop */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative md:col-span-1 md:row-span-2 bg-slate-800 rounded-[2.5rem] overflow-hidden group shadow-2xl"
          >
            {/* Ảnh nền thay thế (Bạn nhớ đổi đường dẫn ảnh vào thư mục public) */}
            <Image src="/brand/AI1.png" alt="AI Booking" fill className="object-cover opacity-100 group-hover:scale-108 transition-transform duration-700" /> 
            
            
            <div className="relative z-20 p-8 h-full flex flex-col justify-end">
            
                <ArrowRight className="w-5 h-4" />

            </div>
          </motion.div>

          {/* Card 2: Khối ngang phía trên - Chiếm 2 cột */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative md:col-span-2 bg-white rounded-[2.5rem] p-8 overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row items-center gap-8 group"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                  <MessageSquareText className="text-[#F56A19] w-5 h-5" />
                </div>
                <span className="font-black text-slate-800 tracking-tight text-lg">Đặt vé qua tin nhắn</span>
              </div>
              <p className="text-slate-500 text-sm font-medium mb-6">
                Chỉ cần gõ: <span className="font-bold text-[#F56A19]">"Tôi muốn mua vé đi từ Hà Nội đến Đà Lạt Ngày mai"</span>. AI sẽ tự động phân tích và đưa ra lựa chọn giờ tốt nhất, bạn chỉ cần giờ và lựu chọn ghế. Không cần thao tác qua từng bước.
              </p>
              
              {/* Mô phỏng khung chat */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex gap-3 mb-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0"></div>
                  <div className="bg-white px-4 py-2 rounded-2xl rounded-tl-sm text-xs font-medium shadow-sm border border-slate-100"></div>
                </div>
                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-8 h-8 bg-[#F56A19] rounded-full shrink-0 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                  <div className="bg-[#F56A19] text-white px-4 py-2 rounded-2xl rounded-tr-sm text-xs font-medium shadow-sm">Dạ, hiện tối nay có chuyến 22:00 và 23:00. Ghế VIP A1, A2 đang trống. Mình chọn chuyến nào ạ? 🚌</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Khối nhỏ bên dưới (Gợi ý lộ trình) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#F56A19] to-[#E24D12] rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-500/30 relative overflow-hidden"
          >
            {/* Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <Sparkles className="w-8 h-8 mb-4 text-orange-200" />
              <h3 className="text-xl font-black mb-2">Gợi ý cá nhân hóa</h3>
              <p className="text-orange-100 text-sm font-medium leading-relaxed">
                Hệ thống AI tự động ghi nhớ thói quen đi lại, sở thích chọn ghế (cạnh cửa sổ, giường dưới) để đề xuất chuyến đi hoàn hảo cho riêng bạn.
              </p>
            </div>
          </motion.div>

          {/* Card 4: Khối nhỏ bên dưới (Hỗ trợ nhanh) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100"
          >
            <Clock4 className="w-8 h-8 mb-4 text-slate-700" />
            <h3 className="text-xl font-black mb-2 text-slate-800">Xử lý tức thì</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-4">
                
              Bạn cần hủy vé? Trợ lý AI sẽ hỗ trợ xử lý ngay lập tức 24/7 mà không cần qua tổng đài viên.
            </p>
            <span className="text-xs font-bold text-[#F56A19] uppercase tracking-wider flex items-center gap-1">
              Không chờ đợi <ArrowRight className="w-3 h-3" />
            </span>
          </motion.div>

        </div>
      </div>
    </section>
  );
}