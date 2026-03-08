import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "../components/layout/Header";
import Providers from "../components/Providers";

const fontSans = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

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
    <html lang="vi" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
