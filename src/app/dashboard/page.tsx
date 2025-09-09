'use client';

import React from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Users, Shield, DollarSign, Edit, PackageSearch, UserPlus, ListChecks } from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { t } from '@/lib/i18n'; // Assuming t is for translations and is correctly imported
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  // Handle authentication redirect after loading is complete
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not loading, the useEffect will redirect
  if (!isAuthenticated) {
    return null;
  }

  let welcomeMessage = t.pages.dashboard.welcomeBack;
  let roleSpecificContent = null;

  if (user?.role === 'owner') {
    welcomeMessage = t.pages.dashboard.welcomeOwner;
    roleSpecificContent = (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Add padding or margin here if needed */}
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.pages.dashboard.ownerCards.activePolicies}</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">{t.pages.dashboard.ownerCards.managedBy}</p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/policies">{t.pages.dashboard.ownerCards.viewPolicies}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.pages.dashboard.ownerCards.totalRentInsured}</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,500.00</div>
            <p className="text-xs text-muted-foreground">{t.pages.dashboard.ownerCards.acrossAll}</p>
             <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/payments">{t.pages.dashboard.ownerCards.viewPayments}</Link>
            </Button>
          </CardContent>
        </Card>
         <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.pages.dashboard.ownerCards.newRenterRequest}</CardTitle>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{t.pages.dashboard.ownerCards.newRenterRequestDesc}</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/policies/new">{t.pages.dashboard.ownerCards.createNewPolicy}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  } else if (user?.role === 'renter') {
    welcomeMessage = t.pages.dashboard.welcomeRenter;
    roleSpecificContent = (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.pages.dashboard.renterCards.myActivePolicy}</CardTitle>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{t.pages.dashboard.renterCards.policyNumber}</div>
            <p className="text-xs text-muted-foreground">{t.pages.dashboard.renterCards.statusActive}</p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/my-policy">{t.pages.dashboard.renterCards.viewDetails}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.pages.dashboard.renterCards.myProfile}</CardTitle>
            <Edit className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground mb-3">{t.pages.dashboard.renterCards.myProfileDesc}</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/profile">{t.pages.dashboard.renterCards.updateProfile}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  } else if (user?.role === 'staff' || user?.role === 'admin') {
    welcomeMessage = user?.role === 'admin' ? t.pages.dashboard.welcomeAdmin : t.pages.dashboard.welcomeStaff;
    roleSpecificContent = (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Add padding or margin here if needed */}
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.pages.dashboard.staffCards.totalUsers}</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,280</div>
            <p className="text-xs text-muted-foreground">{t.pages.dashboard.staffCards.thisMonth}</p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/users">{t.pages.dashboard.staffCards.manageUsers}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.pages.dashboard.staffCards.pendingPolicies}</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">{t.pages.dashboard.staffCards.requireReview}</p>
             <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/policies?status=pending">{t.pages.dashboard.staffCards.reviewPolicies}</Link>
            </Button>
          </CardContent>
        </Card>
         <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.pages.dashboard.staffCards.systemPackages}</CardTitle>
            <PackageSearch className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{t.pages.dashboard.staffCards.systemPackagesDesc}</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/packages">{t.pages.dashboard.staffCards.managePackages}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title={welcomeMessage} className="mb-8" />
      {roleSpecificContent}
    </div>
  );
}
