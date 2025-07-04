import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Users, Target, Shield, Handshake, Lightbulb } from 'lucide-react';
import { SITE_NAME } from '@/lib/constants';

export default function AboutUsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="bg-primary/10 pt-24 pb-16">
          <PageTitle
            title={`Sobre ${SITE_NAME}`}
            subtitle="Pioneros en confianza y seguridad en el mercado de alquiler."
          />
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Nuestra Historia</h2>
              <p className="text-lg text-muted-foreground mb-4">
                {SITE_NAME} fue fundada con una misión clara: revolucionar la experiencia de alquiler fomentando la confianza y proporcionando una seguridad sólida para todas las partes involucradas. Vimos los desafíos que enfrentan los propietarios, inquilinos y asesores inmobiliarios: las incertidumbres, los riesgos financieros y las complejidades de los contratos de alquiler.
              </p>
              <p className="text-lg text-muted-foreground">
                Impulsados por una pasión por la innovación y un compromiso con el servicio, desarrollamos una plataforma que ofrece pólizas de garantía integrales. Nuestro objetivo es hacer que el alquiler sea más simple, seguro y accesible para todos.
              </p>
            </div>
            <div>
              <Image
                src="https://placehold.co/600x400.png"
                alt="Equipo de Hestia trabajando juntos"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
                data-ai-hint="team collaboration"
              />
            </div>
          </div>
        </Section>

        <Section className="bg-muted/30">
          <PageTitle title="Nuestros Valores Fundamentales" titleClassName="text-foreground" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: "Seguridad", description: "Proporcionando protección inquebrantable y tranquilidad." },
              { icon: Handshake, title: "Confianza", description: "Construyendo relaciones transparentes y fiables." },
              { icon: Lightbulb, title: "Innovación", description: "Mejorando continuamente nuestros servicios y tecnología." },
              { icon: Users, title: "Foco en el Cliente", description: "Poniendo siempre las necesidades de nuestros clientes primero." },
            ].map(value => (
              <Card key={value.title} className="text-center p-6 rounded-lg shadow-lg">
                <value.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-headline font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section>
          <div className="text-center max-w-3xl mx-auto">
            <Target className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Nuestra Misión</h2>
            <p className="text-xl text-muted-foreground mb-4">
              Ser el proveedor líder de soluciones de garantía de alquiler, empoderando a individuos y empresas mediante la creación de un ecosistema de alquiler seguro y transparente. Nos esforzamos por ofrecer un valor excepcional a través de productos innovadores, un servicio al cliente sobresaliente y un compromiso firme con la integridad.
            </p>
          </div>
        </Section>
        
        {/* Optional: Team Section
        <Section className="bg-primary/5">
          <PageTitle title="Conoce a Nuestro Equipo" subtitle="Las personas apasionadas detrás de Hestia."/>
           Add team member cards here
        </Section>
        */}

      </main>
      <PublicFooter />
    </div>
  );
}
