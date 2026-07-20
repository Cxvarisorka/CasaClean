import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({ request: vi.fn() }));

import { request } from "@/services/api";
import { toBookingPayload, createBooking, cancelMyBooking, getMyBookings } from "./bookingApi";

const wizardValues = {
  serviceId: "svc1",
  cityId: "city1",
  street: "Via Roma",
  houseNumber: "12",
  propertySize: 80,
  doorbellName: "Rossi",
  date: "2026-08-01",
  time: "10:00",
  hours: "3",
  cleaners: "2",
  name: "Mario Rossi",
  email: "mario@example.com",
  phone: "+393312345678",
  notes: "",
  additionalServices: ["sr1"],
  cleaningTools: ["ct1"],
};

describe("toBookingPayload", () => {
  test("maps wizard fields onto the camelCase API contract", () => {
    const payload = toBookingPayload(wizardValues);
    expect(payload).toEqual({
      serviceId: "svc1",
      cityId: "city1",
      customerPhone: "+393312345678",
      streetName: "Via Roma",
      houseNumber: "12",
      propertySize: "80", // stringified for the API
      doorbellName: "Rossi",
      bookingDate: "2026-08-01",
      bookingTime: "10:00",
      hours: 3, // numeric
      cleaners: 2,
      notes: null, // empty string -> null
      specialRequests: ["sr1"],
      cleaningTools: ["ct1"],
    });
  });

  test("never sends identity or price fields (server derives them)", () => {
    const payload = toBookingPayload(wizardValues);
    // The API's .strict() schema rejects unknown fields — sending any of these
    // would fail the whole request.
    expect(payload).not.toHaveProperty("name");
    expect(payload).not.toHaveProperty("customerName");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("customerEmail");
    expect(payload).not.toHaveProperty("totalAmount");
  });

  test("defaults optional arrays to empty", () => {
    const payload = toBookingPayload({ ...wizardValues, additionalServices: undefined, cleaningTools: undefined });
    expect(payload.specialRequests).toEqual([]);
    expect(payload.cleaningTools).toEqual([]);
  });

  test("sends intervalDays only for a recurring booking", () => {
    expect(toBookingPayload({ ...wizardValues, intervalDays: 3 })).toMatchObject({
      intervalDays: 3,
    });
    expect(toBookingPayload({ ...wizardValues, intervalDays: 0 })).not.toHaveProperty(
      "intervalDays"
    );
  });
});

describe("createBooking", () => {
  beforeEach(() => {
    request.mockReset();
  });

  test("posts the payload and normalises the response", async () => {
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

    const result = await createBooking(toBookingPayload(wizardValues));

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", url: "/booking" })
    );
    expect(result.id).toBe("CC-DEF456"); // reference from the id tail
    expect(result.total_amount).toBe(152);
    expect(result.status).toBe("confirmed");
    expect(result.simulated).toBeUndefined();
  });

  test("simulates success ONLY when the API is unreachable (status 0)", async () => {
    request.mockRejectedValue({ status: 0, message: "Network Error" });

    const result = await createBooking({
      payload: toBookingPayload(wizardValues),
      display: { customerName: "Mario Rossi", totalAmount: 152 },
    });

    expect(result.simulated).toBe(true);
    expect(result.status).toBe("confirmed");
    expect(result.customer_name).toBe("Mario Rossi");
  });

  test("re-throws real server errors (no fake confirmations)", async () => {
    request.mockRejectedValue({ status: 400, message: "Validation failed!" });
    await expect(createBooking(toBookingPayload(wizardValues)))
      .rejects.toMatchObject({ status: 400 });
  });
});

describe("cancelMyBooking", () => {
  test("PATCHes the cancel endpoint and returns the new status", async () => {
    request.mockResolvedValue({ booking: { _id: "b1", status: "cancelled" } });
    const result = await cancelMyBooking("b1");
    expect(request).toHaveBeenCalledWith({ method: "PATCH", url: "/booking/b1/cancel" });
    expect(result).toEqual({ _id: "b1", status: "cancelled" });
  });
});

describe("getMyBookings", () => {
  test("normalises populated and raw service/city references", async () => {
    request.mockResolvedValue({
      bookings: [
        {
          _id: "abcdefabcdef",
          serviceId: { _id: "svc1", name: "Home Cleaning" }, // populated
          cityId: "city1", // raw id
          bookingDate: "2026-08-01",
          bookingTime: "10:00",
          totalAmount: 100,
          status: "confirmed",
        },
      ],
    });

    const [booking] = await getMyBookings();
    expect(booking.service_id).toBe("svc1");
    expect(booking.city_id).toBe("city1");
    expect(booking.reference).toBe("CC-ABCDEF"); // last 6 chars, uppercased
  });
});
