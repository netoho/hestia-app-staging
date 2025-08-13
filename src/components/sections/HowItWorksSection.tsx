import { Card } from "@/components/ui/card";
import { PageTitle } from "../shared/PageTitle";
import { Section } from "../shared/Section";
import { t } from "@/lib/i18n";
import Image from 'next/image';

export function HowItWorksSection() {
  return (
    <Section id="how-it-works" aria-labelledby="how-it-works-title">
      <PageTitle title={t.pages.home.howItWorksTitle} subtitle={t.pages.home.howItWorksSubtitle} titleClassName="text-foreground" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {t.pages.home.howItWorksSteps.map((step) => (
          <Card key={step.id} className="text-center p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow bg-primary/80">
            <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-white">
              <Image src={step.icon} alt={step.title} width={56} height={56} data-ai-hint={step.description} />
            </div>
            <h3 className="text-2xl font-headline font-semibold text-white mb-2">{step.title}</h3>
            <p className="text-lg text-white">{step.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
