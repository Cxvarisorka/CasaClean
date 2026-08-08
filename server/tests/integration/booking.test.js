// Booking flows: admin manual creation (fail-closed resolution + server-side
// pricing), listing/scoping, admin edits with re-pricing, customer
// self-cancellation with the refund policy, and deletion.
const { api, stripeMock, sendEmailMock } = require("../setup/testEnv");
const {
    createUser,
    createAdmin,
    cookieFor,
    createCity,
    createService,
    createSpecialRequest,
    createCleaningTool,
    createWorker,
    createPaidBooking,
    validBookingBody,
    dateStr,
    dateTimeIn
} = require("../setup/fixtures");

const Booking = require("../../models/booking.model");

describe("POST /api/v1/booking (admin manual bookings)", () => {
    test("customers cannot use the direct-create endpoint (they must pay online)", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();

        const res = await api.post("/api/v1/booking")
            .set("Cookie", cookieFor(user))
            .send(validBookingBody(service, city));
        expect(res.status).toBe(403);
    });

    test("admin self-booking is confirmed, manual and priced server-side", async () => {
        const admin = await createAdmin();
        const service = await createService({ pricePerHour: 20 });
        const city = await createCity();
        const addon = await createSpecialRequest({ price: 15 });
        const tool = await createCleaningTool({ price: 5 });

        const res = await api.post("/api/v1/booking")
            .set("Cookie", cookieFor(admin))
            .send(validBookingBody(service, city, {
                hours: 3,
                cleaners: 2,
                specialRequests: [String(addon._id)],
                cleaningTools: [String(tool._id)]
            }));

        expect(res.status).toBe(201);
        const booking = res.body.data.booking;
        // 20 €/h * 3h + 15 + 5 — computed by the server, never from the client.
        expect(booking.totalAmount).toBe(140);
        expect(booking.status).toBe("confirmed");
        expect(booking.paymentMethod).toBe("manual");
        expect(booking.paymentStatus).toBe("manual");
        expect(booking.customerEmail).toBe(admin.email);
        expect(sendEmailMock).toHaveBeenCalledTimes(1); // confirmation email
    });

    test("an admin booking on a customer's behalf starts as pending", async () => {
        const admin = await createAdmin();
        const customer = await createUser();
        const service = await createService();
        const city = await createCity();

        const res = await api.post("/api/v1/booking")
            .set("Cookie", cookieFor(admin))
            .send(validBookingBody(service, city, { userId: String(customer._id) }));

        expect(res.status).toBe(201);
        expect(res.body.data.booking.status).toBe("pending");
        expect(res.body.data.booking.user).toBe(String(customer._id));
        expect(res.body.data.booking.customerEmail).toBe(customer.email);
    });

    test("client-supplied totalAmount is rejected by the strict schema", async () => {
        const admin = await createAdmin();
        const service = await createService();
        const city = await createCity();

        const res = await api.post("/api/v1/booking")
            .set("Cookie", cookieFor(admin))
            .send(validBookingBody(service, city, { totalAmount: 0.01 }));
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Validation failed/);
    });

    test("rejects more than 10 cleaners", async () => {
        const admin = await createAdmin();
        const service = await createService();
        const city = await createCity();
        const res = await api.post("/api/v1/booking")
            .set("Cookie", cookieFor(admin))
            .send(validBookingBody(service, city, { cleaners: 11 }));
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Validation failed/);
    });

    describe("fail-closed reference resolution", () => {
        test("rejects a disabled service", async () => {
            const admin = await createAdmin();
            const service = await createService({ enabled: false });
            const city = await createCity();
            const res = await api.post("/api/v1/booking")
                .set("Cookie", cookieFor(admin))
                .send(validBookingBody(service, city));
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/service does not exist or is unavailable/i);
        });

        test("rejects a disabled city", async () => {
            const admin = await createAdmin();
            const service = await createService();
            const city = await createCity({ enabled: false });
            const res = await api.post("/api/v1/booking")
                .set("Cookie", cookieFor(admin))
                .send(validBookingBody(service, city));
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/city does not exist or is unavailable/i);
        });

        test("rejects a city outside a restricted service's coverage", async () => {
            const admin = await createAdmin();
            const covered = await createCity();
            const uncovered = await createCity();
            const service = await createService({ allCities: false, cities: [covered._id] });

            const res = await api.post("/api/v1/booking")
                .set("Cookie", cookieFor(admin))
                .send(validBookingBody(service, uncovered));
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/not available in the chosen city/i);
        });

        test("rejects a disabled add-on", async () => {
            const admin = await createAdmin();
            const service = await createService();
            const city = await createCity();
            const addon = await createSpecialRequest({ enabled: false });

            const res = await api.post("/api/v1/booking")
                .set("Cookie", cookieFor(admin))
                .send(validBookingBody(service, city, { specialRequests: [String(addon._id)] }));
            expect(res.status).toBe(400);
        });

        test("rejects an add-on the service doesn't offer", async () => {
            const admin = await createAdmin();
            const offered = await createSpecialRequest();
            const notOffered = await createSpecialRequest();
            const service = await createService({
                allSpecialRequests: false,
                specialRequests: [offered._id]
            });
            const city = await createCity();

            const res = await api.post("/api/v1/booking")
                .set("Cookie", cookieFor(admin))
                .send(validBookingBody(service, city, { specialRequests: [String(notOffered._id)] }));
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/not available for this service/i);
        });

        test("rejects a tool restricted to a different service", async () => {
            const admin = await createAdmin();
            const service = await createService();
            const otherService = await createService();
            const city = await createCity();
            const tool = await createCleaningTool({ services: [otherService._id] });

            const res = await api.post("/api/v1/booking")
                .set("Cookie", cookieFor(admin))
                .send(validBookingBody(service, city, { cleaningTools: [String(tool._id)] }));
            expect(res.status).toBe(400);
        });
    });

    describe("working-hours window", () => {
        test("rejects a start outside the city's working hours", async () => {
            const admin = await createAdmin();
            const service = await createService();
            const city = await createCity({ workingHourStarts: "09:00", workingHourEnds: "17:00" });

            const res = await api.post("/api/v1/booking")
                .set("Cookie", cookieFor(admin))
                .send(validBookingBody(service, city, { bookingTime: "07:00" }));
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/outside city working hours/i);
        });

        test("rejects a booking that would run past closing time", async () => {
            const admin = await createAdmin();
            const service = await createService();
            const city = await createCity({ workingHourStarts: "09:00", workingHourEnds: "17:00" });

            const res = await api.post("/api/v1/booking")
                .set("Cookie", cookieFor(admin))
                .send(validBookingBody(service, city, { bookingTime: "16:00", hours: 4 }));
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/run past the city's closing time/i);
        });

        test("rejects a past date at the validation layer", async () => {
            const admin = await createAdmin();
            const service = await createService();
            const city = await createCity();

            const res = await api.post("/api/v1/booking")
                .set("Cookie", cookieFor(admin))
                .send(validBookingBody(service, city, { bookingDate: "2020-01-01" }));
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Validation failed/);
        });
    });

    test("admin can assign workers; ids are validated fail-closed", async () => {
        const admin = await createAdmin();
        const service = await createService();
        const city = await createCity();
        const worker = await createWorker();

        const ok = await api.post("/api/v1/booking")
            .set("Cookie", cookieFor(admin))
            .send(validBookingBody(service, city, { workers: [String(worker._id)] }));
        expect(ok.status).toBe(201);
        expect(ok.body.data.booking.workers).toEqual([String(worker._id)]);

        const bad = await api.post("/api/v1/booking")
            .set("Cookie", cookieFor(admin))
            .send(validBookingBody(service, city, { workers: ["64b000000000000000000000"] }));
        expect(bad.status).toBe(400);
    });
});

