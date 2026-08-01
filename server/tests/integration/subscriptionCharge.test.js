// The scheduler uses the real Mongoose atomic claim query here; only Stripe
// and mail are mocked by the shared integration harness.
const { stripeMock, sendEmailMock } = require("../setup/testEnv");
const { createUser, createCity, createService, dateStr } = require("../setup/fixtures");
const { createSubscription } = require("../setup/subscriptionFixtures");

const Booking = require("../../models/booking.model");
const Subscription = require("../../models/subscription.model");
const { runSubscriptionCharges } = require("../../jobs/subscriptionCharge.job");
const { addDaysToDateString, localMidnight } = require("../../utils/date.util");
const { getChargeLeadDays } = require("../../services/subscription.service");
const { toMinorUnits } = require("../../utils/money.util");

const dueSubscription = async (overrides = {}) => {
    const user = await createUser();
    const service = await createService({ pricePerHour: 20 });
    const city = await createCity();
    const nextServiceDate = overrides.nextServiceDate || dateStr(1);
    const subscription = await createSubscription(user, service, city, {
        nextServiceDate,
        nextChargeAt: new Date(Date.now() - 60_000),
        ...overrides
    });
    return { user, service, city, subscription };
};

const mockOwnedCard = (subscription) => {
    stripeMock.paymentMethods.retrieve.mockResolvedValue({
        id: subscription.paymentMethodId,
        customer: subscription.stripeCustomerId
    });
};

