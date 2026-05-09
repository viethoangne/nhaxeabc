// 1. FORMAT UTILS (Tiền, Thời lượng, Thời gian)
export function formatPrice(value?: number) {
  if (value == null) return '0đ';
  return `${value.toLocaleString('vi-VN')}đ`;
}

export function formatTime(value?: string | Date) {
  if (!value) return '--:--';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDuration(minutes?: number) {
  if (!minutes) return '--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} giờ ${m > 0 ? m + ' phút' : ''}` : `${m} phút`;
}

export function estimateArrivalTime(departureTime: string | Date, durationMinutes: number) {
  if (!departureTime) return '--:--';
  const date = new Date(departureTime);
  date.setMinutes(date.getMinutes() + durationMinutes);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleString('vi-VN');
}

// 2. DATE UTILITY FUNCTIONS
export function formatDate(date: Date | string, format: 'iso' | 'display' = 'iso'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'iso') {
    return d.toISOString().split('T')[0];
  }
  
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return formatDate(d, 'iso');
}

export function isDateValid(date: string): boolean {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

export function isFutureDate(date: string): boolean {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}