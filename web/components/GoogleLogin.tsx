'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function GoogleLoginComponent() {
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const handleGoogleLogin = async (response: any) => {
    const token = response.credential; // Lấy token từ Google OAuth
    setGoogleToken(token);

    try {
      const res = await fetch('/api/register/google-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }), // Gửi token tới backend
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Đăng nhập thành công!');
      } else {
        toast.error('Đăng nhập thất bại');
      }
    } catch (error) {
      toast.error('Đã xảy ra lỗi trong khi đăng nhập');
    }
  };

  return (
    <div>
      <GoogleLogin
        onSuccess={handleGoogleLogin} // Sử dụng onSuccess đúng cách
        onError={() => toast.error('Đăng nhập qua Google thất bại')}
      />
    </div>
  );
  
}
