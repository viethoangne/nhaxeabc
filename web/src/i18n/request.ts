import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // Thêm await vào dòng này
  const cookieStore = await cookies(); 
  
  // Dòng này sẽ hết báo lỗi
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'vi';

  return {
    locale: locale,
    // Lùi ra 2 bậc (../../) để tìm thấy thư mục messages ở ngoài cùng
    messages: (await import(`../../messages/${locale}.json`)).default 
  };
});