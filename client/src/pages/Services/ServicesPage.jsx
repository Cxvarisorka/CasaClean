import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero, CtaSection } from "@/components/sections";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Icon } from "@/components/shared/Icon";
import { ServiceCard, useServices } from "@/features/services";
import { IMAGES } from "@/constants/images";
import { useTranslation } from "@/i18n";
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
  const { t } = useTranslation();
  const { dbServices, isLoading } = useServices();

  // SEO still emits structured data for the curated static catalogue (a stable
  // fallback) so the page always ships rich results even before the DB is seeded.
  const schema = (dbServices.length ? dbServices : SERVICES).map(serviceSchema);

  return (
    <Page>
      <Seo {...PAGE_META.services} schema={schema} />

      <PageHero
        image={IMAGES.kitchen}
        eyebrow={t("pages.services.heroEyebrow")}
        title={t("pages.services.heroTitle")}
        subtitle={t("pages.services.heroSubtitle")}
        actions={
          <Button to={ROUTES.booking} size="lg">
            {t("common.bookTurnover")}
          </Button>
        }
      />

      <section className="py-16 lg:py-24">
        <Container>
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton.Card key={i} />
              ))}
            </div>
          ) : dbServices.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t("pages.services.emptyTitle")}
              description={t("pages.services.emptyDescription")}
              action={
                <Button to={ROUTES.contact} variant="outline">
                  {t("pages.services.emptyAction")}
                </Button>
              }
            />
          ) : (
            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {dbServices.map((service) => (
                <ServiceCard key={service.id} service={service} featured={service.popular} />
              ))}
            </motion.div>
          )}
        </Container>
      </section>

      {/* Process recap */}
      <section className="bg-sand-50 py-20 lg:py-28">
        <Container>
          <SectionHeading
            eyebrow={t("pages.services.processEyebrow")}
            title={t("pages.services.processTitle")}
            subtitle={t("pages.services.processSubtitle")}
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
                className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon name={step.icon} className="size-5.5" />
                  </span>
                  <span className="text-heading-md font-bold text-ink-100">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-heading-sm text-ink-900">
                  {t(`workflow.items.${step.id}.title`)}
                </h3>
                <p className="mt-2 text-body-sm text-ink-500">
                  {t(`workflow.items.${step.id}.description`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Inclusions */}
      <section className="py-20 lg:py-28">
        <Container size="md">
          <SectionHeading
            eyebrow={t("pages.services.includedEyebrow")}
            title={t("pages.services.includedTitle")}
            subtitle={t("pages.services.includedSubtitle")}
          />
          <motion.ul
            variants={staggerContainer(0.06)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-12 grid gap-4 sm:grid-cols-2"
          >
            {t("pages.services.included").map((item) => (
              <motion.li
                key={item}
                variants={staggerItem}
                className="flex items-center gap-3 rounded-xl border border-ink-100 bg-surface px-5 py-4 text-body-md text-ink-700 shadow-soft"
              >
                <Check className="size-5 shrink-0 text-brand-600" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </Container>
      </section>

      <CtaSection
        title={t("pages.services.ctaTitle")}
        subtitle={t("pages.services.ctaSubtitle")}
      />
    </Page>
  );
};

export default ServicesPage;
