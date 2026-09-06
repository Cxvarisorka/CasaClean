// A booking's length is TOTAL MINUTES — 85 is a 1 h 25 min visit. What counts
// as a valid duration, how the "Hours + Minutes" pair combines into one, how a
// legacy record's `hours` is read, and how a length is worded to a customer are
// all shared by the Zod schema, the Booking model, the confirmation email and
// the admin alert, so they are pinned here.
const {
    MIN_DURATION_MINUTES,
    MAX_DURATION_MINUTES,
    MAX_MINUTES_PART,
    isValidDurationMinutes,
    combineDuration,
    splitDuration,
    durationInMinutes,
    formatDuration
} = require("../../utils/duration.util");

describe("isValidDurationMinutes", () => {
    test("accepts any whole minute across the range", () => {
        expect(isValidDurationMinutes(MIN_DURATION_MINUTES)).toBe(true);
        expect(isValidDurationMinutes(85)).toBe(true);   // 1 h 25 m
        expect(isValidDurationMinutes(130)).toBe(true);  // 2 h 10 m
        expect(isValidDurationMinutes(225)).toBe(true);  // 3 h 45 m
        expect(isValidDurationMinutes(MAX_DURATION_MINUTES)).toBe(true);
    });

    test("rejects a fraction of a minute", () => {
        expect(isValidDurationMinutes(85.5)).toBe(false);
        expect(isValidDurationMinutes(60.1)).toBe(false);
    });

    test("rejects anything outside the accepted range", () => {
        expect(isValidDurationMinutes(0)).toBe(false);
        expect(isValidDurationMinutes(-30)).toBe(false);
        expect(isValidDurationMinutes(MIN_DURATION_MINUTES - 1)).toBe(false);
        expect(isValidDurationMinutes(MAX_DURATION_MINUTES + 1)).toBe(false);
    });

    test("rejects non-numbers rather than coercing them", () => {
        expect(isValidDurationMinutes("ninety")).toBe(false);
        expect(isValidDurationMinutes(undefined)).toBe(false);
        expect(isValidDurationMinutes(null)).toBe(false);
        expect(isValidDurationMinutes(Infinity)).toBe(false);
    });
});

describe("combineDuration", () => {
    test("turns an Hours + Minutes pair into total minutes", () => {
        expect(combineDuration(1, 0)).toBe(60);
        expect(combineDuration(1, 25)).toBe(85);
        expect(combineDuration(2, 10)).toBe(130);
        expect(combineDuration(3, 45)).toBe(225);
        expect(combineDuration(0, 30)).toBe(30);
    });

    test("refuses a non-integer half of the pair instead of guessing", () => {
        expect(combineDuration(1.5, 0)).toBeNaN();
        expect(combineDuration(1, "25m")).toBeNaN();
        expect(combineDuration(undefined, 25)).toBeNaN();
    });

    test("round-trips through splitDuration", () => {
        for (const total of [60, 85, 130, 225, MAX_DURATION_MINUTES]) {
            const { hours, minutes } = splitDuration(total);
            expect(minutes).toBeLessThanOrEqual(MAX_MINUTES_PART);
            expect(combineDuration(hours, minutes)).toBe(total);
        }
    });
});

describe("durationInMinutes", () => {
    test("reads the canonical field", () => {
        expect(durationInMinutes({ durationMinutes: 85 })).toBe(85);
    });

    test("falls back to a legacy record's whole/half `hours`", () => {
        expect(durationInMinutes({ hours: 2 })).toBe(120);
        expect(durationInMinutes({ hours: 1.5 })).toBe(90);
    });

    test("prefers the canonical field when a record carries both", () => {
        expect(durationInMinutes({ durationMinutes: 85, hours: 2 })).toBe(85);
    });

    test("returns 0 for a record with no usable duration", () => {
        expect(durationInMinutes({})).toBe(0);
        expect(durationInMinutes(null)).toBe(0);
        expect(durationInMinutes({ durationMinutes: "soon" })).toBe(0);
    });
});

describe("formatDuration", () => {
    test("words an exact-minute duration, never a raw minute count", () => {
        expect(formatDuration(85)).toBe("1 h 25 min");
        expect(formatDuration(130)).toBe("2 h 10 min");
        expect(formatDuration(90)).toBe("1 h 30 min");
    });

    test("leaves the minutes out of a whole hour", () => {
        expect(formatDuration(120)).toBe("2 h");
        expect(formatDuration(60)).toBe("1 h");
    });

    test("states a sub-hour duration in minutes alone", () => {
        expect(formatDuration(45)).toBe("45 min");
    });

    test("falls back to a dash rather than printing a zero duration", () => {
        expect(formatDuration(0)).toBe("—");
        expect(formatDuration(undefined)).toBe("—");
    });
});
