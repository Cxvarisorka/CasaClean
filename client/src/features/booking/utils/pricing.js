import { SERVICES } from "@/data/services";

/*
 * Booking price engine
 * --------------------
 * Pure pricing logic, isolated so it can be unit-tested and reused by the
 * summary, review step and submission payload. Total = base service rate ×
 * hours × cleaners + any selected add-ons.
 *
 * The service catalogue and the add-on catalogue are passed in (they come from
 * the database now); `services` defaults to the static list so existing callers
 * and tests keep working, and `addons` defaults to empty.
 */

export function computeQuote(values, { addons = [], services = SERVICES } = {}) {
  const service = services.find(
    (s) => String(s.id) === String(values.serviceId)
  );
  const rate = service?.pricePerHour ?? 0;
  const hours = Number(values.hours) || 0;
  const cleaners = Number(values.cleaners) || 1;

  const labor = rate * hours * cleaners;

  // Resolve the selected add-on ids against the catalogue so prices/labels
  // always reflect the current database values.
  const selectedAddons = (values.additionalServices || [])
    .map((id) => addons.find((a) => a.value === id))
    .filter(Boolean);

  const addonsTotal = selectedAddons.reduce(
    (sum, a) => sum + (Number(a.price) || 0),
    0
  );

  const subtotal = labor + addonsTotal;

  return {
    service,
    rate,
    hours,
    cleaners,
    labor,
    addons: addonsTotal,
    subtotal,
    total: subtotal,
    lineItems: [
      service && {
        label: `${service.name} · ${hours}h × ${cleaners} ${cleaners > 1 ? "cleaners" : "cleaner"}`,
        amount: labor,
      },
      ...selectedAddons.map((a) => ({
        label: a.label,
        amount: Number(a.price) || 0,
      })),
    ].filter(Boolean),
  };
}
