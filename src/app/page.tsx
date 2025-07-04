import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PackageCard } from '@/components/shared/PackageCard';
import { TestimonialCard } from '@/components/shared/TestimonialCard';
import { PACKAGES_DATA, TESTIMONIALS_DATA, HOW_IT_WORKS_STEPS, SITE_NAME } from '@/lib/constants';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <Section className="bg-gradient-to-br from-primary/10 via-background to-background pt-24 md:pt-32 pb-16 md:pb-24 text-center">
            <ShieldCheck className="mx-auto h-24 w-24 text-primary mb-6" />
            <h1 className="text-5xl md:text-7xl font-headline font-bold text-primary mb-6">
              Asegura tu Tranquilidad con {SITE_NAME}
            </h1>
            <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto mb-10">
              Pólizas de garantía de alquiler integrales para propietarios, inquilinos y asesores inmobiliarios.
              Navega el mercado de alquiler con confianza.
            </p>
            <div className="space-x-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-7 rounded-lg">
                <Link href="/#packages">Explorar Paquetes <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-7 rounded-lg">
                <Link href="/contact">Solicitar Información</Link>
              </Button>
            </div>
        </Section>

        {/* How It Works Section */}
        <Section id="how-it-works" ariaLabelledby="how-it-works-title">
          <PageTitle title="Cómo Funciona Hestia" subtitle="Un proceso simple y transparente para tu seguridad de alquiler." titleClassName="text-foreground" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <Card key={step.id} className="text-center bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
                  <step.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-headline font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </Card>
            ))}
          </div>
        </Section>
        
        {/* Packages Section */}
        <Section id="packages" ariaLabelledby="packages-title" className="bg-muted/30">
          <PageTitle title="Nuestros Paquetes de Protección" subtitle="Elige el nivel de seguridad adecuado para ti." titleClassName="text-foreground" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PACKAGES_DATA.map((pkg) => (
              <PackageCard key={pkg.id} packageItem={pkg} />
            ))}
          </div>
        </Section>

        {/* Benefits Section */}
        <Section id="benefits" ariaLabelledby="benefits-title">
          <PageTitle title="¿Por Qué Elegir Hestia?" subtitle="Experimenta la diferencia con nuestro servicio dedicado y protección robusta." titleClassName="text-foreground" />
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Card className="p-6 bg-card rounded-xl shadow-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-headline font-semibold text-foreground mb-2">Para Propietarios</h3>
              <p className="text-sm text-muted-foreground">Minimiza riesgos, asegura un ingreso de alquiler constante y protege tu inversión inmobiliaria con nuestras fiables pólizas de selección y garantía.</p>
            </Card>
            <Card className="p-6 bg-card rounded-xl shadow-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-headline font-semibold text-foreground mb-2">Para Inquilinos</h3>
              <p className="text-sm text-muted-foreground">Asegura la casa de tus sueños con facilidad. Nuestras pólizas pueden fortalecer tu solicitud y proporcionar una red de seguridad para tu depósito.</p>
            </Card>
            <Card className="p-6 bg-card rounded-xl shadow-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-headline font-semibold text-foreground mb-2">Para Asesores</h3>
              <p className="text-sm text-muted-foreground">Cierra tratos más rápido y ofrece valor añadido a tus clientes. Nuestro proceso simplificado hace que los contratos de alquiler sean más fluidos para todos.</p>
            </Card>
          </div>
        </Section>

        {/* Testimonials Section */}
        <Section id="testimonials" ariaLabelledby="testimonials-title" className="bg-primary/5">
          <PageTitle title="Con la Confianza de Muchos" subtitle="Escucha lo que nuestros clientes satisfechos tienen que decir sobre Hestia." titleClassName="text-foreground" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TESTIMONIALS_DATA.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </Section>

        {/* CTA Section */}
        <Section className="text-center bg-gradient-to-r from-accent/20 to-primary/20">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4">
            ¿Listo para Experimentar Alquileres Seguros?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Únete a Hestia hoy y transforma tu experiencia de alquiler.
            Ya seas propietario, inquilino o asesor, tenemos una solución para ti.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-7 rounded-lg">
            <Link href="/register">Comienza Ahora <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
