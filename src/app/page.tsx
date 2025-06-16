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
              Secure Your Peace of Mind with {SITE_NAME}
            </h1>
            <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto mb-10">
              Comprehensive rental guarantee policies for property owners, tenants, and real estate advisors.
              Navigate the rental market with confidence.
            </p>
            <div className="space-x-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-7 rounded-lg">
                <Link href="/#packages">Explore Packages <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-7 rounded-lg">
                <Link href="/contact">Request Info</Link>
              </Button>
            </div>
        </Section>

        {/* How It Works Section */}
        <Section id="how-it-works" ariaLabelledby="how-it-works-title">
          <PageTitle title="How HestiaGuard Works" subtitle="A simple, transparent process for your rental security." titleClassName="text-foreground" />
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
          <PageTitle title="Our Protection Packages" subtitle="Choose the level of security that's right for you." titleClassName="text-foreground" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PACKAGES_DATA.map((pkg) => (
              <PackageCard key={pkg.id} packageItem={pkg} />
            ))}
          </div>
        </Section>

        {/* Benefits Section */}
        <Section id="benefits" ariaLabelledby="benefits-title">
          <PageTitle title="Why Choose HestiaGuard?" subtitle="Experience the difference with our dedicated service and robust protection." titleClassName="text-foreground" />
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Card className="p-6 bg-card rounded-xl shadow-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-headline font-semibold text-foreground mb-2">For Owners</h3>
              <p className="text-sm text-muted-foreground">Minimize risks, ensure steady rental income, and protect your property investment with our reliable screening and guarantee policies.</p>
            </Card>
            <Card className="p-6 bg-card rounded-xl shadow-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-headline font-semibold text-foreground mb-2">For Renters</h3>
              <p className="text-sm text-muted-foreground">Secure your dream home with ease. Our policies can strengthen your application and provide a safety net for your deposit.</p>
            </Card>
            <Card className="p-6 bg-card rounded-xl shadow-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-headline font-semibold text-foreground mb-2">For Advisors</h3>
              <p className="text-sm text-muted-foreground">Close deals faster and offer added value to your clients. Our streamlined process makes rental agreements smoother for everyone.</p>
            </Card>
          </div>
        </Section>

        {/* Testimonials Section */}
        <Section id="testimonials" ariaLabelledby="testimonials-title" className="bg-primary/5">
          <PageTitle title="Trusted by Many" subtitle="Hear what our satisfied clients have to say about HestiaGuard." titleClassName="text-foreground" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TESTIMONIALS_DATA.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </Section>

        {/* CTA Section */}
        <Section className="text-center bg-gradient-to-r from-accent/20 to-primary/20">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4">
            Ready to Experience Secure Rentals?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join HestiaGuard today and transform your rental experience.
            Whether you're an owner, tenant, or advisor, we have a solution for you.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-7 rounded-lg">
            <Link href="/register">Get Started Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
