import "./globals.css";
import Header from "../components/layout/Header";

export const metadata = {
  title: "ABC-ABC Bus Lines",
  description: "Đặt vé • Chọn ghế • Vé QR",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
