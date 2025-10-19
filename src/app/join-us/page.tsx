import { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { JoinUsForm } from '@/components/forms/JoinUsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, TrendingUp, HeadphonesIcon } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export const metadata: Metadata = {
  title: `${t.pages.joinUs.title} - ${t.siteName}`,
  description: t.pages.joinUs.pageDescription,
};

export default function JoinUsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">{t.pages.joinUs.title}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {t.pages.joinUs.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{t.pages.joinUs.whyJoinTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">{t.pages.joinUs.whyJoinText}</p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Briefcase className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Herramientas Profesionales</h4>
                      <p className="text-sm text-muted-foreground">
                        Acceso a nuestra plataforma completa para gestionar protecciones y clientes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Red de Socios</h4>
                      <p className="text-sm text-muted-foreground">
                        Forma parte de una comunidad de asesores profesionales
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Crecimiento del Negocio</h4>
                      <p className="text-sm text-muted-foreground">
                        Aumenta tus ingresos ofreciendo servicios de valor agregado
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <HeadphonesIcon className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Soporte Dedicado</h4>
                      <p className="text-sm text-muted-foreground">
                        Equipo de soporte disponible para ayudarte en cada paso
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle>Beneficios Destacados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <span className="text-primary">✓</span>
                    <span className="text-sm">Comisiones competitivas por cada protección de arrendamiento</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-primary">✓</span>
                    <span className="text-sm">Capacitación continua y certificaciones</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-primary">✓</span>
                    <span className="text-sm">Material de marketing personalizado</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-primary">✓</span>
                    <span className="text-sm">Portal exclusivo para asesores</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-primary">✓</span>
                    <span className="text-sm">Eventos y networking exclusivos</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.pages.joinUs.form.title}</CardTitle>
              <CardDescription>{t.pages.joinUs.form.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <JoinUsForm />
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
      <PublicFooter />
    </div>
  );
}
