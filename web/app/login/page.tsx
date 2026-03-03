'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import '../../src/styles/login.css';

export default function LoginPage() {
  const [msg, setMsg] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    setMsg(null);
    // OAuth sẽ redirect sang Google, xong quay về callbackUrl
    signIn('google', { callbackUrl: 'http://localhost:3000/api/register/google-callback' }).catch(() => {
      setMsg('Đăng nhập qua Google thất bại');
      toast.error('Đăng nhập qua Google thất bại');
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Đăng nhập</h1>
        <button className="google-login" onClick={handleGoogleLogin}>
  Đăng nhập với Google
</button>
        {msg && <p className="error-message">{msg}</p>}
        <p className="register-link">
          Chưa có tài khoản? <a href="/register">Đăng ký</a>
        </p>
      </div>
    </div>
  );
}
