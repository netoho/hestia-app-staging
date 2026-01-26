'use client';

import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t } from '@/lib/i18n';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { AvatarUploader } from '@/components/user/AvatarUploader';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { isPasswordValid } from '@/lib/validation/password';
import { formatDate } from '@/lib/utils/formatting';

export default function ProfilePage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);

  // tRPC query for profile
  const { data: profile, isLoading: loadingProfile, error: profileError } = trpc.user.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // tRPC mutation for profile update
  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      // Clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFormError(null);

      toast({
        title: t.pages.profile.profileUpdated,
        description: t.pages.profile.profileUpdatedDesc,
      });

      utils.user.getProfile.invalidate();
    },
    onError: (error) => {
      setFormError(error.message);
      toast({
        title: t.misc.error,
        description: error.message || t.pages.profile.failedToUpdate,
        variant: 'destructive',
      });
    },
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate phone (required)
    if (!phone.trim()) {
      setFormError('El teléfono es requerido');
      return;
    }

    // Validate new password if provided
    if (newPassword) {
      if (!isPasswordValid(newPassword)) {
        setFormError('La nueva contraseña no cumple con los requisitos de seguridad');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setFormError(t.pages.profile.passwordMismatch);
        return;
      }
      if (!currentPassword) {
        setFormError('Debes ingresar tu contraseña actual para cambiarla');
        return;
      }
    }

    await updateMutation.mutateAsync({
      name: fullName,
      email: email,
      phone: phone.trim(),
      address: address.trim() || undefined,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined,
    });
  };

  const loading = loadingProfile || isAuthLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.pages.profile.loading}</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">{t.pages.profile.errorLoading}</CardTitle>
            <CardDescription>{profileError.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              {t.pages.profile.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{t.pages.profile.accessDenied}</CardTitle>
            <CardDescription>{t.pages.profile.accessDeniedDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/login'} className="w-full">
              {t.pages.profile.goToLogin}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title={t.pages.profile.title} subtitle={t.pages.profile.subtitle} />

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="items-center text-center">
              <AvatarUploader
                currentAvatarUrl={profile?.avatarUrl}
                userName={profile?.name}
                onUploadComplete={() => utils.user.getProfile.invalidate()}
                onDeleteComplete={() => utils.user.getProfile.invalidate()}
                size="lg"
                showDelete={!!profile?.avatarUrl}
              />
              <CardTitle className="text-2xl font-headline mt-4">{profile?.name || 'N/A'}</CardTitle>
              <CardDescription>{profile?.role}</CardDescription>
              <p className="text-xs text-muted-foreground mt-2">
                Haz clic en el avatar para cambiar la foto
              </p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>{t.pages.profile.email}</strong> {profile?.email}</p>
              <p><strong>{t.pages.profile.phone}</strong> {profile?.phone || 'N/A'}</p>
              <p><strong>{t.pages.profile.address}</strong> {profile?.address || 'N/A'}</p>
              <p><strong>{t.pages.profile.memberSince}</strong> {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">{t.pages.profile.editTitle}</CardTitle>
              <CardDescription>{t.pages.profile.editSubtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t.pages.profile.fullName}</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.pages.profile.emailLabel}</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t.pages.profile.phoneLabel} *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">{t.pages.profile.roleLabel}</Label>
                    <Input id="role" value={profile?.role || 'N/A'} readOnly className="bg-muted/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t.pages.profile.addressLabel}</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Opcional</p>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">{t.pages.profile.changePassword}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">{t.pages.profile.currentPassword}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder={t.pages.profile.passwordPlaceholder}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t.pages.profile.newPassword}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder={t.pages.profile.passwordPlaceholder}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          onFocus={() => setNewPasswordFocused(true)}
                          onBlur={() => setNewPasswordFocused(false)}
                          className="pl-10 pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmNewPassword">{t.pages.profile.confirmNewPassword}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmNewPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={t.pages.profile.passwordPlaceholder}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="pl-10 pr-10"
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
                      {confirmNewPassword && newPassword !== confirmNewPassword && (
                        <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
                      )}
                    </div>
                  </div>

                  {/* Password Requirements */}
                  <PasswordRequirements
                    password={newPassword}
                    show={newPasswordFocused || newPassword.length > 0}
                    className="mt-4"
                  />
                </div>

                {formError && (
                  <div className="text-destructive text-sm mt-4">{formError}</div>
                )}
                <div className="flex justify-end space-x-3 mt-4">
                  <Button type="button" variant="outline" onClick={() => utils.user.getProfile.invalidate()} disabled={updateMutation.isPending}>
                    {t.actions.cancel}
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                    disabled={updateMutation.isPending || !phone.trim() || !!(newPassword && (!isPasswordValid(newPassword) || newPassword !== confirmNewPassword))}
                  >
                    {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t.actions.saveChanges}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
