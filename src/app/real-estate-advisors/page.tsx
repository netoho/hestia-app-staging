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
            title="Empower Your Real Estate Business"
            subtitle="Partner with HestiaGuard to offer enhanced security and streamline rental processes for your clients."
          />
           <div className="text-center">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/contact?subject=AdvisorPartnership">Become a Partner</Link>
            </Button>
          </div>
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Why Advisors Choose HestiaGuard</h2>
              <p className="text-lg text-muted-foreground mb-4">
                As a real estate advisor, your reputation is built on trust and successful placements. HestiaGuard provides the tools and security to enhance your service offering, making you an indispensable partner for both property owners and tenants.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: Zap, text: "Faster Deal Closures: Our streamlined process reduces friction." },
                  { icon: Handshake, text: "Enhanced Client Trust: Offer reliable protection for peace of mind." },
                  { icon: BarChart3, text: "Competitive Edge: Differentiate your services in the market." },
                  { icon: MessageSquare, text: "Dedicated Support: Access to our team for quick assistance." },
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
                alt="Real estate advisors collaborating"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
                data-ai-hint="professionals meeting"
              />
            </div>
          </div>
        </Section>
        
        <Section className="bg-muted/30">
          <PageTitle title="Benefits for Your Clients" subtitle="How HestiaGuard helps you serve property owners and tenants better." titleClassName='text-foreground'/>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary flex items-center"><Users className="mr-2"/> For Property Owners</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Help owners minimize vacancy periods by attracting a wider pool of qualified tenants.</p>
                <p>Provide assurance of rent payment and property protection, reducing owner stress.</p>
                <p>Simplify the leasing process with our standardized and secure policy framework.</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary flex items-center"><Briefcase className="mr-2"/> For Tenants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Increase tenants' chances of securing their desired property.</p>
                <p>Offer a clear, understandable guarantee policy that protects their interests.</p>
                <p>Provide a smoother move-in experience with less upfront financial burden in some cases.</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section>
          <div className="text-center">
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Ready to Elevate Your Services?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Join the growing network of real estate advisors partnering with HestiaGuard. Let's work together to create a more secure and efficient rental market.
            </p>
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/register?role=advisor">Register as an Advisor Partner</Link>
            </Button>
          </div>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
