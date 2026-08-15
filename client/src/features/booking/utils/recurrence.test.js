import { describe, expect, test } from "vitest";
import {
  addDaysToDateString,
  localDateFromDateString,
} from "./recurrence";

describe("recurrence calendar dates", () => {
  test("adds days with local calendar construction across month boundaries", () => {
    expect(addDaysToDateString("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysToDateString("2028-02-28", 1)).toBe("2028-02-29");
  });

  test("does not accept an invalid YYYY-MM-DD date", () => {
    expect(localDateFromDateString("2026-02-30")).toBeNull();
    expect(addDaysToDateString("2026-02-30", 1)).toBeNull();
  });
});
