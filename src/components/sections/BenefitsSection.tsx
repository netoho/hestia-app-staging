import { Card } from "@/components/ui/card";
import { PageTitle } from "../shared/PageTitle";
import { Section } from "../shared/Section";
import { t } from "@/lib/i18n";
import { CheckCircle } from "lucide-react";

export function BenefitsSection() {
  return (
    <Section id="benefits" aria-labelledby="benefits-title">
        <PageTitle title={t.pages.home.whyChooseTitle} subtitle={t.pages.home.whyChooseSubtitle} titleClassName="text-foreground" />
        <br />
        <div className="grid md:grid-cols-3 gap-8 text-center">
            <Card className="p-6 bg-card rounded-xl shadow-md">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-headline font-semibold text-foreground mb-2">{t.pages.home.forOwners}</h3>
            <p className="text-sm text-muted-foreground">{t.pages.home.forOwnersDesc}</p>
            </Card>
            <Card className="p-6 bg-card rounded-xl shadow-md">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-headline font-semibold text-foreground mb-2">{t.pages.home.forRenters}</h3>
            <p className="text-sm text-muted-foreground">{t.pages.home.forRentersDesc}</p>
            </Card>
            <Card className="p-6 bg-card rounded-xl shadow-md">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-headline font-semibold text-foreground mb-2">{t.pages.home.forAdvisors}</h3>
            <p className="text-sm text-muted-foreground">{t.pages.home.forAdvisorsDesc}</p>
            </Card>
        </div>
    </Section>
  )
}
