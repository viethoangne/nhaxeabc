// src/components/ui/Breadcrumb.tsx
"use client";

import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex text-sm text-gray-500 font-medium mb-2" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 sm:space-x-2">
        {/* Nút Trang chủ mặc định */}
        <li>
          <Link href="/" className="hover:text-[#ea580c] transition-colors flex items-center gap-1">
            <Home size={16} className="mb-[2px]" />
            <span className="hidden sm:inline">Trang chủ</span>
          </Link>
        </li>

        {/* Lặp qua các trang được truyền vào */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center space-x-1 sm:space-x-2">
              <ChevronRight size={16} className="text-gray-400" />
              {isLast || !item.href ? (
                <span className="text-gray-900 font-semibold" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-[#ea580c] transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}