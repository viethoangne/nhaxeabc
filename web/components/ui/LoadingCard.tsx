'use client';

export function LoadingCard({ text = 'Đang tải dữ liệu...' }: { text?: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 text-lg text-slate-600 shadow-sm">
      {text}
    </div>
  );
}