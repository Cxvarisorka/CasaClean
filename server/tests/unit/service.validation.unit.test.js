const { createServiceSchema, editServiceSchema } = require("../../validations/service.validation");

const service = {
    name: "Deep Cleaning",
    description: "A complete cleaning service.",
    pricePerHour: 20,
    cities: []
};

describe("service image validation", () => {
    test("accepts HTTPS URLs and supported raster data URLs", () => {
        expect(createServiceSchema.safeParse({ ...service, image: "https://cdn.example.com/service.png" }).success).toBe(true);
        expect(editServiceSchema.safeParse({ image: "data:image/png;base64,iVBORw0KGgo=" }).success).toBe(true);
    });

    test("accepts a path to a file this server stores", () => {
        expect(createServiceSchema.safeParse({ ...service, image: "/uploads/services/1712-ab12cd.png" }).success).toBe(true);
        expect(editServiceSchema.safeParse({ image: "/uploads/services/1712-ab12cd.webp" }).success).toBe(true);
    });

    test("accepts an empty string — the 'no image' / 'clear it' value", () => {
        expect(createServiceSchema.safeParse({ ...service, image: "" }).success).toBe(true);
        expect(editServiceSchema.safeParse({ image: "" }).success).toBe(true);
    });

    test("rejects scriptable image schemes and SVG data URLs", () => {
        expect(createServiceSchema.safeParse({ ...service, image: "javascript:alert(1)" }).success).toBe(false);
        expect(editServiceSchema.safeParse({ image: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }).success).toBe(false);
    });

    test("rejects upload paths that try to escape the upload directory", () => {
        expect(editServiceSchema.safeParse({ image: "/uploads/services/../../.env" }).success).toBe(false);
        expect(editServiceSchema.safeParse({ image: "/uploads/services/nested/file.png" }).success).toBe(false);
    });
});

describe("service translation validation", () => {
    test("translations are optional on both schemas", () => {
        expect(createServiceSchema.safeParse(service).success).toBe(true);
        expect(editServiceSchema.safeParse({ translations: {} }).success).toBe(true);
    });

    test("accepts per-language copy for the supported locales", () => {
        const result = createServiceSchema.safeParse({
            ...service,
            translations: {
                ka: {
                    name: "ღრმა დასუფთავება",
                    subtitle: "სახლი ბრწყინავს",
                    description: "სრული დასუფთავების სერვისი თქვენი სახლისთვის.",
                    includes: ["სამზარეულო", "სააბაზანო"]
                },
                it: { name: "Pulizia profonda" }
            }
        });

        expect(result.success).toBe(true);
    });

    test("accepts a partly filled language — blanks fall back to the base locale", () => {
        expect(editServiceSchema.safeParse({
            translations: { ru: { name: "", description: "Полная уборка вашего дома." } }
        }).success).toBe(true);
    });

    test("rejects an unsupported language code", () => {
        expect(editServiceSchema.safeParse({
            translations: { fr: { name: "Nettoyage" } }
        }).success).toBe(false);
    });

    test("rejects the default locale — it lives in the root fields", () => {
        expect(editServiceSchema.safeParse({
            translations: { en: { name: "Deep Cleaning" } }
        }).success).toBe(false);
    });

    test("rejects unknown fields inside a language", () => {
        expect(editServiceSchema.safeParse({
            translations: { it: { name: "Pulizia", slug: "pulizia" } }
        }).success).toBe(false);
    });

    test("holds translated copy to the same length limits as the base text", () => {
        expect(editServiceSchema.safeParse({
            translations: { it: { name: "x".repeat(51) } }
        }).success).toBe(false);

        expect(editServiceSchema.safeParse({
            translations: { it: { description: "x".repeat(701) } }
        }).success).toBe(false);

        expect(editServiceSchema.safeParse({
            translations: { it: { includes: Array(21).fill("voce") } }
        }).success).toBe(false);
    });
});

describe("service recurrence validation", () => {
    test("recurrence fields are optional on both schemas", () => {
        expect(createServiceSchema.safeParse(service).success).toBe(true);
        expect(editServiceSchema.safeParse({ name: "Deep Cleaning" }).success).toBe(true);
    });

    test("accepts cadences across the whole 1–14 day range, including an empty list", () => {
        expect(createServiceSchema.safeParse({
            ...service,
            recurringEnabled: true,
            recurringIntervalDays: [1, 7, 14]
        }).success).toBe(true);

        // "No restriction — the customer picks" must stay expressible.
        expect(editServiceSchema.safeParse({ recurringIntervalDays: [] }).success).toBe(true);
    });

    test("rejects cadences outside the range and non-whole days", () => {
        expect(editServiceSchema.safeParse({ recurringIntervalDays: [0] }).success).toBe(false);
        expect(editServiceSchema.safeParse({ recurringIntervalDays: [15] }).success).toBe(false);
        expect(editServiceSchema.safeParse({ recurringIntervalDays: [30] }).success).toBe(false);
        expect(editServiceSchema.safeParse({ recurringIntervalDays: [3.5] }).success).toBe(false);
        expect(editServiceSchema.safeParse({ recurringIntervalDays: ["7"] }).success).toBe(false);
    });
});
