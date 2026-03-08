// Reusable Button component
'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void | Promise<unknown>;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'rounded-full font-semibold transition',
    'focus:outline-none focus:ring-4',
    disabled ? 'cursor-not-allowed opacity-60' : '',
  ];

  const variantClasses = {
    primary: [
      'bg-primary-600 text-white',
      'shadow-[0_14px_36px_rgba(234,88,12,0.35)]',
      'hover:bg-primary-700',
      'focus:ring-primary-100',
      'dark:bg-primary-500 dark:hover:bg-primary-600',
    ],
    secondary: [
      'bg-slate-100 text-slate-700',
      'hover:bg-slate-200',
      'focus:ring-slate-100',
      'dark:bg-white/10 dark:text-white dark:hover:bg-white/15',
    ],
    outline: [
      'border border-slate-200 bg-white/70 text-slate-800',
      'hover:bg-white',
      'focus:ring-slate-100',
      'dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15',
    ],
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const buttonClasses = [
    ...baseClasses,
    ...variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(' ');

  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      whileHover={disabled ? {} : { y: -1 }}
      className={buttonClasses}
      disabled={disabled || isLoading}
    >
      {isLoading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </motion.button>
  );
}