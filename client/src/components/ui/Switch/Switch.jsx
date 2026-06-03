import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

/*
 * Switch
 * ------
 * An accessible toggle built on a native checkbox for free keyboard + form
 * semantics. The track/knob are pure CSS driven by :checked via peer variants.
 */

export const Switch = forwardRef(function Switch(
  { label, description, id, className, containerClassName, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <label
      htmlFor={fieldId}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4",
        containerClassName
      )}
    >
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

      <span className="relative inline-flex shrink-0">
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            "h-6 w-11 rounded-full bg-ink-200 transition-colors duration-200",
            "peer-checked:bg-brand-600",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20",
            "peer-checked:[&>span]:translate-x-5",
            className
          )}
        >
          <span className="block size-5 translate-x-0.5 translate-y-0.5 rounded-full bg-surface shadow-soft transition-transform duration-200" />
        </span>
      </span>
    </label>
  );
});

export default Switch;
