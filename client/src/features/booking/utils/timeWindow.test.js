import { describe, expect, it } from "vitest";
import {
  describeDurationIssue,
  describeTimeIssue,
  earliestBookableDate,
  isPastOnDate,
  meetsAdvanceNotice,
  remainingMinutes,
  startWindow,
  toMinutes,
  toTimeString,
} from "./timeWindow";

// The reference city from the seed data: 09:00–17:30.
const city = { name: "Rome", workingHourStarts: "09:00", workingHourEnds: "17:30" };
// The specification's worked example city.
const nineToFive = { name: "Milano", workingHourStarts: "09:00", workingHourEnds: "17:00" };

// A service that sells same-day slots, and one that doesn't.
const instant = { allowInstantBooking: true };
const scheduled = { allowInstantBooking: false };

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
    expect(startWindow({ city, durationMinutes: 120 })).toEqual({
      earliest: "09:00",
      latest: "15:30",
    });
  });

  it("accounts for an exact-minute duration", () => {
    expect(startWindow({ city, durationMinutes: 85 })).toEqual({
      earliest: "09:00",
      latest: "16:05",
    });
  });

  it("shrinks as the booking gets longer", () => {
    expect(startWindow({ city, durationMinutes: 60 }).latest).toBe("16:30");
    expect(startWindow({ city, durationMinutes: 360 }).latest).toBe("11:30");
  });

  it("honours a non-hour opening time", () => {
    const early = { workingHourStarts: "08:30", workingHourEnds: "12:30" };
    expect(startWindow({ city: early, durationMinutes: 60 })).toEqual({
      earliest: "08:30",
      latest: "11:30",
    });
  });

  it("returns null when the booking cannot fit at all", () => {
    expect(startWindow({ city, durationMinutes: 720 })).toBeNull();
  });

  it("returns null for an unknown, malformed or duration-less input", () => {
    expect(startWindow({ city: null, durationMinutes: 120 })).toBeNull();
    expect(
      startWindow({ city: { workingHourStarts: "x", workingHourEnds: "y" }, durationMinutes: 120 })
    ).toBeNull();
    // Closing before opening is nonsense data, not an all-day window.
    expect(
      startWindow({ city: { workingHourStarts: "18:00", workingHourEnds: "09:00" }, durationMinutes: 60 })
    ).toBeNull();
    expect(startWindow({ city, durationMinutes: 0 })).toBeNull();
    expect(startWindow({ city, durationMinutes: NaN })).toBeNull();
  });
});

