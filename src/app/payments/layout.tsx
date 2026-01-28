import { Metadata } from 'next';
import Logo from '@/components/Logo';
import { brandInfo } from '@/lib/config/brand';

export const metadata: Metadata = {
  title: 'Pago - Hestia',
  description: 'Complete su pago de forma segura',
};

export default function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: '#d4dae1' }}>
        <div className="container mx-auto px-4 py-6">
          <Logo size="lg" className="flex flex-row justify-center items-center"/>
        </div>
      </header>

      {children}

      {/* Footer */}
      <footer className="border-t mt-12" style={{ borderColor: '#d4dae1', backgroundColor: 'white' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-sm text-gray-600 space-y-2">
              <p>&copy; {new Date().getFullYear()} {brandInfo.legalName}</p>
              <p>Todos los derechos reservados.</p>
              <p className="mt-4">
                &iquest;Necesitas ayuda? Contacta a{' '}
                <a
                  href={`mailto:${brandInfo.supportEmail}`}
                  className="font-medium hover:underline"
                  style={{ color: '#173459' }}
                >
                  {brandInfo.supportEmail}
                </a>
              </p>
              <p className="text-xs text-gray-500 mt-3">
                {brandInfo.supportPhone}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
