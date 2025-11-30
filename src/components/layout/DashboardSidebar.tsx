'use client';

import type { NavItem } from '@/lib/types';
import type { UserRole } from "@/prisma/generated/prisma-client/enums";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import Logo from '@/components/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronDown, Settings, UserCircle, Bell } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

interface DashboardSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  }
}

const NavLink = ({ item, isMobile }: { item: NavItem; isMobile: boolean }) => {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const isActive = item.matchExact ? pathname === item.href : pathname.startsWith(item.href);

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        aria-current={isActive ? "page" : undefined}
      >
        <Link href={item.href} onClick={handleClick}>
          {item.icon && <item.icon />}
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};


export default function DashboardSidebar({ user }: DashboardSidebarProps) {
  const { isMobile } = useSidebar();
  const [navLinks, setNavLinks] = useState<NavItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const userRole = user.role as UserRole;
    if (userRole === 'BROKER') setNavLinks(t.layout.dashboardSidebar.brokerLinks);
    else if (userRole === 'STAFF') setNavLinks(t.layout.dashboardSidebar.staffLinks);
    else if (userRole === 'ADMIN') setNavLinks(t.layout.dashboardSidebar.adminLinks);
    else setNavLinks(t.layout.dashboardSidebar.renterLinks); // Default for safety
  }, [user.role]);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader className="h-20 flex items-center justify-center p-2 sticky top-0 bg-sidebar z-10 border-b border-sidebar-border">
        <Logo iconOnly={!isMobile && useSidebar().state === 'collapsed'} />
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarMenu>
          {navLinks.map((item) => (
            <NavLink key={item.href} item={item} isMobile={isMobile} />
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border sticky bottom-0 bg-sidebar z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start h-auto p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-10">
              <Avatar className="h-8 w-8 mr-2 group-data-[collapsible=icon]:mr-0">
                <AvatarImage src={user.image || 'https://placehold.co/100x100.png'} alt={user.name || 'User'} data-ai-hint="user avatar" />
                <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="group-data-[collapsible=icon]:hidden text-left">
                <p className="text-sm font-medium text-sidebar-foreground">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/70">{user.email}</p>
              </div>
               <ChevronDown className="ml-auto h-4 w-4 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-2 ml-1">
            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              <UserCircle className="mr-2 h-4 w-4" /> {t.layout.dashboardSidebar.userMenu.profile}
            </DropdownMenuItem>
            {/* <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}> */}
            {/*   <Settings className="mr-2 h-4 w-4" /> {t.layout.dashboardSidebar.userMenu.settings} */}
            {/* </DropdownMenuItem> */}
            {/* <DropdownMenuItem> */}
            {/*   <Bell className="mr-2 h-4 w-4" /> {t.layout.dashboardSidebar.userMenu.notifications} */}
            {/* </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" /> {t.layout.dashboardSidebar.userMenu.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
