import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';
import { t } from '@/lib/i18n';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="pt-24 pb-16">
          <PageTitle title={t.pages.privacy.title} subtitle={t.pages.privacy.lastUpdated} />
          <Card className="p-6 md:p-8 rounded-lg shadow-lg">
            <CardContent className="prose prose-lg max-w-none text-foreground">
              <p>{t.pages.privacy.intro1(t.companyLegalName, t.siteName)}</p>
              <p>{t.pages.privacy.intro2}</p>
              <p>{t.pages.privacy.intro3}</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">{t.pages.privacy.collectionTitle}</h2>
              <p>{t.pages.privacy.collectionText}</p>
              <h3 className="font-headline text-xl mt-4 mb-2 text-primary/90">{t.pages.privacy.typesOfData}</h3>
              <h4>{t.pages.privacy.personalData}</h4>
              <p>{t.pages.privacy.personalDataText}</p>
              <ul>
                {t.pages.privacy.personalDataList.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
              <h4>{t.pages.privacy.usageData}</h4>
              <p>{t.pages.privacy.usageDataText}</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">{t.pages.privacy.useOfDataTitle}</h2>
              <p>{t.pages.privacy.useOfDataText(t.companyLegalName)}</p>
              <ul>
                {t.pages.privacy.useOfDataList.map((item, index) => <li key={index}>{item}</li>)}
              </ul>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">{t.pages.privacy.securityTitle}</h2>
              <p>{t.pages.privacy.securityText}</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">{t.pages.privacy.changesTitle}</h2>
              <p>{t.pages.privacy.changesText1}</p>
              <p>{t.pages.privacy.changesText2}</p>
              <p>{t.pages.privacy.changesText3}</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">{t.pages.privacy.contactTitle}</h2>
              <p>{t.pages.privacy.contactText}</p>
              <ul>
                {t.pages.privacy.contactList(t.contactEmail).map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
