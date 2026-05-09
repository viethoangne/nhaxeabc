'use client';

import { useSearchParams } from 'next/navigation';

export default function MomoReturnPage() {
  const params = useSearchParams();

  const orderId = params.get('orderId');
  const resultCode = params.get('resultCode');
  const message = params.get('message');

  const success = resultCode === '0';

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {success ? 'Thanh toán thành công' : 'Thanh toán chưa thành công'}
        </h1>

        <div className="mt-4 space-y-2 text-slate-700">
          <p>
            <span className="font-semibold">Mã đơn:</span> {orderId || '---'}
          </p>
          <p>
            <span className="font-semibold">Mã kết quả:</span> {resultCode || '---'}
          </p>
          <p>
            <span className="font-semibold">Thông báo:</span> {message || '---'}
          </p>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Trạng thái cuối cùng sẽ được xác nhận từ máy chủ qua IPN của MoMo.
        </p>
      </div>
    </main>
  );
}