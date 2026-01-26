import "../src/styles/globals.css";

export const metadata = {
  title: "Nhà xe ABC - Đặt vé",
  description: "Đặt vé nhà xe ABC: tìm chuyến, chọn ghế, nhận vé QR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
