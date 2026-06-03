import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { TestimonialsCarousel } from "@/features/testimonials";
import { useTranslation } from "@/i18n";

/*
 * TestimonialsSection
 * -------------------
 * Wraps the reusable testimonials carousel with the standard section heading.
 * Thin by design — the carousel owns all interaction logic.
 */

export function TestimonialsSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-sand-50 py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow={t("testimonialsSection.eyebrow")}
          title={t("testimonialsSection.title")}
          subtitle={t("testimonialsSection.subtitle")}
        />
        <div className="mt-14">
          <TestimonialsCarousel />
        </div>
      </Container>
    </section>
  );
}

export default TestimonialsSection;
