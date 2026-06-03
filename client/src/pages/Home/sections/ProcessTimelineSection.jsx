import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { CLEANING_TIMELINE } from "@/data/process";
import { staggerContainer } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";
import { EASE_PREMIUM } from "@/animations/tokens";

/*
 * ProcessTimelineSection — Cleaning Process Timeline
 * --------------------------------------------------
 * A vertical timeline detailing what happens on site, minute by minute. A
 * single left rail with time-stamped nodes keeps it robust across breakpoints
 * while the staggered reveal gives it a deliberate, premium cadence.
 */

const itemVariant = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_PREMIUM } },
};

export function ProcessTimelineSection() {
  return (
    <section className="bg-ink-950 py-20 text-white lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="On-site process"
          title="A documented timeline, every visit"
          subtitle="No guesswork about what gets done. Here's exactly how a CasaClean turnover unfolds."
          titleClassName="text-white"
          className="[&_p]:text-ink-300"
        />

        <motion.ol
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="relative mx-auto mt-16 max-w-2xl pl-8"
        >
          {/* Vertical rail */}
          <div
            className="absolute bottom-3 left-[0.6875rem] top-3 w-px bg-gradient-to-b from-brand-500/70 via-ink-700 to-transparent"
            aria-hidden="true"
          />

          {CLEANING_TIMELINE.map((step) => (
            <motion.li key={step.id} variants={itemVariant} className="relative mb-9 last:mb-0">
              {/* Node */}
              <span
                className="absolute -left-8 top-1.5 size-[0.875rem] rounded-full border-2 border-brand-400 bg-ink-950 ring-4 ring-brand-500/10"
                aria-hidden="true"
              />
              <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-caption font-bold text-brand-300">
                    {step.time}
                  </span>
                  <h3 className="text-heading-sm text-white">{step.title}</h3>
                </div>
                <p className="mt-2 text-body-sm text-ink-400">{step.description}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </Container>
    </section>
  );
}

export default ProcessTimelineSection;
