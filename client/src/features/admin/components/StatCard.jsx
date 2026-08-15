import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/*
 * StatCard
 * --------
 * A single KPI tile for the dashboard. `accent` tints the icon chip so a row of
 * cards reads as distinct metrics at a glance.
 */

const ACCENTS = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-accent-100 text-accent-700",
  success: "bg-emerald-50 text-emerald-600",
  neutral: "bg-ink-100 text-ink-700",
};

export function StatCard({ icon: Icon, label, value, hint, accent = "brand" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full p-4 sm:p-5">
        {/* The icon chip sits ABOVE the metric until the tiles are wide enough
            (xl) to hold both side by side. Column-reverse keeps label/value
            first in the DOM while rendering the chip on top, so the number
            always owns the full tile width — no clipped or side-scrolling
            figures in the 2-up phone grid or the 4-up laptop grid. */}
        <div className="flex flex-col-reverse items-start gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="w-full min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-wide text-ink-400">
              {label}
            </p>
            <p className="mt-1.5 font-display text-[1.5rem] font-bold leading-tight tracking-tight text-ink-900 tabular-nums sm:mt-2 sm:text-[1.75rem] xl:text-[2rem]">
              {value}
            </p>
            {hint && (
              <p className="mt-1 text-caption text-ink-500 sm:text-body-sm">{hint}</p>
            )}
          </div>
          {Icon && (
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl sm:size-11 sm:rounded-2xl",
                ACCENTS[accent]
              )}
            >
              <Icon className="size-5 sm:size-5.5" aria-hidden="true" />
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default StatCard;
