'use client';
import { API_BASE } from '@/lib/api';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useUserStore } from '../../src/store/useUserStore';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Clock, Star, Sparkles, Ticket, ShieldCheck, ChevronRight, CheckCircle2, XCircle, Zap } from 'lucide-react';

// ── CONFETTI COMPONENT ─────────────────────────────
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 30 });
  const colors = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#ec4899', '#a855f7'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {pieces.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            backgroundColor: colors[i % colors.length],
            rotate: Math.random() * 360,
          }}
          animate={{ y: window.innerHeight + 50, rotate: Math.random() * 720, opacity: [1, 1, 0] }}
          transition={{ duration: 1.5 + Math.random(), ease: 'easeIn', delay: Math.random() * 0.4 }}
        />
      ))}
    </div>
  );
}

// ── VOUCHER CARD ────────────────────────────────────
function VoucherCard({ v, points, onRedeem }: { v: any; points: number; onRedeem: (v: any) => void }) {
  const canRedeem = points >= v.cost;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={canRedeem ? { y: -6, boxShadow: '0 20px 40px rgba(249,115,22,0.25)' } : {}}
      className={`relative flex rounded-2xl overflow-hidden border ${canRedeem ? 'border-orange-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'} transition-colors`}
    >
      {/* Left colour bar */}
      <div className={`w-2 shrink-0 ${canRedeem ? 'bg-gradient-to-b from-orange-400 to-rose-500' : 'bg-slate-300'}`} />

      {/* Info section */}
      <div className="flex-1 p-5 border-r border-dashed border-slate-200 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-orange-500/5" />
        <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-black tracking-widest rounded-md mb-2 border border-slate-200 font-mono">
          {v.code}
        </span>
        <h3 className={`font-bold text-base leading-snug mb-1 ${canRedeem ? 'text-slate-800' : 'text-slate-500'}`}>{v.title}</h3>
        <p className={`text-sm font-semibold ${canRedeem ? 'text-rose-500' : 'text-slate-400'}`}>
          {v.type === 'percent' ? `Giảm ${v.value}%` : `Giảm ${v.value.toLocaleString()}đ`}
        </p>
        {v.maxAmount && <p className="text-xs text-slate-400 mt-0.5">Tối đa: {v.maxAmount.toLocaleString()}đ</p>}
      </div>

      {/* Redeem section */}
      <div className={`w-28 shrink-0 flex flex-col items-center justify-center gap-3 p-4 ${canRedeem ? 'bg-orange-50' : 'bg-slate-100'}`}>
        <div className="text-center">
          <div className={`font-black text-xl flex items-center justify-center gap-1 ${canRedeem ? 'text-orange-600' : 'text-slate-400'}`}>
            {v.cost} <Star className={`w-4 h-4 ${canRedeem ? 'fill-orange-500 text-orange-500' : 'fill-slate-400 text-slate-400'}`} />
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Điểm</span>
        </div>
        <motion.button
          onClick={() => onRedeem(v)}
          disabled={!canRedeem}
          whileTap={canRedeem ? { scale: 0.92 } : {}}
          className={`w-full py-2 rounded-xl font-bold text-sm transition-colors ${canRedeem ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          Đổi ngay
        </motion.button>
      </div>

      {/* Ticket notches */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-50 rounded-full border border-slate-200 -ml-2.5" />
      <div className="absolute right-28 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-50 rounded-full border border-slate-200 mr-[-10px]" />
    </motion.div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────
export default function LoyaltyPage() {
  const { data: session } = useSession();
  const { points, setPoints } = useUserStore();
  const [activeTab, setActiveTab] = useState<'redeem' | 'my_vouchers' | 'history'>('redeem');
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (session?.user) {
      const userId = (session.user as any)?.id;
      setLoading(true);
      axios.get(`${API_BASE}/loyalty?userId=${userId}`)
        .then(res => {
          setPoints(res.data.points || 0);
          setVouchers(res.data.redeemableVouchers || []);
          setMyVouchers(res.data.myVouchers || []);
          setHistoryLogs(res.data.history || []);
        })
        .catch(() => showToast('Không tải được dữ liệu điểm thưởng.', 'error'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session, setPoints]);

  const handleRedeem = async (item: any) => {
    const userId = (session?.user as any)?.id;
    if (!userId) return showToast('Vui lòng đăng nhập!', 'error');
    if (points < item.cost) return showToast('Bạn không đủ điểm để đổi mã này!', 'error');

    try {
      const response = await axios.post('${API_BASE}/loyalty/redeem', { userId, voucherId: item.id });
      if (response.data) {
        setPoints(response.data.newPoints);
        setMyVouchers(prev => [response.data.newVoucher, ...prev]);
        setHistoryLogs(prev => [{
          type: 'spend', amount: item.cost,
          description: `Đổi mã ưu đãi: ${item.title}`,
          date: new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
        }, ...prev]);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
        showToast(`🎉 Đã đổi thành công: ${item.title}`, 'success');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!', 'error');
    }
  };

  const TABS = [
    { key: 'redeem', label: 'Đổi điểm ưu đãi', icon: Gift },
    { key: 'my_vouchers', label: 'Kho Voucher', icon: Ticket },
    { key: 'history', label: 'Lịch sử điểm', icon: Clock },
  ] as const;

  return (
    <div className="max-w-[1250px] mx-auto px-4 py-8 min-h-screen">
      <Confetti active={showConfetti} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-semibold text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Khách hàng thân thiết', href: '/loyalty' }]} />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── LEFT COLUMN ── */}
        <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-5">

          {/* VIP Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative h-[220px] rounded-3xl p-7 overflow-hidden shadow-2xl shadow-orange-500/30 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#c2410c] via-[#f97316] to-[#eab308]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
              animate={{ x: ['-150%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-orange-100 font-semibold text-xs tracking-widest uppercase mb-1">Thành viên</p>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">ABC Loyalty <ShieldCheck className="w-5 h-5 text-yellow-300" /></h2>
                </div>
                <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                  <span className="text-white font-black text-xs tracking-widest">VIP</span>
                </div>
              </div>
              <div>
                <p className="text-orange-100 text-xs font-semibold mb-1 uppercase tracking-widest">Điểm tích lũy</p>
                <div className="flex items-baseline gap-2">
                  <motion.span
                    key={points}
                    initial={{ scale: 1.3, color: '#fef9c3' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    className="text-5xl font-black drop-shadow-lg"
                  >
                    {points.toLocaleString()}
                  </motion.span>
                  <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Nav */}
          <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-sm transition-all mb-1 last:mb-0 ${activeTab === key ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-orange-50 hover:text-orange-600'}`}
              >
                <div className="flex items-center gap-3"><Icon className="w-4 h-4" />{label}</div>
                {activeTab === key && <ChevronRight className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {/* Info */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-5 rounded-3xl">
            <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2 text-sm">
              <Zap className="w-4 h-4 fill-orange-500 text-orange-500" /> Cách tích điểm
            </h4>
            <p className="text-sm text-orange-700 leading-relaxed">
              Mỗi vé xe thành công trị giá <strong>10.000đ</strong> sẽ cộng <strong>100 điểm</strong> vào tài khoản của bạn sau khi hành trình hoàn thành.
            </p>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex-1 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 min-h-[500px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
              <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              <p className="font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">

              {/* TAB: REDEEM */}
              {activeTab === 'redeem' && (
                <motion.div key="redeem" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <div className="mb-7">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-1">
                      Đổi điểm lấy ưu đãi
                      <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" /></span>
                    </h2>
                    <p className="text-slate-500 text-sm">Dùng điểm tích luỹ để đổi lấy mã giảm giá hấp dẫn.</p>
                  </div>
                  {vouchers.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Gift className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-400 font-medium">Chưa có ưu đãi nào khả dụng.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {vouchers.map(v => <VoucherCard key={v.id} v={v} points={points} onRedeem={handleRedeem} />)}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB: MY VOUCHERS */}
              {activeTab === 'my_vouchers' && (
                <motion.div key="my_vouchers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-2xl font-black text-slate-800 mb-1">Kho Voucher của tôi</h2>
                  <p className="text-slate-500 text-sm mb-7">Các mã giảm giá bạn đã đổi. Áp dụng khi đặt vé nhé!</p>
                  {myVouchers.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Ticket className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-400 font-medium mb-3">Bạn chưa có voucher nào.</p>
                      <button onClick={() => setActiveTab('redeem')} className="text-orange-600 font-bold hover:underline text-sm">Khám phá ưu đãi ngay →</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {myVouchers.map((v, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          className={`flex items-center justify-between p-5 rounded-2xl border overflow-hidden relative ${v.isUsed ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200'}`}
                        >
                          {!v.isUsed && <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-orange-400 opacity-10 blur-xl" />}
                          <div className="relative z-10">
                            <span className={`inline-block font-mono px-3 py-1 text-sm font-black tracking-widest rounded-md mb-1 ${v.isUsed ? 'bg-slate-200 text-slate-500' : 'bg-white text-orange-600 border border-orange-200'}`}>{v.code}</span>
                            <p className={`font-bold text-sm ${v.isUsed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{v.title}</p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${v.isUsed ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                            {v.isUsed ? 'Đã dùng' : 'Khả dụng'}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB: HISTORY */}
              {activeTab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-2xl font-black text-slate-800 mb-7">Lịch sử giao dịch điểm</h2>
                  {historyLogs.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Clock className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-400 font-medium">Chưa có giao dịch nào.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-100 ml-4 space-y-6">
                      {historyLogs.map((log, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative pl-8">
                          <div className={`absolute -left-[9px] top-2 w-4 h-4 rounded-full border-2 border-white shadow-sm ${log.type === 'earn' ? 'bg-green-500' : log.type === 'spend' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex justify-between items-start gap-4">
                              <p className="font-semibold text-slate-700 text-sm leading-snug">{log.description}</p>
                              <span className={`font-black whitespace-nowrap text-base ${log.type === 'earn' ? 'text-green-600' : 'text-rose-600'}`}>
                                {log.type === 'earn' ? '+' : '-'}{log.amount} đ
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5 font-medium">{log.date}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}