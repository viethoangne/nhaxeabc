// Reusable Card component
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
}

export default function Card({
  children,
  className = '',
  hover = true,
  padding = 'md',
  shadow = 'md',
  border = true,
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const borderClass = border
    ? 'ring-1 ring-slate-200 dark:ring-slate-700'
    : '';

  const hoverClass = hover
    ? 'hover:shadow-xl hover:ring-slate-300 dark:hover:ring-slate-600 transition-all duration-300'
    : '';

  const baseClass = [
    'rounded-2xl bg-white dark:bg-slate-800',
    paddingClasses[padding],
    shadowClasses[shadow],
    borderClass,
    hoverClass,
    className,
  ].join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={baseClass}
    >
      {children}
    </motion.div>
  );
}