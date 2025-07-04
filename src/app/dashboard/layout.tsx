import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Search, Bell, UserCircle, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { SITE_NAME } from '@/lib/constants';
import Logo from '@/components/Logo';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // In a real app, user data would come from an auth provider/session
  const user = { name: "Usuario Demo", email: "demo@example.com" };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 md:px-6 shadow-sm">
             {/* Mobile sidebar trigger is inside DashboardSidebar */}
            <div className="flex-1">
               {/* Optional: Add breadcrumbs or a dynamic title here based on route */}
            </div>
            <div className="flex items-center gap-4">
              <form className="relative hidden md:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar..."
                  className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-muted/50 focus:bg-background"
                />
              </form>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Ver notificaciones</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
           <footer className="border-t bg-background/80 px-4 py-3 md:px-6 text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
            </p>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
