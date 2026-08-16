import { describe, expect, it } from "vitest";
import {
  combineDuration,
  durationInMinutes,
  formatDuration,
  formatDurationPlain,
  splitDuration,
} from "./duration";

// A stand-in for the real `t`: renders the English templates so the assertions
// read like what a customer sees, without pulling in the i18n provider.
const templates = {
  "booking.units.duration.hours": "{hours} h",
  "booking.units.duration.hoursMinutes": "{hours} h {minutes} min",
  "booking.units.duration.minutes": "{minutes} min",
};
const t = (key, vars) =>
  templates[key].replace(/\{(\w+)\}/g, (_, name) => vars[name]);

describe("combineDuration", () => {
  it("joins the wizard's two inputs into total minutes", () => {
    expect(combineDuration(1, 0)).toBe(60);
    expect(combineDuration(1, 25)).toBe(85);
    expect(combineDuration(2, 10)).toBe(130);
    expect(combineDuration(3, 45)).toBe(225);
  });

  it("refuses a half-typed or non-numeric pair rather than guessing", () => {
    expect(combineDuration("", 25)).toBeNaN();
    expect(combineDuration(1, "")).toBeNaN();
    expect(combineDuration(1.5, 0)).toBeNaN();
    expect(combineDuration(undefined, undefined)).toBeNaN();
  });

  it("round-trips through splitDuration", () => {
    for (const total of [60, 85, 130, 225, 360]) {
      const { hours, minutes } = splitDuration(total);
      expect(minutes).toBeLessThan(60);
      expect(combineDuration(hours, minutes)).toBe(total);
    }
  });
});

describe("durationInMinutes", () => {
  it("reads the canonical field", () => {
    expect(durationInMinutes({ durationMinutes: 85 })).toBe(85);
  });

  it("falls back to a legacy record's whole/half hours", () => {
    expect(durationInMinutes({ hours: 2 })).toBe(120);
    expect(durationInMinutes({ hours: 1.5 })).toBe(90);
  });

  it("treats a missing or unusable duration as none", () => {
    expect(durationInMinutes({})).toBe(0);
    expect(durationInMinutes(null)).toBe(0);
    expect(durationInMinutes({ durationMinutes: -30 })).toBe(0);
  });
});

describe("formatDuration", () => {
  it("words an exact-minute duration, never a raw minute count", () => {
    expect(formatDuration(t, 85)).toBe("1 h 25 min");
    expect(formatDuration(t, 90)).toBe("1 h 30 min");
    expect(formatDuration(t, 225)).toBe("3 h 45 min");
  });

  it("leaves the minutes out of a whole hour", () => {
    expect(formatDuration(t, 120)).toBe("2 h");
  });

  it("states a sub-hour duration in minutes alone", () => {
    expect(formatDuration(t, 45)).toBe("45 min");
  });

  it("returns nothing for a missing duration, so the caller can omit the line", () => {
    expect(formatDuration(t, 0)).toBe("");
    expect(formatDuration(t, undefined)).toBe("");
    expect(formatDuration(t, NaN)).toBe("");
  });

  it("never shows a decimal, whatever the minute count", () => {
    for (let minutes = 60; minutes <= 360; minutes += 1) {
      expect(formatDuration(t, minutes)).not.toContain(".");
    }
  });
});

describe("formatDurationPlain", () => {
  it("words a duration without a translator, for pure callers", () => {
    expect(formatDurationPlain(85)).toBe("1h 25m");
    expect(formatDurationPlain(120)).toBe("2h");
    expect(formatDurationPlain(45)).toBe("45m");
    expect(formatDurationPlain(0)).toBe("");
  });
});
