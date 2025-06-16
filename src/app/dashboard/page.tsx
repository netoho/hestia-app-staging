'use client'; // For using hooks like useState/useEffect if needed for role simulation

import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Users, Shield, DollarSign, Edit, PackageSearch, UserPlus, ListChecks } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { UserRole } from '@/lib/types';


// Mock user role, in a real app this would come from auth context
const MOCK_USER_ROLE: UserRole = 'owner'; // Change to 'renter' or 'staff'


export default function DashboardPage() {
  const [userRole, setUserRole] = useState<UserRole>(MOCK_USER_ROLE);

  // useEffect(() => {
  //   // Simulate fetching user role
  //   // const fetchedRole = await getRoleFromAuth();
  //   // setUserRole(fetchedRole);
  // }, []);

  let welcomeMessage = "Welcome to your HestiaGuard Dashboard!";
  let roleSpecificContent = null;

  if (userRole === 'owner') {
    welcomeMessage = "Welcome, Property Owner!";
    roleSpecificContent = (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Managed by HestiaGuard</p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/policies">View Policies</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rent Secured</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,500.00</div>
            <p className="text-xs text-muted-foreground">Across all active policies</p>
             <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/payments">View Payments</Link>
            </Button>
          </CardContent>
        </Card>
         <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Tenant Application</CardTitle>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Start a new policy for a prospective tenant.</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/policies/new">Create New Policy</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  } else if (userRole === 'renter') {
    welcomeMessage = "Welcome, Renter!";
    roleSpecificContent = (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Active Policy</CardTitle>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">Policy #HG-12345</div>
            <p className="text-xs text-muted-foreground">Status: Active</p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/my-policy">View Details</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Profile</CardTitle>
            <Edit className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground mb-3">Keep your information up to date for seamless service.</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/profile">Update Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  } else if (userRole === 'staff') {
    welcomeMessage = "Welcome, HestiaGuard Staff!";
    roleSpecificContent = (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,280</div>
            <p className="text-xs text-muted-foreground">+50 this month</p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Policies</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Require review</p>
             <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/policies?status=pending">Review Policies</Link>
            </Button>
          </CardContent>
        </Card>
         <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Packages</CardTitle>
            <PackageSearch className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">View and edit current service packages.</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/packages">Manage Packages</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title={welcomeMessage} className="mb-8" />
      {roleSpecificContent || <p>Loading dashboard content...</p>}
      {/* Add more general dashboard components or summaries here */}
    </div>
  );
}
