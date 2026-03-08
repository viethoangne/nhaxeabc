// Application constants
export const NAV_ITEMS = [
  { label: 'TRANG CHỦ', href: '/' },
  { label: 'LỊCH TRÌNH', href: '/schedule' },
  { label: 'TRA CỨU VÉ', href: '/lookup' },
  { label: 'TIN TỨC', href: '/news' },
  { label: 'HÓA ĐƠN', href: '/invoice' },
  { label: 'LIÊN HỆ', href: '/contact' },
  { label: 'VỀ CHÚNG TÔI', href: '/about' },
] as const;

export const MAX_TICKETS = 10;
export const MIN_TICKETS = 1;

export const ANIMATION_DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
} as const;

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;