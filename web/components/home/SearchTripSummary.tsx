// SearchTripSummary.tsx
import type { Trip } from '@/types';

type Props = {
  title: string;
  trips: Trip[];        // trips là mảng các đối tượng Trip
  selectedTrip: Trip;
  tone?: 'orange' | 'sky';
};

export default function SearchTripSummary({
  title,
  selectedTrip,
  tone = 'orange',
}: Props) {
  if (!selectedTrip) return null;

  const boxClass =
    tone === 'sky'
      ? 'border-sky-200 bg-sky-50'
      : 'border-orange-200 bg-orange-50';

  return (
    <div className={`rounded-[24px] border p-4 ${boxClass}`}>
      <div className="text-base font-semibold text-slate-600">{title}</div>
      <div className="mt-2 text-[26px] font-bold text-slate-900">
        {selectedTrip.from} → {selectedTrip.to}
      </div>
      <div className="mt-1 text-sm text-slate-600">
        <span className="font-semibold">Khởi hành:</span> {new Date(selectedTrip.departDate).toLocaleString('vi-VN')}
      </div>
    </div>
  );
}