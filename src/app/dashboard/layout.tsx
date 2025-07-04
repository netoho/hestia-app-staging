import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { Button } from '@/components/ui/button';
import { Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const user = { name: t.misc.demoUser, email: "demo@example.com" };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 md:px-6 shadow-sm">
            <div className="flex-1">
            </div>
            <div className="flex items-center gap-4">
              <form className="relative hidden md:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t.layout.dashboardLayout.searchPlaceholder}
                  className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-muted/50 focus:bg-background"
                />
              </form>
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
