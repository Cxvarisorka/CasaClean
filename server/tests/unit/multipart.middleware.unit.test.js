const coerceMultipart = require("../../middlewares/multipart.middleware");

const middleware = coerceMultipart({
    numbers: ["pricePerHour"],
    booleans: ["allCities"],
    arrays: ["cities"],
    objects: ["translations"]
});

/** Minimal req stub — only `is()` and `body` are read. */
const run = (body, contentType = "multipart/form-data; boundary=x") => {
    const req = {
        body,
        is: (type) => (contentType.startsWith(type) ? type : false)
    };
    const next = jest.fn();
    middleware(req, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    return req.body;
};

describe("coerceMultipart", () => {
    test("re-types numbers, booleans and JSON-encoded arrays", () => {
        const body = run({
            pricePerHour: "24.5",
            allCities: "false",
            cities: '["64b000000000000000000000"]'
        });

        expect(body.pricePerHour).toBe(24.5);
        expect(body.allCities).toBe(false);
        expect(body.cities).toEqual(["64b000000000000000000000"]);
    });

    test("an empty array survives the round trip", () => {
        expect(run({ cities: "[]" }).cities).toEqual([]);
        // A blank field is the same thing — nothing was selected.
        expect(run({ cities: "" }).cities).toEqual([]);
    });

    test("re-types a JSON-encoded object (the per-language translations map)", () => {
        const body = run({
            translations: '{"ka":{"name":"ღრმა დასუფთავება","includes":["სამზარეულო"]}}'
        });

        expect(body.translations).toEqual({
            ka: { name: "ღრმა დასუფთავება", includes: ["სამზარეულო"] }
        });
    });

    test("an empty object survives the round trip — 'all translations removed'", () => {
        expect(run({ translations: "{}" }).translations).toEqual({});
        expect(run({ translations: "" }).translations).toEqual({});
    });

    test("leaves values it cannot re-type for Zod to reject", () => {
        const body = run({
            pricePerHour: "free",
            allCities: "yes",
            cities: "not-json",
            translations: "not-json"
        });

        expect(body.pricePerHour).toBe("free");
        expect(body.allCities).toBe("yes");
        expect(body.cities).toBe("not-json");
        expect(body.translations).toBe("not-json");
        // An array is not a translations map either — Zod must see it, not {}.
        expect(run({ translations: "[1,2]" }).translations).toBe("[1,2]");
    });

    test("does not invent values for fields the client omitted", () => {
        const body = run({ pricePerHour: "10" });

        expect(body).toEqual({ pricePerHour: 10 });
        expect("allCities" in body).toBe(false);
        expect("cities" in body).toBe(false);
    });

    test("leaves a JSON body untouched", () => {
        const body = run({ pricePerHour: "24.5", allCities: "false" }, "application/json");

        expect(body).toEqual({ pricePerHour: "24.5", allCities: "false" });
    });
});
