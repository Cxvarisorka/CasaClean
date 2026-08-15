import { describe, test, expect } from "vitest";
import {
  MAX_INTERVAL_DAYS,
  MIN_INTERVAL_DAYS,
  recurrenceChoices,
} from "./constants";

describe("recurrenceChoices", () => {
  test("offers nothing for a service that can't repeat", () => {
    expect(recurrenceChoices(null)).toEqual([]);
    expect(recurrenceChoices({ recurringEnabled: false })).toEqual([]);
    // A stale cadence list on a disabled service must not leak into the picker.
    expect(
      recurrenceChoices({ recurringEnabled: false, recurringIntervalDays: [7] })
    ).toEqual([]);
  });

  test("offers the whole range when the service pins no cadence", () => {
    const choices = recurrenceChoices({ recurringEnabled: true });

    expect(choices).toHaveLength(MAX_INTERVAL_DAYS - MIN_INTERVAL_DAYS + 1);
    expect(choices[0]).toBe(MIN_INTERVAL_DAYS);
    expect(choices.at(-1)).toBe(MAX_INTERVAL_DAYS);
  });

  test("offers only the pinned cadences, deduplicated and sorted", () => {
    expect(
      recurrenceChoices({
        recurringEnabled: true,
        recurringIntervalDays: [14, 7, 7, 1],
      })
    ).toEqual([1, 7, 14]);
  });

  test("drops out-of-range cadences and falls back to the full range if none survive", () => {
    expect(
      recurrenceChoices({
        recurringEnabled: true,
        recurringIntervalDays: [7, 30, 0, 2.5],
      })
    ).toEqual([7]);

    expect(
      recurrenceChoices({ recurringEnabled: true, recurringIntervalDays: [30] })
    ).toHaveLength(MAX_INTERVAL_DAYS - MIN_INTERVAL_DAYS + 1);
  });
});
