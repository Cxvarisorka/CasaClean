import { forwardRef, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  COUNTRIES,
  DEFAULT_COUNTRY_CODE,
  joinPhone,
  normalizePhone,
  splitPhone,
} from "@/lib/phone";

/*
 * PhoneInput
 * ----------
 * One field, two controls: a country picker that supplies the dial code and a
 * box for the rest of the number. The customer never types a "+" — the value
 * handed to the form is always the canonical "+393312345678".
 *
 * Each option reads "🇮🇹 +39 Italy": the flag first, so the closed control still
 * shows a flag and a dial code once the country name is truncated away. Windows
 * has no flag glyphs of its own, which is why the app ships the Twemoji flag
 * subset (styles/globals.css) — without it, that column reads "IT" there.
 *
 * Controlled by design (`value` / `onChange` with the joined string, not an
 * event), which is what react-hook-form's <Controller> expects; `register` alone
 * can't drive two inputs onto one field.
 *
 * The picked country lives in the value itself, so nothing has to be kept in
 * sync — except while the number is still empty, when there are no digits to
 * read a prefix from. That one case is what the local state below remembers, so
 * choosing Georgia and then typing doesn't snap back to Italy.
 */

export const PhoneInput = forwardRef(function PhoneInput(
  {
    label,
    hint,
    error,
    id,
    name,
    value = "",
    onChange,
    onBlur,
    required,
    disabled,
    placeholder,
    countryLabel = "Country code",
    className,
    containerClassName,
  },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  const [preferredCountry, setPreferredCountry] = useState(DEFAULT_COUNTRY_CODE);
  const { country, dialCode, national } = splitPhone(value, preferredCountry);

  const emit = (nextDial, nextNational) => onChange?.(joinPhone(nextDial, nextNational));

  const onCountryChange = (event) => {
    const nextCode = event.target.value;
    setPreferredCountry(nextCode);
    emit(COUNTRIES.find((c) => c.code === nextCode)?.dialCode ?? "+", national);
  };

  const onNationalChange = (event) => {
    const typed = normalizePhone(event.target.value);

    // Pasting a whole international number ("+39 331…", or "0039331…") into the
    // number box re-points the picker instead of appending a second prefix.
    if (typed.startsWith("+")) {
      const pasted = splitPhone(typed, preferredCountry);
      setPreferredCountry(pasted.country);
      onChange?.(joinPhone(pasted.dialCode, pasted.national));
      return;
    }

    emit(dialCode, typed);
  };

  const controlBorder = error
    ? "border-red-400 focus:border-red-500"
    : "border-ink-200 focus:border-brand-500";

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

      <div className="flex gap-2">
        {/* The picker keeps its own width: wide enough for the dial code, never
            wide enough to squeeze the number box on a phone. */}
        <div className="relative shrink-0">
          <select
            aria-label={countryLabel}
            value={country}
            onChange={onCountryChange}
            disabled={disabled}
            className={cn(
              "h-11 w-28 appearance-none rounded-xl border bg-surface pl-3 pr-8 text-body-sm",
              "cursor-pointer text-ink-900 transition-colors duration-200",
              // Explicit rather than inherited: Chromium draws the option list
              // in its own popup, and this is the element whose font it reads
              // for it — see the flag @font-face in styles/globals.css.
              "font-sans",
              "focus:outline-none focus:ring-4 focus:ring-brand-500/15",
              "disabled:cursor-not-allowed disabled:opacity-60",
              controlBorder
            )}
          >
            {COUNTRIES.map((option) => (
              <option key={option.code} value={option.code}>
                {`${option.flag} ${option.dialCode} ${option.name}`}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        </div>

        <input
          ref={ref}
          id={fieldId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={onNationalChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-xl border bg-surface px-4 text-body-sm text-ink-900",
            "placeholder:text-ink-400 transition-colors duration-200",
            "focus:outline-none focus:ring-4 focus:ring-brand-500/15",
            "disabled:cursor-not-allowed disabled:opacity-60",
            controlBorder,
            className
          )}
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

export default PhoneInput;
