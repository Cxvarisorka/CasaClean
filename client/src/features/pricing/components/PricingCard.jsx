import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/utils/formatCurrency";
import { ROUTES } from "@/constants/routes";
import { staggerItemScale } from "@/animations/stagger";

/*
 * PricingCard
 * -----------
 * Presentation for a single pricing tier. The highlighted plan is visually
 * elevated (brand fill, scale) to guide the eye to the recommended option.
 * Fully prop-driven from data/pricing.
 */

export function PricingCard({ plan }) {
  const highlight = plan.highlight;

  return (
    <motion.div
      variants={staggerItemScale}
      className={cn(
        "relative flex h-full flex-col rounded-3xl border p-7 shadow-soft",
        highlight
          ? "border-brand-600 bg-ink-950 text-white shadow-premium lg:-my-3 lg:py-10"
          : "border-ink-100 bg-white"
      )}
    >
      {plan.badge && (
        <Badge variant="accent" className="absolute -top-3 left-1/2 -translate-x-1/2">
          {plan.badge}
        </Badge>
      )}

      <h3 className={cn("text-heading-sm", highlight ? "text-white" : "text-ink-900")}>
        {plan.name}
      </h3>
      <p className={cn("mt-1.5 text-body-sm", highlight ? "text-ink-300" : "text-ink-500")}>
        {plan.description}
      </p>

      <div className="mt-6 flex items-end gap-1.5">
        {plan.price != null ? (
          <>
            <span
              className={cn(
                "text-display !text-5xl font-bold",
                highlight ? "text-white" : "text-ink-900"
              )}
            >
              {formatCurrency(plan.price)}
            </span>
            <span className={cn("mb-2 text-body-sm", highlight ? "text-ink-400" : "text-ink-500")}>
              {plan.unit}
            </span>
          </>
        ) : (
          <span
            className={cn(
              "text-display !text-4xl font-bold",
              highlight ? "text-white" : "text-ink-900"
            )}
          >
            {plan.unit}
          </span>
        )}
      </div>
      <p className={cn("mt-1 text-caption", highlight ? "text-brand-300" : "text-ink-400")}>
        {plan.cadence}
      </p>

      <ul className="mt-7 flex-1 space-y-3.5">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={cn(
              "flex items-start gap-3 text-body-sm",
              highlight ? "text-ink-200" : "text-ink-700"
            )}
          >
            <Check
              className={cn(
                "mt-0.5 size-4.5 shrink-0",
                highlight ? "text-brand-400" : "text-brand-600"
              )}
            />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        to={plan.id === "portfolio" ? ROUTES.contact : ROUTES.booking}
        variant={highlight ? "primary" : "outline"}
        size="lg"
        fullWidth
        className="mt-8"
      >
        {plan.cta}
      </Button>
    </motion.div>
  );
}

export default PricingCard;
