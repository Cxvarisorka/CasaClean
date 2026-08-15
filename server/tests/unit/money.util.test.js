const { toMinorUnits, fromMinorUnits } = require("../../utils/money.util");

describe("money.util", () => {
    test("converts decimal euros to integer cents", () => {
        expect(toMinorUnits(40)).toBe(4000);
        expect(toMinorUnits(19.9)).toBe(1990);
        expect(toMinorUnits(0)).toBe(0);
    });

    test("rounds away floating-point drift (44.8 * 100 === 4479.999…)", () => {
        expect(toMinorUnits(44.8)).toBe(4480);
        expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    });

    test("coerces numeric strings", () => {
        expect(toMinorUnits("12.5")).toBe(1250);
    });

    test("converts cents back to decimal euros", () => {
        expect(fromMinorUnits(4480)).toBe(44.8);
        expect(fromMinorUnits(0)).toBe(0);
    });

    test("round-trips typical booking totals", () => {
        for (const amount of [19.9, 44.8, 100, 0.01, 123.45]) {
            expect(fromMinorUnits(toMinorUnits(amount))).toBeCloseTo(amount, 10);
        }
    });
});
