'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { t } from '@/lib/i18n';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isDemoMode } from '@/lib/env-check';

export default function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled ? "bg-background/80 backdrop-blur-md shadow-md" : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Logo size="lg" />
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {t.layout.publicHeader.navLinks.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                asChild
                className={cn(
                  "text-base lg:text-lg font-bold hover:text-primary",
                  pathname === item.href ? "text-primary font-semibold" : "text-foreground/80"
                )}
              >
                <Link href={item.href}>
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="hidden md:flex items-center space-x-3">
            {isDemoMode() ? (
              <Button variant="default" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground text-base">
                <Link href="/dashboard">{t.layout.publicHeader.gotoDashboard || 'Go to Dashboard'}</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild className="text-base font-bold">
                  <Link href="/login">{t.layout.publicHeader.login}</Link>
                </Button>
                <Button variant="default" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground text-base font-bold">
                  <Link href="/join-us">Únete a Nosotros</Link>
                </Button>
              </>
            )}
          </div>
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t.layout.publicHeader.openMenu}>
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-xs bg-background p-6">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-8">
                    <Logo size="sm" />
                    <SheetClose asChild>
                       <Button variant="ghost" size="icon" aria-label={t.layout.publicHeader.closeMenu}>
                         <X className="h-6 w-6" />
                       </Button>
                    </SheetClose>
                  </div>
                  <nav className="flex flex-col space-y-3 mb-8">
                    {t.layout.publicHeader.navLinks.map((item) => (
                      <SheetClose key={item.label} asChild>
                        <Link
                          href={item.href}
                           className={cn(
                            "block rounded-md px-3 py-2 text-lg font-medium hover:bg-muted hover:text-primary",
                            pathname === item.href ? "bg-muted text-primary font-semibold" : "text-foreground"
                          )}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>
                  <div className="mt-auto space-y-3">
                    {isDemoMode() ? (
                      <SheetClose asChild>
                        <Button variant="default" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                          <Link href="/dashboard">{t.layout.publicHeader.gotoDashboard || 'Go to Dashboard'}</Link>
                        </Button>
                      </SheetClose>
                    ) : (
                      <>
                        <SheetClose asChild>
                          <Button variant="outline" className="w-full" asChild>
                            <Link href="/login">{t.layout.publicHeader.login}</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button variant="default" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                            <Link href="/join-us">Únete a Nosotros</Link>
                          </Button>
                        </SheetClose>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
