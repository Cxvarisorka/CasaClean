import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { MoveHorizontal } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { Image } from "@/components/ui/Image";
import { IMAGES } from "@/constants/images";
import { useTranslation } from "@/i18n";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * BeforeAfterSection — Before & After Showcase
 * --------------------------------------------
 * An interactive comparison slider. The "before" and "after" are rendered as
 * styled panels (no image assets required); dragging the handle reveals the
 * transformation. Pointer events keep it responsive on touch and mouse alike.
 */

function ComparisonSlider() {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);

  const updateFromClientX = (clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (e.buttons !== 1) return;
    updateFromClientX(e.clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-3xl shadow-premium"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      role="slider"
      aria-label="Before and after comparison"
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 4));
        if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 4));
      }}
    >
      {/* After (base layer) */}
      <Image
        src={IMAGES.afterRoom}
        alt="The space after a CasaClean turnover — bright and guest-ready"
        rounded="rounded-none"
        className="absolute inset-0 size-full"
        gradient="from-brand-400 to-brand-600"
        draggable={false}
        overlay={
          <Badge variant="dark" className="absolute right-4 top-4">
            {t("beforeAfter.after")}
          </Badge>
        }
      />

      {/* Before (clipped overlay) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={IMAGES.beforeRoom}
          alt="The space before cleaning, just after guest checkout"
          rounded="rounded-none"
          className="absolute inset-0 size-full"
          imgClassName="grayscale-[35%] brightness-90 contrast-95"
          gradient="from-ink-600 to-ink-800"
          draggable={false}
          overlay={
            <>
              <div className="absolute inset-0 bg-ink-950/20" aria-hidden="true" />
              <Badge variant="neutral" className="absolute left-4 top-4">
                {t("beforeAfter.before")}
              </Badge>
            </>
          }
        />
      </div>

      {/* Handle */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-large"
        style={{ left: `${position}%` }}
      >
        <span className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-ink-700 shadow-large">
          <MoveHorizontal className="size-5" />
        </span>
      </div>
    </div>
  );
}

export function BeforeAfterSection() {
  const { t } = useTranslation();

  return (
    <section className="py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow={t("beforeAfter.eyebrow")}
          title={t("beforeAfter.title")}
          subtitle={t("beforeAfter.subtitle")}
        />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-14 max-w-4xl"
        >
          <ComparisonSlider />
        </motion.div>
      </Container>
    </section>
  );
}

export default BeforeAfterSection;
