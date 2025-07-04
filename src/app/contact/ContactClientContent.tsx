
'use client';

import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';
import { ContactForm } from '@/components/forms/ContactForm';
import { CONTACT_EMAIL, CONTACT_PHONE } from '@/lib/constants';
import { Mail, Phone, MapPin } from 'lucide-react';
import Image from 'next/image';

export default function ContactClientContent() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get('subject') || undefined;

  return (
    <>
      <Section className="bg-primary/10 pt-24 pb-16">
        <PageTitle
          title="Ponte en Contacto"
          subtitle="Estamos aquí para ayudar. Contáctanos con cualquier pregunta o consulta."
        />
      </Section>

      <Section>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Información de Contacto</h2>
            <p className="text-lg text-muted-foreground mb-8">
              No dudes en contactarnos a través de cualquiera de los siguientes canales. Nuestro equipo está listo para ayudarte.
            </p>
            <div className="space-y-6">
              <div className="flex items-start">
                <Mail className="h-8 w-8 text-primary mr-4 mt-1 shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Escríbenos</h3>
                  <p className="text-muted-foreground">Para consultas generales, soporte u oportunidades de asociación.</p>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline font-medium">{CONTACT_EMAIL}</a>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-8 w-8 text-primary mr-4 mt-1 shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Llámanos</h3>
                  <p className="text-muted-foreground">Habla directamente con un miembro de nuestro equipo en horario de oficina.</p>
                  <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="text-primary hover:underline font-medium">{CONTACT_PHONE}</a>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-8 w-8 text-primary mr-4 mt-1 shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Visítanos</h3>
                  <p className="text-muted-foreground">Nuestra oficina se encuentra en:</p>
                  <p className="text-primary font-medium">Calle Segura 123, Oficina 4B, Ciudad de México, MX 01234</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Card className="p-6 md:p-8 rounded-lg shadow-xl">
              <h2 className="text-2xl font-headline font-semibold text-foreground mb-6">Envíanos un Mensaje</h2>
              <ContactForm initialSubject={initialSubject} />
            </Card>
          </div>
        </div>
      </Section>
      
      {/* Optional: Map Section
      <Section className="py-0">
        <div className="h-[400px] rounded-lg overflow-hidden shadow-lg">
           Embed Google Map or similar here
           <Image src="https://placehold.co/1200x400.png" alt="Map placeholder" width={1200} height={400} className="object-cover w-full h-full" data-ai-hint="city map" />
        </div>
      </Section>
      */}
    </>
  );
}
