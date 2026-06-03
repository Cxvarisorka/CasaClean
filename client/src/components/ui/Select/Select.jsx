import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Select
 * ------
 * Native <select> styled to match the design system. Native is deliberate:
 * it's accessible, mobile-friendly and zero-dependency. Accepts an `options`
 * array of { value, label } or arbitrary children.
 */

export const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    id,
    options,
    placeholder,
    className,
    containerClassName,
    required,
    children,
    ...props
  },
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

      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full appearance-none rounded-xl border bg-white pl-4 pr-10 text-body-sm",
            "text-ink-900 transition-colors duration-200 cursor-pointer",
            "focus:outline-none focus:ring-4 focus:ring-brand-500/15",
            error
              ? "border-red-400 focus:border-red-500"
              : "border-ink-200 focus:border-brand-500",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
      </div>

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

export default Select;
