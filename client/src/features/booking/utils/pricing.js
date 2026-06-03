import { SERVICES } from "@/data/services";
import { ADDITIONAL_SERVICES } from "../constants";

/*
 * Booking price engine
 * --------------------
 * Pure pricing logic, isolated so it can be unit-tested and reused by the
 * summary, review step and submission payload. Total = base service rate ×
 * hours × cleaners + any selected add-ons.
 */

export function computeQuote(values) {
  const service = SERVICES.find((s) => String(s.id) === String(values.serviceId));
  const rate = service?.pricePerHour ?? 0;
  const hours = Number(values.hours) || 0;
  const cleaners = Number(values.cleaners) || 1;

  const labor = rate * hours * cleaners;

  const addons = (values.additionalServices || []).reduce((sum, id) => {
    const addon = ADDITIONAL_SERVICES.find((a) => a.value === id);
    return sum + (addon?.price ?? 0);
  }, 0);

  const subtotal = labor + addons;

  return {
    service,
    rate,
    hours,
    cleaners,
    labor,
    addons,
    subtotal,
    total: subtotal,
    lineItems: [
      service && {
        label: `${service.name} · ${hours}h × ${cleaners} ${cleaners > 1 ? "cleaners" : "cleaner"}`,
        amount: labor,
      },
      ...(values.additionalServices || []).map((id) => {
        const addon = ADDITIONAL_SERVICES.find((a) => a.value === id);
        return addon && { label: addon.label, amount: addon.price };
      }),
    ].filter(Boolean),
  };
}
