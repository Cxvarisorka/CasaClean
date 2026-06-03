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
  return (
    <Page>
      <Seo {...PAGE_META.pricing} schema={faqSchema(pricingFaqs)} />

      <PageHero
        image={IMAGES.livingModern}
        eyebrow="Pricing"
        title="Simple pricing that scales with you"
        subtitle="Pay per turnover or save with a managed plan. No contracts, no setup fees, no surprises."
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
            Prices shown are starting points and vary by property size. You'll see
            an exact quote before you confirm any booking.
          </p>
        </Container>
      </section>

      {/* Add-ons */}
      <section className="bg-sand-50 py-20 lg:py-28">
        <Container size="md">
          <SectionHeading
            eyebrow="Add-ons"
            title="Tailor any plan with extras"
            subtitle="Layer on exactly what a listing needs, when it needs it."
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
                  <p className="text-body-md font-semibold text-ink-900">{addon.label}</p>
                  <p className="text-body-sm text-ink-500">{addon.note}</p>
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
          <SectionHeading eyebrow="Pricing FAQ" title="Good to know" />
          <div className="mt-12">
            <Accordion type="single" defaultValue={pricingFaqs[0]?.id}>
              {pricingFaqs.map((faq) => (
                <Accordion.Item key={faq.id} value={faq.id} question={faq.question}>
                  {faq.answer}
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
        </Container>
      </section>

      <CtaSection
        title="Start with a single turnover"
        subtitle="No plan required. Book one clean, see the difference, scale when you're ready."
      />
    </Page>
  );
};

export default PricingPage;
