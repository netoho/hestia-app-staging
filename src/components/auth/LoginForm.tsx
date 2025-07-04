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
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Login data:', values);
    
    toast({
      title: t.pages.login.loginSuccess,
      description: t.pages.login.welcomeBackUser(values.email),
    });
    
    router.push('/dashboard');
  }

  return (
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
  );
}
