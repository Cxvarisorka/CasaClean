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

/*
 * FaqPage
 * -------
 * Category-filtered FAQ. Tabs switch the active category; each category renders
 * its own Accordion. Full FAQ structured data is emitted for rich results.
 */

const FaqPage = () => {
  const [category, setCategory] = useState(FAQ_CATEGORIES[0].id);
  const active = FAQ_CATEGORIES.find((c) => c.id === category);

  return (
    <Page>
      <Seo {...PAGE_META.faq} schema={faqSchema(ALL_FAQS)} />

      <PageHero
        image={IMAGES.pageBackdrop}
        eyebrow="Help center"
        title="Frequently asked questions"
        subtitle="Everything you need to know about working with CasaClean. Still stuck? Reach out anytime."
      />

      <section className="pb-20 lg:pb-28">
        <Container size="md">
          <div className="flex justify-center">
            <Tabs value={category} onValueChange={setCategory}>
              <Tabs.List className="flex-wrap justify-center">
                {FAQ_CATEGORIES.map((cat) => (
                  <Tabs.Trigger key={cat.id} value={cat.id}>
                    {cat.label}
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
                <Accordion.Item key={faq.id} value={faq.id} question={faq.question}>
                  {faq.answer}
                </Accordion.Item>
              ))}
            </Accordion>
          </motion.div>
        </Container>
      </section>

      <CtaSection
        eyebrow="Still have questions?"
        title="We're a message away"
        subtitle="Our team responds within one business day — usually much sooner."
        primaryLabel="Book a turnover"
        secondaryLabel="Contact support"
      />
    </Page>
  );
};

export default FaqPage;
