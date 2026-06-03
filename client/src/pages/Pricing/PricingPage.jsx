import { motion } from "framer-motion";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Accordion } from "@/components/ui/Accordion";
import { PageHero, CtaSection } from "@/components/sections";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { PricingCard } from "@/features/pricing";
import { IMAGES } from "@/constants/images";
import { formatCurrency } from "@/utils/formatCurrency";
import { Seo, faqSchema } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { PRICING_PLANS, PRICING_ADDONS } from "@/data/pricing";
import { ALL_FAQS } from "@/data/faq";
import { useTranslation } from "@/i18n";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * PricingPage
 * -----------
 * Transparent plan comparison, add-on matrix and pricing FAQs. The plans grid
 * reuses PricingCard; the FAQ reuses the Accordion primitive.
 */

const pricingFaqs = ALL_FAQS.filter((f) => ["q4", "q5", "q6"].includes(f.id));

const PricingPage = () => {
  const { t } = useTranslation();

  return (
    <Page>
      <Seo {...PAGE_META.pricing} schema={faqSchema(pricingFaqs)} />

      <PageHero
        image={IMAGES.livingModern}
        eyebrow={t("pages.pricing.heroEyebrow")}
        title={t("pages.pricing.heroTitle")}
        subtitle={t("pages.pricing.heroSubtitle")}
      />

      <section className="pb-20 lg:pb-28">
        <Container>
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid items-stretch gap-6 lg:grid-cols-3"
          >
            {PRICING_PLANS.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </motion.div>

          <p className="mt-8 text-center text-body-sm text-ink-500">
            {t("pages.pricing.disclaimer")}
          </p>
        </Container>
      </section>

      {/* Add-ons */}
      <section className="bg-sand-50 py-20 lg:py-28">
        <Container size="md">
          <SectionHeading
            eyebrow={t("pages.pricing.addonsEyebrow")}
            title={t("pages.pricing.addonsTitle")}
            subtitle={t("pages.pricing.addonsSubtitle")}
          />
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-12 grid gap-4 sm:grid-cols-2"
          >
            {PRICING_ADDONS.map((addon) => (
              <motion.div
                key={addon.id}
                variants={staggerItem}
                className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white px-6 py-5 shadow-soft"
              >
                <div>
                  <p className="text-body-md font-semibold text-ink-900">
                    {t(`pricingAddons.${addon.id}.label`)}
                  </p>
                  <p className="text-body-sm text-ink-500">
                    {t(`pricingAddons.${addon.id}.note`)}
                  </p>
                </div>
                <p className="text-heading-sm font-bold text-brand-700">
                  +{formatCurrency(addon.price)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Pricing FAQ */}
      <section className="py-20 lg:py-28">
        <Container size="md">
          <SectionHeading
            eyebrow={t("pages.pricing.faqEyebrow")}
            title={t("pages.pricing.faqTitle")}
          />
          <div className="mt-12">
            <Accordion type="single" defaultValue={pricingFaqs[0]?.id}>
              {pricingFaqs.map((faq) => (
                <Accordion.Item
                  key={faq.id}
                  value={faq.id}
                  question={t(`faq.items.${faq.id}.question`)}
                >
                  {t(`faq.items.${faq.id}.answer`)}
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
        </Container>
      </section>

      <CtaSection
        title={t("pages.pricing.ctaTitle")}
        subtitle={t("pages.pricing.ctaSubtitle")}
      />
    </Page>
  );
};

export default PricingPage;
