import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ServiceCard } from "@/features/services";
import { SERVICES } from "@/data/services";
import { ROUTES } from "@/constants/routes";
import { staggerContainer } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * ServicesOverviewSection
 * -----------------------
 * The home grid of core services. Reuses ServiceCard and the shared stagger
 * variants so the reveal matches every other grid on the site.
 */

export function ServicesOverviewSection() {
  return (
    <section id="services" className="py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="What we do"
          title="Everything a turnover needs, under one roof"
          subtitle="Mix and match the services your listings need. One vendor, one dashboard, one standard."
        />

        <motion.div
          variants={staggerContainer(0.08, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SERVICES.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              featured={service.popular}
            />
          ))}
        </motion.div>

        <div className="mt-12 flex justify-center">
          <Button to={ROUTES.services} variant="outline" size="lg" rightIcon={ArrowRight}>
            Explore all services
          </Button>
        </div>
      </Container>
    </section>
  );
}

export default ServicesOverviewSection;
