'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import '../../src/styles/login.css';
import GoogleLogin from 'components/GoogleLogin';  // Đảm bảo cấu hình đúng tsconfig.json nếu dùng đường dẫn tuyệt đối


export default function RegisterPage() {
  const [msg, setMsg] = useState<string | null>(null);

  const handleGoogleRegister = () => {
    setMsg(null);
    // OAuth => phải redirect
    signIn('google', { callbackUrl: 'http://localhost:3000/api/register/google-callback' }).catch(() => {  // Cập nhật đường dẫn callback
      setMsg('Đăng ký qua Google thất bại');
      toast.error('Đăng ký qua Google thất bại');
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Đăng ký</h1>
        <button className="google-login" onClick={handleGoogleRegister}>
          Đăng ký với Google
        </button>
        {msg && <p className="error-message">{msg}</p>}
        <p className="register-link">
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </div>
    </div>
  );
}
