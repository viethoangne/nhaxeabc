// Reusable Badge component
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantClasses = {
    default:
      'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    primary:
      'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
    success:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    warning:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    error:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    outline:
      'bg-transparent text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-600',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const baseClass = [
    'inline-flex items-center justify-center rounded-full font-medium',
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(' ');

  return <span className={baseClass}>{children}</span>;
}