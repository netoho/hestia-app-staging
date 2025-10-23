import type { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { t } from '@/lib/i18n';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-config';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const user = session.user;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="relative min-h-screen bg-background">
        {/* Fixed sidebar */}
        <DashboardSidebar user={user} />

        {/* Main content with dynamic margin based on sidebar width */}
        <div
          className="transition-all duration-200 ease-in-out"
          style={{ marginLeft: "var(--sidebar-width, 0px)" }}
        >
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 md:px-6 shadow-sm">
            <div className="lg:hidden">
              <SidebarTrigger />
            </div>
            <div className="flex-1">
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">{t.layout.dashboardLayout.viewNotifications}</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto min-h-[calc(100vh-8rem)]">
            {children}
          </main>
          <footer className="border-t bg-background/80 px-4 py-3 md:px-6 text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {t.siteName}. {t.layout.dashboardLayout.copyright}
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
