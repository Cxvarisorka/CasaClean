// The advance-notice rule: a booking must normally be placed at least
// ADVANCE_BOOKING_HOURS before it starts, measured to the MINUTE rather than by
// calendar day. Pinned here because both the server's assertBookingWindow and
// the wizard's timeWindow.js are written against exactly this arithmetic.
const {
    ADVANCE_BOOKING_HOURS,
    bookingStartsAt,
    earliestBookableStart,
    meetsAdvanceNotice,
    allowsInstantBooking
} = require("../../utils/leadTime.util");

// 16 August 2026, 15:00 local — the example from the specification.
const NOW = new Date(2026, 7, 16, 15, 0);

const at = (offsetMs) => new Date(NOW.getTime() + offsetMs);
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

describe("meetsAdvanceNotice", () => {
    test("accepts a start exactly the notice period away", () => {
        // 16 Aug 15:00 + 48 h = 18 Aug 15:00. "At least" includes the boundary.
        expect(meetsAdvanceNotice("2026-08-18", "15:00", NOW)).toBe(true);
    });

    test("rejects one minute short of the notice period", () => {
        expect(meetsAdvanceNotice("2026-08-18", "14:59", NOW)).toBe(false);
    });

    test("is measured on the clock, not the calendar", () => {
        // Two calendar days later is not enough when the time of day is earlier:
        // 18 Aug 09:00 is only 42 hours out.
        expect(meetsAdvanceNotice("2026-08-18", "09:00", NOW)).toBe(false);
        expect(meetsAdvanceNotice("2026-08-19", "09:00", NOW)).toBe(true);
    });

    test("rejects anything today or already past", () => {
        expect(meetsAdvanceNotice("2026-08-16", "16:00", NOW)).toBe(false);
        expect(meetsAdvanceNotice("2026-08-15", "10:00", NOW)).toBe(false);
    });
});

describe("earliestBookableStart", () => {
    test("is exactly the notice period from now", () => {
        expect(earliestBookableStart(NOW).getTime()).toBe(
            NOW.getTime() + ADVANCE_BOOKING_HOURS * HOUR
        );
    });

    test("agrees with meetsAdvanceNotice at the boundary", () => {
        const earliest = earliestBookableStart(NOW);
        const stamp = (d) => ({
            bookingDate: [
                d.getFullYear(),
                String(d.getMonth() + 1).padStart(2, "0"),
                String(d.getDate()).padStart(2, "0")
            ].join("-"),
            bookingTime: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        });

        const onTime = stamp(earliest);
        const tooSoon = stamp(new Date(earliest.getTime() - MINUTE));

        expect(meetsAdvanceNotice(onTime.bookingDate, onTime.bookingTime, NOW)).toBe(true);
        expect(meetsAdvanceNotice(tooSoon.bookingDate, tooSoon.bookingTime, NOW)).toBe(false);
    });
});

describe("bookingStartsAt", () => {
    test("builds the moment in LOCAL time, not UTC", () => {
        const start = bookingStartsAt({ bookingDate: "2026-08-18", bookingTime: "15:00" });
        expect(start.getFullYear()).toBe(2026);
        expect(start.getMonth()).toBe(7);
        expect(start.getDate()).toBe(18);
        expect(start.getHours()).toBe(15);
        expect(start.getTime()).toBe(at(48 * HOUR).getTime());
    });
});

describe("allowsInstantBooking", () => {
    test("is true only for a service that explicitly opted in", () => {
        expect(allowsInstantBooking({ allowInstantBooking: true })).toBe(true);
    });

    test("fails closed for a missing flag, a missing service or a truthy non-true", () => {
        expect(allowsInstantBooking({ allowInstantBooking: false })).toBe(false);
        expect(allowsInstantBooking({})).toBe(false);
        expect(allowsInstantBooking(null)).toBe(false);
        expect(allowsInstantBooking(undefined)).toBe(false);
    });
});
