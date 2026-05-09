export function formatTime(value?: string) {
    if (!value) return '--:--';
    return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  
  export function formatDateTime(value?: string) {
    if (!value) return '--';
    return new Date(value).toLocaleString('vi-VN');
  }
  
  export function formatPrice(value?: number) {
    if (value == null) return 'Liên hệ';
    return `${value.toLocaleString('vi-VN')}đ`;
  }
  
  export function formatDuration(minutes?: number) {
    if (!minutes) return '--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h} giờ ${m} phút`;
    if (h) return `${h} giờ`;
    return `${m} phút`;
  }
  
  export function estimateArrivalTime(departDate?: string, durationMinutes?: number) {
    if (!departDate || !durationMinutes) return '--:--';
    const date = new Date(departDate);
    date.setMinutes(date.getMinutes() + durationMinutes);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }