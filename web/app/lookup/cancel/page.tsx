'use client';
import { API_BASE } from '@/lib/api';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function CancelTicketPage() {
  const t = useTranslations('cancelTicketPage');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lấy dữ liệu từ URL
  const orderCode = searchParams.get('orderCode');
  const phone = searchParams.get('phone');
  const amount = Number(searchParams.get('amount') || 0);
  const departureDate = searchParams.get('date');
  const customerName = searchParams.get('name');

  const [confirmEmail, setConfirmEmail] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tính toán chính sách hoàn tiền
  const getRefundInfo = () => {
    if (!departureDate) return { percent: 0, amount: 0 };
    const timeDiffHours = (new Date(departureDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    
    let percent = 0;
    if (timeDiffHours >= 24) percent = 100;
    else if (timeDiffHours >= 12) percent = 50;
    
    return { percent, refundAmount: (amount * percent) / 100 };
  };

  const { percent, refundAmount } = getRefundInfo();

  const handleConfirmCancel = async () => {
    if (!confirmEmail.trim()) return alert(t('emailAlert'));
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/cancel-ticket`, {
        orderCode, phone, email: confirmEmail.trim()
      });
      alert(res.data.message || t('successAlert'));
      router.push('/lookup'); // Quay về trang tra cứu sau khi xong
    } catch (err: any) {
      alert(err.response?.data?.message || t('systemError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 max-w-2xl w-full border border-gray-100 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
        
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-2 font-bold text-sm">
          ← {t('back')}
        </button>

        <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">{t('title')}</h1>
        <p className="text-gray-500 text-sm mb-8 font-medium">{t('orderInfo', { orderCode, customerName })}</p>

        {/* KHỐI TIỀN HOÀN */}
        <div className="bg-red-50 border border-red-100 rounded-[2rem] p-8 mb-8 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('refundPercent')}</span>
            <p className="text-3xl font-black text-red-600">{percent}%</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('refundAmount')}</span>
            <p className="text-3xl font-black text-red-600">{refundAmount.toLocaleString('vi-VN')}đ</p>
          </div>
        </div>

        {/* ĐIỀU KHOẢN */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 text-sm text-gray-600 leading-relaxed border border-gray-100 max-h-48 overflow-y-auto">
            <h3 className="font-black text-black uppercase text-[10px] mb-3 tracking-widest">{t('termsTitle')}</h3>
            <ul className="list-disc pl-5 space-y-2 font-medium">
              <li>{t('term1')}</li>
              <li>{t('term2')}</li>
              <li>{t('term3')}</li>
            </ul>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)}
              className="w-6 h-6 rounded-lg border-2 border-gray-300 checked:bg-red-500 transition-all"
            />
            <span className="text-sm font-bold text-gray-700 group-hover:text-red-600">{t('agreeTerms')}</span>
          </label>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">{t('securityEmail')}</label>
            <input
              type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-500/20 font-bold"
            />
          </div>

          <button 
            onClick={handleConfirmCancel}
            disabled={loading || !isAgreed || !confirmEmail}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all
              ${isAgreed && confirmEmail ? 'bg-red-500 text-white shadow-red-200 hover:bg-red-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {loading ? t('processing') : t('cancelBtn')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}