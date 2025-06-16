import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { PageTitle } from '@/components/shared/PageTitle';
import { Section } from '@/components/shared/Section';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { FAQ_DATA, SITE_NAME } from '@/lib/constants';
import { HelpCircle } from 'lucide-react';

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        <Section className="bg-primary/10 pt-24 pb-16">
          <PageTitle
            title="Frequently Asked Questions"
            subtitle={`Find answers to common questions about ${SITE_NAME} and our services.`}
          />
        </Section>

        <Section>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {FAQ_DATA.map((item, index) => (
                <AccordionItem key={index} value={`item-${index + 1}`} className="bg-card shadow-md rounded-lg p-2 hover:shadow-lg transition-shadow">
                  <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline px-4 py-3 text-left">
                    <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 mr-3 text-primary shrink-0"/> 
                        {item.question}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground px-4 pb-4 pt-2">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Section>
         <Section className="text-center bg-muted/30">
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-foreground mb-4">
            Still have questions?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
            If you can't find the answer you're looking for, please don't hesitate to reach out to our support team.
          </p>
          <PublicFooter.Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PublicFooter.Link href="/contact">Contact Support</PublicFooter.Link>
          </PublicFooter.Button>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}

// Minimal Button and Link components for the PublicFooter call, ideally part of PublicFooter or Button/Link imports
PublicFooter.Button = Button;
PublicFooter.Link = Link;
