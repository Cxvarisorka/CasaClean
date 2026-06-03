import { cn } from "@/lib/cn";

/*
 * OptionGroup
 * -----------
 * A controlled single-select button grid (e.g. hours, cleaners, time slots).
 * Presentational + controlled: parent (via RHF Controller) owns the value.
 */

export function OptionGroup({ options, value, onChange, columns = 4, label, error, ariaLabel }) {
  return (
    <fieldset>
      {label && (
        <legend className="mb-2 text-body-sm font-semibold text-ink-800">{label}</legend>
      )}
      <div
        role="radiogroup"
        aria-label={ariaLabel || label}
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => {
          const optValue = typeof opt === "object" ? opt.value : opt;
          const optLabel = typeof opt === "object" ? opt.label : opt;
          const selected = String(value) === String(optValue);
          return (
            <button
              key={optValue}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(optValue)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-body-sm font-semibold transition-all",
                selected
                  ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/15"
                  : "border-ink-200 bg-surface text-ink-600 hover:border-brand-300"
              )}
            >
              {optLabel}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-body-sm text-red-600">{error}</p>}
    </fieldset>
  );
}

export default OptionGroup;
