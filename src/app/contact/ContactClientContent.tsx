'use client';

import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';
import { ContactForm } from '@/components/forms/ContactForm';
import { t } from '@/lib/i18n';
import { Mail, Phone, MapPin } from 'lucide-react';
import Image from 'next/image';

export default function ContactClientContent() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get('subject') || undefined;

  return (
    <>
      <Section className="bg-primary/10 pt-24 pb-16">
        <PageTitle
          title={t.pages.contact.title}
          subtitle={t.pages.contact.subtitle}
        />
      </Section>

      <Section>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">{t.pages.contact.contactInfo}</h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t.pages.contact.contactInfoSubtitle}
            </p>
            <div className="space-y-6">
              <div className="flex items-start">
                <Mail className="h-8 w-8 text-primary mr-4 mt-1 shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{t.pages.contact.emailUs}</h3>
                  <p className="text-muted-foreground">{t.pages.contact.emailUsDesc}</p>
                  <a href={`mailto:${t.contactEmail}`} className="text-primary hover:underline font-medium">{t.contactEmail}</a>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-8 w-8 text-primary mr-4 mt-1 shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{t.pages.contact.callUs}</h3>
                  <p className="text-muted-foreground">{t.pages.contact.callUsDesc}</p>
                  <a href={`tel:${t.contactPhone.replace(/\s/g, '')}`} className="text-primary hover:underline font-medium">{t.contactPhone}</a>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-8 w-8 text-primary mr-4 mt-1 shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{t.pages.contact.visitUs}</h3>
                  <p className="text-muted-foreground">{t.pages.contact.visitUsDesc}</p>
                  <p className="text-primary font-medium">{t.pages.contact.address}</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Card className="p-6 md:p-8 rounded-lg shadow-xl">
              <h2 className="text-2xl font-headline font-semibold text-foreground mb-6">{t.pages.contact.sendMessage}</h2>
              <ContactForm initialSubject={initialSubject} />
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
