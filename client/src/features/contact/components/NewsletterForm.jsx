import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n";
import { newsletterSchema } from "../validation/contactSchema";
import { useSubscribeNewsletter } from "../hooks/useContactMutations";

/*
 * NewsletterForm
 * --------------
 * Compact email-capture form. Handles validation (zod), async submission state
 * (TanStack Query) and an animated success swap. `tone="dark"` adapts it to
 * the footer surface.
 */

export function NewsletterForm({ tone = "light", className }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(newsletterSchema), defaultValues: { email: "" } });

  const { mutateAsync, isPending, isSuccess } = useSubscribeNewsletter();

  const onSubmit = async (values) => {
    await mutateAsync(values);
    reset();
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
            onSubmit={handleSubmit(onSubmit)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            noValidate
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  placeholder={t("footer.emailPlaceholder")}
                  aria-invalid={errors.email ? "true" : undefined}
                  className={cn(
                    "h-11 w-full rounded-xl border px-4 text-body-sm transition-colors focus:outline-none focus:ring-4 focus:ring-brand-500/20",
                    dark
                      ? "border-ink-700 bg-ink-900 text-white placeholder:text-ink-500 focus:border-brand-500"
                      : "border-ink-200 bg-white text-ink-900 placeholder:text-ink-400 focus:border-brand-500",
                    errors.email && "border-red-400"
                  )}
                  {...register("email")}
                />
              </div>
              <Button type="submit" size="md" loading={isPending} rightIcon={ArrowRight}>
                {t("footer.subscribe")}
              </Button>
            </div>
            {errors.email && (
              <p className="mt-1.5 text-body-sm text-red-400">{errors.email.message}</p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NewsletterForm;
