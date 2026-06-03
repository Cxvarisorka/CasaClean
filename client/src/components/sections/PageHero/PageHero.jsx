import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Image } from "@/components/ui/Image";
import { staggerContainer, staggerItem } from "@/animations/stagger";

/*
 * PageHero
 * --------
 * The standardized header band for inner pages. Two treatments:
 *   • default — soft brand-glow on light, dark text (calm).
 *   • image   — a photographic backdrop with a dark scrim and light text
 *     (dramatic), enabled by passing the `image` prop.
 * Either way the eyebrow/title/subtitle/actions composition and staggered
 * reveal stay identical, so every inner page feels consistent.
 */

export function PageHero({ eyebrow, title, subtitle, actions, image, children }) {
  const hasImage = Boolean(image);

  return (
    <section
      className={cn(
        "relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-20",
        hasImage ? "bg-night-soft" : "bg-grid"
      )}
    >
      {hasImage ? (
        <>
          <Image
            src={image}
            alt=""
            aria-hidden="true"
            priority
            rounded="rounded-none"
            className="absolute inset-0 size-full"
            imgClassName="opacity-45"
            gradient="from-ink-800 to-night-soft"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-night-soft via-night-soft/70 to-night-soft/40"
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-brand-glow" aria-hidden="true" />
      )}

      <Container className="relative">
        <motion.div
          variants={staggerContainer(0.12, 0.05)}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl text-center"
        >
          {eyebrow && (
            <motion.div variants={staggerItem} className="flex justify-center">
              <Badge variant={hasImage ? "dark" : "brand"} dot>
                {eyebrow}
              </Badge>
            </motion.div>
          )}
          <motion.h1
            variants={staggerItem}
            className={cn(
              "mt-6 text-heading-xl text-balance",
              hasImage ? "text-white" : "text-ink-900"
            )}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              variants={staggerItem}
              className={cn(
                "mx-auto mt-5 max-w-2xl text-body-lg",
                hasImage ? "text-ink-300" : "text-ink-500"
              )}
            >
              {subtitle}
            </motion.p>
          )}
          {actions && (
            <motion.div
              variants={staggerItem}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              {actions}
            </motion.div>
          )}
          {children}
        </motion.div>
      </Container>
    </section>
  );
}

export default PageHero;
