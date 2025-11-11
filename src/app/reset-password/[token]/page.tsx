'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Loader2,
  Lock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react';

// Password validation schema with complexity requirements
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password');

  // Password requirements checker
  const passwordRequirements = [
    { label: 'Al menos 8 caracteres', met: password?.length >= 8 },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(password || '') },
    { label: 'Una letra minúscula', met: /[a-z]/.test(password || '') },
    { label: 'Un número', met: /[0-9]/.test(password || '') },
  ];

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password/${token}`);
        const result = await response.json();

        if (response.ok && result.success) {
          setIsTokenValid(true);
          setUserEmail(result.email);
        } else {
          setTokenError(result.error || 'Token inválido o expirado');
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        setTokenError('Error al validar el token');
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      validateToken();
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al restablecer la contraseña');
      }

      // Success
      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      setError(error.message || 'Error al restablecer la contraseña. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <AuthCard
        title="Validando enlace"
        description="Por favor, espera un momento..."
      >
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthCard>
    );
  }

  // Token error state
  if (tokenError || !isTokenValid) {
    return (
      <AuthCard
        title="Enlace inválido"
        description="El enlace de recuperación no es válido o ha expirado"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>

          <Alert variant="destructive">
            <AlertDescription>
              {tokenError || 'El enlace para restablecer la contraseña no es válido o ha expirado.'}
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground">
            Los enlaces de recuperación expiran después de 1 hora por motivos de seguridad.
            Puedes solicitar un nuevo enlace si es necesario.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push('/forgot-password')}
              className="w-full"
            >
              Solicitar nuevo enlace
            </Button>

            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio de sesión
            </Button>
          </div>
        </div>
      </AuthCard>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <AuthCard
        title="¡Contraseña restablecida!"
        description="Tu contraseña ha sido actualizada exitosamente"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>

          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Tu contraseña ha sido restablecida exitosamente. Serás redirigido al inicio de sesión en unos segundos...
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Ir a inicio de sesión
          </Button>
        </div>
      </AuthCard>
    );
  }

  // Password reset form
  return (
    <AuthCard
      title="Restablecer contraseña"
      description={userEmail ? `Crea una nueva contraseña para ${userEmail}` : 'Crea tu nueva contraseña'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Password field */}
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pl-10 pr-10"
              {...register('password')}
              disabled={isSubmitting}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Password requirements */}
        {(passwordFocused || password) && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Requisitos de la contraseña:</p>
            <div className="space-y-1">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {req.met ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={req.met ? 'text-green-700' : 'text-muted-foreground'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirm password field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pl-10 pr-10"
              {...register('confirmPassword')}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
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
              Restableciendo...
            </>
          ) : (
            'Restablecer contraseña'
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