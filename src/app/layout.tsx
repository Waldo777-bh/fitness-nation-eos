import type { Metadata } from 'next';
import { Anton, Poppins } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const display = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const body = Poppins({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Fitness Nation EOS',
  description: 'EOS dashboard for Fitness Nation - 24/7 Gym, Preston',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-8 max-w-[1400px]">{children}</main>
        </div>
      </body>
    </html>
  );
}
