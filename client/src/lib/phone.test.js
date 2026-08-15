import { describe, test, expect } from "vitest";
import { COUNTRIES, isValidPhone, joinPhone, normalizePhone, splitPhone } from "./phone";

describe("normalizePhone", () => {
  test("strips grouping punctuation and rewrites 00 as +", () => {
    expect(normalizePhone(" +39 331 234-5678 ")).toBe("+393312345678");
    expect(normalizePhone("0039 331 2345678")).toBe("+393312345678");
  });
});

describe("isValidPhone", () => {
  test("mirrors the server's rule", () => {
    expect(isValidPhone("+393312345678")).toBe(true);
    expect(isValidPhone("+995 555 12 34 56")).toBe(true);
    expect(isValidPhone("3312345678")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });
});

describe("splitPhone", () => {
  test("reads the country out of a stored number", () => {
    expect(splitPhone("+393312345678")).toEqual({
      country: "IT",
      dialCode: "+39",
      national: "3312345678",
    });
    expect(splitPhone("+995555123456")).toEqual({
      country: "GE",
      dialCode: "+995",
      national: "555123456",
    });
  });

  // +389 (North Macedonia) must not be read as +39 (Italy) with a stray 9.
  test("prefers the longest matching dial code", () => {
    expect(splitPhone("+38970123456").country).toBe("MK");
  });

  test("falls back to the given country for a number with no prefix", () => {
    expect(splitPhone("3312345678", "GE")).toEqual({
      country: "GE",
      dialCode: "+995",
      national: "3312345678",
    });
  });

  // The reason for the "Other" entry: a number from outside the list has to
  // survive a round trip through the field unchanged.
  test("keeps an unlisted country code intact under 'Other'", () => {
    const parsed = splitPhone("+12125550123");

    expect(parsed.country).toBe("OTHER");
    expect(joinPhone(parsed.dialCode, parsed.national)).toBe("+12125550123");
  });
});

describe("joinPhone", () => {
  test("puts the prefix and the national number back together", () => {
    expect(joinPhone("+39", "331 234 5678")).toBe("+393312345678");
  });

  // An optional field must stay empty when the customer only opened the picker,
  // rather than submitting a lone "+39".
  test("returns an empty string when there is no national number", () => {
    expect(joinPhone("+39", "")).toBe("");
    expect(joinPhone("+39", undefined)).toBe("");
  });
});

describe("COUNTRIES", () => {
  test("leads with the two home markets and offers an escape hatch", () => {
    expect(COUNTRIES[0].code).toBe("IT");
    expect(COUNTRIES[1].code).toBe("GE");
    expect(COUNTRIES.at(-1).code).toBe("OTHER");
  });

  test("has no duplicate codes and every dial code is well formed", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);

    for (const country of COUNTRIES) {
      expect(country.dialCode).toMatch(/^\+\d*$/);
    }
  });

  // Every listed prefix has to round-trip, or picking that country would
  // silently rewrite the number the customer typed.
  test("every dial code parses back to its own country", () => {
    for (const country of COUNTRIES) {
      if (country.code === "OTHER") continue;

      const full = joinPhone(country.dialCode, "1234567");
      expect(splitPhone(full).country).toBe(country.code);
    }
  });
});
