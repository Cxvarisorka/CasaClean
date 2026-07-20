// Stripe webhook (/webhooks/stripe): signature verification runs the REAL
// Stripe HMAC check — payloads are signed with generateTestHeaderString and the
// same secret the app reads from STRIPE_WEBHOOK_SECRET.
const { app, request, stripeMock, sendEmailMock } = require("../setup/testEnv");
const {
    createUser,
    createCity,
    createService,
    createPaidBooking,
    dateStr
} = require("../setup/fixtures");

const Booking = require("../../models/booking.model");
const PendingBooking = require("../../models/pendingBooking.model");
const StripeEvent = require("../../models/stripeEvent.model");

let eventSeq = 0;

/** POST a signed Stripe event to the webhook endpoint. */
const deliver = (type, object, { eventId, signature } = {}) => {
    const payload = JSON.stringify({
        id: eventId || `evt_test_${++eventSeq}`,
        type,
        data: { object }
    });
    const sig = signature || stripeMock.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET
    });
    return request(app)
        .post("/webhooks/stripe")
        .set("stripe-signature", sig)
        .set("content-type", "application/json")
        .send(payload);
};

/** Seed a PendingBooking draft exactly as createBookingIntent would store it. */
const seedPendingBooking = async (paymentIntentId) => {
    const user = await createUser();
    const service = await createService({ pricePerHour: 20 });
    const city = await createCity();
    await PendingBooking.create({
        user: user._id,
        paymentIntentId,
        draft: {
            serviceId: service._id,
            cityId: city._id,
            serviceName: service.name,
            customerName: user.fullname,
            customerEmail: user.email,
            customerPhone: user.phone,
            streetName: "Via Roma",
            houseNumber: "12",
            propertySize: "80",
            doorbellName: "Rossi",
            bookingDate: dateStr(2),
            bookingTime: "10:00",
            hours: 2,
            cleaners: 1,
            totalAmount: 40
        }
    });
    return { user, service, city };
};

describe("signature verification", () => {
    test("rejects an unsigned payload", async () => {
        const res = await request(app)
            .post("/webhooks/stripe")
            .set("content-type", "application/json")
            .send(JSON.stringify({ id: "evt_x", type: "payment_intent.succeeded", data: { object: {} } }));
        expect(res.status).toBe(400);
        expect(res.text).toMatch(/Webhook Error/);
    });

    test("rejects a payload signed with the wrong secret", async () => {
        const payload = JSON.stringify({ id: "evt_x", type: "payment_intent.succeeded", data: { object: {} } });
        const badSig = stripeMock.webhooks.generateTestHeaderString({
            payload,
            secret: "whsec_wrong_secret"
        });
        const res = await deliver("payment_intent.succeeded", {}, { signature: badSig });
        expect(res.status).toBe(400);
    });

    test("rejects a tampered payload (signature no longer matches)", async () => {
        const payload = JSON.stringify({ id: "evt_x", type: "payment_intent.succeeded", data: { object: { id: "pi_1" } } });
        const sig = stripeMock.webhooks.generateTestHeaderString({
            payload,
            secret: process.env.STRIPE_WEBHOOK_SECRET
        });
        const res = await request(app)
            .post("/webhooks/stripe")
            .set("stripe-signature", sig)
            .set("content-type", "application/json")
            .send(payload.replace("pi_1", "pi_2"));
        expect(res.status).toBe(400);
    });
});

