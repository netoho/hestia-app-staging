import { Metadata } from 'next';
import PublicLayout from '@/components/shared/PublicLayout';

export const metadata: Metadata = {
  title: 'Portal de Actores - Hestia',
  description: 'Complete su información para la protección de arrendamiento',
};

export default function ActorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