describe("listing and scoping", () => {
    test("GET /booking/my only returns the caller's bookings", async () => {
        const service = await createService();
        const city = await createCity();
        const alice = await createUser();
        const bob = await createUser();
        await createPaidBooking(alice, service, city);
        await createPaidBooking(bob, service, city);

        const res = await api.get("/api/v1/booking/my").set("Cookie", cookieFor(alice));
        expect(res.status).toBe(200);
        expect(res.body.bookingCount).toBe(1);
        expect(res.body.data.bookings).toHaveLength(1);
    });

    test("GET /booking (admin) supports status and date filters", async () => {
        const admin = await createAdmin();
        const service = await createService();
        const city = await createCity();
        const user = await createUser();
        await createPaidBooking(user, service, city, { status: "confirmed", bookingDate: dateStr(3) });
        await createPaidBooking(user, service, city, { status: "cancelled", bookingDate: dateStr(30) });

        const byStatus = await api.get("/api/v1/booking?status=cancelled")
            .set("Cookie", cookieFor(admin));
        expect(byStatus.body.bookingCount).toBe(1);
        expect(byStatus.body.data.bookings[0].status).toBe("cancelled");

        const byDate = await api.get(`/api/v1/booking?from=${dateStr(2)}&to=${dateStr(5)}`)
            .set("Cookie", cookieFor(admin));
        expect(byDate.body.bookingCount).toBe(1);
        expect(byDate.body.data.bookings[0].bookingDate).toBe(dateStr(3));
    });

    test("GET /booking/:id is admin-only and 404s when missing", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city);

        const asUser = await api.get(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(user));
        expect(asUser.status).toBe(403);

        const found = await api.get(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin));
        expect(found.status).toBe(200);

        const missing = await api.get("/api/v1/booking/64b000000000000000000000")
            .set("Cookie", cookieFor(admin));
        expect(missing.status).toBe(404);
    });
});

