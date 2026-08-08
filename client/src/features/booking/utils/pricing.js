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
 *
 * VAT
 * ---
 * Catalogue prices are VAT-EXCLUSIVE, so the line items sum to a NET subtotal
 * and VAT is added on top of it: €100 of cleaning at 22% is charged as €122. A
 * business whose VAT number the API has verified pays the €100 instead (EU
 * reverse charge). The quote has to show the same total the API will charge —
 * otherwise the wizard quotes €100 and the card is debited €122.
 *
 * `tax` comes from `GET /auth/me` (see AuthContext): the server resolves the
 * treatment, this only applies it. Omitted, it defaults to "no rate configured",
 * where total === subtotal and every existing caller and test is untouched.
 */

// Round through integer cents so the displayed total can't drift from the
// amount the API computes (44.8 * 100 === 4479.999999999999).
const round2 = (amount) => Math.round(Number(amount) * 100) / 100;

export function computeQuote(
  values,
  { addons = [], tools = [], services = SERVICES, formatServiceLabel, tax } = {}
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

  const subtotal = round2(labor + addonsTotal + toolsTotal);

  // Apply the customer's VAT treatment. VAT is added on top of the net subtotal,
  // except under the reverse charge, where the rate charged is 0 and the total
  // is the subtotal itself.
  const catalogueVatRate = Number(tax?.catalogueVatRate) || 0;
  const reverseCharge = Boolean(tax?.reverseCharge) && catalogueVatRate > 0;
  const vatRate = reverseCharge ? 0 : catalogueVatRate;
  const vatAmount = vatRate > 0 ? round2((subtotal * vatRate) / 100) : 0;
  const total = round2(subtotal + vatAmount);

  return {
    service,
    rate,
    hours,
    cleaners,
    labor,
    addons: addonsTotal,
    tools: toolsTotal,
    // Net of VAT — the sum of the catalogue line items above.
    subtotal,
    total,
    // What the summary needs to break the total down: the rate applied, the
    // amount it added, and whether this customer is relieved of it.
    reverseCharge,
    vatRate,
    vatAmount,
    catalogueVatRate,
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
