// DB-free units of the booking domain service: the working-hours window check
// and the email rendering (HTML escaping of customer-controlled values).
const {
    assertBookingWindow,
    computeBookingTotal,
    renderBookingConfirmationEmail,
    renderRefundEmail,
    formatEuro
} = require("../../services/booking.service");

describe("computeBookingTotal", () => {
    test("multiplies labour by cleaners and adds fixed catalogue fees", () => {
        expect(computeBookingTotal({
            service: { pricePerHour: 20 }, durationMinutes: 180, cleaners: 2,
            specialRequests: [{ price: 15 }], cleaningTools: [{ price: 5 }]
        })).toBe(140);
    });

    test("pro-rates the hourly rate over an exact number of minutes", () => {
        // The specification's own example: 85 / 60 x EUR 20 = EUR 28.33.
        expect(computeBookingTotal({
            service: { pricePerHour: 20 }, durationMinutes: 85, cleaners: 1
        })).toBe(28.33);
    });

    test("rounds the labour ONCE, at the cent, for every crew size", () => {
        // 85 min at EUR 20/h is 28.3333 per cleaner. Rounding per cleaner and
        // then doubling would give 56.66; the charge is the rounded whole.
        expect(computeBookingTotal({
            service: { pricePerHour: 20 }, durationMinutes: 85, cleaners: 2
        })).toBe(56.67);
    });

    test("keeps a fractional catalogue rate cent-exact", () => {
        // 19.9/h over 130 min is 43.1166... - a float sum drifts here.
        expect(computeBookingTotal({
            service: { pricePerHour: 19.9 }, durationMinutes: 130, cleaners: 1
        })).toBe(43.12);
    });

    test("adds add-ons on top of the pro-rated labour, not into it", () => {
        expect(computeBookingTotal({
            service: { pricePerHour: 20 }, durationMinutes: 85, cleaners: 1,
            specialRequests: [{ price: 15 }], cleaningTools: [{ price: 5 }]
        })).toBe(48.33);
    });
});

const city = { workingHourStarts: "09:00", workingHourEnds: "17:30" };

// A date safely in the future so the same-day "time already passed" branch
// never interferes with the window assertions.
const futureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0")
    ].join("-");
};

