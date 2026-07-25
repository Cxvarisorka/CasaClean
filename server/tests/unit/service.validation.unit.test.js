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

    test("rejects scriptable image schemes and SVG data URLs", () => {
        expect(createServiceSchema.safeParse({ ...service, image: "javascript:alert(1)" }).success).toBe(false);
        expect(editServiceSchema.safeParse({ image: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }).success).toBe(false);
    });
});
