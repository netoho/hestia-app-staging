import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { t } from '@/lib/i18n';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { redirect } from 'next/navigation';
import { isDemoMode } from '@/lib/env-check';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let session;
  let user;

  if (isDemoMode()) {
    // In demo mode, create a mock session with super admin user
    user = {
      id: 'demo-admin-id',
      email: 'admin@hestiaplp.com.mx',
      name: 'Super Admin',
      role: 'staff'
    };
  } else {
    session = await getServerSession(authOptions);

    if (!session) {
      redirect('/login');
    }

    user = session.user;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background w-full">
        <DashboardSidebar user={user} />
        <SidebarInset className="flex flex-col flex-1">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 md:px-6 shadow-sm">
            <div className="flex-1">
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">{t.layout.dashboardLayout.viewNotifications}</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
           <footer className="border-t bg-background/80 px-4 py-3 md:px-6 text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {t.siteName}. {t.layout.dashboardLayout.copyright}
            </p>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
