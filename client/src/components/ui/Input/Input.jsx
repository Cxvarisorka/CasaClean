import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

/*
 * Input
 * -----
 * Accessible text field. forwardRef + spread props make it a drop-in target
 * for react-hook-form's `register`. Label, hint and error are wired with the
 * correct aria attributes so screen readers announce validation state.
 */

export const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    id,
    type = "text",
    leftIcon: LeftIcon,
    rightAddon,
    className,
    containerClassName,
    required,
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  const describedBy = error
    ? `${inputId}-error`
    : hint
    ? `${inputId}-hint`
    : undefined;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-body-sm font-semibold text-ink-800"
        >
          {label}
          {required && <span className="ml-0.5 text-brand-600">*</span>}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <LeftIcon
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-xl border bg-surface text-body-sm text-ink-900",
            "placeholder:text-ink-400 transition-colors duration-200",
            "focus:outline-none focus:ring-4 focus:ring-brand-500/15",
            LeftIcon ? "pl-10 pr-4" : "px-4",
            rightAddon && "pr-12",
            error
              ? "border-red-400 focus:border-red-500"
              : "border-ink-200 focus:border-brand-500",
            className
          )}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
            {rightAddon}
          </div>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-body-sm text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-body-sm text-ink-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
});

export default Input;
