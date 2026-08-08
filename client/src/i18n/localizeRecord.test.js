import { describe, test, expect } from "vitest";
import { localizedField } from "./localizeRecord";

// A service as the API returns it: default-locale copy at the root, per-language
// overrides in `translations` — Italian fully translated, Georgian only partly.
const SERVICE = {
  name: "Deep Clean",
  subtitle: "Top to bottom",
  description: "A complete cleaning session for your home.",
  includes: ["Kitchen", "Bathroom"],
  translations: {
    it: {
      name: "Pulizia profonda",
      subtitle: "Da cima a fondo",
      description: "Una pulizia completa della tua casa.",
      includes: ["Cucina", "Bagno"],
    },
    ka: { name: "ღრმა დასუფთავება" },
  },
};

describe("localizedField", () => {
  test("returns the root copy for the default locale", () => {
    expect(localizedField(SERVICE, "name", "en")).toBe("Deep Clean");
    expect(localizedField(SERVICE, "includes", "en")).toEqual([
      "Kitchen",
      "Bathroom",
    ]);
  });

  test("returns the translation when the language has one", () => {
    expect(localizedField(SERVICE, "name", "it")).toBe("Pulizia profonda");
    expect(localizedField(SERVICE, "includes", "it")).toEqual(["Cucina", "Bagno"]);
  });

  test("falls back per field, not per record", () => {
    // Georgian translated the title only — the rest stays in the base language
    // instead of the whole card reverting to English.
    expect(localizedField(SERVICE, "name", "ka")).toBe("ღრმა დასუფთავება");
    expect(localizedField(SERVICE, "description", "ka")).toBe(
      "A complete cleaning session for your home."
    );
    expect(localizedField(SERVICE, "includes", "ka")).toEqual([
      "Kitchen",
      "Bathroom",
    ]);
  });

  test("falls back for a language with no translations at all", () => {
    expect(localizedField(SERVICE, "name", "ru")).toBe("Deep Clean");
    expect(localizedField({ name: "Deep Clean" }, "name", "ru")).toBe("Deep Clean");
  });

  test("treats blank translated values as untranslated", () => {
    const record = {
      name: "Deep Clean",
      includes: ["Kitchen"],
      translations: { it: { name: "   ", includes: ["", "  "] } },
    };

    expect(localizedField(record, "name", "it")).toBe("Deep Clean");
    expect(localizedField(record, "includes", "it")).toEqual(["Kitchen"]);
  });

  test("keeps the filled bullets of a partly translated list", () => {
    const record = {
      includes: ["Kitchen", "Bathroom"],
      translations: { it: { includes: ["Cucina", ""] } },
    };

    expect(localizedField(record, "includes", "it")).toEqual(["Cucina"]);
  });
});
