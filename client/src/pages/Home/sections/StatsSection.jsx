import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { STATS } from "@/data/stats";
import { useTranslation } from "@/i18n";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * StatsSection
 * ------------
 * The headline metrics band. Each figure counts up the first time it enters
 * the viewport (AnimatedNumber), turning static proof points into a moment.
 */

export function StatsSection() {
  const { t } = useTranslation();

  return (
    <section className="py-16 lg:py-20">
      <Container>
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid gap-8 rounded-3xl border border-ink-100 bg-gradient-to-b from-surface to-sand-50 px-6 py-12 shadow-soft sm:grid-cols-2 lg:grid-cols-4"
        >
          {STATS.map((stat) => (
            <motion.div key={stat.id} variants={staggerItem} className="text-center">
              <p className="text-heading-xl font-bold text-gradient">
                <AnimatedNumber
                  value={stat.value}
                  decimals={stat.decimals || 0}
                  suffix={stat.suffix}
                />
              </p>
              <p className="mt-2 text-body-md text-ink-500">{t(`stats.${stat.id}`)}</p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

export default StatsSection;
