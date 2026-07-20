// Subscription-cycle webhook coverage uses the real Stripe signature verifier
// exposed by the shared Stripe mock, just like the existing one-off webhook
// suite.
const { app, request, stripeMock, sendEmailMock } = require("../setup/testEnv");
const { createUser, createCity, createService, dateStr } = require("../setup/fixtures");
const { createSubscription } = require("../setup/subscriptionFixtures");

const Booking = require("../../models/booking.model");
const PendingBooking = require("../../models/pendingBooking.model");
const Subscription = require("../../models/subscription.model");
const { addDaysToDateString } = require("../../utils/date.util");

let eventSequence = 0;

const deliver = (type, object, eventId = `evt_subscription_${++eventSequence}`) => {
    const payload = JSON.stringify({
        id: eventId,
        type,
        data: { object }
    });
    const signature = stripeMock.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET
    });
    return request(app)
        .post("/webhooks/stripe")
        .set("stripe-signature", signature)
        .set("content-type", "application/json")
        .send(payload);
};

describe("subscription-cycle webhooks", () => {
    test("creates a paid cycle booking as a succeeded-event backstop and advances only once", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const subscription = await createSubscription(user, service, city, {
            nextServiceDate: dateStr(2),
            intervalDays: 3
        });
        const paymentIntent = {
            id: "pi_subscription_hook_success",
            status: "succeeded",
            amount: 4000,
            customer: subscription.stripeCustomerId,
            metadata: {
                type: "subscription-cycle",
                subscriptionId: String(subscription._id),
                serviceDate: subscription.nextServiceDate,
                userId: String(user._id)
            }
        };

        const first = await deliver("payment_intent.succeeded", paymentIntent, "evt_subscription_success_1");
        // Different Stripe event id: the event ledger cannot hide a bad
        // schedule/idempotency implementation here.
        const second = await deliver("payment_intent.succeeded", paymentIntent, "evt_subscription_success_2");

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(await Booking.countDocuments({ paymentIntentId: paymentIntent.id })).toBe(1);

        const booking = await Booking.findOne({ paymentIntentId: paymentIntent.id });
        expect(booking).toMatchObject({
            status: "confirmed",
            paymentStatus: "paid",
            totalAmount: 40,
            bookingDate: subscription.nextServiceDate
        });
        expect(String(booking.subscriptionId)).toBe(String(subscription._id));

        const fresh = await Subscription.findById(subscription._id);
        expect(fresh.nextServiceDate).toBe(addDaysToDateString(subscription.nextServiceDate, 3));
        expect(fresh.chargeAttempts).toHaveLength(1);
        expect(fresh.chargeAttempts[0]).toMatchObject({
            status: "succeeded",
            paymentIntentId: paymentIntent.id,
            amount: 40
        });
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    test("does not send the one-off failure email for a subscription-cycle decline", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();

        // Deliberately leave a matching pending draft behind. The legacy
        // one-off branch would email it, so silence proves the early return.
        await PendingBooking.create({
            user: user._id,
            paymentIntentId: "pi_subscription_hook_failed",
            draft: {
                serviceId: service._id,
                cityId: city._id,
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

        const res = await deliver("payment_intent.payment_failed", {
            id: "pi_subscription_hook_failed",
            metadata: { type: "subscription-cycle" },
            last_payment_error: { message: "Your card was declined." }
        });

        expect(res.status).toBe(200);
        expect(await Booking.countDocuments()).toBe(0);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });
});
