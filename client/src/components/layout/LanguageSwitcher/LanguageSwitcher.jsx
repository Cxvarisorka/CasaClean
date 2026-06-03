import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Globe } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/i18n";

/*
 * LanguageSwitcher
 * ----------------
 * Accessible locale picker. Renders the active language and a popover of the
 * supported locales; selecting one swaps the whole UI via the i18n context.
 * Closes on outside-click and Escape. `variant="block"` adapts it for the
 * mobile menu (full-width list) vs. the compact navbar dropdown.
 */

export function LanguageSwitcher({ variant = "menu", className }) {
  const { locale, setLocale, languages, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const active = languages.find((l) => l.code === locale) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (code) => {
    setLocale(code);
    setOpen(false);
  };

  // Full-width variant for the mobile drawer.
  if (variant === "block") {
    return (
      <div className={className}>
        <p className="mb-2 px-1 text-caption font-semibold uppercase tracking-wider text-ink-400">
          {t("language.label")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => select(lang.code)}
              aria-pressed={lang.code === locale}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-body-sm font-medium transition-colors",
                lang.code === locale
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-ink-200 text-ink-600 hover:border-brand-300"
              )}
            >
              <span className="text-lg">{lang.flag}</span>
              {lang.native}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.select")}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-body-sm font-medium text-ink-600 transition-colors hover:bg-ink-100/70 hover:text-ink-900"
      >
        <Globe className="size-4.5" />
        <span className="hidden sm:inline">{active.flag}</span>
        <span className="uppercase">{active.code}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-ink-100 bg-white p-1.5 shadow-large"
          >
            {languages.map((lang) => (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={lang.code === locale}
                  onClick={() => select(lang.code)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-body-sm transition-colors",
                    lang.code === locale
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-700 hover:bg-ink-100"
                  )}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="flex-1 font-medium">{lang.native}</span>
                  {lang.code === locale && <Check className="size-4 text-brand-600" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LanguageSwitcher;