describe("remainingMinutes", () => {
  it("reports how much of the working day is left after the chosen start", () => {
    // The specification's example: 15:00 in a city closing at 17:00.
    expect(remainingMinutes({ city: nineToFive, time: "15:00" })).toBe(120);
    expect(remainingMinutes({ city: nineToFive, time: "16:30" })).toBe(30);
    expect(remainingMinutes({ city, time: "15:00" })).toBe(150);
  });

  it("returns null when the city or the start is unknown", () => {
    expect(remainingMinutes({ city: null, time: "15:00" })).toBeNull();
    expect(remainingMinutes({ city, time: "" })).toBeNull();
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

describe("meetsAdvanceNotice", () => {
  // 16 August 2026 at 15:00, the specification's worked example.
  const now = new Date(2026, 7, 16, 15, 0);

  it("accepts a start exactly 48 hours out", () => {
    expect(meetsAdvanceNotice("2026-08-18", "15:00", now)).toBe(true);
  });

  it("rejects 47 h 59 m", () => {
    expect(meetsAdvanceNotice("2026-08-18", "14:59", now)).toBe(false);
  });

  it("measures the clock, not the calendar day", () => {
    expect(meetsAdvanceNotice("2026-08-18", "09:00", now)).toBe(false);
    expect(meetsAdvanceNotice("2026-08-19", "09:00", now)).toBe(true);
  });
});

describe("earliestBookableDate", () => {
  const now = new Date(2026, 7, 16, 15, 0);

  it("is two days out for an ordinary service", () => {
    expect(earliestBookableDate({ service: scheduled, now })).toBe("2026-08-18");
    // A service that hasn't been chosen yet is held to the notice too.
    expect(earliestBookableDate({ service: null, now })).toBe("2026-08-18");
  });

  it("is today for a service that allows instant booking", () => {
    expect(earliestBookableDate({ service: instant, now })).toBe("2026-08-16");
  });
});

describe("describeTimeIssue", () => {
  const future = "2026-07-30";
  const now = new Date(2026, 6, 28, 12, 30); // 2026-07-28 12:30 local

  const issue = (over) =>
    describeTimeIssue({
      city,
      service: instant, // the notice rule is exercised on its own below
      durationMinutes: 120,
      date: future,
      now,
      ...over,
    });

  it("accepts any minute inside the window, not just whole hours", () => {
    expect(issue({ time: "12:20" })).toBeNull();
    expect(issue({ time: "15:35", durationMinutes: 60 })).toBeNull();
    expect(issue({ time: "09:00" })).toBeNull();
    expect(issue({ time: "15:30" })).toBeNull(); // ends exactly at closing
    expect(issue({ time: "16:05", durationMinutes: 85 })).toBeNull();
  });

  it("stays quiet for a time that hasn't been entered yet", () => {
    expect(issue({ time: "" })).toBeNull();
    expect(issue({ time: undefined })).toBeNull();
  });

  it("rejects a start outside the opening hours", () => {
    expect(issue({ time: "08:45" })).toMatchObject({ code: "outsideHours" });
    expect(issue({ time: "17:30" })).toMatchObject({ code: "outsideHours" });
  });

  it("names the duration when the visit would run past closing", () => {
    // 16:00 is inside 09:00-17:30 but a 2h booking from there ends at 18:00.
    expect(issue({ time: "16:00" })).toMatchObject({
      code: "durationExceeds",
      params: { latest: "15:30", close: "17:30", remaining: 90 },
    });
  });

  it("rejects a duration that overruns closing by a single minute", () => {
    // The specification's boundary, on a 09:00-17:00 city.
    const at15 = (durationMinutes) =>
      issue({ city: nineToFive, time: "15:00", durationMinutes });

    expect(at15(60)).toBeNull();
    expect(at15(85)).toBeNull();
    expect(at15(120)).toBeNull();
    expect(at15(121)).toMatchObject({ code: "durationExceeds" });
    expect(at15(180)).toMatchObject({ code: "durationExceeds" });
  });

  it("distinguishes a duration that fits nowhere from a start that is too late", () => {
    expect(issue({ time: "09:00", durationMinutes: 720 })).toMatchObject({
      code: "noRoom",
    });
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

  describe("advance notice", () => {
    // 16 August 2026 at 15:00; the city is open all day so only the notice and
    // the past-start rules can fire.
    const allDay = { name: "Roma", workingHourStarts: "00:00", workingHourEnds: "23:59" };
    const noticeNow = new Date(2026, 7, 16, 15, 0);
    const check = (over) =>
      describeTimeIssue({
        city: allDay,
        service: scheduled,
        durationMinutes: 60,
        now: noticeNow,
        ...over,
      });

    it("accepts a start exactly 48 hours out", () => {
      expect(check({ date: "2026-08-18", time: "15:00" })).toBeNull();
    });

    it("rejects 47 h 59 m and names the earliest slot", () => {
      expect(check({ date: "2026-08-18", time: "14:59" })).toMatchObject({
        code: "tooSoon",
        params: { hours: 48, earliestDate: "2026-08-18", earliestTime: "15:00" },
      });
    });

    it("waives the notice for a service that allows instant booking", () => {
      expect(check({ service: instant, date: "2026-08-16", time: "16:00" })).toBeNull();
    });

    it("still refuses an instant start that has already passed", () => {
      expect(check({ service: instant, date: "2026-08-16", time: "08:00" })).toMatchObject({
        code: "past",
      });
    });

    it("still holds an instant booking to the city's closing time", () => {
      const check17 = (durationMinutes) =>
        describeTimeIssue({
          city: nineToFive,
          service: instant,
          durationMinutes,
          date: "2026-08-16",
          time: "15:30",
          now: noticeNow,
        });

      expect(check17(90)).toBeNull();
      expect(check17(91)).toMatchObject({ code: "durationExceeds" });
    });
  });
});

describe("describeDurationIssue", () => {
  it("reports a visit longer than the city's whole working day", () => {
    // Rome is open 8.5 hours; a 12-hour visit can never fit, whatever the start.
    expect(describeDurationIssue({ city, durationMinutes: 720 })).toMatchObject({
      code: "noRoom",
      params: { city: "Rome", open: "09:00", close: "17:30" },
    });
  });

  it("stays quiet for a duration the day can hold", () => {
    expect(describeDurationIssue({ city, durationMinutes: 480 })).toBeNull();
    expect(describeDurationIssue({ city, durationMinutes: 85 })).toBeNull();
  });

  it("stays quiet before a city is chosen or a duration is complete", () => {
    expect(describeDurationIssue({ city: null, durationMinutes: 720 })).toBeNull();
    expect(describeDurationIssue({ city, durationMinutes: NaN })).toBeNull();
    expect(describeDurationIssue({ city, durationMinutes: 30 })).toBeNull();
  });
});
