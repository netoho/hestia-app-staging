'use client';

import Logo from '@/components/Logo';
import MagicLinkForm from '@/components/portal/receipts/MagicLinkForm';
import { brandInfo } from '@/lib/config/brand';

export default function ReceiptMagicLinkPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: '#d4dae1' }}>
        <div className="container mx-auto px-4 py-6">
          <Logo size="lg" className="flex flex-row justify-center items-center" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <MagicLinkForm />
      </main>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: '#d4dae1', backgroundColor: 'white' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>&copy; {new Date().getFullYear()} {brandInfo.legalName}</p>
            <p>
              ¿Necesitas ayuda? Contacta a{' '}
              <a
                href={`mailto:${brandInfo.supportEmail}`}
                className="font-medium hover:underline"
                style={{ color: '#173459' }}
              >
                {brandInfo.supportEmail}
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
