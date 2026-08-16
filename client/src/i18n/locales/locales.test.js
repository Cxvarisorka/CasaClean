import { describe, expect, it } from "vitest";
import en from "./en";
import italian from "./it";
import ka from "./ka";
import ru from "./ru";
import el from "./el";

/*
 * Locale structure
 * ----------------
 * English is the source of truth and every other locale mirrors its shape. A
 * missing key silently falls back to English, which is a tolerable gap — but a
 * key landing in the WRONG BLOCK is not: it clobbers whatever was there, and
 * the fallback can't help because the key still resolves, just to the wrong
 * string. That is exactly the mistake these tests exist to catch.
 *
 * They also pin the interpolation placeholders, so a translation can't drop the
 * {hours} out of a duration and render "h" on its own.
 */

const LOCALES = { it: italian, ka, ru, el };

/** Every leaf path in a locale tree, as dotted keys. */
const paths = (node, prefix = "") =>
  Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object" && !Array.isArray(value)
      ? paths(value, path)
      : [path];
  });

const at = (node, path) =>
  path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), node);

/** The {placeholders} a template interpolates, as a sorted list. */
const placeholders = (value) =>
  typeof value === "string"
    ? [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    : [];

const enPaths = paths(en);

describe("locale structure", () => {
  it.each(Object.keys(LOCALES))("%s introduces no key English doesn't have", (name) => {
    // A key here that English lacks is almost always a paste into the wrong
    // block — the case that silently overwrites a real translation.
    const extra = paths(LOCALES[name]).filter((path) => !enPaths.includes(path));
    expect(extra).toEqual([]);
  });

  it.each(Object.keys(LOCALES))("%s keeps every key a leaf where English does", (name) => {
    const mistyped = enPaths.filter((path) => {
      const value = at(LOCALES[name], path);
      // Absent is fine (it falls back); an object where a string belongs is not.
      return value != null && typeof value === "object" && !Array.isArray(value);
    });
    expect(mistyped).toEqual([]);
  });

  it.each(Object.keys(LOCALES))("%s interpolates the same placeholders", (name) => {
    const drifted = enPaths
      .filter((path) => {
        const translated = at(LOCALES[name], path);
        if (translated == null) return false;
        return (
          placeholders(at(en, path)).join(",") !== placeholders(translated).join(",")
        );
      })
      .map((path) => `${path}: expected {${placeholders(at(en, path)).join("}, {")}}`);
    expect(drifted).toEqual([]);
  });
});

describe("duration wording", () => {
  // The three templates formatDuration picks between. Every locale needs all
  // three, because a duration is minutes as much as hours now.
  const forms = ["hours", "hoursMinutes", "minutes"];

  it.each(Object.entries({ en, ...LOCALES }))(
    "%s words a duration in all three forms",
    (_name, locale) => {
      for (const form of forms) {
        expect(typeof locale.booking.units.duration[form]).toBe("string");
      }
      expect(placeholders(locale.booking.units.duration.hours)).toEqual(["hours"]);
      expect(placeholders(locale.booking.units.duration.minutes)).toEqual(["minutes"]);
      expect(placeholders(locale.booking.units.duration.hoursMinutes)).toEqual([
        "hours",
        "minutes",
      ]);
    }
  );
});
