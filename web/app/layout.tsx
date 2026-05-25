import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Providers from "../components/Providers";
import MaintenanceProvider from "../components/MaintenanceProvider";
import ChatAI from '@/components/layout/ChatAI';
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

const fontSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata = {
  title: "ABC - ABC Bus Lines | Chất Lượng Là Danh Dự",
  description: "Hệ thống đặt vé xe khách ABC hiện đại, an toàn.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${fontSans.variable} ${fontMono.variable} scroll-smooth`}>
      <body className="antialiased bg-[#F5F5F5] dark:bg-[#020617] text-slate-900 dark:text-slate-100">
        
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {/* Beautiful, High-End Glassmorphic Hot Toasts */}
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#0f172a',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  backdropFilter: 'blur(8px)',
                  padding: '12px 18px',
                },
                success: {
                  iconTheme: {
                    primary: '#EF5222',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  style: {
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fee2e2',
                  },
                },
              }}
            />

            <MaintenanceProvider>
              <div className="flex flex-col lg:flex-row min-h-screen w-full relative">
                <Header />
                <main className="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out"> 
                  {children}
                  <ChatAI /> 
                  <Footer />
                </main>
              </div>
            </MaintenanceProvider>

          </Providers>
        </NextIntlClientProvider>

      </body>
    </html>
  );
}