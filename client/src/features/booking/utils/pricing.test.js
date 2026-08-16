import { describe, test, expect } from "vitest";
import { computeQuote } from "./pricing";

// Database-shaped catalogues, as the wizard receives them.
const services = [
  { id: "svc1", name: "Home Cleaning", pricePerHour: 20 },
  { id: "svc2", name: "Deep Cleaning", pricePerHour: 25 },
];
const addons = [
  { value: "sr1", label: "Fridge Cleaning", price: 15 },
  { value: "sr2", label: "Inside Oven", price: 12 },
];
const tools = [
  { value: "ct1", label: "Vacuum Cleaner", price: 5 },
];

describe("computeQuote", () => {
  test("total = rate pro-rated over the booked minutes × cleaners + add-ons + tools", () => {
    const quote = computeQuote(
      {
        serviceId: "svc1",
        durationMinutes: 180,
        cleaners: 2,
        additionalServices: ["sr1", "sr2"],
        cleaningTools: ["ct1"],
      },
      { addons, tools, services }
    );

    expect(quote.labor).toBe(120); // 20/h over 180 min x 2 cleaners
    expect(quote.addons).toBe(27); // 15 + 12
    expect(quote.tools).toBe(5);
    expect(quote.total).toBe(152);
    expect(quote.subtotal).toBe(quote.total);
  });

  test("produces one line item per component", () => {
    const quote = computeQuote(
      { serviceId: "svc2", durationMinutes: 120, cleaners: 1, additionalServices: ["sr1"], cleaningTools: ["ct1"] },
      { addons, tools, services }
    );
    expect(quote.lineItems).toHaveLength(3);
    expect(quote.lineItems[0].label).toMatch(/Deep Cleaning · 2h × 1 cleaner$/);
    expect(quote.lineItems[0].amount).toBe(50);
    expect(quote.lineItems[1]).toEqual({ label: "Fridge Cleaning", amount: 15 });
    expect(quote.lineItems[2]).toEqual({ label: "Vacuum Cleaner", amount: 5 });
  });

  test("pluralizes the cleaners label", () => {
    const quote = computeQuote(
      { serviceId: "svc1", durationMinutes: 60, cleaners: 3 },
      { services }
    );
    expect(quote.lineItems[0].label).toMatch(/3 cleaners$/);
  });

  test("matches service ids loosely (string vs number)", () => {
    const numericCatalogue = [{ id: 7, name: "Office", pricePerHour: 30 }];
    const quote = computeQuote(
      { serviceId: "7", durationMinutes: 120, cleaners: 1 },
      { services: numericCatalogue }
    );
    expect(quote.labor).toBe(60);
  });

  test("unknown service yields a zero-labor quote instead of crashing", () => {
    const quote = computeQuote(
      { serviceId: "ghost", durationMinutes: 240, cleaners: 2 },
      { services }
    );
    expect(quote.rate).toBe(0);
    expect(quote.labor).toBe(0);
    expect(quote.total).toBe(0);
    expect(quote.lineItems).toHaveLength(0);
  });

  test("ignores selected add-on/tool ids missing from the live catalogue", () => {
    const quote = computeQuote(
      {
        serviceId: "svc1",
        durationMinutes: 60,
        cleaners: 1,
        additionalServices: ["sr1", "deleted-addon"],
        cleaningTools: ["deleted-tool"],
      },
      { addons, tools, services }
    );
    expect(quote.addons).toBe(15);
    expect(quote.tools).toBe(0);
    expect(quote.total).toBe(35);
  });

  test("coerces a garbage duration to 0 and missing cleaners to 1", () => {
    const quote = computeQuote({ serviceId: "svc1", durationMinutes: "junk" }, { services });
    expect(quote.durationMinutes).toBe(0);
    expect(quote.cleaners).toBe(1);
    expect(quote.total).toBe(0);
  });

  test("pro-rates the hourly rate over an exact number of minutes", () => {
    // 85 minutes at 20/h is 28.3333... - the quote has to land on the same cent
    // the API charges, which means integer-cent maths and one rounding.
    const quote = computeQuote(
      { serviceId: "svc1", durationMinutes: 85, cleaners: 1 },
      { services }
    );
    expect(quote.labor).toBe(28.33);
    expect(quote.total).toBe(28.33);
  });

  test("rounds the labour once, for the whole crew", () => {
    // Rounding per cleaner and then doubling would give 56.66.
    const quote = computeQuote(
      { serviceId: "svc1", durationMinutes: 85, cleaners: 2 },
      { services }
    );
    expect(quote.labor).toBe(56.67);
  });

  test("keeps a fractional catalogue rate cent-exact", () => {
    const quote = computeQuote(
      { serviceId: "svcx", durationMinutes: 130, cleaners: 1 },
      { services: [{ id: "svcx", name: "X", pricePerHour: 19.9 }] }
    );
    expect(quote.labor).toBe(43.12);
  });

  test("words an exact-minute duration in the labour line", () => {
    const quote = computeQuote(
      { serviceId: "svc1", durationMinutes: 85, cleaners: 1 },
      { services }
    );
    expect(quote.lineItems[0].label).toMatch(/1h 25m × 1 cleaner$/);
  });
});

