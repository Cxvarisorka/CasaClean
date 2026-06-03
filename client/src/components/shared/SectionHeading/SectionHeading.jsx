import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * SectionHeading
 * --------------
 * The standardized "eyebrow + title + subtitle" header that opens nearly every
 * section. Centralizing it guarantees consistent rhythm and a single staggered
 * reveal pattern across the whole site.
 */

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
  titleClassName,
}) {
  return (
    <motion.div
      variants={staggerContainer(0.12)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center mx-auto max-w-2xl",
        align === "left" && "items-start text-left max-w-2xl",
        className
      )}
    >
      {eyebrow && (
        <motion.span
          variants={staggerItem}
          className="text-eyebrow text-brand-600"
        >
          {eyebrow}
        </motion.span>
      )}
      <motion.h2
        variants={staggerItem}
        className={cn("text-heading-lg text-balance text-ink-900", titleClassName)}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={staggerItem}
          className="text-body-lg text-ink-500"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

export default SectionHeading;
