import { Metadata } from 'next';
import PublicLayout from '@/components/shared/PublicLayout';

export const metadata: Metadata = {
  title: 'Portal de Comprobantes - Hestia',
  description: 'Suba sus comprobantes de pago mensuales',
};

export default function ReceiptPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
