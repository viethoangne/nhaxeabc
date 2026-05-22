// ContinueButton.tsx
'use client';

import { useTranslations } from 'next-intl';

type Props = {
  disabled: boolean;
  onClick: () => void;
  children?: React.ReactNode;
};

export default function ContinueButton({ disabled, onClick, children }: Props) {
  const t = useTranslations('chairPage');
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl bg-orange-500 px-6 py-2 font-bold text-white shadow-lg transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children || t('continue')}
    </button>
  );
}