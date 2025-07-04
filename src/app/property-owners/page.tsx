import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, DollarSign, Users, Clock, FileText, CheckSquare } from 'lucide-react';

export default function PropertyOwnersPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="bg-primary/10 pt-24 pb-16">
          <PageTitle
            title="Proteja su Inversión, Maximice sus Ganancias"
            subtitle="Hestia ofrece soluciones robustas de garantía de alquiler para propietarios, asegurando tranquilidad y seguridad financiera."
          />
          <div className="text-center">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/#packages">Ver Nuestros Paquetes</Link>
            </Button>
          </div>
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
               <Image
                src="https://placehold.co/600x400.png"
                alt="Propietario feliz revisando documentos"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
                data-ai-hint="property owner"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Asegure sus Ingresos por Alquiler y su Propiedad</h2>
              <p className="text-lg text-muted-foreground mb-4">
                Ser propietario de inmuebles de alquiler conlleva desafíos. Hestia está aquí para mitigar sus riesgos, desde impagos de inquilinos hasta daños a la propiedad. Nuestras pólizas integrales están diseñadas para proteger su inversión.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: DollarSign, text: "Renta Garantizada: Asegure un flujo de caja constante incluso con impagos." },
                  { icon: Shield, text: "Protección de la Propiedad: Cobertura por daños más allá de los depósitos estándar." },
                  { icon: Users, text: "Inquilinos de Calidad: Atraiga inquilinos fiables con una selección rigurosa." },
                  { icon: Clock, text: "Reducción de Vacancia: Colocación más rápida de inquilinos con seguridad añadida." },
                ].map(item => (
                  <li key={item.text} className="flex items-center text-foreground">
                    <item.icon className="h-6 w-6 text-primary mr-3" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section className="bg-muted/30">
          <PageTitle title="Beneficios Clave para Propietarios" subtitle="Descubra cómo Hestia simplifica la gestión de propiedades y mejora la seguridad." titleClassName='text-foreground' />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><FileText className="mr-2"/>Investigación Exhaustiva</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Realizamos verificaciones de antecedentes y crédito para encontrarle los inquilinos más fiables.</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><CheckSquare className="mr-2"/>Soporte Legal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Acceso a asistencia y recursos legales para manejar contratos de arrendamiento y disputas (según el paquete).</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><DollarSign className="mr-2"/>Seguridad Financiera</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Protéjase contra rentas no pagadas y costos inesperados, asegurando que su inversión siga siendo rentable.</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section>
          <div className="text-center">
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">¿Listo para Asegurar su Propiedad?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Tome el control de sus inversiones de alquiler con Hestia. Explore nuestros paquetes o contáctenos para encontrar la solución perfecta para sus necesidades.
            </p>
            <div className="space-x-4">
               <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/register?role=owner">Registrarse como Propietario</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact?subject=OwnerInquiry">Hablar con un Experto</Link>
              </Button>
            </div>
          </div>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
