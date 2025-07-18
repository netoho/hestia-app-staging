import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { t } from '@/lib/i18n';
import { isDemoMode } from '@/lib/env-check';
import { redirect } from 'next/navigation';

export default function RegisterPage() {
  // In demo mode, redirect directly to dashboard
  if (isDemoMode()) {
    redirect('/dashboard');
  }

  return (
    <AuthCard
      title={t.pages.register.title}
      description={t.pages.register.description}
      footerContent={
        <>
          {t.pages.register.hasAccount}{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t.pages.register.loginLink}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
