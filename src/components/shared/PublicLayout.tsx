import Logo from '@/components/Logo';
import { brandInfo } from '@/lib/config/brand';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <header className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <Logo size="lg" className="flex flex-row justify-center items-center" />
        </div>
      </header>

      {children}

      <footer className="border-t border-border mt-12 bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>&copy; {new Date().getFullYear()} {brandInfo.legalName}</p>
              <p>Todos los derechos reservados.</p>
              <p className="mt-4">
                ¿Necesitas ayuda? Contacta a{' '}
                <a
                  href={`mailto:${brandInfo.supportEmail}`}
                  className="font-medium hover:underline text-primary"
                >
                  {brandInfo.supportEmail}
                </a>
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                {brandInfo.supportPhone}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
