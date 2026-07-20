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
  test("total = rate × hours × cleaners + add-ons + tools", () => {
    const quote = computeQuote(
      {
        serviceId: "svc1",
        hours: 3,
        cleaners: 2,
        additionalServices: ["sr1", "sr2"],
        cleaningTools: ["ct1"],
      },
      { addons, tools, services }
    );

    expect(quote.labor).toBe(120); // 20 * 3 * 2
    expect(quote.addons).toBe(27); // 15 + 12
    expect(quote.tools).toBe(5);
    expect(quote.total).toBe(152);
    expect(quote.subtotal).toBe(quote.total);
  });

  test("produces one line item per component", () => {
    const quote = computeQuote(
      { serviceId: "svc2", hours: 2, cleaners: 1, additionalServices: ["sr1"], cleaningTools: ["ct1"] },
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
      { serviceId: "svc1", hours: 1, cleaners: 3 },
      { services }
    );
    expect(quote.lineItems[0].label).toMatch(/3 cleaners$/);
  });

  test("matches service ids loosely (string vs number)", () => {
    const numericCatalogue = [{ id: 7, name: "Office", pricePerHour: 30 }];
    const quote = computeQuote(
      { serviceId: "7", hours: 2, cleaners: 1 },
      { services: numericCatalogue }
    );
    expect(quote.labor).toBe(60);
  });

  test("unknown service yields a zero-labor quote instead of crashing", () => {
    const quote = computeQuote(
      { serviceId: "ghost", hours: 4, cleaners: 2 },
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
        hours: 1,
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

  test("coerces garbage hours to 0 and missing cleaners to 1", () => {
    const quote = computeQuote({ serviceId: "svc1", hours: "junk" }, { services });
    expect(quote.hours).toBe(0);
    expect(quote.cleaners).toBe(1);
    expect(quote.total).toBe(0);
  });
});
