import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import Link from 'next/link';
import { Briefcase, Users } from 'lucide-react';
import { t } from '@/lib/i18n';

export default function RealEstateAdvisorsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="bg-primary/10 pt-24 pb-16">
          <PageTitle
            title={t.pages.realEstateAdvisors.title}
            subtitle={t.pages.realEstateAdvisors.subtitle}
          />
           <div className="text-center">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/contact?subject=AdvisorPartnership">{t.pages.realEstateAdvisors.becomePartner}</Link>
            </Button>
          </div>
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">{t.pages.realEstateAdvisors.whyChooseTitle}</h2>
              <p className="text-lg text-muted-foreground mb-4">
                {t.pages.realEstateAdvisors.whyChooseText}
              </p>
              <ul className="space-y-3">
                {t.pages.realEstateAdvisors.benefitsList.map(item => (
                  <li key={item.text} className="flex items-center text-foreground">
                    <item.icon className="h-6 w-6 text-primary mr-3" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <VideoPlayer
                videoId={t.pages.realEstateAdvisors.videoId}
                title="Real Estate Advisors Partnership Video"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
              />
            </div>
          </div>
        </Section>
        
        <Section className="bg-muted/30">
          <PageTitle title={t.pages.realEstateAdvisors.clientBenefitsTitle} subtitle={t.pages.realEstateAdvisors.clientBenefitsSubtitle} titleClassName='text-foreground'/>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary flex items-center"><Users className="mr-2"/> {t.pages.realEstateAdvisors.forOwnersTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{t.pages.realEstateAdvisors.forOwnersText1}</p>
                <p>{t.pages.realEstateAdvisors.forOwnersText2}</p>
                <p>{t.pages.realEstateAdvisors.forOwnersText3}</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary flex items-center"><Briefcase className="mr-2"/> {t.pages.realEstateAdvisors.forRentersTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{t.pages.realEstateAdvisors.forRentersText1}</p>
                <p>{t.pages.realEstateAdvisors.forRentersText2}</p>
                <p>{t.pages.realEstateAdvisors.forRentersText3}</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section>
          <div className="text-center">
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">{t.pages.realEstateAdvisors.ctaTitle}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {t.pages.realEstateAdvisors.ctaText}
            </p>
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/contact?role=advisor">{t.pages.realEstateAdvisors.registerAsAdvisor}</Link>
            </Button>
          </div>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
