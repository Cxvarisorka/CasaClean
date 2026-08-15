// utils/env.util.js computes isProduction at require time, so each case loads a
// fresh copy of the module against a manipulated process.env.
describe("env.util", () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV };
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    const load = () => require("../../utils/env.util");

    describe("isProduction (fail-secure)", () => {
        test.each(["dev", "development", "test"])(
            "is false for the explicit dev value %p",
            (value) => {
                process.env.NODE_ENV = value;
                expect(load().isProduction).toBe(false);
            }
        );

        test.each(["production", "prod", "staging", "banana", "", undefined])(
            "is true for any other value (%p)",
            (value) => {
                if (value === undefined) delete process.env.NODE_ENV;
                else process.env.NODE_ENV = value;
                expect(load().isProduction).toBe(true);
            }
        );
    });

    describe("assertEnv", () => {
        test("passes with the full test configuration", () => {
            expect(() => load().assertEnv()).not.toThrow();
        });

        test.each([
            "MONGO_URI", "JWT_SECRET", "JWT_EXPIRES_IN", "CLIENT_URL", "SERVER_URL",
            "PORT", "COOKIE_EXPIRES", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
            "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL",
            "MAIL_HOST", "MAIL_USERNAME", "MAIL_PASSWORD"
        ])("throws when %s is missing", (name) => {
            delete process.env[name];
            expect(() => load().assertEnv()).toThrow(new RegExp(name));
        });

        test("rejects a short JWT secret", () => {
            process.env.JWT_SECRET = "too-short";
            expect(() => load().assertEnv()).toThrow(/too short/i);
        });

        test("rejects known placeholder JWT secrets", () => {
            process.env.JWT_SECRET = "change-me-to-a-long-random-string";
            expect(() => load().assertEnv()).toThrow(/placeholder/i);
        });

        test.each(["0", "-1", "junk", ""])(
            "rejects non-positive COOKIE_EXPIRES (%p)",
            (value) => {
                process.env.COOKIE_EXPIRES = value;
                expect(() => load().assertEnv()).toThrow(/COOKIE_EXPIRES/);
            }
        );
    });
});
