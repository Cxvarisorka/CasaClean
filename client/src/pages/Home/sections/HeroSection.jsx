import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, PlayCircle, ShieldCheck, Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Image } from "@/components/ui/Image";
import { StarRating } from "@/components/shared/StarRating";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";
import { IMAGES } from "@/constants/images";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { EASE_PREMIUM } from "@/animations/tokens";

/*
 * HeroSection
 * -----------
 * The above-the-fold statement. A staggered entrance brings in the eyebrow,
 * headline, copy and CTAs in sequence, while a floating "guest-ready" proof
 * card and ambient brand glow do the heavy visual lifting — no hero image
 * dependency required for first paint.
 */

const FLOAT_TRANSITION = {
  duration: 6,
  repeat: Infinity,
  ease: "easeInOut",
};

export function HeroSection() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  // Subtle scroll parallax for the hero visual.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-grid pt-32 pb-20 lg:pt-40 lg:pb-28"
    >
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-brand-glow" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-32 top-20 size-[28rem] rounded-full bg-brand-200/40 blur-3xl"
        aria-hidden="true"
      />

      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy */}
          <motion.div
            variants={staggerContainer(0.12, 0.1)}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={staggerItem}>
              <Badge variant="brand" dot>
                {t("hero.badge")}
              </Badge>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="mt-6 text-display text-ink-900"
            >
              {t("hero.titleA")}{" "}
              <span className="text-gradient">{t("hero.titleHighlight")}</span>.
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="mt-6 max-w-xl text-body-lg text-ink-500"
            >
              {t("hero.subtitle")}
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Button to={ROUTES.booking} size="lg" rightIcon={ArrowRight}>
                {t("hero.ctaPrimary")}
              </Button>
              <Button
                to={ROUTES.services}
                variant="outline"
                size="lg"
                leftIcon={PlayCircle}
              >
                {t("hero.ctaSecondary")}
              </Button>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
            >
              <div className="flex items-center gap-3">
                <StarRating rating={5} />
                <span className="text-body-sm text-ink-600">
                  <strong className="font-semibold text-ink-900">4.97</strong>{" "}
                  {t("hero.ratingText")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-body-sm text-ink-600">
                <ShieldCheck className="size-4.5 text-brand-600" />
                {t("hero.guarantee")}
              </div>
            </motion.div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_PREMIUM, delay: 0.2 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <motion.div style={{ y: imageY }} className="relative aspect-[4/5]">
              <Image
                src={IMAGES.heroInterior}
                alt="A bright, freshly cleaned vacation rental living space"
                priority
                rounded="rounded-3xl"
                className="size-full shadow-premium"
                overlay={
                  <>
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-night-soft/70 via-night-soft/10 to-transparent"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                      <p className="text-eyebrow text-brand-200">
                        {t("hero.cardLabel")}
                      </p>
                      <p className="mt-2 text-heading-md text-white">
                        Via Giovanni Giorgi 5
                      </p>
                      <p className="text-body-sm text-brand-100">
                        Rome · 2 bed · 1 bath
                      </p>
                    </div>
                  </>
                }
              />
            </motion.div>

            {/* Floating proof card */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={FLOAT_TRANSITION}
              className="absolute -left-4 top-10 w-52 rounded-2xl bg-surface/95 p-4 shadow-large backdrop-blur sm:-left-8"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-caption text-ink-500">Status</p>
                  <p className="text-body-sm font-semibold text-ink-900">
                    Guest-ready ✓
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Floating rating card */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ ...FLOAT_TRANSITION, delay: 1 }}
              className="absolute -right-3 bottom-16 w-44 rounded-2xl bg-surface/95 p-4 shadow-large backdrop-blur sm:-right-6"
            >
              <div className="flex items-center gap-1.5">
                <Star className="size-4 fill-accent-400 text-accent-400" />
                <span className="text-heading-sm font-bold text-ink-900">4.97</span>
              </div>
              <p className="mt-0.5 text-caption text-ink-500">
                Avg. guest cleanliness
              </p>
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

export default HeroSection;
