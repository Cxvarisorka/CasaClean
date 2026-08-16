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

  const selected = COUNTRIES.find((c) => c.code === country);

  return (
    // `@container`: what this field can show depends on how wide *it* is, not on
    // how wide the window is — the same component sits in a full-width form and
    // in a narrow modal column. See the flag below.
    <div className={cn("@container w-full min-w-0", containerClassName)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-1.5 block text-body-sm font-semibold text-ink-800"
        >
          {label}
          {required && <span className="ml-0.5 text-brand-600">*</span>}
        </label>
      )}

      {/*
       * One control, two segments — a dial-code chip against the number box,
       * sharing a single border and a single focus ring. Two separate boxes
       * (which is what a bordered picker beside a bordered input reads as)
       * looked like two unrelated questions, and side by side they needed
       * ~250px before the number box was usable at all.
       *
       * What made it wide was the OPTION text ("🇮🇹 +39 Italy"), which a native
       * <select> also renders into the closed control. So the two are split:
       * the real <select> keeps the full labels and the native popup, and sits
       * invisibly on top of a display that shows only what has to be read back.
       */}
      <div
        className={cn(
          // `overflow-hidden` so the segment tint and the input meet the border
          // radius exactly, instead of each re-guessing it a pixel inside.
          "flex w-full items-stretch overflow-hidden rounded-xl border bg-surface transition-colors duration-200",
          "focus-within:ring-4",
          error
            ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/15"
            : "border-ink-200 focus-within:border-brand-500 focus-within:ring-brand-500/15",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <div className="relative shrink-0">
          <select
            aria-label={countryLabel}
            value={country}
            onChange={onCountryChange}
            disabled={disabled}
            className={cn(
              "peer absolute inset-0 size-full cursor-pointer appearance-none opacity-0",
              // Explicit rather than inherited: Chromium draws the option list
              // in its own popup, and this is the element whose font it reads
              // for it — see the flag @font-face in styles/globals.css.
              "font-sans",
              "disabled:cursor-not-allowed"
            )}
          >
            {COUNTRIES.map((option) => (
              <option key={option.code} value={option.code}>
                {`${option.flag} ${option.dialCode} ${option.name}`}
              </option>
            ))}
          </select>

          {/* The select above is invisible, so its focus ring would be too —
              the chip lights up in its place, which also says which of the two
              segments the keyboard is on. */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none flex h-11 items-center gap-1.5 pl-3 pr-2 text-body-sm text-ink-900",
              "transition-colors peer-focus-visible:bg-brand-50 peer-focus-visible:text-brand-700"
            )}
          >
            {/* Dropped when the field itself is narrow — the dial code is the
                part that has to be read back, the flag is the part that makes
                it scannable. A container query, not a media query: this is
                about the field's own width, and it sits in columns of very
                different sizes on the same screen. */}
            <span className="hidden @min-[15rem]:inline">{selected?.flag}</span>
            <span className="tabular-nums">{dialCode}</span>
            <ChevronDown className="size-4 shrink-0 text-ink-400" />
          </span>
        </div>

        <span className="my-2 w-px shrink-0 bg-ink-200" aria-hidden="true" />

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
            "h-11 min-w-0 flex-1 bg-transparent px-3 text-body-sm text-ink-900",
            "placeholder:text-ink-400",
            // The group owns the ring now, so the input must not draw a second
            // one inside it.
            "focus:outline-none",
            "disabled:cursor-not-allowed",
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
