import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Globe, Bell, ShieldCheck } from 'lucide-react'; // Changed ShieldLock to ShieldCheck

export default function SettingsPage() {
  return (
    <div>
      <PageTitle title="Account Settings" subtitle="Manage your preferences and account security." />

      <div className="space-y-8">
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><Bell className="mr-2 h-5 w-5 text-primary"/> Notification Settings</CardTitle>
            <CardDescription>Control how you receive notifications from HestiaGuard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Label htmlFor="emailNotifications" className="flex flex-col space-y-1">
                <span>Email Notifications</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Receive updates about your policies, payments, and important announcements via email.
                </span>
              </Label>
              <Switch id="emailNotifications" defaultChecked aria-label="Toggle email notifications"/>
            </div>
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Label htmlFor="smsNotifications" className="flex flex-col space-y-1">
                <span>SMS Alerts</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Get critical alerts and reminders via text message (carrier rates may apply).
                </span>
              </Label>
              <Switch id="smsNotifications" aria-label="Toggle SMS alerts"/>
            </div>
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Label htmlFor="newsletter" className="flex flex-col space-y-1">
                <span>Promotional Updates</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Subscribe to our newsletter for product updates and special offers.
                </span>
              </Label>
              <Switch id="newsletter" defaultChecked aria-label="Toggle promotional updates"/>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary"/> Security Settings</CardTitle> {/* Changed ShieldLock to ShieldCheck */}
            <CardDescription>Manage your account security features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex flex-col space-y-1">
                <span>Two-Factor Authentication (2FA)</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Enhance your account security by requiring a second form of verification.
                </span>
              </div>
              <Button variant="outline">Enable 2FA</Button>
            </div>
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex flex-col space-y-1">
                <span>Login History</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Review recent login activity on your account.
                </span>
              </div>
              <Button variant="link">View History</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><Globe className="mr-2 h-5 w-5 text-primary"/> Language & Region</CardTitle>
            <CardDescription>Choose your preferred language and regional settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
              <Label htmlFor="language" className="font-normal">Language</Label>
              {/* This would be a Select component in a real app */}
              <Button variant="outline">English (US)</Button> 
            </div>
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
              <Label htmlFor="timezone" className="font-normal">Timezone</Label>
              <Button variant="outline">(GMT-06:00) Central Time</Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-right">
            <Button className="bg-primary hover:bg-primary/90 text-lg px-6 py-5">Save All Settings</Button>
        </div>
      </div>
    </div>
  );
}
