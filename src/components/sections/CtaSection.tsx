import { Button } from "@/components/ui/button";
import { Section } from "../shared/Section";
import { t } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CtaSection() {
  return (
    <Section className="text-center bg-gradient-to-r from-accent/20 to-primary/20">
      <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4">
        {t.pages.home.ctaTitle}
      </h2>
      <p className="text-lg font-bold max-w-2xl mx-auto mb-8">
        {t.pages.home.ctaSubtitle}
      </p>
      <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-7 rounded-lg">
        <Link href="/register">{t.actions.startNow} <ArrowRight className="ml-2 h-5 w-5" /></Link>
      </Button>
    </Section>
  );
}
