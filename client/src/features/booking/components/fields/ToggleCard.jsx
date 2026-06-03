import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * ToggleCard
 * ----------
 * A selectable card for multi-select option sets (add-ons, supplies). Controlled
 * by the parent; renders a checkmark and price when selected.
 */

export function ToggleCard({ selected, onToggle, title, price, description }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-brand-600 bg-brand-50 ring-2 ring-brand-500/15"
          : "border-ink-200 bg-white hover:border-brand-300"
      )}
    >
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-md border transition-colors",
          selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300"
        )}
      >
        {selected && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="flex-1">
        <span className="block text-body-sm font-semibold text-ink-900">{title}</span>
        {description && (
          <span className="block text-caption text-ink-500">{description}</span>
        )}
      </span>
      {price != null && (
        <span className="text-body-sm font-bold text-brand-700">+€{price}</span>
      )}
    </button>
  );
}

export default ToggleCard;
