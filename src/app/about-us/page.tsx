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
            title={`About ${SITE_NAME}`}
            subtitle="Pioneering trust and security in the rental market."
          />
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Our Story</h2>
              <p className="text-lg text-muted-foreground mb-4">
                {SITE_NAME} was founded with a clear mission: to revolutionize the rental experience by fostering trust and providing robust security for all parties involved. We saw the challenges faced by property owners, tenants, and real estate advisors – the uncertainties, the financial risks, and the complexities of rental agreements.
              </p>
              <p className="text-lg text-muted-foreground">
                Driven by a passion for innovation and a commitment to service, we developed a platform that offers comprehensive guarantee policies. Our goal is to make renting simpler, safer, and more accessible for everyone.
              </p>
            </div>
            <div>
              <Image
                src="https://placehold.co/600x400.png"
                alt="HestiaGuard team working together"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
                data-ai-hint="team collaboration"
              />
            </div>
          </div>
        </Section>

        <Section className="bg-muted/30">
          <PageTitle title="Our Core Values" titleClassName="text-foreground" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: "Security", description: "Providing unwavering protection and peace of mind." },
              { icon: Handshake, title: "Trust", description: "Building transparent and reliable relationships." },
              { icon: Lightbulb, title: "Innovation", description: "Continuously improving our services and technology." },
              { icon: Users, title: "Customer-Centricity", description: "Putting the needs of our clients first, always." },
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
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Our Mission</h2>
            <p className="text-xl text-muted-foreground mb-4">
              To be the leading provider of rental guarantee solutions, empowering individuals and businesses by creating a secure and transparent rental ecosystem. We strive to deliver exceptional value through innovative products, outstanding customer service, and a steadfast commitment to integrity.
            </p>
          </div>
        </Section>
        
        {/* Optional: Team Section
        <Section className="bg-primary/5">
          <PageTitle title="Meet Our Team" subtitle="The passionate individuals behind HestiaGuard."/>
           Add team member cards here
        </Section>
        */}

      </main>
      <PublicFooter />
    </div>
  );
}
