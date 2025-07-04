import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthCard
      title="¡Bienvenido de Nuevo!"
      description="Inicia sesión en tu cuenta de Hestia."
      footerContent={
        <>
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
