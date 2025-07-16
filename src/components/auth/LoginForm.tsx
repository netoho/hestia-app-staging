'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { signIn } from 'next-auth/react';


import { isDemoMode } from '@/lib/services/demoDatabase';

const loginSchema = z.object({
  email: z.string().email({ message: t.pages.register.validation.emailInvalid }),
  password: z.string().min(6, { message: t.pages.register.validation.passwordMin }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    
    const result = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
    });

    setIsLoading(false);

    if (result?.error) {
      toast({
        title: 'Error de inicio de sesión',
        description: 'Credenciales inválidas. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } else if (result?.ok) {
      toast({
        title: 'Inicio de sesión exitoso',
        description: `¡Bienvenido de nuevo!`,
      });
      router.push('/dashboard');
    }
  }

  return (
    <div className="space-y-4">
      {process.env.NODE_ENV === 'development' && (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>isDemoMode: {isDemoMode()}</strong>
            <strong>Demo Credentials:</strong><br />
            Email: admin@hestiaplp.com.mx<br />
            Password: password123
          </AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.pages.login.emailLabel}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t.pages.login.emailPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.pages.login.passwordLabel}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t.pages.login.passwordPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
               <div className="text-right mt-1">
                <Button variant="link" size="sm" asChild className="p-0 h-auto">
                  <Link href="/forgot-password">{t.pages.login.forgotPassword}</Link>
                </Button>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-lg py-6" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : t.actions.login}
        </Button>
      </form>
    </Form>
    </div>
  );
}
