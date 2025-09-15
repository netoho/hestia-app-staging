import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal de Actores - Hestia',
  description: 'Complete su información para la póliza de garantía',
};

export default function ActorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Hestia
            </h1>
            <p className="text-gray-600 mt-2">Sistema de Pólizas de Garantía</p>
          </div>

          {/* Main Content */}
          {children}

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.</p>
            <p className="mt-2">
              ¿Necesitas ayuda? Contacta a{' '}
              <a href="mailto:soporte@hestiaplp.com.mx" className="text-blue-600 hover:underline">
                soporte@hestiaplp.com.mx
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}