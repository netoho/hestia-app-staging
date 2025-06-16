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
            title="Protect Your Investment, Maximize Your Returns"
            subtitle="HestiaGuard offers robust rental guarantee solutions for property owners, ensuring peace of mind and financial security."
          />
          <div className="text-center">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/#packages">View Our Packages</Link>
            </Button>
          </div>
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
               <Image
                src="https://placehold.co/600x400.png"
                alt="Happy property owner reviewing documents"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
                data-ai-hint="property owner"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Secure Your Rental Income & Property</h2>
              <p className="text-lg text-muted-foreground mb-4">
                Owning rental properties comes with its challenges. HestiaGuard is here to mitigate your risks, from tenant defaults to property damages. Our comprehensive policies are designed to safeguard your investment.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: DollarSign, text: "Guaranteed Rent: Ensure consistent cash flow even with tenant defaults." },
                  { icon: Shield, text: "Property Protection: Coverage for damages beyond standard deposits." },
                  { icon: Users, text: "Quality Tenants: Attract reliable renters with robust screening." },
                  { icon: Clock, text: "Reduced Vacancy: Faster tenant placement with added security." },
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
          <PageTitle title="Key Benefits for Property Owners" subtitle="Discover how HestiaGuard simplifies property management and enhances security." titleClassName='text-foreground' />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><FileText className="mr-2"/>Comprehensive Screening</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">We conduct thorough background and credit checks to find you the most reliable tenants.</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><CheckSquare className="mr-2"/>Legal Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Access to legal assistance and resources for handling lease agreements and disputes (depending on package).</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><DollarSign className="mr-2"/>Financial Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Protect against unpaid rent and unexpected costs, ensuring your investment remains profitable.</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section>
          <div className="text-center">
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">Ready to Secure Your Property?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Take control of your rental investments with HestiaGuard. Explore our packages or contact us to find the perfect solution for your needs.
            </p>
            <div className="space-x-4">
               <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/register?role=owner">Register as an Owner</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact?subject=OwnerInquiry">Speak to an Expert</Link>
              </Button>
            </div>
          </div>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
