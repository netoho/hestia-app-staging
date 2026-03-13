import type { Metadata } from 'next';
import { PT_Sans, Libre_Baskerville } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { t } from '@/lib/i18n';
import AuthProvider from '@/components/auth/AuthProvider';
import ChatwootWidget from '@/components/ChatwootWidget';
import { TRPCProviders } from '@/providers';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-headline',
  display: 'swap',
});

export const metadata: Metadata = {
  title: t.layout.root.metaTitle,
  description: t.layout.root.metaDescription,
  keywords: t.layout.root.metaKeywords,
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${ptSans.variable} ${libreBaskerville.variable}`}>
      <body className="font-body antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground focus:border">
          Saltar al contenido principal
        </a>
        <TRPCProviders>
          <AuthProvider>
            {children}
            <Toaster />
            <ChatwootWidget />
          </AuthProvider>
        </TRPCProviders>
      </body>
    </html>
  );
}