describe("assertBookingWindow - city working hours", () => {
    test("accepts a booking fully inside working hours", () => {
        expect(() => assertBookingWindow(city, futureDate(), "09:00", 120)).not.toThrow();
        expect(() => assertBookingWindow(city, futureDate(), "15:30", 120)).not.toThrow();
    });

    test("rejects a start before opening", () => {
        expect(() => assertBookingWindow(city, futureDate(), "08:59", 60))
            .toThrow(/outside city working hours/);
    });

    test("rejects a start at or after closing", () => {
        expect(() => assertBookingWindow(city, futureDate(), "17:30", 60))
            .toThrow(/outside city working hours/);
        expect(() => assertBookingWindow(city, futureDate(), "18:00", 60))
            .toThrow(/outside city working hours/);
    });

    test("rejects a booking that would run past closing time", () => {
        // 16:30 + 8h runs long past a 17:30 close even though the start is valid.
        expect(() => assertBookingWindow(city, futureDate(), "16:30", 480))
            .toThrow(/run past the city's closing time/);
    });

    test("accepts a booking that ends exactly at closing time", () => {
        expect(() => assertBookingWindow(city, futureDate(), "15:30", 120)).not.toThrow();
    });

    test("measures the END to the minute", () => {
        // The specification's boundary, on a 09:00-17:00 city: 15:00 + 2 h ends
        // exactly at closing; one minute more does not fit.
        const nineToFive = { workingHourStarts: "09:00", workingHourEnds: "17:00" };
        expect(() => assertBookingWindow(nineToFive, futureDate(), "15:00", 60)).not.toThrow();
        expect(() => assertBookingWindow(nineToFive, futureDate(), "15:00", 85)).not.toThrow();
        expect(() => assertBookingWindow(nineToFive, futureDate(), "15:00", 120)).not.toThrow();
        expect(() => assertBookingWindow(nineToFive, futureDate(), "15:00", 121))
            .toThrow(/run past the city's closing time/);
        expect(() => assertBookingWindow(nineToFive, futureDate(), "15:00", 180))
            .toThrow(/run past the city's closing time/);
    });

    test("accepts any minute as a start time, not just whole hours", () => {
        expect(() => assertBookingWindow(city, futureDate(), "12:20", 120)).not.toThrow();
        expect(() => assertBookingWindow(city, futureDate(), "15:35", 60)).not.toThrow();
    });

    test("words the duration in the too-late message, never as a raw minute count", () => {
        expect(() => assertBookingWindow(city, futureDate(), "17:00", 85))
            .toThrow(/1 h 25 min booking starting at 17:00/);
    });
});

describe("assertBookingWindow - advance notice", () => {
    // 16 August 2026 at 15:00, the specification's worked example.
    const now = new Date(2026, 7, 16, 15, 0);
    const allDay = { workingHourStarts: "00:00", workingHourEnds: "23:59" };
    const instant = { allowInstantBooking: true };

    test("accepts a start exactly 48 hours out", () => {
        expect(() => assertBookingWindow(allDay, "2026-08-18", "15:00", 60, { now }))
            .not.toThrow();
    });

    test("rejects 47 h 59 m - the rule is the clock, not the calendar day", () => {
        expect(() => assertBookingWindow(allDay, "2026-08-18", "14:59", 60, { now }))
            .toThrow(/at least 48 hours in advance/);
    });

    test("names the earliest bookable moment in the refusal", () => {
        expect(() => assertBookingWindow(allDay, "2026-08-17", "15:00", 60, { now }))
            .toThrow(/2026-08-18 at 15:00/);
    });

    test("a service with instant booking skips the notice entirely", () => {
        expect(() =>
            assertBookingWindow(allDay, "2026-08-16", "16:00", 60, { now, service: instant })
        ).not.toThrow();
    });

    test("instant booking still cannot reach a start that has passed", () => {
        expect(() =>
            assertBookingWindow(allDay, "2026-08-16", "08:00", 60, { now, service: instant })
        ).toThrow(/must be in the future/);
    });

    test("instant booking still has to finish inside the city's day", () => {
        const nineToFive = { workingHourStarts: "09:00", workingHourEnds: "17:00" };
        // Booking at 15:30 today: 90 minutes fits exactly, 91 does not.
        expect(() =>
            assertBookingWindow(nineToFive, "2026-08-16", "15:30", 90, { now, service: instant })
        ).not.toThrow();
        expect(() =>
            assertBookingWindow(nineToFive, "2026-08-16", "15:30", 91, { now, service: instant })
        ).toThrow(/run past the city's closing time/);
    });

    test("a service without the flag waits the full 48 hours", () => {
        expect(() =>
            assertBookingWindow(allDay, "2026-08-16", "16:00", 60, { now, service: {} })
        ).toThrow(/at least 48 hours in advance/);
    });
});

describe("formatEuro", () => {
    test("formats numbers as EUR currency", () => {
        expect(formatEuro(44.8)).toMatch(/44\.80/);
        expect(formatEuro(44.8)).toMatch(/€/);
    });

    test("falls back to zero for garbage input", () => {
        expect(formatEuro("garbage")).toMatch(/0\.00/);
    });
});

describe("booking confirmation email", () => {
    const details = {
        customerName: "Mario Rossi",
        serviceName: "Deep Cleaning",
        bookingDate: "2026-08-01",
        bookingTime: "10:00",
        durationMinutes: 85,
        cleaners: 2,
        streetName: "Via Roma",
        houseNumber: "12",
        totalAmount: 129.9
    };

    test("returns subject, html and plain-text parts", () => {
        const { subject, html, text } = renderBookingConfirmationEmail(details);
        expect(subject).toMatch(/confirmed/i);
        expect(html).toContain("Mario Rossi");
        expect(html).toContain("2026-08-01");
        expect(text).toContain("Deep Cleaning");
        expect(text).toContain("10:00");
        // The exact-minute length reads as words, never as "85".
        expect(text).toContain("1 h 25 min");
    });

    test("escapes HTML in customer-controlled values", () => {
        const { html } = renderBookingConfirmationEmail({
            ...details,
            customerName: `<script>alert("xss")</script>`
        });
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
    });
});

describe("refund email", () => {
    test("mentions the refunded amount and escapes the name", () => {
        const { subject, html, text } = renderRefundEmail({
            customerName: "<b>Eve</b>",
            serviceName: "Deep Cleaning",
            bookingDate: "2026-08-01",
            amount: 40
        });
        expect(subject).toMatch(/refunded/i);
        expect(html).toContain("&lt;b&gt;Eve&lt;/b&gt;");
        expect(html).not.toContain("<b>Eve</b>");
        expect(text).toContain("2026-08-01");
    });
});
