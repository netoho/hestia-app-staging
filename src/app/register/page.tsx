import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthCard
      title="Crea Tu Cuenta"
      description="Únete a Hestia y asegura tu experiencia de alquiler."
      footerContent={
        <>
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
