import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { TestimonialCard } from '@/components/shared/TestimonialCard';
import { t } from '@/lib/i18n';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import { PackagesSection } from '@/components/sections/PackagesSection';
import Image from 'next/image';

export default function HomePage() {

  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <Section className="bg-primary pt-24 md:pt-32 pb-16 md:pb-24 text-center">
            <Image 
              src="https://placehold.co/150x150.png" 
              alt="Professional legal services for rental guarantees"
              width={128}
              height={128}
              className="mx-auto mb-8 rounded-full border-4 border-primary-foreground/50 shadow-lg"
              data-ai-hint="professional lawyer"
              priority
            />
            <h1 className="text-5xl md:text-7xl font-headline font-bold text-primary-foreground mb-6">
              {t.pages.home.heroTitle}
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl mx-auto mb-10">
              {t.pages.home.heroSubtitle}
            </p>
            <div className="space-x-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-7 rounded-lg">
                <Link href="/#packages">{t.actions.explorePackages} <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-7 rounded-lg border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10">
                <Link href="/contact">{t.actions.requestInfo}</Link>
              </Button>
            </div>
        </Section>

        {/* How It Works Section */}
        <Section id="how-it-works" aria-labelledby="how-it-works-title">
          <PageTitle title={t.pages.home.howItWorksTitle} subtitle={t.pages.home.howItWorksSubtitle} titleClassName="text-foreground" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.pages.home.howItWorksSteps.map((step) => (
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
        <PackagesSection />

        {/* Benefits Section */}
        <Section id="benefits" aria-labelledby="benefits-title">
          <PageTitle title={t.pages.home.whyChooseTitle} subtitle={t.pages.home.whyChooseSubtitle} titleClassName="text-foreground" />
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Card className="p-6 bg-card rounded-xl shadow-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-headline font-semibold text-foreground mb-2">{t.pages.home.forOwners}</h3>
              <p className="text-sm text-muted-foreground">{t.pages.home.forOwnersDesc}</p>
            </Card>
            <Card className="p-6 bg-card rounded-xl shadow-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-headline font-semibold text-foreground mb-2">{t.pages.home.forRenters}</h3>
              <p className="text-sm text-muted-foreground">{t.pages.home.forRentersDesc}</p>
            </Card>
            <Card className="p-6 bg-card rounded-xl shadow-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-headline font-semibold text-foreground mb-2">{t.pages.home.forAdvisors}</h3>
              <p className="text-sm text-muted-foreground">{t.pages.home.forAdvisorsDesc}</p>
            </Card>
          </div>
        </Section>

        {/* Testimonials Section */}
        <Section id="testimonials" aria-labelledby="testimonials-title" className="bg-primary/5">
          <PageTitle title={t.pages.home.testimonialsTitle} subtitle={t.pages.home.testimonialsSubtitle} titleClassName="text-foreground" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {t.pages.home.testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </Section>

        {/* CTA Section */}
        <Section className="text-center bg-gradient-to-r from-accent/20 to-primary/20">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4">
            {t.pages.home.ctaTitle}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t.pages.home.ctaSubtitle}
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-7 rounded-lg">
            <Link href="/register">{t.actions.startNow} <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
