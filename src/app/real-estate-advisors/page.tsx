import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Briefcase, Users, Zap, BarChart3, MessageSquare, Handshake } from 'lucide-react';

export default function RealEstateAdvisorsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="bg-primary/10 pt-24 pb-16">
          <PageTitle
            title="Potencie su Negocio Inmobiliario"
            subtitle="Asóciese con Hestia para ofrecer seguridad mejorada y agilizar los procesos de alquiler para sus clientes."
          />
           <div className="text-center">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/contact?subject=AdvisorPartnership">Conviértase en Socio</Link>
            </Button>
          </div>
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Por Qué los Asesores Eligen Hestia</h2>
              <p className="text-lg text-muted-foreground mb-4">
                Como asesor inmobiliario, su reputación se basa en la confianza y en colocaciones exitosas. Hestia proporciona las herramientas y la seguridad para mejorar su oferta de servicios, convirtiéndolo en un socio indispensable tanto para propietarios como para inquilinos.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: Zap, text: "Cierres de Tratos Más Rápidos: Nuestro proceso ágil reduce la fricción." },
                  { icon: Handshake, text: "Mayor Confianza del Cliente: Ofrezca protección fiable para su tranquilidad." },
                  { icon: BarChart3, text: "Ventaja Competitiva: Diferencie sus servicios en el mercado." },
                  { icon: MessageSquare, text: "Soporte Dedicado: Acceso a nuestro equipo para asistencia rápida." },
                ].map(item => (
                  <li key={item.text} className="flex items-center text-foreground">
                    <item.icon className="h-6 w-6 text-primary mr-3" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Image
                src="https://placehold.co/600x400.png"
                alt="Asesores inmobiliarios colaborando"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
                data-ai-hint="professionals meeting"
              />
            </div>
          </div>
        </Section>
        
        <Section className="bg-muted/30">
          <PageTitle title="Beneficios para sus Clientes" subtitle="Cómo Hestia le ayuda a servir mejor a propietarios e inquilinos." titleClassName='text-foreground'/>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary flex items-center"><Users className="mr-2"/> Para Propietarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Ayude a los propietarios a minimizar los períodos de vacancia atrayendo a un grupo más amplio de inquilinos calificados.</p>
                <p>Proporcione seguridad en el pago de la renta y protección de la propiedad, reduciendo el estrés del propietario.</p>
                <p>Simplifique el proceso de arrendamiento con nuestro marco de pólizas estandarizado y seguro.</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary flex items-center"><Briefcase className="mr-2"/> Para Inquilinos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Aumente las posibilidades de los inquilinos de asegurar la propiedad deseada.</p>
                <p>Ofrezca una póliza de garantía clara y comprensible que proteja sus intereses.</p>
                <p>Proporcione una experiencia de mudanza más fluida con menos carga financiera inicial en algunos casos.</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section>
          <div className="text-center">
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">¿Listo para Elevar sus Servicios?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Únase a la creciente red de asesores inmobiliarios que se asocian con Hestia. Trabajemos juntos para crear un mercado de alquiler más seguro y eficiente.
            </p>
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/register?role=advisor">Registrarse como Asesor Socio</Link>
            </Button>
          </div>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
