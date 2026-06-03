import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Icon } from "@/components/shared/Icon";
import { WORKFLOW_STEPS } from "@/data/process";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * WorkflowSection — Property Turnover Workflow
 * -------------------------------------------
 * The four-step "how it works" overview. A connecting line behind the numbered
 * nodes communicates sequence at a glance on desktop.
 */

export function WorkflowSection() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="From booking to guest-ready in four steps"
          subtitle="A turnover workflow designed to disappear into the background of your hosting."
        />

        <div className="relative mt-16">
          {/* Connecting line (desktop) */}
          <div
            className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-ink-200 to-transparent lg:block"
            aria-hidden="true"
          />

          <motion.ol
            variants={staggerContainer(0.12)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4"
          >
            {WORKFLOW_STEPS.map((step, i) => (
              <motion.li key={step.id} variants={staggerItem} className="relative text-center">
                <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-medium">
                  <Icon name={step.icon} className="size-6" />
                  <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border-2 border-white bg-accent-400 text-caption font-bold text-ink-950">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-heading-sm text-ink-900">{step.title}</h3>
                <p className="mt-2 text-body-md text-ink-500">{step.description}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </Container>
    </section>
  );
}

export default WorkflowSection;
