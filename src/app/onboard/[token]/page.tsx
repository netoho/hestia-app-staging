'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';

interface UserInfo {
  id: string;
  name?: string;
  email: string;
  role: string;
}

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/onboard/${token}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Invalid or expired invitation');
        }

        const data = await response.json();
        setUserInfo(data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      validateToken();
    }
  }, [token]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: t.pages.onboard.toast.fileTooLarge.title,
        description: t.pages.onboard.toast.fileTooLarge.description,
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.pages.onboard.toast.invalidFileType.title,
        description: t.pages.onboard.toast.invalidFileType.description,
        variant: 'destructive',
      });
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (password !== confirmPassword) {
      setError(t.pages.onboard.validation.passwordMismatch);
      return;
    }

    if (password.length < 6) {
      setError(t.pages.onboard.validation.passwordMinLength);
      return;
    }

    setSubmitting(true);

    try {
      // First, set the password and profile info
      const response = await fetch(`/api/onboard/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          phone,
          address,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Upload avatar if provided
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);

        const avatarResponse = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!avatarResponse.ok) {
          console.error('Failed to upload avatar');
          // Don't fail the whole process if avatar upload fails
        }
      }

      toast({
        title: t.pages.onboard.toast.success.title,
        description: t.pages.onboard.toast.success.description,
      });

      // Redirect to profile page
      setTimeout(() => {
        router.push('/dashboard/profile');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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

  if (error && !userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>{t.pages.onboard.invalidInvitation.title}</CardTitle>
            <CardDescription>{error}</CardDescription>
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

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center space-y-4">
              <Label>{t.pages.onboard.avatar.label}</Label>
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-muted">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Avatar preview" />
                  ) : (
                    <AvatarFallback>
                      {userInfo?.name ? userInfo.name.split(' ').map(n => n[0]).join('') : t.pages.onboard.accountInfo.userFallback[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t.pages.onboard.avatar.maxSize}
              </p>
            </div>

            <div className="grid gap-4">
              {/* Password Fields */}
              <div className="grid gap-2">
                <Label htmlFor="password">{t.pages.onboard.form.password.label}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.pages.onboard.form.password.placeholder}
                  required
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  {t.pages.onboard.form.password.minLength}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">{t.pages.onboard.form.confirmPassword.label}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.pages.onboard.form.confirmPassword.placeholder}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Additional Info */}
              <div className="grid gap-2">
                <Label htmlFor="phone">{t.pages.onboard.form.phone.label}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.pages.onboard.form.phone.placeholder}
                  disabled={submitting}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">{t.pages.onboard.form.address.label}</Label>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t.pages.onboard.form.address.placeholder}
                  disabled={submitting}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !password || !confirmPassword}
            >
              {submitting ? (
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
