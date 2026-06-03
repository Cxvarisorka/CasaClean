import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { cn } from "@/lib/cn";
import { StarRating } from "@/components/shared/StarRating";
import { Badge } from "@/components/ui/Badge";
import { Image } from "@/components/ui/Image";
import { carouselSlide } from "@/animations/slide";
import { TESTIMONIALS } from "@/data/testimonials";
import { useTranslation } from "@/i18n";

/*
 * TestimonialsCarousel
 * --------------------
 * A self-contained, accessible testimonial carousel. Tracks slide direction so
 * transitions animate the correct way, auto-advances on an interval (paused on
 * hover), and exposes prev/next plus dot controls. Data-driven from
 * data/testimonials so it's reusable anywhere.
 */

const AUTOPLAY_MS = 6500;

export function TestimonialsCarousel({ items = TESTIMONIALS }) {
  const { t } = useTranslation();
  const [[index, direction], setState] = useState([0, 0]);
  const [paused, setPaused] = useState(false);

  const paginate = useCallback(
    (dir) => {
      setState(([prev]) => {
        const next = (prev + dir + items.length) % items.length;
        return [next, dir];
      });
    },
    [items.length]
  );

  const goTo = (i) => setState(([prev]) => [i, i > prev ? 1 : -1]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => paginate(1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paginate, paused, index]);

  const active = items[index];

  return (
    <div
      className="relative mx-auto max-w-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative overflow-hidden rounded-3xl border border-ink-100 bg-surface p-8 shadow-medium sm:p-12">
        <Quote className="absolute right-8 top-8 size-16 text-brand-50" aria-hidden="true" />

        <div className="relative min-h-[16rem]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.figure
              key={active.id}
              custom={direction}
              variants={carouselSlide}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <StarRating rating={active.rating} size="size-5" />
              <blockquote className="mt-5 text-heading-md font-medium leading-snug text-ink-900">
                “{t(`testimonials.${active.id}.quote`)}”
              </blockquote>

              <figcaption className="mt-7 flex items-center gap-4">
                {active.photo ? (
                  <Image
                    src={active.photo}
                    alt={active.name}
                    rounded="rounded-full"
                    className="size-12 shrink-0"
                    gradient="from-brand-500 to-brand-700"
                  />
                ) : (
                  <span className="grid size-12 place-items-center rounded-full bg-brand-600 text-body-sm font-bold text-white">
                    {active.avatar}
                  </span>
                )}
                <div>
                  <p className="text-body-md font-semibold text-ink-900">
                    {active.name}
                  </p>
                  <p className="text-body-sm text-ink-500">
                    {active.role} · {active.location}
                  </p>
                </div>
                <Badge variant="brand" className="ml-auto hidden sm:inline-flex">
                  {t(`testimonials.${active.id}.metric`)}
                </Badge>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-7 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => paginate(-1)}
          aria-label="Previous testimonial"
          className="grid size-11 place-items-center rounded-full border border-ink-200 bg-surface text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-600"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="flex items-center gap-2" role="tablist">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              aria-selected={i === index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === index ? "w-7 bg-brand-600" : "w-2 bg-ink-200 hover:bg-ink-300"
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => paginate(1)}
          aria-label="Next testimonial"
          className="grid size-11 place-items-center rounded-full border border-ink-200 bg-surface text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-600"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

export default TestimonialsCarousel;
