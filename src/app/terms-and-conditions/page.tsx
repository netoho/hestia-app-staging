import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';
import { t } from '@/lib/i18n';

export default function TermsAndConditionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="pt-24 pb-16">
          <PageTitle title={t.pages.terms.title} subtitle={t.pages.terms.lastUpdated} />
          <Card className="p-6 md:p-8 rounded-lg shadow-lg">
            <CardContent className="prose prose-lg max-w-none text-foreground">
              <p>{t.pages.terms.intro1(t.siteName, t.companyLegalName)}</p>
              <p>{t.pages.terms.intro2(t.siteName)}</p>
              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">{t.pages.terms.cookiesTitle}</h2>
              <p>{t.pages.terms.cookiesText(t.siteName, t.companyLegalName)}</p>
              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">{t.pages.terms.licenseTitle}</h2>
              <p>{t.pages.terms.licenseText1(t.companyLegalName, t.siteName)}</p>
              <p>{t.pages.terms.licenseForbidden}</p>
              <ul>
                {t.pages.terms.licenseList(t.siteName).map((item, index) => <li key={index}>{item}</li>)}
              </ul>
              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">{t.pages.terms.commentsTitle}</h2>
              <p>{t.pages.terms.commentsText1}</p>
              <p>{t.pages.terms.commentsText2(t.companyLegalName)}</p>
              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">{t.pages.terms.disclaimerTitle}</h2>
              <p>{t.pages.terms.disclaimerText}</p>
              <ul>
                {t.pages.terms.disclaimerList.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
              <p>{t.pages.terms.disclaimerText2}</p>
              <p>{t.pages.terms.disclaimerText3}</p>
              <p className="mt-8"><strong>{t.pages.terms.contactTitle}</strong></p>
              <p>{t.pages.terms.contactText(t.contactEmail)}</p>
            </CardContent>
          </Card>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
