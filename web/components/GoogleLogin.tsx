'use client';

import { signIn } from 'next-auth/react';

interface Props {
  label?: string;
  callbackUrl?: string;
  className?: string;
}

export default function GoogleLogin({
  label = 'Tiếp tục với Google',
  callbackUrl = '/auth/callback',
  className = 'google-login',
}: Props) {
  return (
    <button
      className={className}
      onClick={() => signIn('google', { callbackUrl })}
      type="button"
    >
      {label}
    </button>
  );
}
