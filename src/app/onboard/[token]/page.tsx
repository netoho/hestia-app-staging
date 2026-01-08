'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';
import { trpc } from '@/lib/trpc/client';
import { AvatarUploader } from '@/components/user/AvatarUploader';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { isPasswordValid } from '@/lib/validation/password';

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.token as string;

  const [formError, setFormError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Form fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // tRPC query to validate token
  const { data, isLoading, error: tokenError } = trpc.onboard.validateToken.useQuery(
    { token },
    { enabled: !!token }
  );

  // tRPC mutation to complete onboarding
  const completeMutation = trpc.onboard.complete.useMutation({
    onSuccess: async () => {
      // Auto-login after successful onboarding
      const signInResult = await signIn('credentials', {
        email: userInfo?.email,
        password: password,
        redirect: false,
      });

      toast({
        title: t.pages.onboard.toast.success.title,
        description: t.pages.onboard.toast.success.description,
      });

      if (signInResult?.ok) {
        // Redirect to profile page
        router.push('/dashboard/profile');
      } else {
        // Onboarding succeeded but login failed - redirect to login
        router.push('/login');
      }
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const userInfo = data?.user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate phone (required)
    if (!phone.trim()) {
      setFormError('El teléfono es requerido');
      return;
    }

    // Validate password strength
    if (!isPasswordValid(password)) {
      setFormError('La contraseña no cumple con los requisitos de seguridad');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setFormError(t.pages.onboard.validation.passwordMismatch);
      return;
    }

    await completeMutation.mutateAsync({
      token,
      password,
      phone: phone.trim(),
      address: address.trim() || undefined,
    });
  };

  const isSubmitting = completeMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">{t.pages.onboard.loading}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>{t.pages.onboard.invalidInvitation.title}</CardTitle>
            <CardDescription>{tokenError.message}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {t.pages.onboard.invalidInvitation.description}
              {' '}
              {t.pages.onboard.invalidInvitation.contact}
            </p>
            <Button onClick={() => router.push('/login')} variant="outline">
              {t.pages.onboard.invalidInvitation.goToLogin}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4">
            <img src="/images/logo-hestia-azul-top.png" alt="Hestia" className="h-16 mx-auto" />
          </div>
          <CardTitle className="text-2xl">{t.pages.onboard.welcome.title}</CardTitle>
          <CardDescription>
            {t.pages.onboard.welcome.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {userInfo && (
            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">{t.pages.onboard.accountInfo.title}</p>
              <p className="font-medium">{userInfo.name || t.pages.onboard.accountInfo.userFallback}</p>
              <p className="text-sm text-muted-foreground">{userInfo.email}</p>
              <p className="text-sm text-muted-foreground capitalize">{t.pages.onboard.accountInfo.permissions} {userInfo.role.toLowerCase()}</p>
            </div>
          )}

          {formError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center space-y-4">
              <Label>{t.pages.onboard.avatar.label}</Label>
              <AvatarUploader
                currentAvatarUrl={avatarUrl}
                userName={userInfo?.name}
                showDelete={false}
                disabled={isSubmitting}
                size="lg"
                token={token}
                onUploadComplete={(url) => setAvatarUrl(url)}
              />
              <p className="text-xs text-muted-foreground">
                {t.pages.onboard.avatar.maxSize}
              </p>
            </div>

            <div className="grid gap-4">
              {/* Password Field */}
              <div className="grid gap-2">
                <Label htmlFor="password" required>{t.pages.onboard.form.password.label}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder={t.pages.onboard.form.password.placeholder}
                    className="pl-10 pr-10"
                    required
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <PasswordRequirements
                password={password}
                show={passwordFocused || password.length > 0}
              />

              {/* Confirm Password */}
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword" required>{t.pages.onboard.form.confirmPassword.label}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.pages.onboard.form.confirmPassword.placeholder}
                    className="pl-10 pr-10"
                    required
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Phone (Required) */}
              <div className="grid gap-2">
                <Label htmlFor="phone" required>{t.pages.onboard.form.phone.label}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.pages.onboard.form.phone.placeholder}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Address (Optional) */}
              <div className="grid gap-2">
                <Label htmlFor="address" optional>{t.pages.onboard.form.address.label}</Label>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t.pages.onboard.form.address.placeholder}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !password || !confirmPassword || !phone.trim() || !isPasswordValid(password) || password !== confirmPassword}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.pages.onboard.submit.submitting}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t.pages.onboard.submit.complete}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
