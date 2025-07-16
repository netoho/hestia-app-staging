import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { FileText, CheckSquare, DollarSign } from 'lucide-react';

export default function PropertyOwnersPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="bg-primary/10 pt-24 pb-16">
          <PageTitle
            title={t.pages.propertyOwners.title}
            subtitle={t.pages.propertyOwners.subtitle}
          />
          <div className="text-center">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/#packages">{t.pages.propertyOwners.viewPackages}</Link>
            </Button>
          </div>
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <VideoPlayer
                videoId={t.pages.propertyOwners.videoId}
                title="Property Owners Benefits Video"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">{t.pages.propertyOwners.sectionTitle}</h2>
              <p className="text-lg text-muted-foreground mb-4">
                {t.pages.propertyOwners.sectionText}
              </p>
              <ul className="space-y-3">
                {t.pages.propertyOwners.benefitsList.map(item => (
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
          <PageTitle title={t.pages.propertyOwners.keyBenefitsTitle} subtitle={t.pages.propertyOwners.keyBenefitsSubtitle} titleClassName='text-foreground' />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><FileText className="mr-2"/>{t.pages.propertyOwners.benefit1Title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t.pages.propertyOwners.benefit1Text}</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><CheckSquare className="mr-2"/>{t.pages.propertyOwners.benefit2Title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t.pages.propertyOwners.benefit2Text}</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center"><DollarSign className="mr-2"/>{t.pages.propertyOwners.benefit3Title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t.pages.propertyOwners.benefit3Text}</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section>
          <div className="text-center">
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">{t.pages.propertyOwners.ctaTitle}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {t.pages.propertyOwners.ctaText}
            </p>
            <div className="space-x-4">
               <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/register?role=owner">{t.pages.propertyOwners.registerAsOwner}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact?subject=OwnerInquiry">{t.pages.propertyOwners.talkToExpert}</Link>
              </Button>
            </div>
          </div>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
