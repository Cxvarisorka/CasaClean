import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { TRUSTED_BY } from "@/data/stats";
import { useTranslation } from "@/i18n";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * TrustedBySection
 * ----------------
 * A quiet trust strip of platform/partner names. Kept understated (muted, no
 * boxes) so it reads as credibility, not advertising.
 */

export function TrustedBySection() {
  const { t } = useTranslation();

  return (
    <section className="border-y border-ink-100 bg-surface py-10">
      <Container>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportOnce}
          className="text-center text-caption uppercase tracking-widest text-ink-400"
        >
          {t("trustedBy.label")}
        </motion.p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {TRUSTED_BY.map((name, i) => (
            <motion.span
              key={name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ delay: i * 0.06 }}
              className="text-body-lg font-semibold tracking-tight text-ink-300 grayscale transition-colors hover:text-ink-500"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default TrustedBySection;
