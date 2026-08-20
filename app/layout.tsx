import type { Metadata } from 'next';
import './globals.css';
import Sidebar from './components/Sidebar';
import BackgroundMailer from './components/BackgroundMailer'; // Arka plan motoru eklendi

export const metadata: Metadata = {
  title: 'E-Posta Pazarlama',
  description: 'Email Marketing Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="flex h-screen bg-[#f8fafc] overflow-hidden antialiased">
        {/* Görünmez Arka Plan Gönderim Motoru */}
        <BackgroundMailer />

        {/* Sol Menü her sayfada sabit kalacak */}
        <Sidebar />
        
        {/* Sağ taraf (İçerik) tıklanan sayfaya göre değişecek */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  );
}