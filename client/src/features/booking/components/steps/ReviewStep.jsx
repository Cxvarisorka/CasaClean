import { useFormContext, useWatch } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { CITIES } from "@/data/cities";
import { useBookingNav } from "../../store/BookingContext";
import { computeQuote } from "../../utils/pricing";
import { ADDITIONAL_SERVICES, SUPPLY_OPTIONS } from "../../constants";

/*
 * ReviewStep
 * ----------
 * Step 5 — a final, readable summary before submission. Each group links back
 * to its step (edit affordance), and the live quote is restated. A submission
 * error from the mutation surfaces here.
 */

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-body-sm">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-900">{value}</span>
    </div>
  );
}

function Group({ title, stepIndex, children }) {
  const { goTo } = useBookingNav();
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-body-md font-semibold text-ink-900">{title}</h3>
        <button
          type="button"
          onClick={() => goTo(stepIndex)}
          className="text-body-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Edit
        </button>
      </div>
      <div className="mt-2 divide-y divide-ink-50">{children}</div>
    </div>
  );
}

export function ReviewStep({ submitError }) {
  const { control } = useFormContext();
  const v = useWatch({ control });
  const quote = computeQuote(v);

  const city = CITIES.find((c) => String(c.id) === String(v.cityId))?.name;
  const addonLabels = (v.additionalServices || [])
    .map((id) => ADDITIONAL_SERVICES.find((a) => a.value === id)?.label)
    .filter(Boolean)
    .join(", ");
  const supplyLabels = (v.supplies || [])
    .map((id) => SUPPLY_OPTIONS.find((s) => s.value === id)?.label)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4">
      <Group title="Property" stepIndex={0}>
        <Row label="Address" value={`${v.street} ${v.houseNumber}, ${city || ""}`} />
        <Row label="Size" value={v.propertySize ? `${v.propertySize} m²` : null} />
        <Row label="Doorbell" value={v.doorbellName} />
      </Group>

      <Group title="Cleaning" stepIndex={1}>
        <Row label="Service" value={quote.service?.name} />
        <Row label="Duration" value={`${v.hours}h × ${v.cleaners} cleaner${v.cleaners > 1 ? "s" : ""}`} />
        <Row label="Add-ons" value={addonLabels || "None"} />
        <Row label="Supplies" value={supplyLabels || "Host provides"} />
      </Group>

      <Group title="Schedule" stepIndex={2}>
        <Row label="Date" value={v.date ? formatDate(v.date, { style: "long" }) : null} />
        <Row label="Time" value={v.time} />
      </Group>

      <Group title="Contact" stepIndex={3}>
        <Row label="Name" value={v.name} />
        <Row label="Email" value={v.email} />
        <Row label="Phone" value={v.phone} />
        <Row label="Notes" value={v.notes} />
      </Group>

      {/* Total */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="space-y-2">
          {quote.lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-body-sm text-black">
              <span>{item.label}</span>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3">
          <span className="text-body-md font-semibold text-black">Total due</span>
          <span className="text-heading-sm font-bold text-black">
            {formatCurrency(quote.total)}
          </span>
        </div>
      </div>

      {submitError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-body-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
          {submitError.message || "We couldn't submit your booking. Please try again."}
        </div>
      )}
    </div>
  );
}

export default ReviewStep;
