import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';

// Mock user data, replace with actual data from auth context or API
const MOCK_USER = {
  name: "Demo User",
  email: "demo@hestiaguard.com",
  role: "Property Owner",
  phone: "+52 55 1234 5678",
  address: "123 Secure St, Mexico City",
  avatarUrl: "https://placehold.co/150x150.png",
  memberSince: new Date(2023, 0, 15).toLocaleDateString(),
};

export default function ProfilePage() {
  return (
    <div>
      <PageTitle title="My Profile" subtitle="View and manage your personal information." />

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
              <Button variant="outline" size="sm" className="mt-2">Change Picture</Button>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Email:</strong> {MOCK_USER.email}</p>
              <p><strong>Phone:</strong> {MOCK_USER.phone}</p>
              <p><strong>Address:</strong> {MOCK_USER.address}</p>
              <p><strong>Member Since:</strong> {MOCK_USER.memberSince}</p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Edit Profile Information</CardTitle>
              <CardDescription>Make changes to your personal details and save them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" defaultValue={MOCK_USER.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue={MOCK_USER.email} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue={MOCK_USER.phone} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="role">Role (Read-only)</Label>
                  <Input id="role" defaultValue={MOCK_USER.role} readOnly className="bg-muted/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" defaultValue={MOCK_USER.address} />
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">Change Password</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input id="currentPassword" type="password" placeholder="••••••••" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" placeholder="••••••••" />
                    </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-4">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-primary hover:bg-primary/90">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
