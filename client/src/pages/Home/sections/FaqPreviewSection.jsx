import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal } from "@/components/shared/Reveal";
import { ALL_FAQS } from "@/data/faq";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";

/*
 * FaqPreviewSection
 * -----------------
 * A condensed FAQ on the home page (first five questions) with a path to the
 * full page. Reuses the Accordion primitive so behavior matches the FAQ page.
 */

export function FaqPreviewSection() {
  const { t } = useTranslation();
  const preview = ALL_FAQS.slice(0, 5);

  return (
    <section className="py-20 lg:py-28">
      <Container size="md">
        <SectionHeading
          eyebrow={t("faqSection.eyebrow")}
          title={t("faqSection.title")}
          subtitle={t("faqSection.subtitle")}
        />

        <Reveal className="mt-12">
          <Accordion type="single" defaultValue={preview[0].id}>
            {preview.map((faq) => (
              <Accordion.Item
                key={faq.id}
                value={faq.id}
                question={t(`faq.items.${faq.id}.question`)}
              >
                {t(`faq.items.${faq.id}.answer`)}
              </Accordion.Item>
            ))}
          </Accordion>
        </Reveal>

        <div className="mt-10 flex justify-center">
          <Button to={ROUTES.faq} variant="outline" rightIcon={ArrowRight}>
            {t("faqSection.readAll")}
          </Button>
        </div>
      </Container>
    </section>
  );
}

export default FaqPreviewSection;
