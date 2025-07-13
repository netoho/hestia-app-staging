'use client';

import { useEffect, useState } from 'react';
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
import { Loader2 } from 'lucide-react';

interface UserProfile {
  name?: string;
  email?: string;
  role: string;
  phone?: string;
  address?: string;
  image?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const fetchProfile = async () => {
    if (!isAuthenticated || !user?.token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data: UserProfile = await res.json();
      setProfile(data);
      setFullName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.token) {
      fetchProfile();
    } else if (!isAuthLoading && !isAuthenticated) {
        setLoading(false); // User is not authenticated, stop loading
    }
  }, [isAuthenticated, user?.token, isAuthLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (newPassword && newPassword !== confirmNewPassword) {
      setError('New password and confirmation do not match.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: fullName,
          email: email,
          phone: phone,
          address: address,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedProfile: UserProfile = await res.json();
      setProfile(updatedProfile);
      
      // Clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      toast({
        title: 'Profile Updated',\
        description: 'Your profile has been successfully updated.',\
      });
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast({
        title: 'Error',\
        description: err instanceof Error ? err.message : 'Failed to update profile',\
        variant: 'destructive',\
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">\
        <div className="text-center">\
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />\
          <p className="text-muted-foreground">Loading profile...</p>\
        </div>\
      </div>\
    );\
  }

  if (error) {
    return (\
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">\
        <Card className="w-full max-w-md">\
          <CardHeader className="text-center">\
            <CardTitle className="text-red-600">Error Loading Profile</CardTitle>\
            <CardDescription>{error}</CardDescription>\
          </CardHeader>\
          <CardContent>\
            <Button onClick={() => window.location.reload()} className="w-full">\
              Retry\
            </Button>\
          </CardContent>\
        </Card>\
      </div>\
    );\
  }

  if (!isAuthenticated) {
    return (\
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">\
            <Card className="w-full max-w-md">\
                <CardHeader className="text-center">\
                    <CardTitle>Access Denied</CardTitle>\
                    <CardDescription>Please log in to view your profile.</CardDescription>\
                </CardHeader>\
                <CardContent>\
                    <Button onClick={() => window.location.href = '/login'} className="w-full">\
                        Go to Login\
                    </Button>\
                </CardContent>\
            </Card>\
        </div>\
    );\
  }

  return (
    <div>
      <PageTitle title={t.pages.profile.title} subtitle={t.pages.profile.subtitle} />

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="items-center text-center">
                <Avatar className="h-32 w-32 border-4 border-primary mb-4">
                  <AvatarImage asChild src={profile?.image || 'https://placehold.co/150x150.png'} alt={profile?.name || 'User'}>
                     <Image src={profile?.image || 'https://placehold.co/150x150.png'} alt={profile?.name || 'User'} width={128} height={128} data-ai-hint="user portrait" />
                  </AvatarImage>
                  <AvatarFallback className="text-4xl bg-muted">{profile?.name ? profile.name.split(' ').map(n=>n[0]).join('') : 'U'}</AvatarFallback>
                </Avatar>
              <CardTitle className="text-2xl font-headline">{profile?.name || 'N/A'}</CardTitle>
              <CardDescription>{profile?.role}</CardDescription>
              {/* <Button variant="outline" size="sm" className="mt-2">{t.pages.profile.changePhoto}</Button> */}{/* Photo change not implemented yet */}
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
              <form onSubmit={handleSubmit} className="space-y-6">\
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
                          <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                          <Input id="confirmNewPassword" type="password" placeholder="••••••••" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                      </div>
                  </div>
                </div>

                {error && (\
                  <div className="text-destructive text-sm mt-4">{error}</div>\
                )}\
                <div className="flex justify-end space-x-3 mt-4">\
                  <Button type="button" variant="outline" onClick={() => fetchProfile()} disabled={isSaving}>
                    {t.actions.cancel}
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t.actions.saveChanges}
                  </Button>
                </div>
              </form>\
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
