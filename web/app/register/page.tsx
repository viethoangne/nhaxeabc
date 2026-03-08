'use client';

import { useState } from 'react';
import GoogleLogin from 'components/GoogleLogin';
import '../../src/styles/login.css';

export default function RegisterPage() {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">🎟️</div>
        <h1>Tạo tài khoản</h1>
        <p className="login-subtitle">Đăng ký để đặt vé và theo dõi hành trình</p>
        <div className="login-divider"><span>Tiếp tục với</span></div>
        <GoogleLogin label="Đăng ký với Google" />
        {msg && <p className="error-message">{msg}</p>}
        <p className="register-link">
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </div>
    </div>
  );
}
