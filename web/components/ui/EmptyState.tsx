// EmptyState.tsx
'use client';

export default function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 text-lg text-slate-600 shadow-sm">
      {text}
    </div>
  );
}