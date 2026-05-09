import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Providers from "../components/Providers";
import ChatAI from '@/components/layout/ChatAI';
import ForceLogoutWrapper from '@/components/ForceLogoutWrapper'; // 🟢 Import chuẩn rồi

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const fontSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata = {
  title: "ABC - ABC Bus Lines | Chất Lượng Là Danh Dự",
  description: "Hệ thống đặt vé xe khách ABC hiện đại, an toàn.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  
  const messages = await getMessages();

  return (
    <html lang="vi" className={`${fontSans.variable} ${fontMono.variable} scroll-smooth`}>
      <body className="antialiased bg-[#F5F5F5] dark:bg-[#020617] text-slate-900 dark:text-slate-100">
        
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {/* 🟢 BẮT ĐẦU BỌC "KẺ HỦY DIỆT SESSION" Ở ĐÂY */}
            <ForceLogoutWrapper>

              <div className="flex min-h-screen w-full relative">
                <Header />
                <main className="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out"> 
                  {children}
                  <ChatAI /> 
                  <Footer />
                </main>
              </div>

            </ForceLogoutWrapper>
            {/* 🟢 KẾT THÚC BỌC */}
          </Providers>
        </NextIntlClientProvider>

      </body>
    </html>
  );
}