// Reusable Input component
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
    <div className="group">
      {label && (
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {label}
        </label>
      )}
      
      <div className="mt-2 relative">
        <div
          className={[
            'relative flex items-center gap-3',
            'rounded-2xl border',
            error
              ? 'border-red-300 bg-white ring-4 ring-red-100'
              : 'border-slate-200 bg-white',
            'px-4 py-4 shadow-sm transition',
            'group-focus-within:border-primary-300 group-focus-within:ring-4 group-focus-within:ring-primary-100',
            'dark:border-white/10 dark:bg-white/5',
            className,
          ].join(' ')}
        >
          {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
          
          <input
            ref={ref}
            value={value}
            className={[
              'w-full bg-transparent text-[16px] font-semibold outline-none',
              'placeholder:text-slate-400',
              'dark:text-white dark:placeholder:text-slate-500',
            ].join(' ')}
            {...props}
          />
          
          {clearable && value && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full px-2 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-white/10"
              aria-label="Clear input"
            >
              ✕
            </button>
          )}
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
});

export default Input;