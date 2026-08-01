import { describe, expect, it } from "vitest";
import {
  bookableTimeSlots,
  buildTimeSlots,
  isPastOnDate,
  toMinutes,
  toTimeString,
} from "./timeSlots";

// The reference city from the seed data: 09:00–17:30.
const city = { name: "Rome", workingHourStarts: "09:00", workingHourEnds: "17:30" };

describe("toMinutes / toTimeString", () => {
  it("round-trips valid times", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(toTimeString(570)).toBe("09:30");
    expect(toTimeString(0)).toBe("00:00");
  });

  it("rejects malformed values rather than guessing", () => {
    expect(toMinutes("24:00")).toBeNull();
    expect(toMinutes("9:00")).toBeNull();
    expect(toMinutes("")).toBeNull();
    expect(toMinutes(undefined)).toBeNull();
  });
});

describe("buildTimeSlots", () => {
  it("never offers a start that would run past closing", () => {
    // 09:00-17:30 with a 2h booking -> last valid start is 15:00 (ends 17:00);
    // 16:00 would end at 18:00 and the server would reject it.
    expect(buildTimeSlots({ city, hours: 2 })).toEqual([
      "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
    ]);
  });

  it("offers fewer slots as the booking gets longer", () => {
    const short = buildTimeSlots({ city, hours: 1 });
    const long = buildTimeSlots({ city, hours: 6 });
    expect(short.length).toBeGreaterThan(long.length);
    expect(long).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("excludes the old hardcoded 17:00 slot, which was never bookable", () => {
    // This is the concrete bug the static TIME_SLOTS list shipped: even at the
    // minimum 1h duration, 17:00 ends at 18:00 — past the 17:30 close.
    expect(buildTimeSlots({ city, hours: 1 })).not.toContain("17:00");
  });

  it("honours a non-hour opening time", () => {
    const early = { workingHourStarts: "08:30", workingHourEnds: "12:30" };
    expect(buildTimeSlots({ city: early, hours: 1 })).toEqual([
      "08:30", "09:30", "10:30", "11:30",
    ]);
  });

  it("returns nothing when the duration cannot fit at all", () => {
    expect(buildTimeSlots({ city, hours: 24 })).toEqual([]);
  });

  it("returns nothing for an unknown or malformed city", () => {
    expect(buildTimeSlots({ city: null, hours: 2 })).toEqual([]);
    expect(buildTimeSlots({ city: { workingHourStarts: "x", workingHourEnds: "y" }, hours: 2 })).toEqual([]);
    // Closing before opening is nonsense data, not an all-day window.
    expect(buildTimeSlots({ city: { workingHourStarts: "18:00", workingHourEnds: "09:00" }, hours: 1 })).toEqual([]);
  });

  it("falls back to the plain opening window when no duration is chosen yet", () => {
    expect(buildTimeSlots({ city, hours: 0 })).toContain("17:00");
  });
});

describe("isPastOnDate", () => {
  const now = new Date(2026, 6, 28, 13, 15); // 2026-07-28 13:15 local

  it("flags earlier slots on today only", () => {
    expect(isPastOnDate("09:00", "2026-07-28", now)).toBe(true);
    expect(isPastOnDate("14:00", "2026-07-28", now)).toBe(false);
  });

  it("treats the current minute as already gone, matching the server", () => {
    expect(isPastOnDate("13:15", "2026-07-28", now)).toBe(true);
  });

  it("never flags a future date", () => {
    expect(isPastOnDate("09:00", "2026-07-29", now)).toBe(false);
  });
});

describe("bookableTimeSlots", () => {
  it("drops past slots for a same-day booking", () => {
    const now = new Date(2026, 6, 28, 12, 30);
    const slots = bookableTimeSlots({ city, hours: 2, date: "2026-07-28", now });
    expect(slots).toEqual(["13:00", "14:00", "15:00"]);
  });

  it("keeps the full window for a future date", () => {
    const now = new Date(2026, 6, 28, 12, 30);
    const slots = bookableTimeSlots({ city, hours: 2, date: "2026-07-30", now });
    expect(slots[0]).toBe("09:00");
    expect(slots.at(-1)).toBe("15:00");
  });
});
