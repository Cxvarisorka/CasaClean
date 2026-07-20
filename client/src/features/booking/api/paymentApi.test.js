import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({ request: vi.fn() }));

import { request } from "@/services/api";
import {
  createBookingIntent,
  finalizeBooking,
  listSavedCards,
  createSetupIntent,
  deleteSavedCard,
  setDefaultCard,
} from "./paymentApi";

beforeEach(() => {
  request.mockReset();
});

describe("createBookingIntent", () => {
  const payload = { serviceId: "svc1", cityId: "city1", hours: 2 };

  test("posts the booking payload without payment flags by default", async () => {
    request.mockResolvedValue({ clientSecret: "cs_1", paymentIntentId: "pi_1" });
    await createBookingIntent({ payload });

    expect(request).toHaveBeenCalledWith({
      method: "POST",
      url: "/payment/booking/intent",
      data: payload,
    });
    const sent = request.mock.calls[0][0].data;
    expect(sent).not.toHaveProperty("savePaymentMethod");
    expect(sent).not.toHaveProperty("savedPaymentMethodId");
  });

  test("adds savePaymentMethod / savedPaymentMethodId only when set", async () => {
    request.mockResolvedValue({});
    await createBookingIntent({ payload, savePaymentMethod: true });
    expect(request.mock.calls[0][0].data.savePaymentMethod).toBe(true);

    await createBookingIntent({ payload, savedPaymentMethodId: "pm_1" });
    expect(request.mock.calls[1][0].data.savedPaymentMethodId).toBe("pm_1");
  });
});

describe("finalizeBooking", () => {
  test("promotes the intent and normalises the booking for the confirmation step", async () => {
    request.mockResolvedValue({
      booking: {
        _id: "abc123def456",
        customerName: "Mario Rossi",
        bookingDate: "2026-08-01",
        bookingTime: "10:00",
        totalAmount: 152,
        status: "confirmed",
      },
    });

    const result = await finalizeBooking("pi_1");

    expect(request).toHaveBeenCalledWith({
      method: "POST",
      url: "/payment/booking/finalize",
      data: { paymentIntentId: "pi_1" },
    });
    expect(result).toEqual({
      _id: "abc123def456",
      id: "CC-DEF456",
      customer_name: "Mario Rossi",
      booking_date: "2026-08-01",
      booking_time: "10:00",
      total_amount: 152,
      status: "confirmed",
    });
  });
});

describe("saved cards", () => {
  test("listSavedCards unwraps the paymentMethods array (and defaults to [])", async () => {
    request.mockResolvedValue({ paymentMethods: [{ id: "pm_1", last4: "4242" }] });
    expect(await listSavedCards()).toEqual([{ id: "pm_1", last4: "4242" }]);

    request.mockResolvedValue(undefined);
    expect(await listSavedCards()).toEqual([]);
  });

  test("createSetupIntent returns just the clientSecret", async () => {
    request.mockResolvedValue({ clientSecret: "seti_secret" });
    expect(await createSetupIntent()).toBe("seti_secret");
    expect(request).toHaveBeenCalledWith({
      method: "POST",
      url: "/payment/methods/setup-intent",
    });
  });

  test("deleteSavedCard / setDefaultCard hit the per-card endpoints", async () => {
    request.mockResolvedValue({});
    await deleteSavedCard("pm_9");
    expect(request).toHaveBeenCalledWith({ method: "DELETE", url: "/payment/methods/pm_9" });

    await setDefaultCard("pm_9");
    expect(request).toHaveBeenCalledWith({ method: "PATCH", url: "/payment/methods/pm_9/default" });
  });
});
