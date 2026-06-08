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
      <Card className="h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-wide text-ink-400">
              {label}
            </p>
            <p className="mt-2 overflow-x-auto whitespace-nowrap text-heading-lg font-bold leading-tight text-ink-900 tabular-nums [scrollbar-width:thin]">
              {value}
            </p>
            {hint && <p className="mt-1 text-body-sm text-ink-500">{hint}</p>}
          </div>
          {Icon && (
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-2xl",
                ACCENTS[accent]
              )}
            >
              <Icon className="size-5.5" aria-hidden="true" />
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default StatCard;
