import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { Target } from 'lucide-react';
import { t } from '@/lib/i18n';

export default function AboutUsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="bg-primary/10 pt-24 pb-16">
          <PageTitle
            title={`${t.pages.aboutUs.pageTitle}`}
            subtitle={t.pages.aboutUs.pageSubtitle}
          />
        </Section>

        <Section>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">{t.pages.aboutUs.ourStory}</h2>
              <p className="text-lg text-muted-foreground mb-4">
                {t.pages.aboutUs.storyParagraph1}
              </p>
              <p className="text-lg text-muted-foreground">
                {t.pages.aboutUs.storyParagraph2}
              </p>
            </div>
            <div>
              <VideoPlayer
                videoId={t.pages.aboutUs.videoId}
                title="Property Owners Benefits Video"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
              />
            </div>
          </div>
        </Section>

        <Section className="bg-muted/30">
          <PageTitle title={t.pages.aboutUs.coreValuesTitle} titleClassName="text-foreground" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.pages.aboutUs.values.map(value => (
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
            <h2 className="text-3xl font-headline font-semibold text-foreground mb-6">{t.pages.aboutUs.ourMissionTitle}</h2>
            <p className="text-xl text-muted-foreground mb-4">
              {t.pages.aboutUs.missionText}
            </p>
          </div>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
