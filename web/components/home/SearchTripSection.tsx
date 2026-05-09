'use client';

import TripCard from '@/components/ui/TripCard';
import EmptyState from '@/components/ui/EmptyState';
import type { Trip } from '@/types';
import { useLocale } from 'next-intl';

type Props = {
  title: string;
  trips: Trip[];
  selectedTrip: Trip | null;
  onSelectTrip: (trip: Trip) => void;
  buttonText: string;
  emptyText: string;
  labels: {
    selectSeat: string;
    schedule: string;
    transfer: string;
    policy: string;
    soldOut: string;
    stopBooking: string;
    availableSeats: string;
    contact: string;
    hour: string;
    minute: string;
    selected: string;
    totalFare: string;
    selectedOutboundLabel: string;
  };
};

export default function SearchTripSection({
  title,
  trips,
  selectedTrip,
  onSelectTrip,
  buttonText,
  emptyText,
  labels,
}: Props) {
  const locale = useLocale();

  /**
   * Helper để format thời gian và ngày tháng theo locale hiện tại
   */
  function formatDateTime(dateString?: string) {
    if (!dateString) return { time: '--:--', date: '' };
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return { time: '--:--', date: '' };

    return {
      time: d.toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      date: d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    };
  }

  // Thông tin của chuyến đi đã chọn (Outbound) để hiển thị tóm tắt phía trên
  const selectedDepart = formatDateTime(selectedTrip?.departDate);
  const selectedArrival = formatDateTime(
    selectedTrip?.arrivalDate || (selectedTrip as any)?.arrivalTime,
  );

  return (
    <section className="space-y-4">
      <h2 className="text-[28px] md:text-[32px] font-semibold text-slate-900">{title}</h2>
      

      {/* Hiển thị tóm tắt chuyến đi đã chọn (chỉ hiện khi user đang ở bước chọn chuyến về) */}
      {selectedTrip && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50 shadow-sm transition-all animate-in fade-in slide-in-from-top-4">
          <div className="bg-orange-500 px-4 py-2 text-sm font-bold text-white">
            {labels.selectedOutboundLabel}
          </div>

          <div className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {/* Giờ đi */}
                <div className="text-center min-w-[70px]">
                  <div className="text-2xl font-black text-slate-900">
                    {selectedDepart.time}
                  </div>
                  <div className="text-xs text-slate-500">{selectedDepart.date}</div>
                </div>

                {/* Đường nối */}
                <div className="flex flex-col items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <div className="h-8 w-[2px] bg-slate-300" />
                  <div className="h-2 w-2 rounded-full bg-green-600" />
                </div>

                {/* Giờ đến */}
                <div className="text-center min-w-[70px]">
                  <div className="text-2xl font-black text-slate-900">
                    {selectedArrival.time}
                  </div>
                  <div className="text-xs text-slate-500">{selectedArrival.date}</div>
                </div>

                {/* Tuyến đường */}
                <div className="ml-4">
                  <div className="flex items-center gap-2 text-lg md:text-xl font-bold text-slate-800">
                    <span>{selectedTrip.from}</span>
                    <span className="text-slate-400">→</span>
                    <span>{selectedTrip.to}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="bg-white px-2 py-0.5 rounded border border-orange-100">{selectedTrip.busType}</span>
                  </div>
                </div>
              </div>

              {/* Tổng tiền */}
              <div className="flex flex-row items-center justify-between border-t border-orange-100 pt-4 md:flex-col md:items-end md:border-none md:pt-0">
                <div className="text-xs font-medium uppercase text-slate-400">
                  {labels.totalFare}
                </div>
                <div className="text-2xl md:text-3xl font-black text-orange-600">
                  {/* Ép kiểu về VN format để luôn hiện "đ" */}
                  {(selectedTrip.price || 0).toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danh sách các chuyến xe có sẵn */}
      {trips.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="space-y-5">
          {trips.map((trip) => (
            // --- BỌC THÊM DIV RELATIVE ĐỂ HIỂN THỊ BADGE ĐỀ XUẤT ---
            <div key={trip.id} className="relative">
              
              {/* --- CHÈN BADGE ĐỀ XUẤT / PHỔ BIẾN --- */}
              {(trip as any).isRecommended && (
                <div className="absolute -top-3 -right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 z-20 animate-pulse border border-orange-300/50">
                  {/* Bỏ icon SVG sao chổi ở đây đi vì ta đã nhét Icon 🔥 và ✨ vào thẳng chữ recommendTag rồi */}
                  {(trip as any).recommendTag}
                </div>
              )}

              <TripCard
                trip={trip}
                // Kiểm tra xem card này có đang được chọn hay không
                selected={selectedTrip?.id === trip.id}
                onSelect={() => onSelectTrip(trip)}
                buttonText={buttonText}
                // TRUYỀN LABELS XUỐNG ĐỂ KHỬ LỖI UNDEFINED TRONG TRIPCARD
                labels={labels}
                className="transition-transform transform hover:scale-[1.01]"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}