/*
 * VAT
 * ---
 * Catalogue prices are VAT-exclusive, so VAT is added on top of the line items:
 * a €120 booking is charged at €146.40. A business whose VAT number the API has
 * verified pays the €120. The wizard has to show whichever number the API is
 * about to charge.
 *
 * The `tax` block comes from GET /auth/me: the server resolves the treatment,
 * this engine only applies it.
 */
describe("computeQuote — VAT treatment", () => {
  const values = { serviceId: "svc1", durationMinutes: 180, cleaners: 2 }; // 120 net
  const reverseCharge = { reverseCharge: true, catalogueVatRate: 22 };

  test("an individual pays the catalogue price PLUS VAT", () => {
    const quote = computeQuote(values, {
      services,
      tax: { reverseCharge: false, catalogueVatRate: 22 },
    });

    expect(quote.subtotal).toBe(120);
    expect(quote.vatRate).toBe(22);
    expect(quote.vatAmount).toBe(26.4);
    expect(quote.total).toBe(146.4);
    expect(quote.reverseCharge).toBe(false);
  });

  test("a verified business is quoted the catalogue price, with no VAT added", () => {
    const quote = computeQuote(values, { services, tax: reverseCharge });

    expect(quote.total).toBe(120);
    expect(quote.subtotal).toBe(120);
    expect(quote.vatAmount).toBe(0);
    expect(quote.vatRate).toBe(0);
    // Still reported, so the summary can label the zero line.
    expect(quote.catalogueVatRate).toBe(22);
    expect(quote.reverseCharge).toBe(true);
  });

  test("add-ons and tools are inside the amount the VAT is added to", () => {
    const quote = computeQuote(
      { ...values, additionalServices: ["sr1"], cleaningTools: ["ct1"] },
      {
        addons,
        tools,
        services,
        tax: { reverseCharge: false, catalogueVatRate: 22 },
      }
    );

    // 120 + 15 + 5 = 140 net -> 170.80 charged.
    expect(quote.subtotal).toBe(140);
    expect(quote.total).toBe(170.8);

    // And the relieved customer pays the 140 flat.
    const business = computeQuote(
      { ...values, additionalServices: ["sr1"], cleaningTools: ["ct1"] },
      { addons, tools, services, tax: reverseCharge }
    );
    expect(business.total).toBe(140);
  });

  test("is a no-op without a tax block, so existing callers are unaffected", () => {
    expect(computeQuote(values, { services }).total).toBe(120);
  });

  test("ignores a reverse charge claim when no VAT rate is configured", () => {
    // Nothing is added, so a business pays the catalogue price like everyone
    // else, matching the server's own collapse to the standard rule.
    const quote = computeQuote(values, {
      services,
      tax: { reverseCharge: true, catalogueVatRate: 0 },
    });

    expect(quote.total).toBe(120);
    expect(quote.reverseCharge).toBe(false);
  });

  test("rounds to whole cents so the display cannot drift from the charge", () => {
    // 44.80 net at 22% -> 54.66 (not 54.655999...).
    const quote = computeQuote(
      { serviceId: "svc1", durationMinutes: 60, cleaners: 1 },
      {
        services: [{ id: "svc1", name: "X", pricePerHour: 44.8 }],
        tax: { reverseCharge: false, catalogueVatRate: 22 },
      }
    );

    expect(quote.total).toBe(54.66);
    expect(Number.isInteger(Math.round(quote.total * 100))).toBe(true);
  });
});
