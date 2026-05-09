'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
  clearable?: boolean;
  onClear?: () => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    icon,
    clearable = false,
    onClear,
    className = '',
    value,
    ...props
  },
  ref
) {
  return (
    <div className="group w-full">
      {/* 1. Label nhỏ lại và sát hơn */}
      {label && (
        <label className="text-[13px] font-bold text-slate-600 dark:text-slate-400 ml-1">
          {label}
        </label>
      )}
      
      <div className="mt-1 relative">
        <div
          className={[
            'relative flex items-center gap-2.5',
            'rounded-xl border', // Giảm độ bo góc để nhìn cứng cáp hơn
            error
              ? 'border-red-500 bg-white ring-2 ring-red-50'
              : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5',
            'px-3 py-2.5 shadow-sm transition-all duration-200', // ĐIỂM CHÍNH: Giảm py-4 xuống py-2.5
            'group-focus-within:border-orange-500 group-focus-within:ring-2 group-focus-within:ring-orange-100',
            className,
          ].join(' ')}
        >
          {/* Icon tinh chỉnh nhỏ lại */}
          {icon && (
            <span className="text-lg opacity-70 group-focus-within:opacity-100 transition-opacity">
              {icon}
            </span>
          )}
          
          <input
            ref={ref}
            value={value}
            className={[
              'w-full bg-transparent text-[15px] font-medium outline-none', // Giảm text-16 xuống 15 cho dẹt
              'placeholder:text-slate-400 placeholder:font-normal',
              'dark:text-white dark:placeholder:text-slate-500',
            ].join(' ')}
            {...props}
          />
          
          {/* Nút Clear nhỏ gọn hơn */}
          {clearable && value && (
            <button
              type="button"
              onClick={onClear}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500 hover:bg-slate-200 transition dark:bg-white/10 dark:text-slate-400"
              aria-label="Clear input"
            >
              ✕
            </button>
          )}
        </div>
        
        {error && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
        )}
      </div>
    </div>
  );
});

export default Input;