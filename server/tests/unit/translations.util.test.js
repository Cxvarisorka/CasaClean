const {
    TRANSLATABLE_FIELDS,
    normalizeTranslations
} = require("../../utils/translations.util");
const { TRANSLATABLE_LOCALES, DEFAULT_LOCALE } = require("../../utils/locale.util");

const serviceFields = TRANSLATABLE_FIELDS.service;

describe("normalizeTranslations", () => {
    test("distinguishes 'no translations field sent' from 'translations cleared'", () => {
        // undefined lets a controller leave the stored map untouched...
        expect(normalizeTranslations(undefined, serviceFields)).toBeUndefined();
        expect(normalizeTranslations(null, serviceFields)).toBeUndefined();
        // ...while an empty map is an explicit "remove every translation".
        expect(normalizeTranslations({}, serviceFields)).toEqual({});
    });

    test("trims the copy it keeps", () => {
        expect(normalizeTranslations({ it: { name: "  Pulizia  " } }, serviceFields))
            .toEqual({ it: { name: "Pulizia" } });
    });

    test("drops blank fields so they fall back to the default locale", () => {
        const result = normalizeTranslations(
            { it: { name: "Pulizia", subtitle: "   ", description: "" } },
            serviceFields
        );

        expect(result).toEqual({ it: { name: "Pulizia" } });
    });

    test("drops blank list items, and the list itself when nothing is left", () => {
        expect(normalizeTranslations({ it: { name: "x", includes: ["Cucina", "  ", ""] } }, serviceFields))
            .toEqual({ it: { name: "x", includes: ["Cucina"] } });

        expect(normalizeTranslations({ it: { name: "x", includes: ["", "  "] } }, serviceFields))
            .toEqual({ it: { name: "x" } });
    });

    test("removes a language with nothing filled in at all", () => {
        const result = normalizeTranslations(
            { it: { name: "Pulizia" }, ru: { name: "", description: "  ", includes: [] } },
            serviceFields
        );

        expect(result).toEqual({ it: { name: "Pulizia" } });
        expect("ru" in result).toBe(false);
    });

    test("keeps only the fields the resource declares as translatable", () => {
        // City copy is just the name — anything else is ignored here (and the
        // Zod schema rejects it outright before this ever runs).
        const result = normalizeTranslations(
            { it: { name: "Roma", description: "Not a city field" } },
            TRANSLATABLE_FIELDS.city
        );

        expect(result).toEqual({ it: { name: "Roma" } });
    });

    test("ignores a locale whose entry isn't an object", () => {
        expect(normalizeTranslations({ it: null, ka: "Roma" }, TRANSLATABLE_FIELDS.city))
            .toEqual({});
    });
});

describe("translatable field lists", () => {
    test("the default locale is never a translation target", () => {
        expect(TRANSLATABLE_LOCALES).not.toContain(DEFAULT_LOCALE);
    });

    test("every resource declares at least a name", () => {
        for (const [resource, fields] of Object.entries(TRANSLATABLE_FIELDS)) {
            expect(fields.some((f) => f.name === "name")).toBe(true);
            // Every field needs a cap, or a translation could outgrow its design.
            for (const field of fields) {
                expect(typeof field.max).toBe("number");
                if (field.list) expect(typeof field.maxItems).toBe("number");
            }
            expect(resource).toBeTruthy();
        }
    });
});
