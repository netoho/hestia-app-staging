import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { t } from '@/lib/i18n';

const MOCK_USER = {
  name: t.misc.demoUser,
  email: "demo@hestia.com",
  role: t.roles.owner,
  phone: "+52 55 1234 5678",
  address: "Calle Segura 123, Ciudad de México",
  avatarUrl: "https://placehold.co/150x150.png",
  memberSince: new Date(2023, 0, 15).toLocaleDateString('es-MX'),
};

export default function ProfilePage() {
  return (
    <div>
      <PageTitle title={t.pages.profile.title} subtitle={t.pages.profile.subtitle} />

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="items-center text-center">
                <Avatar className="h-32 w-32 border-4 border-primary mb-4">
                  <AvatarImage asChild src={MOCK_USER.avatarUrl} alt={MOCK_USER.name}>
                     <Image src={MOCK_USER.avatarUrl} alt={MOCK_USER.name} width={128} height={128} data-ai-hint="user portrait" />
                  </AvatarImage>
                  <AvatarFallback className="text-4xl bg-muted">{MOCK_USER.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                </Avatar>
              <CardTitle className="text-2xl font-headline">{MOCK_USER.name}</CardTitle>
              <CardDescription>{MOCK_USER.role}</CardDescription>
              <Button variant="outline" size="sm" className="mt-2">{t.pages.profile.changePhoto}</Button>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>{t.pages.profile.email}</strong> {MOCK_USER.email}</p>
              <p><strong>{t.pages.profile.phone}</strong> {MOCK_USER.phone}</p>
              <p><strong>{t.pages.profile.address}</strong> {MOCK_USER.address}</p>
              <p><strong>{t.pages.profile.memberSince}</strong> {MOCK_USER.memberSince}</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t.pages.profile.fullName}</Label>
                  <Input id="fullName" defaultValue={MOCK_USER.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t.pages.profile.emailLabel}</Label>
                  <Input id="email" type="email" defaultValue={MOCK_USER.email} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t.pages.profile.phoneLabel}</Label>
                  <Input id="phone" type="tel" defaultValue={MOCK_USER.phone} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="role">{t.pages.profile.roleLabel}</Label>
                  <Input id="role" defaultValue={MOCK_USER.role} readOnly className="bg-muted/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t.pages.profile.addressLabel}</Label>
                <Input id="address" defaultValue={MOCK_USER.address} />
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">{t.pages.profile.changePassword}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">{t.pages.profile.currentPassword}</Label>
                        <Input id="currentPassword" type="password" placeholder={t.pages.profile.passwordPlaceholder} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="newPassword">{t.pages.profile.newPassword}</Label>
                        <Input id="newPassword" type="password" placeholder={t.pages.profile.passwordPlaceholder} />
                    </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-4">
                <Button variant="outline">{t.actions.cancel}</Button>
                <Button className="bg-primary hover:bg-primary/90">{t.actions.saveChanges}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
