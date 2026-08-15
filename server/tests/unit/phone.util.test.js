const { normalizePhone, isValidPhone } = require("../../utils/phone.util");

describe("normalizePhone", () => {
    test("strips the punctuation people type between digit groups", () => {
        expect(normalizePhone(" +39 331 234-5678 ")).toBe("+393312345678");
        expect(normalizePhone("+39 (0)331.234.5678")).toBe("+3903312345678");
    });

    test("rewrites the 00 international prefix as +", () => {
        expect(normalizePhone("00995555123456")).toBe("+995555123456");
    });

    test("returns an empty string for anything that isn't text", () => {
        expect(normalizePhone(undefined)).toBe("");
        expect(normalizePhone(null)).toBe("");
        expect(normalizePhone({ $ne: null })).toBe("");
    });
});

describe("isValidPhone", () => {
    test("accepts numbers from the markets this product sells in", () => {
        expect(isValidPhone("+393312345678")).toBe(true);   // Italy
        expect(isValidPhone("+995555123456")).toBe(true);   // Georgia
        expect(isValidPhone("+306912345678")).toBe(true);   // Greece
        expect(isValidPhone("+4915112345678")).toBe(true);  // Germany
    });

    test("rejects a number with no country prefix — it is ambiguous across markets", () => {
        expect(isValidPhone("3312345678")).toBe(false);
    });

    test("rejects letters, blanks and lengths outside E.164", () => {
        expect(isValidPhone("call-me")).toBe(false);
        expect(isValidPhone("")).toBe(false);
        expect(isValidPhone("+39123")).toBe(false);
        expect(isValidPhone("+3912345678901234567")).toBe(false);
        // A country code never starts with 0.
        expect(isValidPhone("+0393312345")).toBe(false);
    });
});
