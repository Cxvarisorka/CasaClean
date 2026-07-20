import { describe, test, expect } from "vitest";
import { bookingSchema, bookingDefaults } from "./bookingSchema";
import { todayDateString } from "../utils/recurrence";

const todayISO = () => todayDateString();

const validValues = {
  cityId: "city1",
  street: "Via Roma",
  houseNumber: "12",
  propertySize: "80",
  doorbellName: "Rossi",
  serviceId: "svc1",
  hours: 3,
  cleaners: 2,
  additionalServices: [],
  cleaningTools: [],
  date: todayISO(),
  time: "10:00",
  name: "Mario Rossi",
  email: "mario@example.com",
  phone: "+39 331 234 5678",
  notes: "",
};

const errorsOf = (result) =>
  Object.fromEntries(
    (result.error?.issues || []).map((i) => [i.path.join("."), i.message])
  );

describe("bookingSchema", () => {
  test("accepts a complete, valid wizard state", () => {
    const result = bookingSchema.safeParse(validValues);
    expect(result.success).toBe(true);
  });

  test("coerces hours and cleaners from the select-string values", () => {
    const result = bookingSchema.safeParse({ ...validValues, hours: "4", cleaners: "2" });
    expect(result.success).toBe(true);
    expect(result.data.hours).toBe(4);
    expect(result.data.cleaners).toBe(2);
  });

  test("defaults a one-time booking frequency and accepts recurring intervals", () => {
    const oneTime = bookingSchema.safeParse(validValues);
    expect(oneTime.success).toBe(true);
    expect(oneTime.data.intervalDays).toBe(0);

    const recurring = bookingSchema.safeParse({ ...validValues, intervalDays: "7" });
    expect(recurring.success).toBe(true);
    expect(recurring.data.intervalDays).toBe(7);
  });

  test("bounds hours to 1–8 and cleaners to 1–3", () => {
    expect(bookingSchema.safeParse({ ...validValues, hours: 0 }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validValues, hours: 9 }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validValues, cleaners: 0 }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validValues, cleaners: 4 }).success).toBe(false);
  });

  test("rejects a past date but allows today", () => {
    const past = bookingSchema.safeParse({ ...validValues, date: "2020-01-01" });
    expect(past.success).toBe(false);
    expect(errorsOf(past).date).toMatch(/future/i);

    expect(bookingSchema.safeParse({ ...validValues, date: todayISO() }).success).toBe(true);
  });

  test("requires a positive property size", () => {
    const zero = bookingSchema.safeParse({ ...validValues, propertySize: "0" });
    expect(zero.success).toBe(false);
    expect(errorsOf(zero).propertySize).toMatch(/greater than 0/i);
  });

  test("validates the phone format", () => {
    expect(bookingSchema.safeParse({ ...validValues, phone: "not-a-phone" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validValues, phone: "+39 (331) 234-5678" }).success).toBe(true);
  });

  test("validates the email format", () => {
    const bad = bookingSchema.safeParse({ ...validValues, email: "nope" });
    expect(bad.success).toBe(false);
    expect(errorsOf(bad).email).toMatch(/valid email/i);
  });

  test("caps notes at 500 characters", () => {
    expect(bookingSchema.safeParse({ ...validValues, notes: "x".repeat(501) }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...validValues, notes: "x".repeat(500) }).success).toBe(true);
  });

  test("the defaults fail validation until the wizard is filled in", () => {
    // Defaults intentionally start empty; submission must be impossible.
    expect(bookingSchema.safeParse(bookingDefaults).success).toBe(false);
  });
});
