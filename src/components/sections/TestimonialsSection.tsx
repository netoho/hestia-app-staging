import { PageTitle } from "../shared/PageTitle";
import { Section } from "../shared/Section";
import { TestimonialCard } from "../shared/TestimonialCard";
import { t } from "@/lib/i18n";

export function TestimonialsSection() {
    return (
        <Section id="testimonials" aria-labelledby="testimonials-title" className="bg-primary/5">
            <PageTitle title={t.pages.home.testimonialsTitle} subtitle={t.pages.home.testimonialsSubtitle} titleClassName="text-foreground" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {t.pages.home.testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
            </div>
      </Section>
    );
}
