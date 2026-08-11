// A booking's length is stored in hours and may be a half (1.5 = 90 minutes).
// These two rules — what counts as a valid duration, and how one is worded to a
// customer — are shared by the Zod schema, the Booking model, the confirmation
// email, the admin alert and the invoice, so they are pinned here.
const {
    DURATION_STEP_HOURS,
    MIN_DURATION_HOURS,
    MAX_DURATION_HOURS,
    isValidDurationHours,
    formatDuration
} = require("../../utils/duration.util");

describe("isValidDurationHours", () => {
    test("accepts whole and half hours across the range", () => {
        expect(isValidDurationHours(1)).toBe(true);
        expect(isValidDurationHours(1.5)).toBe(true);
        expect(isValidDurationHours(2)).toBe(true);
        expect(isValidDurationHours(11.5)).toBe(true);
        expect(isValidDurationHours(MAX_DURATION_HOURS)).toBe(true);
    });

    test("rejects a finer step than the half hour", () => {
        // A quarter hour can't be priced to the cent from a per-hour rate.
        expect(isValidDurationHours(1.25)).toBe(false);
        expect(isValidDurationHours(1.1)).toBe(false);
    });

    test("rejects anything outside the accepted range", () => {
        expect(isValidDurationHours(MIN_DURATION_HOURS - DURATION_STEP_HOURS)).toBe(false);
        expect(isValidDurationHours(0)).toBe(false);
        expect(isValidDurationHours(-2)).toBe(false);
        expect(isValidDurationHours(MAX_DURATION_HOURS + DURATION_STEP_HOURS)).toBe(false);
    });

    test("rejects non-numbers rather than coercing them", () => {
        expect(isValidDurationHours("two")).toBe(false);
        expect(isValidDurationHours(undefined)).toBe(false);
        expect(isValidDurationHours(null)).toBe(false);
        expect(isValidDurationHours(Infinity)).toBe(false);
    });
});

describe("formatDuration", () => {
    test("never states a decimal hour to a customer", () => {
        expect(formatDuration(1.5)).toBe("1 h 30 min");
        expect(formatDuration(3.5)).toBe("3 h 30 min");
    });

    test("leaves the minutes out of a whole hour", () => {
        expect(formatDuration(2)).toBe("2 h");
        expect(formatDuration(1)).toBe("1 h");
    });

    test("falls back to a dash rather than printing a zero duration", () => {
        expect(formatDuration(0)).toBe("—");
        expect(formatDuration(undefined)).toBe("—");
    });
});
