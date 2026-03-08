'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import '../../src/styles/login.css';

export default function LoginPage() {
  const [msg, setMsg] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    setMsg(null);
    signIn('google', { callbackUrl: '/auth/callback' }).catch(() => {
      setMsg('Đăng nhập qua Google thất bại');
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">🚌</div>
        <h1>Đăng nhập</h1>
        <p className="login-subtitle">Chào mừng trở lại Nhà Xe ABC</p>
        <div className="login-divider"><span>Tiếp tục với</span></div>
        <button className="google-login" onClick={handleGoogleLogin} type="button">
          Đăng nhập với Google
        </button>
        {msg && <p className="error-message">{msg}</p>}
        <p className="register-link">
          Chưa có tài khoản? <a href="/register">Đăng ký ngay</a>
        </p>
      </div>
    </div>
  );
}
