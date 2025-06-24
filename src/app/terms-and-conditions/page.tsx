import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_NAME, COMPANY_LEGAL_NAME, CONTACT_EMAIL } from '@/lib/constants';

export default function TermsAndConditionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="pt-24 pb-16">
          <PageTitle title="Terms and Conditions" subtitle="Last updated: June 24, 2024" />
          <Card className="p-6 md:p-8 rounded-lg shadow-lg">
            <CardContent className="prose prose-lg max-w-none text-foreground">
              <p>Welcome to {SITE_NAME}. These terms and conditions outline the rules and regulations for the use of {COMPANY_LEGAL_NAME}'s Website, located at [Your Website URL].</p>

              <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use {SITE_NAME} if you do not agree to take all of the terms and conditions stated on this page.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Cookies</h2>
              <p>We employ the use of cookies. By accessing {SITE_NAME}, you agreed to use cookies in agreement with the {COMPANY_LEGAL_NAME}'s Privacy Policy.</p>
              
              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">License</h2>
              <p>Unless otherwise stated, {COMPANY_LEGAL_NAME} and/or its licensors own the intellectual property rights for all material on {SITE_NAME}. All intellectual property rights are reserved. You may access this from {SITE_NAME} for your own personal use subjected to restrictions set in these terms and conditions.</p>
              <p>You must not:</p>
              <ul>
                <li>Republish material from {SITE_NAME}</li>
                <li>Sell, rent or sub-license material from {SITE_NAME}</li>
                <li>Reproduce, duplicate or copy material from {SITE_NAME}</li>
                <li>Redistribute content from {SITE_NAME}</li>
              </ul>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">User Comments</h2>
              <p>This Agreement shall begin on the date hereof.</p>
              <p>Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. {COMPANY_LEGAL_NAME} does not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect the views and opinions of {COMPANY_LEGAL_NAME},its agents and/or affiliates. Comments reflect the views and opinions of the person who post their views and opinions.</p>
              
              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Disclaimer</h2>
              <p>To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:</p>
              <ul>
                <li>limit or exclude our or your liability for death or personal injury;</li>
                <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
                <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
                <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
              </ul>
              <p>The limitations and prohibitions of liability set in this Section and elsewhere in this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer, including liabilities arising in contract, in tort and for breach of statutory duty.</p>
              <p>As long as the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature.</p>
              
              <p className="mt-8"><strong>Contact Information</strong></p>
              <p>If you have any queries regarding any of our terms, please contact us at {CONTACT_EMAIL}.</p>
            </CardContent>
          </Card>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
