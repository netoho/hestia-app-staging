'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor, ingresa un correo electrónico válido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.status === 429) {
        // Rate limit exceeded
        setError(`Demasiadas solicitudes. Por favor, intenta de nuevo en ${result.retryAfter || '60'} segundos.`);
        return;
      }

      if (!response.ok && response.status !== 429) {
        throw new Error(result.error || 'Error al procesar la solicitud');
      }

      // Success - show success message
      setIsSuccess(true);
    } catch (error) {
      console.error('Password reset request failed:', error);
      setError('Error al procesar la solicitud. Por favor, intenta de nuevo más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthCard
        title="Correo enviado"
        description="Revisa tu bandeja de entrada"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>

          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Si existe una cuenta con ese correo electrónico, recibirás un enlace para restablecer tu contraseña en breve.
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>Por favor, revisa tu correo electrónico y sigue las instrucciones.</p>
            <p>Si no recibes el correo en unos minutos:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Revisa tu carpeta de spam</li>
              <li>Verifica que el correo sea correcto</li>
              <li>Intenta solicitar otro enlace</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
              variant="default"
            >
              Volver al inicio de sesión
            </Button>

            <Button
              onClick={() => {
                setIsSuccess(false);
                setError(null);
              }}
              className="w-full"
              variant="outline"
            >
              Solicitar otro enlace
            </Button>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="¿Olvidaste tu contraseña?"
      description="Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña"
      footerContent={
        <div className="text-muted-foreground">
          ¿Recordaste tu contraseña?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Iniciar sesión
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              className="pl-10"
              {...register('email')}
              disabled={isSubmitting}
              autoComplete="email"
              autoFocus
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar enlace de recuperación'
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => router.push('/login')}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al inicio de sesión
        </Button>
      </form>
    </AuthCard>
  );
}