describe("PATCH /api/v1/booking/:id (admin edit)", () => {
    test("re-pointing a booking at another service is rejected, not silently ignored", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const otherService = await createService({ pricePerHour: 99 });
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, { totalAmount: 40 });

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ serviceId: String(otherService._id) });

        expect(res.status).toBe(400);
        const fresh = await Booking.findById(booking._id);
        expect(String(fresh.serviceId)).toBe(String(service._id));
        expect(fresh.totalAmount).toBe(40);
    });

    test("recomputes the total when hours change", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService({ pricePerHour: 20 });
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, { hours: 2, totalAmount: 40 });

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ hours: 5 });

        expect(res.status).toBe(200);
        expect(res.body.data.booking.totalAmount).toBe(100);
    });

    test("recomputes the total when cleaners change", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService({ pricePerHour: 20 });
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, { totalAmount: 40 });
        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ cleaners: 3 });
        expect(res.status).toBe(200);
        expect(res.body.data.booking.totalAmount).toBe(120);
    });

    test("cannot overwrite server-managed payment fields (strict schema)", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city);

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ paymentStatus: "refunded" });
        expect(res.status).toBe(400);
    });

    test("admin cancellation of a paid card booking refunds the charge", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city);

        stripeMock.refunds.create.mockResolvedValue({ id: "re_admin_1" });

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ status: "cancelled" });

        expect(res.status).toBe(200);
        // The idempotency key is what stops two concurrent cancels producing
        // two refunds, so assert it explicitly rather than ignoring the option.
        expect(stripeMock.refunds.create).toHaveBeenCalledWith(
            { payment_intent: booking.paymentIntentId },
            { idempotencyKey: `refund:booking:${booking._id}` }
        );
        const fresh = await Booking.findById(booking._id);
        expect(fresh.status).toBe("cancelled");
        expect(fresh.paymentStatus).toBe("refunded");
        expect(fresh.refundId).toBe("re_admin_1");
        expect(sendEmailMock).toHaveBeenCalledTimes(1); // refund email
    });

    // The admin edit form seeds every field from the booking and re-sends them,
    // so an edit to a PAST booking (marking it completed, adding notes,
    // assigning staff after the fact) always carries its own past bookingDate.
    // A blanket "no past dates" rule used to live in editBookingSchema and made
    // every one of those edits fail with "Validation failed!".
    test("editing a past booking with its own unchanged date is allowed", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, {
            bookingDate: dateStr(-30),
            status: "confirmed"
        });

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({
                status: "completed",
                bookingDate: dateStr(-30),
                bookingTime: "10:00",
                notes: "Keys returned to the concierge."
            });

        expect(res.status).toBe(200);
        expect(res.body.data.booking.status).toBe("completed");
        expect(res.body.data.booking.bookingDate).toBe(dateStr(-30));
    });

    test("a status-only edit of a past booking succeeds", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, {
            bookingDate: dateStr(-3)
        });

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ status: "completed" });

        expect(res.status).toBe(200);
    });

    test("actually RESCHEDULING a booking into the past is still rejected", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city);

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ bookingDate: dateStr(-1) });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/past/i);
        const fresh = await Booking.findById(booking._id);
        expect(fresh.bookingDate).toBe(booking.bookingDate);
    });

    test("a malformed date is still rejected by the schema", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city);

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ bookingDate: "04/02/2026" });

        expect(res.status).toBe(400);
    });

    test("a validation failure names the offending field", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city);

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ hours: 99 });

        expect(res.status).toBe(400);
        expect(res.body.fields).toHaveProperty("hours");
    });

    test("re-cancelling an already-cancelled booking never double-refunds", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, { status: "cancelled" });

        const res = await api.patch(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ status: "cancelled" });

        expect(res.status).toBe(200);
        expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    });
});

