import { useState } from "react";
import { motion } from "framer-motion";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Accordion } from "@/components/ui/Accordion";
import { Tabs } from "@/components/ui/Tabs";
import { PageHero, CtaSection } from "@/components/sections";
import { Seo, faqSchema } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { IMAGES } from "@/constants/images";
import { FAQ_CATEGORIES, ALL_FAQS } from "@/data/faq";
import { useTranslation } from "@/i18n";

/*
 * FaqPage
 * -------
 * Category-filtered FAQ. Tabs switch the active category; each category renders
 * its own Accordion. Full FAQ structured data is emitted for rich results.
 */

const FaqPage = () => {
  const { t } = useTranslation();
  const [category, setCategory] = useState(FAQ_CATEGORIES[0].id);
  const active = FAQ_CATEGORIES.find((c) => c.id === category);

  return (
    <Page>
      <Seo {...PAGE_META.faq} schema={faqSchema(ALL_FAQS)} />

      <PageHero
        image={IMAGES.pageBackdrop}
        eyebrow={t("pages.faq.heroEyebrow")}
        title={t("pages.faq.heroTitle")}
        subtitle={t("pages.faq.heroSubtitle")}
      />

      <section className="pb-20 lg:pb-28">
        <Container size="md">
          <div className="flex justify-center">
            <Tabs value={category} onValueChange={setCategory}>
              <Tabs.List className="flex-wrap justify-center">
                {FAQ_CATEGORIES.map((cat) => (
                  <Tabs.Trigger key={cat.id} value={cat.id}>
                    {t(`faq.categories.${cat.id}`)}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs>
          </div>

          <motion.div
            key={category}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-10"
          >
            <Accordion type="single" defaultValue={active.items[0].id}>
              {active.items.map((faq) => (
                <Accordion.Item
                  key={faq.id}
                  value={faq.id}
                  question={t(`faq.items.${faq.id}.question`)}
                >
                  {t(`faq.items.${faq.id}.answer`)}
                </Accordion.Item>
              ))}
            </Accordion>
          </motion.div>
        </Container>
      </section>

      <CtaSection
        eyebrow={t("pages.faq.ctaEyebrow")}
        title={t("pages.faq.ctaTitle")}
        subtitle={t("pages.faq.ctaSubtitle")}
        primaryLabel={t("common.bookTurnover")}
        secondaryLabel={t("common.talkToTeam")}
      />
    </Page>
  );
};

export default FaqPage;
