import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Icon } from "@/components/shared/Icon";
import { WHY_CASACLEAN } from "@/data/company";
import { useTranslation } from "@/i18n";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * WhyCasaCleanSection
 * -------------------
 * The differentiators band on a warm sand surface. A two-up layout pairs a
 * sticky heading with a staggered list of reasons — scannable and calm.
 */

export function WhyCasaCleanSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-sand-50 py-20 lg:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              align="left"
              eyebrow={t("why.eyebrow")}
              title={t("why.title")}
              subtitle={t("why.subtitle")}
            />
          </div>

          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid gap-5 sm:grid-cols-2"
          >
            {WHY_CASACLEAN.map((item) => (
              <motion.div
                key={item.id}
                variants={staggerItem}
                className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-soft transition-shadow hover:shadow-medium"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon name={item.icon} className="size-6" />
                </span>
                <h3 className="mt-5 text-heading-sm text-ink-900">
                  {t(`why.items.${item.id}.title`)}
                </h3>
                <p className="mt-2 text-body-md text-ink-500">
                  {t(`why.items.${item.id}.description`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

export default WhyCasaCleanSection;
