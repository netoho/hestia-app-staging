import { Metadata } from 'next';
import PublicLayout from '@/components/shared/PublicLayout';

export const metadata: Metadata = {
  title: 'Pago - Hestia',
  description: 'Complete su pago de forma segura',
};

export default function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
