import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { PageHero, CtaSection } from "@/components/sections";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Icon } from "@/components/shared/Icon";
import { ServiceCard } from "@/features/services";
import { IMAGES } from "@/constants/images";
import { Seo, serviceSchema } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { SERVICES } from "@/data/services";
import { WORKFLOW_STEPS } from "@/data/process";
import { ROUTES } from "@/constants/routes";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * ServicesPage
 * ------------
 * The full services index: a grid of every offering plus a recap of the
 * working process. Structured data is emitted per service for rich results.
 */

const ServicesPage = () => {
  return (
    <Page>
      <Seo {...PAGE_META.services} schema={SERVICES.map(serviceSchema)} />

      <PageHero
        image={IMAGES.kitchen}
        eyebrow="Our services"
        title="Full-service operations for short-term rentals"
        subtitle="From a single turnover to fully managed linens, restocking and inspections — choose exactly what your listings need."
        actions={
          <Button to={ROUTES.booking} size="lg">
            Book a turnover
          </Button>
        }
      />

      <section className="py-16 lg:py-24">
        <Container>
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {SERVICES.map((service) => (
              <ServiceCard key={service.id} service={service} featured={service.popular} />
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Process recap */}
      <section className="bg-sand-50 py-20 lg:py-28">
        <Container>
          <SectionHeading
            eyebrow="The process"
            title="Effortless from the first booking"
            subtitle="However many services you choose, the experience is the same: simple, reliable, documented."
          />
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {WORKFLOW_STEPS.map((step, i) => (
              <motion.div
                key={step.id}
                variants={staggerItem}
                className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon name={step.icon} className="size-5.5" />
                  </span>
                  <span className="text-heading-md font-bold text-ink-100">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-heading-sm text-ink-900">{step.title}</h3>
                <p className="mt-2 text-body-sm text-ink-500">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Inclusions */}
      <section className="py-20 lg:py-28">
        <Container size="md">
          <SectionHeading
            eyebrow="Always included"
            title="Every turnover, guaranteed"
            subtitle="No matter which services you book, these come standard."
          />
          <motion.ul
            variants={staggerContainer(0.06)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-12 grid gap-4 sm:grid-cols-2"
          >
            {[
              "Vetted, background-checked professionals",
              "50-point quality checklist",
              "Timestamped photo completion report",
              "Full liability insurance on every visit",
              "Damage & lost-item documentation",
              "Guest-Ready Guarantee or we re-clean free",
            ].map((item) => (
              <motion.li
                key={item}
                variants={staggerItem}
                className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-5 py-4 text-body-md text-ink-700 shadow-soft"
              >
                <Check className="size-5 shrink-0 text-brand-600" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </Container>
      </section>

      <CtaSection
        title="Build the turnover plan your listings deserve"
        subtitle="Tell us about your property and we'll recommend the right mix of services."
      />
    </Page>
  );
};

export default ServicesPage;
