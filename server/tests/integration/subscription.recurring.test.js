// First recurring-payment cycle and customer subscription controls.  Stripe is
// mocked at the SDK boundary by testEnv; these tests retain the real Express,
// Mongoose and validation paths.
const { api, stripeMock } = require("../setup/testEnv");
const {
    createUser,
    cookieFor,
    createCity,
    createService,
    createPaidBooking,
    validBookingBody,
    dateStr
} = require("../setup/fixtures");
const { createSubscription } = require("../setup/subscriptionFixtures");

const Booking = require("../../models/booking.model");
const PendingBooking = require("../../models/pendingBooking.model");
const Subscription = require("../../models/subscription.model");
const {
    addDaysToDateString,
    localMidnight,
    todayString
} = require("../../utils/date.util");
const { getChargeLeadDays } = require("../../services/subscription.service");
const { toMinorUnits } = require("../../utils/money.util");

describe("recurring first-cycle payment", () => {
    test("rejects recurrence unless the first payment saves or uses a card", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();

        const res = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send(validBookingBody(service, city, { intervalDays: 3 }));

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/recurring booking requires a saved card/i);
        expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
        expect(await PendingBooking.countDocuments()).toBe(0);
    });

    test("persists recurrence and creates one backfilled subscription after payment", async () => {
        const user = await createUser({ stripeCustomerId: "cus_recurring_first" });
        const service = await createService({ pricePerHour: 20 });
        const city = await createCity();
        const bookingDate = dateStr(5);

        stripeMock.paymentIntents.create.mockImplementation(async (params) => ({
            id: "pi_recurring_first",
            client_secret: "pi_recurring_first_secret",
            status: "requires_payment_method",
            amount: params.amount,
            customer: params.customer
        }));

        const intentRes = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send(validBookingBody(service, city, {
                bookingDate,
                intervalDays: 3,
                savePaymentMethod: true
            }));

        expect(intentRes.status).toBe(201);
        expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: toMinorUnits(40),
                customer: "cus_recurring_first",
                setup_future_usage: "off_session",
                metadata: expect.objectContaining({
                    type: "booking",
                    recurring: "true",
                    intervalDays: "3"
                })
            })
        );

        const pending = await PendingBooking.findOne({ paymentIntentId: "pi_recurring_first" });
        expect(pending).not.toBeNull();
        expect(pending.recurrence).toMatchObject({ intervalDays: 3 });

        stripeMock.paymentIntents.retrieve.mockResolvedValue({
            id: "pi_recurring_first",
            status: "succeeded",
            amount: toMinorUnits(40),
            customer: "cus_recurring_first",
            payment_method: "pm_recurring_first"
        });

        const cookie = cookieFor(user);
        const finalized = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookie)
            .send({ paymentIntentId: "pi_recurring_first" });
        const duplicateFinalize = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookie)
            .send({ paymentIntentId: "pi_recurring_first" });

        expect(finalized.status).toBe(201);
        expect(duplicateFinalize.status).toBe(201);
        expect(duplicateFinalize.body.data.booking._id).toBe(finalized.body.data.booking._id);

        const subscription = await Subscription.findOne({ firstPaymentIntentId: "pi_recurring_first" });
        expect(subscription).not.toBeNull();
        expect(subscription.paymentMethodId).toBe("pm_recurring_first");
        expect(subscription.stripeCustomerId).toBe("cus_recurring_first");
        expect(subscription.nextServiceDate).toBe(addDaysToDateString(bookingDate, 3));
        expect(subscription.nextChargeAt).toEqual(
            localMidnight(addDaysToDateString(subscription.nextServiceDate, -getChargeLeadDays()))
        );
        expect(await Subscription.countDocuments({ firstPaymentIntentId: "pi_recurring_first" })).toBe(1);

        const booking = await Booking.findOne({ paymentIntentId: "pi_recurring_first" });
        expect(String(booking.subscriptionId)).toBe(String(subscription._id));
        expect(await PendingBooking.countDocuments({ paymentIntentId: "pi_recurring_first" })).toBe(0);
    });
});

describe("cancelling a subscription", () => {
    test("does not cancel or refund already-created paid cycle bookings", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const subscription = await createSubscription(user, service, city);
        const booking = await createPaidBooking(user, service, city, {
            subscriptionId: subscription._id,
            paymentIntentId: "pi_paid_cycle_kept"
        });

        const res = await api.patch(`/api/v1/subscription/${subscription._id}/cancel`)
            .set("Cookie", cookieFor(user))
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.data.subscription.status).toBe("cancelled");
        expect(res.body.data.subscription.cancelledAt).toBeTruthy();
        expect(stripeMock.refunds.create).not.toHaveBeenCalled();

        const unchangedBooking = await Booking.findById(booking._id);
        expect(unchangedBooking.status).toBe("confirmed");
        expect(unchangedBooking.paymentStatus).toBe("paid");
        expect(unchangedBooking.paymentIntentId).toBe("pi_paid_cycle_kept");
    });
});

describe("subscription ownership and resume", () => {
    test("hides another user's subscription and rolls a stale paused schedule forward", async () => {
        const user = await createUser();
        const otherUser = await createUser();
        const service = await createService();
        const city = await createCity();
        const subscription = await createSubscription(user, service, city, {
            status: "paused",
            pausedReason: "payment-failed",
            failedAttempts: 3,
            nextServiceDate: dateStr(-2),
            nextChargeAt: new Date(Date.now() - 60_000)
        });

        const forbidden = await api.patch(`/api/v1/subscription/${subscription._id}/resume`)
            .set("Cookie", cookieFor(otherUser))
            .send({});

        expect(forbidden.status).toBe(404);

        stripeMock.paymentMethods.retrieve.mockResolvedValue({
            id: subscription.paymentMethodId,
            customer: subscription.stripeCustomerId
        });

        const resumed = await api.patch(`/api/v1/subscription/${subscription._id}/resume`)
            .set("Cookie", cookieFor(user))
            .send({});

        expect(resumed.status).toBe(200);
        const expectedServiceDate = addDaysToDateString(todayString(), subscription.intervalDays);
        expect(resumed.body.data.subscription.status).toBe("active");
        expect(resumed.body.data.subscription.nextServiceDate).toBe(expectedServiceDate);
        expect(new Date(resumed.body.data.subscription.nextChargeAt)).toEqual(
            localMidnight(addDaysToDateString(expectedServiceDate, -getChargeLeadDays()))
        );
        expect(resumed.body.data.subscription.failedAttempts).toBe(0);
    });
});
