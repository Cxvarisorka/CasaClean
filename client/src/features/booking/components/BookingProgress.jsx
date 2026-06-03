import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBookingNav } from "../store/BookingContext";

/*
 * BookingProgress
 * ---------------
 * The wizard's step tracker. Completed steps are clickable (jump back), the
 * active step is emphasized, and locked future steps are inert. An animated
 * connector fills as the user advances — the small detail that signals quality.
 */

export function BookingProgress() {
  const { steps, step, maxReached, goTo } = useBookingNav();
  const progress = (step / (steps.length - 1)) * 100;

  return (
    <nav aria-label="Booking progress" className="w-full">
      <ol className="relative flex items-center justify-between">
        {/* Track */}
        <div className="absolute left-0 right-0 top-5 -z-0 mx-5 h-0.5 bg-ink-200" aria-hidden="true">
          <motion.div
            className="h-full bg-brand-600"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        {steps.map((s, i) => {
          const isComplete = i < step;
          const isActive = i === step;
          const isUnlocked = i <= maxReached;

          return (
            <li key={s.id} className="relative z-10 flex flex-col items-center">
              <button
                type="button"
                onClick={() => isUnlocked && goTo(i)}
                disabled={!isUnlocked}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "grid size-10 place-items-center rounded-full border-2 bg-white text-body-sm font-bold transition-colors",
                  isComplete && "border-brand-600 bg-brand-600 text-white",
                  isActive && "border-brand-600 text-brand-700 ring-4 ring-brand-500/15",
                  !isComplete && !isActive && "border-ink-200 text-ink-400",
                  isUnlocked && !isActive && "cursor-pointer hover:border-brand-400"
                )}
              >
                {isComplete ? <Check className="size-5" strokeWidth={3} /> : i + 1}
              </button>
              <span
                className={cn(
                  "mt-2 hidden text-caption font-medium sm:block",
                  isActive ? "text-ink-900" : "text-ink-400"
                )}
              >
                {s.title}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default BookingProgress;
