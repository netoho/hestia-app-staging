import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { t } from '@/lib/i18n';
import AuthProvider from '@/components/auth/AuthProvider';
import ChatwootWidget from '@/components/ChatwootWidget';

export const metadata: Metadata = {
  title: t.layout.root.metaTitle,
  description: t.layout.root.metaDescription,
  keywords: t.layout.root.metaKeywords,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
          <ChatwootWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
