import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

/*
 * StatCard
 * --------
 * A single KPI tile for the dashboard. `accent` tints the icon chip so a row of
 * cards reads as distinct metrics at a glance.
 *
 * `loading` shims the figure (and the hint, which counts the same records) while
 * the collections it is derived from are still in flight — a stat card has no
 * honest zero, so "0 bookings" for a second is a wrong answer, not a pending
 * one. The label stays: it says which metric is arriving.
 */

const ACCENTS = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-accent-100 text-accent-700",
  success: "bg-emerald-50 text-emerald-600",
  neutral: "bg-ink-100 text-ink-700",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "brand",
  loading = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full p-4 xs:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-wide text-ink-400">
              {label}
            </p>
            {/* The figure sets the tile's floor: at `heading-lg` a formatted
                euro total is ~100px, which is the whole text column once the
                icon chip has taken its share on a 200px screen. One step down
                below `xs`, and the chip goes with it — it is decoration, and
                the label already says which metric this is.

                The overflow needs all three parts. `overflow-x-auto` is what
                lets a long total scroll instead of spilling out of the tile,
                but it also computes the y axis to `auto` (CSS resolves
                `visible` to `auto` on the opposite axis), and the display font
                is taller than the line box it is set in — ascent + descent run
                ~1.26em against `heading-lg`'s 1.12 — so every card scrolled
                vertically over a sliver of leading, whatever its value.
                `overflow-y-hidden` takes that axis back; it clips empty font
                metrics, never ink, since digits stay inside cap-height.
                `scrollbar-none` then drops the horizontal bar, which is pure
                chrome across a figure — the value is still swipe-reachable. */}
            <p className="scrollbar-none mt-2 overflow-x-auto overflow-y-hidden whitespace-nowrap text-heading-md font-bold leading-tight text-ink-900 tabular-nums xs:text-heading-lg">
              {/* Sized in `em` so the bar tracks the figure's own font size
                  across the `xs` step instead of pinning a pixel height that
                  only matches at one breakpoint. */}
              {loading ? (
                <Skeleton className="inline-block h-[1em] w-24 max-w-full align-middle" />
              ) : (
                value
              )}
            </p>
            {hint &&
              (loading ? (
                <Skeleton className="mt-2 h-3.5 w-2/3" />
              ) : (
                <p className="mt-1 text-body-sm text-ink-500">{hint}</p>
              ))}
          </div>
          {Icon && (
            <span
              className={cn(
                "hidden size-11 shrink-0 place-items-center rounded-2xl xs:grid",
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
