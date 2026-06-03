import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useTranslation } from "@/i18n";

/*
 * ThemeToggle
 * -----------
 * A compact light/dark switch bound to ThemeProvider. The icon cross-fades on
 * change. `variant="block"` renders a full-width labeled row for the mobile
 * drawer; the default is the icon-only button used in the navbar.
 */

export function ThemeToggle({ variant = "icon", className }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? t("theme.light") : t("theme.dark");

  const Icon = isDark ? Sun : Moon;

  if (variant === "block") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-ink-200 px-4 py-3 text-body-sm font-medium text-ink-700 transition-colors hover:border-brand-300",
          className
        )}
      >
        <span>{t("theme.label")}</span>
        <span className="inline-flex items-center gap-2 text-ink-900">
          <Icon className="size-4.5" />
          {isDark ? t("theme.dark") : t("theme.light")}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "relative grid size-9 place-items-center overflow-hidden rounded-full text-ink-600 transition-colors hover:bg-ink-100/70 hover:text-ink-900",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "sun" : "moon"}
          initial={{ y: 8, opacity: 0, rotate: -30 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -8, opacity: 0, rotate: 30 }}
          transition={{ duration: 0.18 }}
          className="grid place-items-center"
        >
          <Icon className="size-5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export default ThemeToggle;
