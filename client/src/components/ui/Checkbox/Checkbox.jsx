import { forwardRef, useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Checkbox
 * --------
 * A styled, accessible checkbox. The native input drives state and remains the
 * focus/click target (peer); the visual box is layered on top. RHF-compatible.
 */

export const Checkbox = forwardRef(function Checkbox(
  { label, description, id, error, className, containerClassName, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className={cn("w-full", containerClassName)}>
      <label
        htmlFor={fieldId}
        className="group flex cursor-pointer items-start gap-3"
      >
        <span className="relative mt-0.5 inline-flex">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            className="peer sr-only"
            aria-invalid={error ? "true" : undefined}
            {...props}
          />
          <span
            className={cn(
              "grid size-5 place-items-center rounded-md border border-ink-300 bg-white",
              "transition-colors duration-150",
              "peer-checked:border-brand-600 peer-checked:bg-brand-600",
              "peer-checked:[&>svg]:opacity-100",
              "peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20",
              error && "border-red-400",
              className
            )}
          >
            <Check
              className="size-3.5 text-white opacity-0 transition-opacity"
              strokeWidth={3}
              aria-hidden="true"
            />
          </span>
        </span>

        {(label || description) && (
          <span className="select-none">
            {label && (
              <span className="block text-body-sm font-medium text-ink-800">
                {label}
              </span>
            )}
            {description && (
              <span className="block text-body-sm text-ink-500">{description}</span>
            )}
          </span>
        )}
      </label>
      {error && <p className="mt-1.5 text-body-sm text-red-600">{error}</p>}
    </div>
  );
});

export default Checkbox;
