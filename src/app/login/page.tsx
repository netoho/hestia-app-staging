'use client';

import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { t } from '@/lib/i18n';
import { isDemoMode } from '@/lib/env-check';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // In demo mode, automatically sign in with demo credentials
    if (isDemoMode() && !isAuthenticated && !isLoading) {
      signIn('credentials', {
        email: 'admin@hestiaplp.com.mx',
        password: 'password123',
        redirect: false
      }).then((result) => {
        if (result?.ok) {
          router.push('/dashboard');
        }
      });
    }
    
    // If already authenticated, redirect to dashboard
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking auth or during demo login
  if (isLoading || (isDemoMode() && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">
            {isDemoMode() ? 'Iniciando sesión demo...' : 'Cargando...'}
          </p>
        </div>
      </div>
    );
  }

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
