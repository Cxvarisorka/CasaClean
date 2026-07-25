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
            service: { pricePerHour: 20 }, hours: 3, cleaners: 2,
            specialRequests: [{ price: 15 }], cleaningTools: [{ price: 5 }]
        })).toBe(140);
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

describe("assertBookingWindow", () => {
    test("accepts a booking fully inside working hours", () => {
        expect(() => assertBookingWindow(city, futureDate(), "09:00", 2)).not.toThrow();
        expect(() => assertBookingWindow(city, futureDate(), "15:30", 2)).not.toThrow();
    });

    test("rejects a start before opening", () => {
        expect(() => assertBookingWindow(city, futureDate(), "08:59", 1))
            .toThrow(/outside city working hours/);
    });

    test("rejects a start at or after closing", () => {
        expect(() => assertBookingWindow(city, futureDate(), "17:30", 1))
            .toThrow(/outside city working hours/);
        expect(() => assertBookingWindow(city, futureDate(), "18:00", 1))
            .toThrow(/outside city working hours/);
    });

    test("rejects a booking that would run past closing time", () => {
        // 16:30 + 8h runs long past a 17:30 close even though the start is valid.
        expect(() => assertBookingWindow(city, futureDate(), "16:30", 8))
            .toThrow(/run past the city's closing time/);
    });

    test("accepts a booking that ends exactly at closing time", () => {
        expect(() => assertBookingWindow(city, futureDate(), "15:30", 2)).not.toThrow();
    });

    test("rejects a same-day booking whose start time has already passed", () => {
        const now = new Date();
        const today = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
        const allDay = { workingHourStarts: "00:00", workingHourEnds: "23:59" };
        const earlier = `${String(Math.max(now.getHours() - 1, 0)).padStart(2, "0")}:00`;
        expect(() => assertBookingWindow(allDay, today, earlier, 1))
            .toThrow(/must be in the future/);
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
        hours: 3,
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