describe("runSubscriptionCharges", () => {
    test("charges a claimed cycle once, creates its paid booking, and advances the schedule", async () => {
        const { user, subscription } = await dueSubscription({ intervalDays: 3 });
        mockOwnedCard(subscription);
        stripeMock.paymentIntents.create.mockResolvedValue({
            id: "pi_cycle_success",
            status: "succeeded"
        });

        // The second invocation overlaps the first and must be skipped; a later
        // sweep sees the advanced schedule and must also find nothing due.
        const [first, overlapping] = await Promise.all([
            runSubscriptionCharges(),
            runSubscriptionCharges()
        ]);
        const afterAdvance = await runSubscriptionCharges();

        expect(first).toMatchObject({ skipped: false, processed: 1 });
        expect(overlapping).toMatchObject({ skipped: true, processed: 0 });
        expect(afterAdvance).toMatchObject({ skipped: false, processed: 0 });
        expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(1);
        expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: toMinorUnits(40),
                currency: "eur",
                customer: subscription.stripeCustomerId,
                payment_method: subscription.paymentMethodId,
                off_session: true,
                confirm: true,
                receipt_email: user.email,
                metadata: expect.objectContaining({
                    type: "subscription-cycle",
                    subscriptionId: String(subscription._id),
                    serviceDate: subscription.nextServiceDate,
                    userId: String(user._id)
                })
            }),
            {
                idempotencyKey:
                    `subcycle:${subscription._id}:${subscription.nextServiceDate}:a0`
            }
        );

        const booking = await Booking.findOne({ paymentIntentId: "pi_cycle_success" });
        expect(booking).not.toBeNull();
        expect(booking.status).toBe("confirmed");
        expect(booking.paymentStatus).toBe("paid");
        expect(booking.amountPaid).toBe(40);
        expect(booking.bookingDate).toBe(subscription.nextServiceDate);
        expect(String(booking.subscriptionId)).toBe(String(subscription._id));

        const fresh = await Subscription.findById(subscription._id);
        const expectedServiceDate = addDaysToDateString(subscription.nextServiceDate, 3);
        expect(fresh.nextServiceDate).toBe(expectedServiceDate);
        expect(fresh.nextChargeAt).toEqual(
            localMidnight(addDaysToDateString(expectedServiceDate, -getChargeLeadDays()))
        );
        expect(fresh.failedAttempts).toBe(0);
        expect(fresh.processingAt).toBeNull();
        expect(fresh.chargeAttempts).toHaveLength(1);
        expect(fresh.chargeAttempts[0]).toMatchObject({
            serviceDate: subscription.nextServiceDate,
            status: "succeeded",
            paymentIntentId: "pi_cycle_success",
            amount: 40
        });
        expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ email: user.email }));
    });

    test("treats authentication_required as a card decline and uses a new idempotency key per retry", async () => {
        const { subscription } = await dueSubscription({ intervalDays: 3 });
        mockOwnedCard(subscription);
        const cardError = Object.assign(new Error("Off-session authentication is required."), {
            type: "StripeCardError",
            code: "authentication_required",
            payment_intent: { id: "pi_cycle_auth_required" }
        });
        stripeMock.paymentIntents.create.mockRejectedValue(cardError);

        for (let attempt = 1; attempt <= 3; attempt += 1) {
            await runSubscriptionCharges();
            const fresh = await Subscription.findById(subscription._id);

            expect(fresh.failedAttempts).toBe(attempt);
            expect(fresh.processingAt).toBeNull();
            expect(fresh.lastChargeStatus).toBe("failed");
            expect(fresh.chargeAttempts).toHaveLength(attempt);

            if (attempt < 3) {
                expect(fresh.status).toBe("active");
                // Allow a full hour of runner overhead while still proving the
                // retry moved out by approximately one day rather than staying due.
                expect(fresh.nextChargeAt.getTime()).toBeGreaterThan(
                    Date.now() + 23 * 60 * 60 * 1000
                );
                await Subscription.updateOne(
                    { _id: subscription._id },
                    { $set: { nextChargeAt: new Date(Date.now() - 60_000) } }
                );
            } else {
                expect(fresh.status).toBe("paused");
                expect(fresh.pausedReason).toBe("payment-failed");
            }
        }

        expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(3);
        expect(stripeMock.paymentIntents.create.mock.calls.map(([, options]) => options.idempotencyKey))
            .toEqual([
                `subcycle:${subscription._id}:${subscription.nextServiceDate}:a0`,
                `subcycle:${subscription._id}:${subscription.nextServiceDate}:a1`,
                `subcycle:${subscription._id}:${subscription.nextServiceDate}:a2`
            ]);
        expect(await Booking.countDocuments({ subscriptionId: subscription._id })).toBe(0);
        expect(sendEmailMock).toHaveBeenCalledTimes(3);
    });

    test("pauses instead of charging once the service stops offering that cadence", async () => {
        const { service, subscription } = await dueSubscription({ intervalDays: 3 });
        mockOwnedCard(subscription);

        // The admin narrows the service to a fortnightly cadence, orphaning this
        // three-day plan. The unattended charge must not go through.
        service.recurringIntervalDays = [14];
        await service.save();

        const result = await runSubscriptionCharges();

        expect(result).toMatchObject({ skipped: false, processed: 1 });
        expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();

        const fresh = await Subscription.findById(subscription._id);
        expect(fresh.status).toBe("paused");
        expect(fresh.pausedReason).toBe("service-unavailable");
        expect(fresh.lastError).toMatch(/can only repeat every 14 days/i);
        expect(fresh.processingAt).toBeNull();
        expect(await Booking.countDocuments({ subscriptionId: subscription._id })).toBe(0);
        expect(sendEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({ email: subscription.customerEmail })
        );
    });

    test("pauses when recurrence is switched off on the service entirely", async () => {
        const { service, subscription } = await dueSubscription();
        mockOwnedCard(subscription);

        service.recurringEnabled = false;
        await service.save();

        await runSubscriptionCharges();

        const fresh = await Subscription.findById(subscription._id);
        expect(fresh.status).toBe("paused");
        expect(fresh.pausedReason).toBe("service-unavailable");
        expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    });

    test("clears its claim but leaves schedule and retry state unchanged for non-Stripe failures", async () => {
        const { subscription } = await dueSubscription();
        const originalChargeAt = new Date(subscription.nextChargeAt);
        mockOwnedCard(subscription);
        stripeMock.paymentIntents.create.mockRejectedValue(
            Object.assign(new Error("Stripe API temporarily unavailable"), { type: "StripeAPIError" })
        );
        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        try {
            const result = await runSubscriptionCharges();
            expect(result).toMatchObject({ skipped: false, processed: 1 });
        } finally {
            errorSpy.mockRestore();
        }

        const fresh = await Subscription.findById(subscription._id);
        expect(fresh.status).toBe("active");
        expect(fresh.failedAttempts).toBe(0);
        expect(fresh.nextChargeAt.getTime()).toBe(originalChargeAt.getTime());
        expect(fresh.processingAt).toBeNull();
        expect(fresh.chargeAttempts).toHaveLength(0);
        expect(await Booking.countDocuments({ subscriptionId: subscription._id })).toBe(0);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });
});
