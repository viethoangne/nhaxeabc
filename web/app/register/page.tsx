'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import GoogleLogin from 'components/GoogleLogin';
import '../../src/styles/login.css';

export default function RegisterPage() {
  const t = useTranslations('loginPage');
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">🎟️</div>
        <h1>{t('registerTitle')}</h1>
        <p className="login-subtitle">{t('registerSub')}</p>
        <div className="login-divider"><span>{t('continueWith')}</span></div>
        <GoogleLogin label={t('registerWithGoogle')} />
        {msg && <p className="error-message">{msg}</p>}
        <p className="register-link">
          {t('hasAccount')} <a href="/login">{t('loginNow')}</a>
        </p>
      </div>
    </div>
  );
}
