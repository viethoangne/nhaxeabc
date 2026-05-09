'use client';

// Loại bỏ import TripType nếu không dùng đến để tránh cảnh báo (warning)
type Props = {
  from: string;
  to: string;
  date: string;
  tickets: string;
  tripType: string; // Đây là giá trị đã dịch từ page.tsx (Ví dụ: "Một chiều" hoặc "One way")
  returnDate?: string;
  labelResults: string; // Đây là giá trị đã dịch (Ví dụ: "Kết quả tìm chuyến" hoặc "Search Results")
};

export default function SearchTripHero({
  from,
  to,
  date,
  tickets,
  tripType,
  returnDate,
  labelResults,
}: Props) {
  return (
    <div className="rounded-[30px] border border-orange-100 bg-white p-6 shadow-sm">
      {/* SỬA TẠI ĐÂY: Thay chữ cứng bằng biến labelResults */}
      <h1 className="text-[28px] font-extrabold text-slate-900 md:text-[36px]">
        {labelResults}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{from}</span>
        <span className="mx-2">→</span>
        <span className="font-semibold text-slate-900">{to}</span>
        <span className="mx-2">|</span>
        
        {/* SỬA TẠI ĐÂY: "Ngày đi" nên được dịch từ trang cha và truyền vào prop date 
            hoặc chỉ hiển thị giá trị date nếu date đã bao gồm chữ "Ngày đi" */}
        <span>{date}</span>
        
        <span className="mx-2">|</span>
        
        {/* tickets lúc này đã là "1 vé" hoặc "1 ticket(s)" từ page.tsx */}
        <span>{tickets}</span>
        
        <span className="mx-2">|</span>
        
        {/* SỬA TẠI ĐÂY: Hiển thị trực tiếp tripType vì nó đã được dịch ở trang cha */}
        <span>
          {tripType}
          {returnDate ? ` - ${returnDate}` : ''}
        </span>
      </div>
    </div>
  );
}