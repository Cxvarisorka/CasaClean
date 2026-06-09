import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ServiceCard, useServices } from "@/features/services";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";
import { staggerContainer } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * ServicesOverviewSection
 * -----------------------
 * The home grid of core services — the real, admin-managed catalogue from the
 * database (no static seed data). Reuses ServiceCard and the shared stagger
 * variants so the reveal matches every other grid on the site.
 */

export function ServicesOverviewSection() {
  const { t } = useTranslation();
  const { dbServices, isLoading } = useServices();

  // Nothing to advertise yet (empty DB) — drop the whole section rather than
  // showing an empty grid with a dangling "explore all" button.
  if (!isLoading && dbServices.length === 0) return null;

  return (
    <section id="services" className="py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow={t("servicesSection.eyebrow")}
          title={t("servicesSection.title")}
          subtitle={t("servicesSection.subtitle")}
        />

        {isLoading ? (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton.Card key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            variants={staggerContainer(0.08, 0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {dbServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                featured={service.popular}
              />
            ))}
          </motion.div>
        )}

        <div className="mt-12 flex justify-center">
          <Button to={ROUTES.services} variant="outline" size="lg" rightIcon={ArrowRight}>
            {t("servicesSection.exploreAll")}
          </Button>
        </div>
      </Container>
    </section>
  );
}

export default ServicesOverviewSection;
