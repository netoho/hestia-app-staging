import { Card } from "@/components/ui/card";
import { PageTitle } from "../shared/PageTitle";
import { Section } from "../shared/Section";
import { t } from "@/lib/i18n";

export function HowItWorksSection() {
  return (
    <Section id="how-it-works" aria-labelledby="how-it-works-title">
      <PageTitle title={t.pages.home.howItWorksTitle} subtitle={t.pages.home.howItWorksSubtitle} titleClassName="text-foreground" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {t.pages.home.howItWorksSteps.map((step) => (
          <Card key={step.id} className="text-center bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
              <step.icon className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-headline font-semibold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
