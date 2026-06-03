import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

/*
 * Textarea
 * --------
 * Multi-line counterpart to Input, sharing the same label/hint/error contract
 * and RHF-friendly forwardRef so forms stay consistent.
 */

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, id, rows = 4, className, containerClassName, required, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  const describedBy = error
    ? `${fieldId}-error`
    : hint
    ? `${fieldId}-hint`
    : undefined;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-1.5 block text-body-sm font-semibold text-ink-800"
        >
          {label}
          {required && <span className="ml-0.5 text-brand-600">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={cn(
          "w-full rounded-xl border bg-white px-4 py-3 text-body-sm text-ink-900",
          "placeholder:text-ink-400 transition-colors duration-200 resize-y",
          "focus:outline-none focus:ring-4 focus:ring-brand-500/15",
          error
            ? "border-red-400 focus:border-red-500"
            : "border-ink-200 focus:border-brand-500",
          className
        )}
        {...props}
      />

      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-body-sm text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${fieldId}-hint`} className="mt-1.5 text-body-sm text-ink-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
});

export default Textarea;
