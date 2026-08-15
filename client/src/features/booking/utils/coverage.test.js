import { describe, test, expect } from "vitest";
import { coversCity, servicesForCity } from "./coverage";

const restricted = { id: "s1", fromDb: true, allCities: false, cities: ["c1", "c2"] };
const everywhere = { id: "s2", fromDb: true, allCities: true, cities: [] };
const static_ = { id: "s3", fromDb: false };

describe("coversCity", () => {
  test("a city-restricted service covers only the cities it lists", () => {
    expect(coversCity(restricted, "c1")).toBe(true);
    expect(coversCity(restricted, "c3")).toBe(false);
  });

  test("an allCities service covers everywhere, whatever its stale list says", () => {
    expect(coversCity({ ...everywhere, cities: ["c1"] }, "c9")).toBe(true);
  });

  test("services without database coverage data are available everywhere", () => {
    expect(coversCity(static_, "c9")).toBe(true);
  });

  test("compares ids as strings, so an ObjectId-ish value still matches", () => {
    expect(coversCity(restricted, { toString: () => "c2" })).toBe(true);
  });

  test("a missing service covers nothing (fail closed, like the server)", () => {
    expect(coversCity(null, "c1")).toBe(false);
    expect(coversCity(undefined, "c1")).toBe(false);
  });

  test("a restricted service with no cities covers nothing", () => {
    expect(coversCity({ fromDb: true, allCities: false }, "c1")).toBe(false);
  });
});

describe("servicesForCity", () => {
  const all = [restricted, everywhere, static_];

  test("narrows to what the city actually offers", () => {
    expect(servicesForCity(all, "c1").map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
    expect(servicesForCity(all, "c3").map((s) => s.id)).toEqual(["s2", "s3"]);
  });

  test("rules nothing out before a city is chosen", () => {
    expect(servicesForCity(all, "")).toBe(all);
    expect(servicesForCity(all, undefined)).toBe(all);
  });

  test("tolerates an empty catalogue", () => {
    expect(servicesForCity(undefined, "c1")).toEqual([]);
  });
});
