import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Image } from "@/components/ui/Image";
import { ROUTES } from "@/constants/routes";
import { IMAGES } from "@/constants/images";
import { useTranslation } from "@/i18n";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * CtaSection
 * ----------
 * The reusable conversion band that closes most pages. Content is prop-driven
 * so each page can tailor the message while the premium dark treatment and
 * layout stay consistent.
 */

export function CtaSection({
  eyebrow,
  title,
  subtitle,
  primaryLabel,
  primaryTo = ROUTES.booking,
  secondaryLabel,
}) {
  const { t } = useTranslation();
  const resolvedEyebrow = eyebrow ?? t("cta.eyebrow");
  const resolvedTitle = title ?? t("cta.title");
  const resolvedSubtitle = subtitle ?? t("cta.subtitle");
  const resolvedPrimary = primaryLabel ?? t("cta.primary");
  const resolvedSecondary = secondaryLabel ?? t("cta.secondary");

  return (
    <section className="px-5 py-16 lg:py-24">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-ink-950 px-7 py-14 text-center shadow-premium sm:px-12 lg:py-20"
        >
          {/* Photographic backdrop */}
          <Image
            src={IMAGES.ctaBackdrop}
            alt=""
            aria-hidden="true"
            rounded="rounded-none"
            className="absolute inset-0 size-full"
            imgClassName="opacity-25"
            gradient="from-ink-800 to-ink-950"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/70"
            aria-hidden="true"
          />

          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-brand-600/30 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-brand-500/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-2xl">
            <span className="text-eyebrow text-brand-300">{resolvedEyebrow}</span>
            <h2 className="mt-4 text-heading-xl text-balance text-white">{resolvedTitle}</h2>
            <p className="mx-auto mt-5 max-w-xl text-body-lg text-ink-300">
              {resolvedSubtitle}
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button to={primaryTo} size="lg" rightIcon={ArrowRight}>
                {resolvedPrimary}
              </Button>
              <Button
                to={ROUTES.contact}
                size="lg"
                variant="outline"
                leftIcon={Phone}
                className="border-ink-700 bg-transparent text-white hover:border-brand-400 hover:bg-ink-900"
              >
                {resolvedSecondary}
              </Button>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

export default CtaSection;
