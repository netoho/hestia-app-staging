'use client';

import type { NavItem, User, UserRole } from '@/lib/types';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';
import Logo from '@/components/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronDown, ChevronRight, Settings, UserCircle, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SITE_NAME, OWNER_DASHBOARD_LINKS, RENTER_DASHBOARD_LINKS, STAFF_DASHBOARD_LINKS } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from 'react';

// Mock user for demonstration. Replace with actual auth context.
const MOCK_USER: User = {
  id: '1',
  name: 'Demo User',
  email: 'demo@hestiaguard.com',
  role: 'owner', // Change this to 'renter' or 'staff' to see different sidebars
  avatarUrl: 'https://placehold.co/100x100.png',
};


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
      <Link href={item.href} passHref legacyBehavior>
        <SidebarMenuButton
          isActive={isActive}
          onClick={handleClick}
          tooltip={item.label}
          aria-current={isActive ? "page" : undefined}
        >
          {item.icon && <item.icon />}
          <span>{item.label}</span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
};


export default function DashboardSidebar() {
  const { isMobile } = useSidebar();
  const [userRole, setUserRole] = useState<UserRole>('owner'); // Default role
  const [navLinks, setNavLinks] = useState<NavItem[]>(OWNER_DASHBOARD_LINKS);

  // In a real app, userRole would come from an auth context/store
  useEffect(() => {
    // Simulate fetching user role or getting from context
    const currentMockUserRole = MOCK_USER.role; // This could be dynamic in a real app
    setUserRole(currentMockUserRole);
    if (currentMockUserRole === 'owner') setNavLinks(OWNER_DASHBOARD_LINKS);
    else if (currentMockUserRole === 'renter') setNavLinks(RENTER_DASHBOARD_LINKS);
    else if (currentMockUserRole === 'staff') setNavLinks(STAFF_DASHBOARD_LINKS);
  }, []);


  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader className="h-20 flex items-center justify-between p-2 sticky top-0 bg-sidebar z-10 border-b border-sidebar-border">
        <Logo iconOnly={!isMobile && useSidebar().state === 'collapsed'} />
        <div className="md:hidden">
         <SidebarTrigger />
        </div>
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
                <AvatarImage src={MOCK_USER.avatarUrl} alt={MOCK_USER.name} data-ai-hint="user avatar" />
                <AvatarFallback>{MOCK_USER.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="group-data-[collapsible=icon]:hidden text-left">
                <p className="text-sm font-medium text-sidebar-foreground">{MOCK_USER.name}</p>
                <p className="text-xs text-sidebar-foreground/70">{MOCK_USER.email}</p>
              </div>
               <ChevronDown className="ml-auto h-4 w-4 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-2 ml-1">
            <DropdownMenuLabel>{MOCK_USER.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile"><UserCircle className="mr-2 h-4 w-4" /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell className="mr-2 h-4 w-4" /> Notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              // onClick={() => console.log('Log out user')} // Replace with actual logout
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
