// Regression suite for the body-less subscription action endpoints.
//
// These six routes are validated with `z.object({}).strict()`, and the browser
// client calls them with NO request body at all. Axios' XHR adapter removes the
// default Content-Type header when `data` is undefined, so express.json() never
// runs and `req.body` arrives as `undefined` rather than `{}`.
//
// Every request below therefore omits `.send()` on purpose — sending `{}` (as
// the suite used to) sets a JSON Content-Type that the real client never sends,
// which is exactly how a total outage of subscription management stayed green
// in CI. Do not add `.send({})` to these tests.
const { api, stripeMock } = require("../setup/testEnv");
const {
    createUser,
    createAdmin,
    cookieFor,
    createCity,
    createService
} = require("../setup/fixtures");
const { createSubscription } = require("../setup/subscriptionFixtures");

const Subscription = require("../../models/subscription.model");

/** Point the Stripe mock at a card that legitimately belongs to the customer. */
const stubStoredCard = (subscription) => {
    stripeMock.paymentMethods.retrieve.mockResolvedValue({
        id: subscription.paymentMethodId,
        customer: subscription.stripeCustomerId
    });
};

const setup = async (overrides = {}) => {
    const user = await createUser();
    const service = await createService();
    const city = await createCity();
    const subscription = await createSubscription(user, service, city, overrides);
    return { user, subscription };
};

describe("customer subscription actions accept a body-less request", () => {
    test("pause reaches the controller and persists the paused state", async () => {
        const { user, subscription } = await setup();

        const res = await api.patch(`/api/v1/subscription/${subscription._id}/pause`)
            .set("Cookie", cookieFor(user));

        expect(res.status).toBe(200);
        expect(res.body.data.subscription.status).toBe("paused");
        expect(res.body.data.subscription.pausedReason).toBe("user-request");

        const stored = await Subscription.findById(subscription._id);
        expect(stored.status).toBe("paused");
    });

    test("resume reaches the controller and reactivates the plan", async () => {
        const { user, subscription } = await setup({
            status: "paused",
            pausedReason: "user-request"
        });
        stubStoredCard(subscription);

        const res = await api.patch(`/api/v1/subscription/${subscription._id}/resume`)
            .set("Cookie", cookieFor(user));

        expect(res.status).toBe(200);
        expect(res.body.data.subscription.status).toBe("active");

        const stored = await Subscription.findById(subscription._id);
        expect(stored.status).toBe("active");
    });

    test("cancel reaches the controller and persists the cancellation", async () => {
        const { user, subscription } = await setup();

        const res = await api.patch(`/api/v1/subscription/${subscription._id}/cancel`)
            .set("Cookie", cookieFor(user));

        expect(res.status).toBe(200);
        expect(res.body.data.subscription.status).toBe("cancelled");

        const stored = await Subscription.findById(subscription._id);
        expect(stored.status).toBe("cancelled");
        expect(stored.cancelledAt).toBeTruthy();
    });
});

describe("admin subscription actions accept a body-less request", () => {
    test("admin-pause reaches the controller", async () => {
        const admin = await createAdmin();
        const { subscription } = await setup();

        const res = await api.patch(`/api/v1/subscription/${subscription._id}/admin-pause`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(200);
        expect(res.body.data.subscription.status).toBe("paused");
        expect((await Subscription.findById(subscription._id)).status).toBe("paused");
    });

    test("admin-resume reaches the controller", async () => {
        const admin = await createAdmin();
        const { subscription } = await setup({ status: "paused" });
        stubStoredCard(subscription);

        const res = await api.patch(`/api/v1/subscription/${subscription._id}/admin-resume`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(200);
        expect(res.body.data.subscription.status).toBe("active");
        expect((await Subscription.findById(subscription._id)).status).toBe("active");
    });

    test("admin-cancel reaches the controller", async () => {
        const admin = await createAdmin();
        const { subscription } = await setup();

        const res = await api.patch(`/api/v1/subscription/${subscription._id}/admin-cancel`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(200);
        expect(res.body.data.subscription.status).toBe("cancelled");
        expect((await Subscription.findById(subscription._id)).status).toBe("cancelled");
    });

    test("a non-admin cannot drive the admin action routes", async () => {
        const user = await createUser();
        const { subscription } = await setup();

        const res = await api.patch(`/api/v1/subscription/${subscription._id}/admin-cancel`)
            .set("Cookie", cookieFor(user));

        expect(res.status).toBe(403);
        expect((await Subscription.findById(subscription._id)).status).toBe("active");
    });
});

describe("strict action schemas still reject smuggled fields", () => {
    test("a body attempting to set server-managed state is refused", async () => {
        const { user, subscription } = await setup();

        const res = await api.patch(`/api/v1/subscription/${subscription._id}/pause`)
            .set("Cookie", cookieFor(user))
            .send({ status: "cancelled", nextChargeAt: "1999-01-01" });

        expect(res.status).toBe(400);
        expect((await Subscription.findById(subscription._id)).status).toBe("active");
    });
});
