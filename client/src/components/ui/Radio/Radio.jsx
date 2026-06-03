import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

/*
 * Radio
 * -----
 * A single styled radio input. Compose several with the same `name` (e.g. via
 * RHF) for a group. The visual dot is driven by the native input's :checked.
 */

export const Radio = forwardRef(function Radio(
  { label, description, id, className, containerClassName, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <label
      htmlFor={fieldId}
      className={cn(
        "group flex cursor-pointer items-start gap-3",
        containerClassName
      )}
    >
      <span className="relative mt-0.5 inline-flex">
        <input
          ref={ref}
          id={fieldId}
          type="radio"
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            "grid size-5 place-items-center rounded-full border border-ink-300 bg-white",
            "transition-colors duration-150",
            "peer-checked:border-brand-600",
            "peer-checked:[&>span]:scale-100",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20",
            className
          )}
        >
          <span className="size-2.5 scale-0 rounded-full bg-brand-600 transition-transform duration-150" />
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
  );
});

export default Radio;
