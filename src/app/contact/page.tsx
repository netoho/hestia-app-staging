'use client'; // For searchParams
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';
import { ContactForm } from '@/components/forms/ContactForm';
import { CONTACT_EMAIL, CONTACT_PHONE } from '@/lib/constants';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function ContactPage() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get('subject') || undefined;

  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="bg-primary/10 pt-24 pb-16">
          <PageTitle
            title="Get in Touch"
            subtitle="We're here to help. Reach out to us with any questions or inquiries."
          />
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Contact Information</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Feel free to reach out to us through any of the following channels. Our team is ready to assist you.
              </p>
              <div className="space-y-6">
                <div className="flex items-start">
                  <Mail className="h-8 w-8 text-primary mr-4 mt-1 shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Email Us</h3>
                    <p className="text-muted-foreground">For general inquiries, support, or partnership opportunities.</p>
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline font-medium">{CONTACT_EMAIL}</a>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-8 w-8 text-primary mr-4 mt-1 shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Call Us</h3>
                    <p className="text-muted-foreground">Speak directly with a member of our team during business hours.</p>
                    <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="text-primary hover:underline font-medium">{CONTACT_PHONE}</a>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-8 w-8 text-primary mr-4 mt-1 shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Visit Us</h3>
                    <p className="text-muted-foreground">Our office is located at:</p>
                    <p className="text-primary font-medium">123 Secure St, Suite 4B, Mexico City, MX 01234</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Card className="p-6 md:p-8 rounded-lg shadow-xl">
                <h2 className="text-2xl font-headline font-semibold text-foreground mb-6">Send Us a Message</h2>
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
      </main>
      <PublicFooter />
    </div>
  );
}
