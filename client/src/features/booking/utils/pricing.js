import { SERVICES } from "@/data/services";

/*
 * Booking price engine
 * --------------------
 * Pure pricing logic, isolated so it can be unit-tested and reused by the
 * summary, review step and submission payload. Total = base service rate ×
 * hours × cleaners + any selected add-ons + any requested cleaning tools.
 *
 * The service, add-on and tool catalogues are passed in (they come from the
 * database now); `services` defaults to the static list so existing callers
 * and tests keep working, and `addons`/`tools` default to empty.
 *
 * `formatServiceLabel` is an optional hook the UI passes to localize the labor
 * line item (`{ name, hours, cleaners } → string`). When omitted the original
 * English label is produced, so pure callers and unit tests are unaffected.
 */

export function computeQuote(
  values,
  { addons = [], tools = [], services = SERVICES, formatServiceLabel } = {}
) {
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

  // Same resolution for the requested cleaning tools (mop, vacuum, …) — each
  // adds its flat surcharge from the live catalogue.
  const selectedTools = (values.cleaningTools || [])
    .map((id) => tools.find((t) => t.value === id))
    .filter(Boolean);

  const toolsTotal = selectedTools.reduce(
    (sum, t) => sum + (Number(t.price) || 0),
    0
  );

  const subtotal = labor + addonsTotal + toolsTotal;

  return {
    service,
    rate,
    hours,
    cleaners,
    labor,
    addons: addonsTotal,
    tools: toolsTotal,
    subtotal,
    total: subtotal,
    lineItems: [
      service && {
        label: formatServiceLabel
          ? formatServiceLabel({ name: service.name, hours, cleaners })
          : `${service.name} · ${hours}h × ${cleaners} ${cleaners > 1 ? "cleaners" : "cleaner"}`,
        amount: labor,
      },
      ...selectedAddons.map((a) => ({
        label: a.label,
        amount: Number(a.price) || 0,
      })),
      ...selectedTools.map((t) => ({
        label: t.label,
        amount: Number(t.price) || 0,
      })),
    ].filter(Boolean),
  };
}
