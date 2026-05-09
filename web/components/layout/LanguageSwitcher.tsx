'use client';

import { useRouter } from 'next/navigation';

export default function LanguageSwitcher() {
  const router = useRouter();

  const changeLanguage = (lang: string) => {
    // 1. Lưu ngôn ngữ vào Cookie (có hiệu lực 1 năm, áp dụng toàn trang)
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
    
    // 2. Ép Next.js gọi lại Server để tải lại giao diện với ngôn ngữ mới
    router.refresh();
  };

  return (
    <div className="flex gap-2">
      <button onClick={() => changeLanguage('vi')}>Tiếng Việt</button>
      <button onClick={() => changeLanguage('en')}>English</button>
    </div>
  );
}