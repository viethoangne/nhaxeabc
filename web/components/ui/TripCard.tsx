'use client';

import { MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Trip } from '@/types';
import { useLocale } from 'next-intl'; // Thêm dòng này để lấy ngôn ngữ hiện tại

type Props = {
  trip: Trip;
  selected: boolean;
  onSelect: () => void;
  buttonText: string;
  className?: string;
  // THÊM: prop chứa các nhãn đã dịch từ page cha
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
  };
};

export default function TripCard({
  trip,
  selected,
  onSelect,
  buttonText,
  className,
  labels, // Nhận labels từ props
}: Props) {
  const locale = useLocale(); // Lấy 'vi' hoặc 'en'

  // Helper: Format thời gian theo locale
  const formatTime = (dateString?: string | null) => {
    if (!dateString) return '--:--';
    const d = new Date(dateString);
    return d.toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Helper: Format ngày theo locale
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Helper: Format thời gian di chuyển dùng label dịch
  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return '...';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let result = '';
    if (hours > 0) result += `${hours} ${labels.hour} `;
    if (mins > 0) result += `${mins} ${labels.minute}`;
    return result.trim();
  };

  const formatPrice = (price?: number | null) => {
    if (!price) return labels.contact;
    // Format tiền: 100.000đ cho VN, $100 cho EN (tùy bạn cấu hình)
    return locale === 'vi' 
      ? `${price.toLocaleString('vi-VN')}đ` 
      : `$${(price / 25000).toFixed(0)}`; // Ví dụ quy đổi tạm tính
  };

  const departureTime = formatTime(trip.departDate);
  const arrivalTime = formatTime(trip.arrivalDate || trip.arrivalTime);
  const availableSeats = trip.availableSeats ?? 22;

  const isSoldOut = availableSeats <= 0;
  const isTimeBlocked = trip.canBook === false && !isSoldOut;
  const isBlocked = isSoldOut || trip.canBook === false;

  // Cần dịch thông báo lỗi này trong JSON và truyền vào hoặc xử lý tại đây
  const blockedMessage = isSoldOut 
  ? labels?.soldOut || 'Hết chỗ' 
  : labels?.stopBooking || 'Ngừng nhận vé';

  return (
    <div
      className={[
        'rounded-lg border bg-white px-4 py-4 shadow-sm transition-all cursor-pointer',
        isBlocked ? 'opacity-80' : '',
        selected ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200 hover:border-orange-300 hover:shadow-md',
        className,
      ].join(' ')}
      onClick={() => (isBlocked ? toast.error(blockedMessage) : onSelect())}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr_1.2fr_1fr] xl:items-start">
          {/* Cột Điểm đi */}
          <div>
            <div className="text-[32px] font-extrabold text-slate-900">{departureTime}</div>
            <div className="mt-2 flex items-start gap-2 text-slate-700">
              <MapPin className="mt-1 h-4 w-4 text-orange-500" />
              <div>
                <div className="text-[20px] font-semibold">{trip.pickupPoint || trip.from}</div>
                <div className="text-sm text-slate-500">{formatDate(trip.departDate)}</div>
              </div>
            </div>
          </div>

          {/* Cột Thời gian di chuyển */}
          <div className="flex flex-col items-center justify-center pt-2">
            <div className="text-center text-sm font-medium text-slate-500">
              {formatDuration(trip.durationMinutes)}
              {trip.distanceKm ? ` • ${trip.distanceKm}Km` : ''}
            </div>
            <div className="mt-2 flex w-full max-w-[200px] items-center">
              <div className="h-3 w-3 rounded-full bg-green-600" />
              <div className="mx-2 h-[2px] flex-1 bg-slate-300" />
              <div className="h-3 w-3 rounded-full bg-orange-500" />
            </div>
          </div>

          {/* Cột Điểm đến */}
          <div>
            <div className="text-[32px] font-extrabold text-slate-900">{arrivalTime}</div>
            <div className="mt-2 flex items-start gap-2 text-slate-700">
              <MapPin className="mt-1 h-4 w-4 text-orange-500" />
              <div>
                <div className="text-[20px] font-semibold">{trip.dropoffPoint || trip.to}</div>
                <div className="text-sm text-slate-500">
                   {formatDate(trip.arrivalDate || trip.arrivalTime || trip.departDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Cột Giá & Trạng thái */}
          <div className="flex flex-col items-start gap-2 xl:items-end">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-700">{trip.busType || 'Limousine'}</span>
              <span className="text-slate-400">•</span>
              {isSoldOut ? (
                <span className="font-semibold text-red-500">{labels.soldOut}</span>
              ) : isTimeBlocked ? (
                <span className="font-semibold text-red-500">{labels.stopBooking}</span>
              ) : (
                <span className="font-semibold text-emerald-600">
                  {availableSeats} {labels.availableSeats}
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-orange-600">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ</div>
          </div>
        </div>

        {/* Phần Nút bấm Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-800">
            {/* Sửa: Dùng mảng nhãn từ prop labels */}
            {[labels.selectSeat, labels.schedule, labels.transfer, labels.policy].map((item) => (
              <button key={item} type="button" className="hover:text-orange-500" onClick={(e) => e.stopPropagation()}>
                {item}
              </button>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              isBlocked ? toast.error(blockedMessage) : onSelect();
            }}
            className={[
              'rounded-2xl px-6 py-2 text-sm font-bold text-white transition',
              isBlocked ? 'bg-slate-400' : selected ? 'bg-slate-800' : 'bg-orange-500 hover:bg-orange-600',
            ].join(' ')}
          >
            {isSoldOut ? labels.soldOut : isTimeBlocked ? labels.stopBooking : selected ? labels.selected : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}