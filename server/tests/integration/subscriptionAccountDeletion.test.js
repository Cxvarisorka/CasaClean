// Account removal must stop unattended charging without rewriting historical
// paused/cancelled subscription state.  Exercise both auth deletion paths via
// the real HTTP routes and shared Mongo/Stripe test harness.
const { api } = require("../setup/testEnv");
const { createUser, createAdmin, cookieFor, createCity, createService } = require("../setup/fixtures");
const { createSubscription } = require("../setup/subscriptionFixtures");

const Subscription = require("../../models/subscription.model");

const seedSubscriptionStates = async (user) => {
    const service = await createService();
    const city = await createCity();
    const preservedCancelledAt = new Date("2025-01-02T03:04:05.000Z");
    const active = await createSubscription(user, service, city, {
        processingAt: new Date()
    });
    const paused = await createSubscription(user, service, city, {
        status: "paused",
        pausedReason: "card-removed",
        pausedAt: new Date("2025-01-01T00:00:00.000Z")
    });
    const cancelled = await createSubscription(user, service, city, {
        status: "cancelled",
        cancelledAt: preservedCancelledAt
    });
    return { active, paused, cancelled, preservedCancelledAt };
};

const expectOnlyActiveCancelled = async ({ active, paused, cancelled, preservedCancelledAt }) => {
    const [activeFresh, pausedFresh, cancelledFresh] = await Promise.all([
        Subscription.findById(active._id),
        Subscription.findById(paused._id),
        Subscription.findById(cancelled._id)
    ]);

    expect(activeFresh.status).toBe("cancelled");
    expect(activeFresh.cancelledAt).toBeInstanceOf(Date);
    expect(activeFresh.processingAt).toBeNull();

    expect(pausedFresh.status).toBe("paused");
    expect(pausedFresh.pausedReason).toBe("card-removed");
    expect(pausedFresh.cancelledAt).toBeUndefined();

    expect(cancelledFresh.status).toBe("cancelled");
    expect(cancelledFresh.cancelledAt.getTime()).toBe(preservedCancelledAt.getTime());
};

describe("subscription safety during account deletion", () => {
    test("self-delete cancels active subscriptions but preserves paused and cancelled history", async () => {
        const user = await createUser();
        const states = await seedSubscriptionStates(user);

        const res = await api.delete("/api/v1/auth/me")
            .set("Cookie", cookieFor(user))
            .send({ password: "password123" });

        expect(res.status).toBe(200);
        await expectOnlyActiveCancelled(states);
    });

    test("admin deletion applies the same active-subscription cancellation rule", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const states = await seedSubscriptionStates(user);

        const res = await api.delete(`/api/v1/auth/users/${user._id}`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(200);
        await expectOnlyActiveCancelled(states);
    });
});
