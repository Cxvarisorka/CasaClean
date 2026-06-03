import { useFormContext, useWatch } from "react-hook-form";
import { ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTranslation } from "@/i18n";
import { computeQuote } from "../utils/pricing";

/*
 * BookingSummary
 * --------------
 * A live order summary that recomputes as the user fills the form (useWatch).
 * Pure derived UI over the pricing engine — it owns no state of its own.
 */

export function BookingSummary() {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const values = useWatch({ control });
  const quote = computeQuote(values);

  return (
    <aside className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft lg:sticky lg:top-24">
      <h3 className="text-heading-sm text-ink-900">{t("booking.quote.title")}</h3>
      <p className="mt-1 text-body-sm text-ink-500">
        {t("booking.quote.subtitle")}
      </p>

      <div className="mt-5 space-y-3 border-t border-ink-100 pt-5">
        {quote.lineItems.length === 0 ? (
          <p className="text-body-sm text-ink-400">
            {t("booking.quote.empty")}
          </p>
        ) : (
          quote.lineItems.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-4 text-body-sm">
              <span className="text-ink-600">{item.label}</span>
              <span className="font-semibold text-ink-900">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-5">
        <span className="text-body-md font-semibold text-ink-900">{t("booking.quote.total")}</span>
        <span className="text-heading-sm font-bold text-brand-700">
          {formatCurrency(quote.total)}
        </span>
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-brand-50/60 p-3.5 text-body-sm text-ink-600">
        <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-brand-600" />
        {t("booking.quote.guarantee")}
      </div>
    </aside>
  );
}

export default BookingSummary;
