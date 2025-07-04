
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { Suspense } from 'react';
import ContactClientContent from './ContactClientContent';
import { Skeleton } from '@/components/ui/skeleton';
import { Section } from '@/components/shared/Section';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card } from '@/components/ui/card';

// Fallback component to show while ContactClientContent is loading
function ContactPageSkeleton() {
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
            <Skeleton className="h-6 w-3/4 mb-8" />
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start">
                  <Skeleton className="h-8 w-8 rounded-full mr-4 mt-1 shrink-0" />
                  <div className="w-full">
                    <Skeleton className="h-6 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Card className="p-6 md:p-8 rounded-lg shadow-xl">
              <h2 className="text-2xl font-headline font-semibold text-foreground mb-6">Envíanos un Mensaje</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-32" />
              </div>
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}


export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Suspense fallback={<ContactPageSkeleton />}>
          <ContactClientContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
