import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_NAME, COMPANY_LEGAL_NAME, CONTACT_EMAIL } from '@/lib/constants';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="pt-24 pb-16">
          <PageTitle title="Privacy Policy" subtitle="Last updated: June 24, 2024" />
          <Card className="p-6 md:p-8 rounded-lg shadow-lg">
            <CardContent className="prose prose-lg max-w-none text-foreground">
              <p>{COMPANY_LEGAL_NAME} ("us", "we", or "our") operates the {SITE_NAME} website (the "Service").</p>
              <p>This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
              <p>We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Information Collection and Use</h2>
              <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
              <h3 className="font-headline text-xl mt-4 mb-2 text-primary/90">Types of Data Collected</h3>
              <h4>Personal Data</h4>
              <p>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:</p>
              <ul>
                <li>Email address</li>
                <li>First name and last name</li>
                <li>Phone number</li>
                <li>Address, State, Province, ZIP/Postal code, City</li>
                <li>Cookies and Usage Data</li>
              </ul>
              <h4>Usage Data</h4>
              <p>We may also collect information how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Use of Data</h2>
              <p>{COMPANY_LEGAL_NAME} uses the collected data for various purposes:</p>
              <ul>
                <li>To provide and maintain the Service</li>
                <li>To notify you about changes to our Service</li>
                <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
                <li>To provide customer care and support</li>
                <li>To provide analysis or valuable information so that we can improve the Service</li>
                <li>To monitor the usage of the Service</li>
                <li>To detect, prevent and address technical issues</li>
              </ul>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Security of Data</h2>
              <p>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Changes to This Privacy Policy</h2>
              <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
              <p>We will let you know via email and/or a prominent notice on our Service, prior to the change becoming effective and update the "effective date" at the top of this Privacy Policy.</p>
              <p>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>

              <h2 className="font-headline text-2xl mt-6 mb-3 text-primary">Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <ul>
                <li>By email: {CONTACT_EMAIL}</li>
              </ul>
            </CardContent>
          </Card>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
