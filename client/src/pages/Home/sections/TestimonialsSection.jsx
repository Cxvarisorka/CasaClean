import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { TestimonialsCarousel } from "@/features/testimonials";

/*
 * TestimonialsSection
 * -------------------
 * Wraps the reusable testimonials carousel with the standard section heading.
 * Thin by design — the carousel owns all interaction logic.
 */

export function TestimonialsSection() {
  return (
    <section className="bg-sand-50 py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="Loved by hosts"
          title="Hosts don't just like us — they rebook"
          subtitle="Real words from the operators who trust CasaClean with their guests."
        />
        <div className="mt-14">
          <TestimonialsCarousel />
        </div>
      </Container>
    </section>
  );
}

export default TestimonialsSection;
