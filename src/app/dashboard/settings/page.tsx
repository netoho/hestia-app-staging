import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, Bell, ShieldCheck } from 'lucide-react';
import { t } from '@/lib/i18n';

export default function SettingsPage() {
  return (
    <div>
      <PageTitle title={t.pages.settings.title} subtitle={t.pages.settings.subtitle} />

      <div className="space-y-8">
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><Bell className="mr-2 h-5 w-5 text-primary"/> {t.pages.settings.notifications}</CardTitle>
            <CardDescription>{t.pages.settings.notificationsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Label htmlFor="emailNotifications" className="flex flex-col space-y-1">
                <span>{t.pages.settings.emailNotifications}</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {t.pages.settings.emailNotificationsDesc}
                </span>
              </Label>
              <Switch id="emailNotifications" defaultChecked aria-label={t.pages.settings.emailNotifications}/>
            </div>
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Label htmlFor="smsNotifications" className="flex flex-col space-y-1">
                <span>{t.pages.settings.smsAlerts}</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {t.pages.settings.smsAlertsDesc}
                </span>
              </Label>
              <Switch id="smsNotifications" aria-label={t.pages.settings.smsAlerts}/>
            </div>
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Label htmlFor="newsletter" className="flex flex-col space-y-1">
                <span>{t.pages.settings.promoUpdates}</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {t.pages.settings.promoUpdatesDesc}
                </span>
              </Label>
              <Switch id="newsletter" defaultChecked aria-label={t.pages.settings.promoUpdates}/>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary"/> {t.pages.settings.security}</CardTitle>
            <CardDescription>{t.pages.settings.securityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex flex-col space-y-1">
                <span>{t.pages.settings.twoFactor}</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {t.pages.settings.twoFactorDesc}
                </span>
              </div>
              <Button variant="outline">{t.pages.settings.enable2FA}</Button>
            </div>
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex flex-col space-y-1">
                <span>{t.pages.settings.loginHistory}</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {t.pages.settings.loginHistoryDesc}
                </span>
              </div>
              <Button variant="link">{t.pages.settings.viewHistory}</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><Globe className="mr-2 h-5 w-5 text-primary"/> {t.pages.settings.languageRegion}</CardTitle>
            <CardDescription>{t.pages.settings.languageRegionDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
              <Label htmlFor="language" className="font-normal">{t.pages.settings.language}</Label>
              <Button variant="outline">{t.pages.settings.languageValue}</Button> 
            </div>
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
              <Label htmlFor="timezone" className="font-normal">{t.pages.settings.timezone}</Label>
              <Button variant="outline">{t.pages.settings.timezoneValue}</Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-right">
            <Button className="bg-primary hover:bg-primary/90 text-lg px-6 py-5">{t.pages.settings.saveAll}</Button>
        </div>
      </div>
    </div>
  );
}
