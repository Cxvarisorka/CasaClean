import { describe, test, expect } from "vitest";
import {
  contentField,
  toContentValue,
  fromContentValue,
} from "./localizedContent";

// The subfields an admin page declares — one plain text field, one list.
const SUBFIELDS = [
  { name: "name", required: true },
  { name: "description", type: "textarea" },
  { name: "includes", type: "list" },
];

// A record as the admin API hands it over: default-locale copy at the root,
// per-language overrides in `translations`.
const RECORD = {
  _id: "svc1",
  name: "Deep Clean",
  description: "A complete cleaning session.",
  includes: ["Kitchen", "Bathroom"],
  translations: {
    it: { name: "Pulizia profonda", includes: ["Cucina", "Bagno"] },
    ka: { name: "ღრმა დასუფთავება" },
  },
};

describe("toContentValue", () => {
  test("puts the root copy under the default locale and keeps the translations", () => {
    expect(toContentValue(RECORD, SUBFIELDS)).toEqual({
      en: {
        name: "Deep Clean",
        description: "A complete cleaning session.",
        includes: ["Kitchen", "Bathroom"],
      },
      it: { name: "Pulizia profonda", includes: ["Cucina", "Bagno"] },
      ka: { name: "ღრმა დასუფთავება" },
    });
  });

  test("seeds an empty form for a new record, typed per subfield", () => {
    expect(toContentValue(null, SUBFIELDS)).toEqual({
      en: { name: "", description: "", includes: [] },
    });
  });
});

describe("fromContentValue", () => {
  test("splits the form value back into root fields plus translations", () => {
    const payload = fromContentValue(toContentValue(RECORD, SUBFIELDS), SUBFIELDS);

    expect(payload).toEqual({
      name: "Deep Clean",
      description: "A complete cleaning session.",
      includes: ["Kitchen", "Bathroom"],
      translations: {
        it: { name: "Pulizia profonda", includes: ["Cucina", "Bagno"] },
        ka: { name: "ღრმა დასუფთავება" },
      },
    });
  });

  test("drops blank fields and leaves out a language with nothing filled in", () => {
    const payload = fromContentValue(
      {
        en: { name: "  Deep Clean  ", description: "", includes: ["Kitchen", "  "] },
        it: { name: "Pulizia", description: "   ", includes: [] },
        // Touched but never actually filled — must not become a translation,
        // which is what removes one stored earlier.
        ru: { name: "", description: "", includes: ["  "] },
      },
      SUBFIELDS
    );

    expect(payload).toEqual({
      name: "Deep Clean",
      description: "",
      includes: ["Kitchen"],
      translations: { it: { name: "Pulizia" } },
    });
  });

  test("always returns a translations map, so a save can clear every language", () => {
    expect(fromContentValue({ en: { name: "Deep Clean" } }, SUBFIELDS).translations)
      .toEqual({});
    expect(fromContentValue(undefined, SUBFIELDS).translations).toEqual({});
  });
});

describe("contentField", () => {
  test("builds an i18n field the form can render, keyed on the default locale", () => {
    const field = contentField("Copy", SUBFIELDS);

    expect(field.name).toBe("content");
    expect(field.type).toBe("i18n");
    expect(field.label).toBe("Copy");
    expect(field.baseLocale).toBe("en");
    expect(field.subfields).toBe(SUBFIELDS);
    // Every supported language gets a step, the base one included.
    expect(field.locales.map((l) => l.code)).toEqual(["en", "ka", "it", "el", "ru"]);
  });
});