describe("payment_intent.succeeded (booking-creation backstop)", () => {
    test("promotes the pending draft into a paid booking without any client call", async () => {
        const { user } = await seedPendingBooking("pi_hook_1");

        const res = await deliver("payment_intent.succeeded", { id: "pi_hook_1", status: "succeeded" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ received: true });

        const booking = await Booking.findOne({ paymentIntentId: "pi_hook_1" });
        expect(booking).not.toBeNull();
        expect(booking.status).toBe("confirmed");
        expect(booking.paymentStatus).toBe("paid");
        expect(String(booking.user)).toBe(String(user._id));
        expect(booking.totalAmount).toBe(40);

        // Draft consumed; confirmation email dispatched (fire-and-forget).
        expect(await PendingBooking.countDocuments({ paymentIntentId: "pi_hook_1" })).toBe(0);
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    test("does nothing (but ACKs) when no draft or booking exists", async () => {
        const res = await deliver("payment_intent.succeeded", { id: "pi_ghost", status: "succeeded" });
        expect(res.status).toBe(200);
        expect(await Booking.countDocuments()).toBe(0);
    });

    test("never creates a second booking for an already-promoted intent", async () => {
        await seedPendingBooking("pi_hook_2");
        await deliver("payment_intent.succeeded", { id: "pi_hook_2", status: "succeeded" });

        // A second delivery with a DIFFERENT event id (so it isn't deduped) still
        // finds the existing booking instead of creating a duplicate.
        const res = await deliver("payment_intent.succeeded", { id: "pi_hook_2", status: "succeeded" });
        expect(res.status).toBe(200);
        expect(await Booking.countDocuments({ paymentIntentId: "pi_hook_2" })).toBe(1);
    });

    test("skips duplicate event ids entirely (processed-event ledger)", async () => {
        await seedPendingBooking("pi_hook_3");
        await deliver("payment_intent.succeeded", { id: "pi_hook_3", status: "succeeded" }, { eventId: "evt_dup" });
        // Delete the booking so a re-processed event WOULD recreate it.
        await Booking.deleteMany({ paymentIntentId: "pi_hook_3" });

        const res = await deliver("payment_intent.succeeded", { id: "pi_hook_3", status: "succeeded" }, { eventId: "evt_dup" });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ received: true, duplicate: true });
        expect(await Booking.countDocuments({ paymentIntentId: "pi_hook_3" })).toBe(0);

        expect(await StripeEvent.countDocuments({ eventId: "evt_dup" })).toBe(1);
    });
});

describe("payment_intent.payment_failed", () => {
    test("emails the customer a heads-up and creates no booking", async () => {
        const { user } = await seedPendingBooking("pi_fail_1");

        const res = await deliver("payment_intent.payment_failed", {
            id: "pi_fail_1",
            last_payment_error: { message: "Your card was declined." }
        });

        expect(res.status).toBe(200);
        expect(await Booking.countDocuments()).toBe(0);
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
        const mail = sendEmailMock.mock.calls[0][0];
        expect(mail.email).toBe(user.email);
        expect(mail.text).toMatch(/didn't go through/i);
        expect(mail.text).toMatch(/declined/i);
    });

    test("stays silent when there is no matching draft", async () => {
        const res = await deliver("payment_intent.payment_failed", { id: "pi_unknown" });
        expect(res.status).toBe(200);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });
});

describe("charge.refunded", () => {
    test("a FULL refund flips the booking's money state", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, {
            paymentIntentId: "pi_refund_1"
        });

        const res = await deliver("charge.refunded", {
            payment_intent: "pi_refund_1",
            amount: 4000,
            amount_refunded: 4000
        });

        expect(res.status).toBe(200);
        const fresh = await Booking.findById(booking._id);
        expect(fresh.paymentStatus).toBe("refunded");
        expect(fresh.stripeStatus).toBe("refunded");
        expect(fresh.refundedAt).toBeInstanceOf(Date);
    });

    test("a PARTIAL refund does NOT mark the booking refunded", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, {
            paymentIntentId: "pi_refund_2"
        });

        const res = await deliver("charge.refunded", {
            payment_intent: "pi_refund_2",
            amount: 4000,
            amount_refunded: 1000 // €10 goodwill refund from the dashboard
        });

        expect(res.status).toBe(200);
        const fresh = await Booking.findById(booking._id);
        expect(fresh.paymentStatus).toBe("paid");
    });
});

describe("unhandled event types", () => {
    test("are acknowledged so Stripe stops retrying", async () => {
        const res = await deliver("customer.created", { id: "cus_whatever" });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ received: true });
    });
});
