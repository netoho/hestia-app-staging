import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { t } from '@/lib/i18n';
import { ArrowRight } from 'lucide-react';
import { PackagesSection } from '@/components/sections/PackagesSection';
import Image from 'next/image';
import Logo from '@/components/Logo';
import { HowItWorksSection } from '@/components/sections/HowItWorksSection';
import { BenefitsSection } from '@/components/sections/BenefitsSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { CtaSection } from '@/components/sections/CtaSection';
import { VideoTestimonialSection } from '@/components/sections/VideoTestimonialSection';
import { PricingCalculator } from '@/components/sections/PricingCalculator';

export default function HomePage() {

  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-background text-primary-foreground pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden parallax-bg">
            <div className="absolute inset-0 -z-10">
              <Image
                src="/images/hero-home.jpg"
                alt="Happy couple securing their rental agreement"
                fill
                className="object-cover fixed"
                data-ai-hint="happy couple"
                priority
              />
              <div className="absolute inset-0 bg-primary/80 backdrop-brightness-75" />
            </div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="text-left">
                  <h1 className="text-5xl md:text-7xl font-headline font-bold text-primary-foreground mb-6">
                    {t.pages.home.heroTitle}
                  </h1>
                  <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-xl mb-10">
                    {t.pages.home.heroSubtitle}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-7 rounded-lg">
                      <Link href="/#packages">{t.actions.explorePackages} <ArrowRight className="ml-2 h-5 w-5" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="text-lg px-8 py-7 rounded-lg border-primary-foreground/70 text-accent-foreground hover:bg-primary-foreground/10">
                      <Link href="/contact">{t.actions.requestInfo}</Link>
                    </Button>
                  </div>
                </div>
                <div>
                  {/* This column is intentionally empty to let the background image show */}
                </div>
              </div>
            </div>
        </section>

        {/* How It Works Section */}
        <HowItWorksSection />
        
        {/* Video Testimonial Section */}
        <VideoTestimonialSection />

        {/* Packages Section */}
        <PackagesSection />

        {/* Pricing Calculator */}
        <PricingCalculator />

        {/* Benefits Section */}
        <BenefitsSection />

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* CTA Section */}
        <CtaSection />
      </main>
      <PublicFooter />
    </div>
  );
}
