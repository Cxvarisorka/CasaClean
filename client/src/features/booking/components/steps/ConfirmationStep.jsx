import { motion } from "framer-motion";
import { CalendarCheck, CheckCircle2, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import { ROUTES } from "@/constants/routes";
import { useTranslation } from "@/i18n";
import { EASE_SPRING } from "@/animations/tokens";

/*
 * ConfirmationStep
 * ----------------
 * The success screen. Celebrates completion with a spring-animated check, the
 * booking reference and a recap, then routes the user back into the product.
 */

export function ConfirmationStep({ booking }) {
  const { t } = useTranslation();
  const firstName = booking.customer_name?.split(" ")[0] || "there";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg text-center"
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
        className="mx-auto grid size-20 place-items-center rounded-full bg-brand-50"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ease: EASE_SPRING, delay: 0.25 }}
        >
          <CheckCircle2 className="size-12 text-brand-600" />
        </motion.span>
      </motion.span>

      <h2 className="mt-6 text-heading-lg text-ink-900">
        {t("booking.confirmation.title")}
      </h2>
      <p className="mt-3 text-body-lg text-ink-500">
        {firstName} — {t("booking.confirmation.body")}
      </p>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 text-left shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-ink-500">{t("booking.confirmation.reference")}</span>
          <span className="font-mono text-body-sm font-bold text-ink-900">
            {booking.id}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-4">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <CalendarCheck className="size-5" />
          </span>
          <div>
            <p className="text-body-sm font-semibold text-ink-900">
              {booking.booking_date
                ? formatDate(booking.booking_date, { style: "long" })
                : "Scheduled"}{" "}
              · {booking.booking_time}
            </p>
            <p className="text-caption text-ink-500">
              {formatCurrency(booking.total_amount)} {t("booking.confirmation.total")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button to={ROUTES.home} leftIcon={Home} size="lg">
          {t("booking.confirmation.home")}
        </Button>
        <Button to={ROUTES.services} variant="outline" size="lg">
          {t("booking.confirmation.more")}
        </Button>
      </div>
    </motion.div>
  );
}

export default ConfirmationStep;
