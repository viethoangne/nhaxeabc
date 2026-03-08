'use client';

import { useState } from 'react';
import GoogleLogin from 'components/GoogleLogin';
import '../../src/styles/login.css';

export default function RegisterPage() {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Đăng ký</h1>
        <GoogleLogin label="Đăng ký với Google" />
        {msg && <p className="error-message">{msg}</p>}
        <p className="register-link">
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </div>
    </div>
  );
}
