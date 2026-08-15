import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  apiClient: { request: vi.fn() },
  request: vi.fn(),
}));

import { apiClient, request } from "@/services/api";
import { bookingApi, invoiceApi, subscriptionApi } from "./adminApi";

/** Build one envelope page exactly as the API returns it. */
const page = (key, countKey, items, total) => ({
  data: {
    status: "success",
    [countKey]: total,
    data: { [key]: items },
  },
});

const bookings = (n, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({
    _id: `booking${offset + i}`,
    customerName: `Customer ${offset + i}`,
  }));

beforeEach(() => {
  apiClient.request.mockReset();
  request.mockReset();
});

describe("admin list pagination", () => {
  test("walks every page instead of silently stopping at the first 100", async () => {
    apiClient.request
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(100, 0), 250))
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(100, 100), 250))
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(50, 200), 250));

    const result = await bookingApi.list();

    expect(apiClient.request).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(250);
    expect(result[0]._id).toBe("booking0");
    expect(result.at(-1)._id).toBe("booking249");
  });

  test("requests successive pages with the documented query shape", async () => {
    apiClient.request
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(100, 0), 150))
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(50, 100), 150));

    await bookingApi.list();

    expect(apiClient.request).toHaveBeenNthCalledWith(1, {
      method: "GET",
      url: "/booking?page=1&limit=100",
    });
    expect(apiClient.request).toHaveBeenNthCalledWith(2, {
      method: "GET",
      url: "/booking?page=2&limit=100",
    });
  });

  test("stops after a single request when the first page is short", async () => {
    apiClient.request.mockResolvedValueOnce(
      page("bookings", "bookingCount", bookings(7), 7)
    );

    const result = await bookingApi.list();

    expect(apiClient.request).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(7);
  });

  test("stops when the total lands exactly on a page boundary", async () => {
    // A full page whose count says that's everything must NOT trigger a second
    // request that would return an empty page.
    apiClient.request.mockResolvedValueOnce(
      page("bookings", "bookingCount", bookings(100), 100)
    );

    const result = await bookingApi.list();

    expect(apiClient.request).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(100);
  });

  test("appends the pagination params to a url that already has a query string", async () => {
    apiClient.request.mockResolvedValueOnce(
      page("subscriptions", "subscriptionCount", [], 0)
    );

    await subscriptionApi.list({ status: "paused" });

    expect(apiClient.request).toHaveBeenCalledWith({
      method: "GET",
      url: "/subscription?status=paused&page=1&limit=100",
    });
  });

  test("omits the status param entirely when no filter is active", async () => {
    apiClient.request.mockResolvedValueOnce(
      page("subscriptions", "subscriptionCount", [], 0)
    );

    await subscriptionApi.list();

    expect(apiClient.request).toHaveBeenCalledWith({
      method: "GET",
      url: "/subscription?page=1&limit=100",
    });
  });
});

describe("invoiceApi", () => {
  const apiInvoice = (overrides = {}) => ({
    _id: "inv1",
    number: "CC-2026-000042",
    series: "2026",
    status: "issued",
    issuedAt: "2026-08-07T09:14:00.000Z",
    booking: "68b3f0a1c2d4e5f6a7b8c9d0",
    user: "user1",
    customer: {
      name: "Alessandra Bianchi",
      email: "a.bianchi@example.com",
      phone: "+39 340 118 2299",
      addressLines: ["Via Verdi 118", "Milano"],
    },
    service: {
      name: "Deep cleaning",
      city: "Milano",
      date: "2026-08-14",
      time: "10:00",
      hours: 3,
      cleaners: 2,
    },
    lineItems: [
      { description: "Deep cleaning", detail: "3 h × 2 cleaners", quantity: 6, unitPrice: 24.5, amount: 147 },
    ],
    subtotal: 153.69,
    vatRate: 22,
    vatAmount: 33.81,
    total: 187.5,
    paymentMethod: "card",
    paymentIntentId: "pi_test_1",
    emailedTo: "a.bianchi@example.com",
    emailedAt: "2026-08-07T09:14:05.000Z",
    emailCount: 1,
    ...overrides,
  });

  test("maps the API envelope onto the panel's display shape", async () => {
    apiClient.request.mockResolvedValueOnce(
      page("invoices", "invoiceCount", [apiInvoice()], 1)
    );

    const [invoice] = await invoiceApi.list();

    expect(invoice.number).toBe("CC-2026-000042");
    expect(invoice.customer_name).toBe("Alessandra Bianchi");
    expect(invoice.service_name).toBe("Deep cleaning");
    expect(invoice.vat_rate).toBe(22);
    expect(invoice.total).toBe(187.5);
    expect(invoice.email_count).toBe(1);
    expect(invoice.line_items[0]).toEqual({
      description: "Deep cleaning",
      detail: "3 h × 2 cleaners",
      quantity: 6,
      unit_price: 24.5,
      amount: 147,
    });
    // Derived the same way the Bookings page derives it, so an admin can match
    // an invoice back to the row it came from.
    expect(invoice.booking_reference).toBe("CC-B8C9D0");
  });

  test("survives an invoice with no line items or customer details", async () => {
    apiClient.request.mockResolvedValueOnce(
      page(
        "invoices",
        "invoiceCount",
        [apiInvoice({ lineItems: undefined, customer: undefined, service: undefined })],
        1
      )
    );

    const [invoice] = await invoiceApi.list();

    expect(invoice.line_items).toEqual([]);
    expect(invoice.customer_name).toBe("—");
    expect(invoice.service_name).toBe("—");
    expect(invoice.customer_address).toBe("");
  });

  test("downloads the PDF as a blob and names the file after the invoice", async () => {
    const clicked = [];
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    // jsdom does not implement navigation, so a real <a> click would warn.
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function mockClick() {
        clicked.push({ href: this.href, download: this.download });
      });

    apiClient.request.mockResolvedValueOnce({ data: new Blob(["%PDF-1.3"]) });

    try {
      const filename = await invoiceApi.downloadPdf("inv1", "CC-2026-000042");

      expect(apiClient.request).toHaveBeenCalledWith({
        method: "GET",
        url: "/invoice/inv1/pdf",
        responseType: "blob",
      });
      expect(filename).toBe("invoice-CC-2026-000042.pdf");
      expect(clicked).toHaveLength(1);
      expect(clicked[0].download).toBe("invoice-CC-2026-000042.pdf");
      // The temporary link must not be left in the document.
      expect(document.querySelector("a[download]")).toBeNull();
    } finally {
      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  test("issues an invoice for a booking without mailing the customer on export", async () => {
    request.mockResolvedValueOnce({ invoice: apiInvoice() });

    await invoiceApi.issueForBooking("booking1", { send: false });

    expect(request).toHaveBeenCalledWith({
      method: "POST",
      url: "/invoice/booking/booking1",
      data: { send: false },
    });
  });

  test("resends an invoice with an empty body — the recipient comes from the snapshot", async () => {
    request.mockResolvedValueOnce({ invoice: apiInvoice({ emailCount: 2 }) });

    const invoice = await invoiceApi.resend("inv1");

    expect(request).toHaveBeenCalledWith({
      method: "POST",
      url: "/invoice/inv1/send",
      data: {},
    });
    expect(invoice.email_count).toBe(2);
  });
});
