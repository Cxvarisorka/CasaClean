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
