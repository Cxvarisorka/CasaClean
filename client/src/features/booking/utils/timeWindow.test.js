import { describe, expect, it } from "vitest";
import {
  describeTimeIssue,
  isPastOnDate,
  startWindow,
  toMinutes,
  toTimeString,
} from "./timeWindow";

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

describe("startWindow", () => {
  it("ends the window early enough to finish before closing", () => {
    // 09:00-17:30 with a 2h booking -> the last start that still finishes in
    // time is 15:30 (ends 17:30 exactly).
    expect(startWindow({ city, hours: 2 })).toEqual({
      earliest: "09:00",
      latest: "15:30",
    });
  });

  it("accounts for a half-hour duration to the minute", () => {
    expect(startWindow({ city, hours: 1.5 })).toEqual({
      earliest: "09:00",
      latest: "16:00",
    });
  });

  it("shrinks as the booking gets longer", () => {
    expect(startWindow({ city, hours: 1 }).latest).toBe("16:30");
    expect(startWindow({ city, hours: 6 }).latest).toBe("11:30");
  });

  it("honours a non-hour opening time", () => {
    const early = { workingHourStarts: "08:30", workingHourEnds: "12:30" };
    expect(startWindow({ city: early, hours: 1 })).toEqual({
      earliest: "08:30",
      latest: "11:30",
    });
  });

  it("returns null when the booking cannot fit at all", () => {
    expect(startWindow({ city, hours: 12 })).toBeNull();
  });

  it("returns null for an unknown, malformed or duration-less input", () => {
    expect(startWindow({ city: null, hours: 2 })).toBeNull();
    expect(startWindow({ city: { workingHourStarts: "x", workingHourEnds: "y" }, hours: 2 })).toBeNull();
    // Closing before opening is nonsense data, not an all-day window.
    expect(startWindow({ city: { workingHourStarts: "18:00", workingHourEnds: "09:00" }, hours: 1 })).toBeNull();
    expect(startWindow({ city, hours: 0 })).toBeNull();
  });
});

describe("isPastOnDate", () => {
  const now = new Date(2026, 6, 28, 13, 15); // 2026-07-28 13:15 local

  it("flags earlier times on today only", () => {
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

describe("describeTimeIssue", () => {
  const future = "2026-07-30";
  const now = new Date(2026, 6, 28, 12, 30); // 2026-07-28 12:30 local

  const issue = (over) =>
    describeTimeIssue({ city, hours: 2, date: future, now, ...over });

  it("accepts any minute inside the window, not just whole hours", () => {
    expect(issue({ time: "12:20" })).toBeNull();
    expect(issue({ time: "15:35", hours: 1 })).toBeNull();
    expect(issue({ time: "09:00" })).toBeNull();
    expect(issue({ time: "15:30" })).toBeNull(); // ends exactly at closing
  });

  it("stays quiet for a time that hasn't been entered yet", () => {
    expect(issue({ time: "" })).toBeNull();
    expect(issue({ time: undefined })).toBeNull();
  });

  it("rejects a start outside the opening hours", () => {
    expect(issue({ time: "08:45" })).toMatchObject({ code: "outsideHours" });
    expect(issue({ time: "17:30" })).toMatchObject({ code: "outsideHours" });
  });

  it("rejects a start that would run past closing, and says how late is late", () => {
    // 16:00 is inside 09:00-17:30 but a 2h booking from there ends at 18:00.
    expect(issue({ time: "16:00" })).toMatchObject({
      code: "tooLate",
      params: { latest: "15:30", close: "17:30" },
    });
  });

  it("distinguishes a duration that fits nowhere from a start that is too late", () => {
    expect(issue({ time: "09:00", hours: 12 })).toMatchObject({ code: "noRoom" });
  });

  it("rejects a same-day start that has already passed", () => {
    expect(issue({ time: "10:00", date: "2026-07-28" })).toMatchObject({ code: "past" });
    expect(issue({ time: "14:00", date: "2026-07-28" })).toBeNull();
  });

  it("reports a missing city rather than silently accepting the time", () => {
    expect(issue({ time: "10:00", city: null })).toMatchObject({ code: "noCity" });
  });

  it("rejects a malformed time", () => {
    expect(issue({ time: "25:00" })).toMatchObject({ code: "invalid" });
  });
});
