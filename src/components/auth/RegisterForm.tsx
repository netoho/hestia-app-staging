'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from "@/components/ui/checkbox"
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';

const registerSchema = z.object({
  fullName: z.string().min(2, { message: t.pages.register.validation.fullNameMin }),
  email: z.string().email({ message: t.pages.register.validation.emailInvalid }),
  password: z.string().min(8, { message: t.pages.register.validation.passwordMin }),
  confirmPassword: z.string(),
  role: z.enum(['tenant', 'landlord', 'broker'], { required_error: t.pages.register.validation.roleRequired }),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: t.pages.register.validation.termsRequired,
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: t.pages.register.validation.passwordsNoMatch,
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: undefined,
      agreedToTerms: false,
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.fullName,
          email: values.email,
          password: values.password,
          role: values.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store the auth token and user data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      
      toast({
        title: t.pages.register.registerSuccess,
        description: t.pages.register.welcomeUser(values.fullName),
      });
      
      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to register. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.pages.register.fullName}</FormLabel>
              <FormControl>
                <Input placeholder={t.pages.register.fullNamePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.pages.register.email}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t.pages.register.emailPlaceholder} {...field} />
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
              <FormLabel>{t.pages.register.password}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t.pages.register.passwordPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.pages.register.confirmPassword}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t.pages.register.passwordPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.pages.register.role}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t.pages.register.selectRole} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="landlord">Landlord</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="agreedToTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  {t.pages.register.agreeToTermsPart1}
                  <Link href="/terms-and-conditions" className="text-primary hover:underline">{t.pages.register.terms}</Link>
                  {t.pages.register.agreeToTermsPart2}
                  <Link href="/privacy-policy" className="text-primary hover:underline">{t.pages.register.privacy}</Link>
                  {t.pages.register.agreeToTermsPart3}
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" disabled={isLoading}>
           {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : t.actions.createAccount}
        </Button>
      </form>
    </Form>
  );
}