describe("PATCH /api/v1/booking/:id/cancel (customer self-cancel)", () => {
    test("a user cannot cancel someone else's booking (404, no leak)", async () => {
        const owner = await createUser();
        const attacker = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(owner, service, city);

        const res = await api.patch(`/api/v1/booking/${booking._id}/cancel`)
            .set("Cookie", cookieFor(attacker));
        expect(res.status).toBe(404);
        expect((await Booking.findById(booking._id)).status).toBe("confirmed");
    });

    test("cancelling early enough refunds a paid card booking", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        // 72h ahead — outside the 24h no-refund window.
        const booking = await createPaidBooking(user, service, city, dateTimeIn(72));

        stripeMock.refunds.create.mockResolvedValue({ id: "re_user_1" });

        const res = await api.patch(`/api/v1/booking/${booking._id}/cancel`)
            .set("Cookie", cookieFor(user));

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/refunded/i);
        expect(stripeMock.refunds.create).toHaveBeenCalledTimes(1);
        const fresh = await Booking.findById(booking._id);
        expect(fresh.status).toBe("cancelled");
        expect(fresh.paymentStatus).toBe("refunded");
    });

    test("two concurrent cancels issue exactly one refund", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, dateTimeIn(72));

        stripeMock.refunds.create.mockResolvedValue({ id: "re_race_1" });
        const cookie = cookieFor(user);

        // Both requests race the same booking. Only the one that wins the atomic
        // status claim may talk to Stripe; the loser must be rejected outright.
        const [a, b] = await Promise.all([
            api.patch(`/api/v1/booking/${booking._id}/cancel`).set("Cookie", cookie),
            api.patch(`/api/v1/booking/${booking._id}/cancel`).set("Cookie", cookie)
        ]);

        const statuses = [a.status, b.status].sort();
        expect(statuses).toEqual([200, 400]);
        expect(stripeMock.refunds.create).toHaveBeenCalledTimes(1);

        const fresh = await Booking.findById(booking._id);
        expect(fresh.status).toBe("cancelled");
        expect(fresh.paymentStatus).toBe("refunded");
    });

    test("a failed refund leaves the booking uncancelled", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, dateTimeIn(72));

        stripeMock.refunds.create.mockRejectedValue(
            Object.assign(new Error("Stripe is down"), { type: "StripeAPIError" })
        );

        const res = await api.patch(`/api/v1/booking/${booking._id}/cancel`)
            .set("Cookie", cookieFor(user));

        expect(res.status).toBe(502);
        // The atomic claim must be rolled back — a booking cancelled while the
        // customer is still charged is the exact state this guards against.
        const fresh = await Booking.findById(booking._id);
        expect(fresh.status).toBe("confirmed");
        expect(fresh.paymentStatus).toBe("paid");
    });

    test("cancelling inside the 24h window keeps the money (no refund)", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        // 2h ahead — inside the no-refund window.
        const booking = await createPaidBooking(user, service, city, dateTimeIn(2));

        const res = await api.patch(`/api/v1/booking/${booking._id}/cancel`)
            .set("Cookie", cookieFor(user));

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/contact support/i);
        expect(stripeMock.refunds.create).not.toHaveBeenCalled();
        const fresh = await Booking.findById(booking._id);
        expect(fresh.status).toBe("cancelled");
        expect(fresh.paymentStatus).toBe("paid");
    });

    test("a Stripe refund failure aborts the cancellation", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, dateTimeIn(72));

        stripeMock.refunds.create.mockRejectedValue(
            Object.assign(new Error("stripe down"), { type: "StripeAPIError" })
        );

        const res = await api.patch(`/api/v1/booking/${booking._id}/cancel`)
            .set("Cookie", cookieFor(user));

        expect(res.status).toBeGreaterThanOrEqual(500);
        // Never mark a booking cancelled while the customer is still charged.
        const fresh = await Booking.findById(booking._id);
        expect(fresh.status).toBe("confirmed");
        expect(fresh.paymentStatus).toBe("paid");
    });

    test("completed and already-cancelled bookings can't be cancelled", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const completed = await createPaidBooking(user, service, city, { status: "completed" });
        const cancelled = await createPaidBooking(user, service, city, { status: "cancelled" });

        const r1 = await api.patch(`/api/v1/booking/${completed._id}/cancel`)
            .set("Cookie", cookieFor(user));
        expect(r1.status).toBe(400);

        const r2 = await api.patch(`/api/v1/booking/${cancelled._id}/cancel`)
            .set("Cookie", cookieFor(user));
        expect(r2.status).toBe(400);
    });

    test("manual (offline) bookings cancel without touching Stripe", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, {
            ...dateTimeIn(72),
            paymentMethod: "manual",
            paymentStatus: "manual",
            paymentIntentId: undefined
        });

        const res = await api.patch(`/api/v1/booking/${booking._id}/cancel`)
            .set("Cookie", cookieFor(user));
        expect(res.status).toBe(200);
        expect(stripeMock.refunds.create).not.toHaveBeenCalled();
        expect((await Booking.findById(booking._id)).status).toBe("cancelled");
    });
});

describe("DELETE /api/v1/booking/:id", () => {
    test("is admin-only", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city);

        const asUser = await api.delete(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(user));
        expect(asUser.status).toBe(403);

        const admin = await createAdmin();
        const asAdmin = await api.delete(`/api/v1/booking/${booking._id}`)
            .set("Cookie", cookieFor(admin));
        expect(asAdmin.status).toBe(200);
        expect(await Booking.findById(booking._id)).toBeNull();
    });
});
