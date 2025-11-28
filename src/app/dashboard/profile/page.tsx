'use client';

import { useEffect, useState, useRef } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { t } from '@/lib/i18n';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

export default function ProfilePage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // tRPC query for profile
  const { data: profile, isLoading: loadingProfile, error: profileError } = trpc.user.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // tRPC mutation for profile update
  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: (updatedProfile) => {
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 20MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', file.type);

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload avatar');
      }

      toast({
        title: 'Avatar uploaded',
        description: 'Your profile picture has been updated successfully',
      });

      utils.user.getProfile.invalidate();
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarDelete = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete avatar');
      }

      toast({
        title: 'Avatar removed',
        description: 'Your profile picture has been removed',
      });

      utils.user.getProfile.invalidate();
    } catch (err) {
      console.error('Error deleting avatar:', err);
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete avatar',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newPassword && newPassword !== confirmNewPassword) {
      setFormError(t.pages.profile.passwordMismatch);
      return;
    }

    await updateMutation.mutateAsync({
      name: fullName,
      email: email,
      phone: phone,
      address: address,
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
              <div className="relative group">
                <Avatar
                  className="h-32 w-32 border-4 border-primary mb-4 cursor-pointer transition-opacity group-hover:opacity-80"
                  onClick={handleAvatarClick}
                >
                  <AvatarImage asChild src={profile?.avatarUrl || 'https://placehold.co/150x150.png'} alt={profile?.name || 'User'}>
                     <Image src={profile?.avatarUrl || 'https://placehold.co/150x150.png'} alt={profile?.name || 'User'} width={128} height={128} data-ai-hint="user portrait" />
                  </AvatarImage>
                  <AvatarFallback className="text-4xl bg-muted">{profile?.name ? profile.name.split(' ').map(n=>n[0]).join('') : 'U'}</AvatarFallback>
                </Avatar>

                {/* Upload overlay */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ width: '128px', height: '128px', top: '0', left: '50%', transform: 'translateX(-50%)' }}
                >
                  <div className="bg-black/50 rounded-full w-full h-full flex items-center justify-center">
                    {isUploadingAvatar ? (
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    ) : (
                      <Camera className="h-8 w-8 text-white" />
                    )}
                  </div>
                </div>

                {/* Delete button - only show if user has an avatar */}
                {profile?.avatarUrl && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAvatarDelete();
                    }}
                    disabled={isUploadingAvatar}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
              </div>
              <CardTitle className="text-2xl font-headline">{profile?.name || 'N/A'}</CardTitle>
              <CardDescription>{profile?.role}</CardDescription>
              <p className="text-xs text-muted-foreground mt-2">
                Click on avatar to change photo
              </p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>{t.pages.profile.email}</strong> {profile?.email}</p>
              <p><strong>{t.pages.profile.phone}</strong> {profile?.phone || 'N/A'}</p>
              <p><strong>{t.pages.profile.address}</strong> {profile?.address || 'N/A'}</p>
              <p><strong>{t.pages.profile.memberSince}</strong> {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('es-MX') : 'N/A'}</p>
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
                    <Label htmlFor="phone">{t.pages.profile.phoneLabel}</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="role">{t.pages.profile.roleLabel}</Label>
                    <Input id="role" value={profile?.role || 'N/A'} readOnly className="bg-muted/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t.pages.profile.addressLabel}</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t.pages.profile.changePassword}</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="currentPassword">{t.pages.profile.currentPassword}</Label>
                          <Input id="currentPassword" type="password" placeholder={t.pages.profile.passwordPlaceholder} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                      </div>
                       <div className="space-y-2">
                          <Label htmlFor="newPassword">{t.pages.profile.newPassword}</Label>
                          <Input id="newPassword" type="password" placeholder={t.pages.profile.passwordPlaceholder} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="confirmNewPassword">{t.pages.profile.confirmNewPassword}</Label>
                          <Input id="confirmNewPassword" type="password" placeholder={t.pages.profile.passwordPlaceholder} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                      </div>
                  </div>
                </div>

                {formError && (
                  <div className="text-destructive text-sm mt-4">{formError}</div>
                )}
                <div className="flex justify-end space-x-3 mt-4">
                  <Button type="button" variant="outline" onClick={() => utils.user.getProfile.invalidate()} disabled={updateMutation.isPending}>
                    {t.actions.cancel}
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={updateMutation.isPending}>
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
