import { useCallback, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTranslation } from "@/i18n";
import { useServices } from "@/features/services";
import { useAuth } from "@/features/admin/context/AuthContext";
import { computeQuote } from "../utils/pricing";
import { combineDuration, formatDuration } from "../utils/duration";
import { useSpecialRequests } from "../hooks/useSpecialRequests";
import { useCleaningTools } from "../hooks/useCleaningTools";

/*
 * BookingSummary
 * --------------
 * A live order summary that recomputes as the user fills the form (useWatch).
 * Pure derived UI over the pricing engine — it owns no state of its own.
 *
 * The watch is scoped to the fields the price actually depends on, and the
 * quote is memoized. Unscoped, `useWatch({ control })` subscribed this aside to
 * the entire form, so the pricing engine re-ran on every character typed into
 * an address or a name — fields that cannot change the total.
 */

// Exactly the inputs computeQuote reads. Keep in sync with utils/pricing.js.
const PRICING_FIELDS = [
  "serviceId",
  // The duration pair, combined into total minutes below — computeQuote takes
  // the total, but the FORM holds the two fields the customer types.
  "durationHours",
  "durationMins",
  "cleaners",
  "additionalServices",
  "cleaningTools",
];

// Stable identities for the "not loaded yet" case, so a default `= []` doesn't
// hand the memo below a new array on every render.
const NO_ADDONS = [];
const NO_TOOLS = [];

export function BookingSummary() {
  const { t } = useTranslation();
  const { control } = useFormContext();

  const [
    serviceId,
    durationHours,
    durationMins,
    cleaners,
    additionalServices,
    cleaningTools,
  ] = useWatch({ control, name: PRICING_FIELDS });

  const durationMinutes = combineDuration(durationHours, durationMins);

  const { data: addons = NO_ADDONS } = useSpecialRequests();
  const { data: tools = NO_TOOLS } = useCleaningTools();
  const { services } = useServices();
  // How this customer is taxed, as resolved server-side. A verified business is
  // charged the net, and the total shown here has to be the one they'll pay.
  const { tax } = useAuth();

  const formatServiceLabel = useCallback(
    ({ name, durationMinutes: minutes, cleaners: c }) =>
      t("booking.units.serviceLine", {
        name,
        duration: formatDuration(t, minutes),
        cleaners: c,
        unit: t(c > 1 ? "booking.units.cleaners" : "booking.units.cleaner"),
      }),
    [t]
  );

  const quote = useMemo(
    () =>
      computeQuote(
        { serviceId, durationMinutes, cleaners, additionalServices, cleaningTools },
        { addons, tools, services, formatServiceLabel, tax }
      ),
    [
      serviceId,
      durationMinutes,
      cleaners,
      additionalServices,
      cleaningTools,
      addons,
      tools,
      services,
      formatServiceLabel,
      tax,
    ]
  );

  return (
    <aside className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-soft lg:sticky lg:top-24">
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

      {/* Catalogue prices are net, so the total is higher than the lines above
          it — the VAT that made it higher has to be shown, not implied. A
          business relieved of it sees the same breakdown reading 0. */}
      {quote.catalogueVatRate > 0 && (
        <div className="mt-5 space-y-2 border-t border-ink-100 pt-5">
          <div className="flex items-center justify-between gap-4 text-body-sm">
            <span className="text-ink-500">{t("booking.quote.subtotal")}</span>
            <span className="text-ink-700">{formatCurrency(quote.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-body-sm">
            <span className="text-ink-500">
              {quote.reverseCharge
                ? t("booking.quote.vatReverseCharge", {
                    rate: quote.catalogueVatRate,
                  })
                : t("booking.quote.vat", { rate: quote.vatRate })}
            </span>
            <span className="text-ink-700">{formatCurrency(quote.vatAmount)}</span>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-5">
        <span className="text-body-md font-semibold text-ink-900">{t("booking.quote.total")}</span>
        <span className="text-heading-sm font-bold text-brand-700">
          {formatCurrency(quote.total)}
        </span>
      </div>

      {quote.reverseCharge && (
        <p className="mt-2.5 rounded-xl bg-brand-50 px-3.5 py-2.5 text-caption leading-relaxed text-brand-800">
          {t("booking.quote.reverseChargeNote")}
        </p>
      )}

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-ink-200 bg-white p-3.5 text-body-sm text-black">
        <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-black" />
        {t("booking.quote.guarantee")}
      </div>
    </aside>
  );
}

export default BookingSummary;
