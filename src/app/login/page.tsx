import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { t } from '@/lib/i18n';

export default function LoginPage() {
  return (
    <AuthCard
      title={t.pages.login.title}
      description={t.pages.login.description}
      footerContent={
        <>
          {t.pages.login.noAccount}{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {t.pages.login.registerLink}
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
