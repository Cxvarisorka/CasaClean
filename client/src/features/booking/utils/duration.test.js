import { describe, expect, it } from "vitest";
import { durationMinutes, formatDuration } from "./duration";
import { durationChoices } from "../constants";

// A stand-in for the real `t`: renders the English templates so the assertions
// read like what a customer sees, without pulling in the i18n provider.
const templates = {
  "booking.units.duration.hours": "{hours} h",
  "booking.units.duration.hoursMinutes": "{hours} h {minutes} min",
  "booking.units.duration.minutes": "{minutes} min",
};
const t = (key, vars) =>
  templates[key].replace(/\{(\w+)\}/g, (_, name) => vars[name]);

describe("durationMinutes", () => {
  it("converts halves exactly", () => {
    expect(durationMinutes(1.5)).toBe(90);
    expect(durationMinutes(2)).toBe(120);
  });

  it("treats missing or negative input as no duration", () => {
    expect(durationMinutes(undefined)).toBe(0);
    expect(durationMinutes(-1)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("never shows a decimal hour", () => {
    expect(formatDuration(t, 1.5)).toBe("1 h 30 min");
    expect(formatDuration(t, 3.5)).toBe("3 h 30 min");
  });

  it("leaves the minutes out of a whole hour", () => {
    expect(formatDuration(t, 2)).toBe("2 h");
  });

  it("returns nothing for a missing duration, so the caller can omit the line", () => {
    expect(formatDuration(t, 0)).toBe("");
    expect(formatDuration(t, undefined)).toBe("");
  });
});

describe("durationChoices", () => {
  it("steps by the half hour between the bounds", () => {
    expect(durationChoices()).toEqual([
      1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6,
    ]);
  });

  it("formats every choice without a decimal", () => {
    for (const hours of durationChoices()) {
      expect(formatDuration(t, hours)).not.toContain(".");
    }
  });
});
