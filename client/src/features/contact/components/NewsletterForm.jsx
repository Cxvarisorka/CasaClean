import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n";
import { useSubscribeNewsletter } from "../hooks/useContactMutations";

/*
 * NewsletterForm
 * --------------
 * Compact email-capture form. Handles validation, async submission state
 * (TanStack Query) and an animated success swap. `tone="dark"` adapts it to
 * the footer surface.
 *
 * Deliberately hand-rolled rather than react-hook-form + zod: the Footer renders
 * on every page, so a static import here put the whole forms/validation stack
 * (~31 kB gz) on the critical path of the marketing site for a single email
 * field. The wizard and auth pages still use RHF + zod, where it earns its size.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({ tone = "light", className }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);

  const { mutateAsync, isPending, isSuccess } = useSubscribeNewsletter();

  const onSubmit = async (e) => {
    e.preventDefault();
    const value = email.trim();

    if (!EMAIL_PATTERN.test(value)) {
      setError("Enter a valid email address");
      return;
    }

    setError(null);
    await mutateAsync({ email: value });
    setEmail("");
  };

  const dark = tone === "dark";

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {isSuccess ? (
          <motion.p
            key="success"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center gap-2 text-body-sm font-medium",
              dark ? "text-brand-300" : "text-brand-700"
            )}
          >
            <CheckCircle2 className="size-4.5" /> {t("footer.subscribed")}
          </motion.p>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            noValidate
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="newsletter-email" className="sr-only">
                  {t("footer.emailLabel")}
                </label>
                <input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("footer.emailPlaceholder")}
                  aria-invalid={error ? "true" : undefined}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  className={cn(
                    "h-11 w-full rounded-xl border px-4 text-body-sm transition-colors focus:outline-none focus:ring-4 focus:ring-brand-500/20",
                    dark
                      ? "border-ink-700 bg-night text-white placeholder:text-ink-500 focus:border-brand-500"
                      : "border-ink-200 bg-surface text-ink-900 placeholder:text-ink-400 focus:border-brand-500",
                    error && "border-red-400"
                  )}
                />
              </div>
              <Button type="submit" size="md" loading={isPending} rightIcon={ArrowRight}>
                {t("footer.subscribe")}
              </Button>
            </div>
            {error && (
              <p className="mt-1.5 text-body-sm text-red-400">{error}</p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NewsletterForm;
