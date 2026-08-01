// The online payment flow (Stripe mocked at the SDK boundary):
//   intent creation (server-side pricing + PendingBooking draft),
//   finalize (promotion, ownership, amount checks, orphan refunds),
//   saved-card management (list / setup-intent / default / delete).
const { api, stripeMock } = require("../setup/testEnv");
const {
    createUser,
    cookieFor,
    createCity,
    createService,
    createSpecialRequest,
    createCleaningTool,
    validBookingBody
} = require("../setup/fixtures");

const User = require("../../models/user.model");
const Booking = require("../../models/booking.model");
const PendingBooking = require("../../models/pendingBooking.model");
const { toMinorUnits } = require("../../utils/money.util");

const mockCustomerCreate = (id = "cus_test_1") =>
    stripeMock.customers.create.mockResolvedValue({ id });

const mockIntentCreate = (overrides = {}) =>
    stripeMock.paymentIntents.create.mockImplementation(async (params) => ({
        id: "pi_test_1",
        client_secret: "pi_test_1_secret",
        status: "requires_payment_method",
        amount: params.amount,
        customer: params.customer,
        ...overrides
    }));

describe("POST /api/v1/payment/booking/intent", () => {
    test("requires authentication", async () => {
        const service = await createService();
        const city = await createCity();
        const res = await api.post("/api/v1/payment/booking/intent")
            .send(validBookingBody(service, city));
        expect(res.status).toBe(401);
    });

    test("prices the booking server-side and stores a validated draft", async () => {
        const user = await createUser();
        const service = await createService({ pricePerHour: 20 });
        const city = await createCity();
        const addon = await createSpecialRequest({ price: 15 });
        const tool = await createCleaningTool({ price: 5 });
        mockCustomerCreate();
        mockIntentCreate();

        const res = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send(validBookingBody(service, city, {
                hours: 2,
                cleaners: 2,
                specialRequests: [String(addon._id)],
                cleaningTools: [String(tool._id)]
            }));

        expect(res.status).toBe(201);
        // 20 €/h * 2h + 15 + 5 = 60 — computed from DB prices, never the client.
        expect(res.body.data.amount).toBe(100);
        expect(res.body.data.clientSecret).toBe("pi_test_1_secret");

        // Stripe was asked to charge exactly the server-computed total in cents.
        expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: toMinorUnits(100),
                currency: "eur",
                customer: "cus_test_1",
                receipt_email: user.email
            })
        );

        // The draft is persisted, keyed to the intent, with the same total.
        const pending = await PendingBooking.findOne({ paymentIntentId: "pi_test_1" });
        expect(pending).not.toBeNull();
        expect(pending.draft.totalAmount).toBe(100);
        expect(String(pending.user)).toBe(String(user._id));

        // No booking exists yet — pay-first means no charge, no booking.
        expect(await Booking.countDocuments()).toBe(0);

        // The user now has a persisted Stripe customer id.
        const freshUser = await User.findById(user._id);
        expect(freshUser.stripeCustomerId).toBe("cus_test_1");
    });

    test("reuses an existing Stripe customer", async () => {
        const user = await createUser({ stripeCustomerId: "cus_existing" });
        const service = await createService();
        const city = await createCity();
        mockIntentCreate();

        const res = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send(validBookingBody(service, city));

        expect(res.status).toBe(201);
        expect(stripeMock.customers.create).not.toHaveBeenCalled();
        expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({ customer: "cus_existing" })
        );
    });

    test("rejects a client-supplied totalAmount (strict schema)", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();

        const res = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send(validBookingBody(service, city, { totalAmount: 0.01 }));
        expect(res.status).toBe(400);
        expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    });

    test("fails closed on a disabled service — no Stripe call, no draft", async () => {
        const user = await createUser();
        const service = await createService({ enabled: false });
        const city = await createCity();

        const res = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send(validBookingBody(service, city));

        expect(res.status).toBe(400);
        expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
        expect(await PendingBooking.countDocuments()).toBe(0);
    });

    test("marks the intent for card saving when requested", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        mockCustomerCreate();
        mockIntentCreate();

        const res = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send({ ...validBookingBody(service, city), savePaymentMethod: true });

        expect(res.status).toBe(201);
        expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({ setup_future_usage: "off_session" })
        );
        const pending = await PendingBooking.findOne({ paymentIntentId: "pi_test_1" });
        expect(pending.savePaymentMethod).toBe(true);
    });

    test("paying with a saved card confirms server-side after an ownership check", async () => {
        const user = await createUser({ stripeCustomerId: "cus_mine" });
        const service = await createService();
        const city = await createCity();
        stripeMock.paymentMethods.retrieve.mockResolvedValue({ id: "pm_1", customer: "cus_mine" });
        mockIntentCreate({ status: "succeeded" });

        const res = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send({ ...validBookingBody(service, city), savedPaymentMethodId: "pm_1" });

        expect(res.status).toBe(201);
        expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({ payment_method: "pm_1", confirm: true })
        );
    });

    test("rejects a saved card belonging to another customer", async () => {
        const user = await createUser({ stripeCustomerId: "cus_mine" });
        const service = await createService();
        const city = await createCity();
        stripeMock.paymentMethods.retrieve.mockResolvedValue({ id: "pm_x", customer: "cus_theirs" });

        const res = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send({ ...validBookingBody(service, city), savedPaymentMethodId: "pm_x" });

        expect(res.status).toBe(403);
        expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    });
});

describe("POST /api/v1/payment/booking/finalize", () => {
    /** Runs the intent endpoint for real, so a genuine draft exists. */
    const createIntentFor = async (user, extras = {}) => {
        const service = await createService({ pricePerHour: 20 });
        const city = await createCity();
        mockCustomerCreate(`cus_of_${user._id}`);
        mockIntentCreate();
        const res = await api.post("/api/v1/payment/booking/intent")
            .set("Cookie", cookieFor(user))
            .send(validBookingBody(service, city, extras));
        expect(res.status).toBe(201);
        return res.body.data; // { paymentIntentId, amount, ... }
    };

    const mockRetrieveSucceeded = (intent, overrides = {}) =>
        stripeMock.paymentIntents.retrieve.mockResolvedValue({
            id: intent.paymentIntentId,
            status: "succeeded",
            amount: toMinorUnits(intent.amount),
            customer: null,
            ...overrides
        });

    test("promotes a succeeded intent into a paid, confirmed booking", async () => {
        const user = await createUser();
        const intent = await createIntentFor(user);
        mockRetrieveSucceeded(intent);

        const res = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookieFor(user))
            .send({ paymentIntentId: intent.paymentIntentId });

        expect(res.status).toBe(201);
        const booking = res.body.data.booking;
        expect(booking.status).toBe("confirmed");
        expect(booking.paymentStatus).toBe("paid");
        expect(booking.paymentMethod).toBe("card");
        expect(booking.totalAmount).toBe(intent.amount);
        expect(booking.amountPaid).toBe(intent.amount);

        // The draft is consumed.
        expect(await PendingBooking.countDocuments({ paymentIntentId: intent.paymentIntentId })).toBe(0);
    });

    test("is idempotent — finalizing twice returns the same booking", async () => {
        const user = await createUser();
        const intent = await createIntentFor(user);
        mockRetrieveSucceeded(intent);
        const cookie = cookieFor(user);

        const first = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookie).send({ paymentIntentId: intent.paymentIntentId });
        const second = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookie).send({ paymentIntentId: intent.paymentIntentId });

        expect(first.status).toBe(201);
        expect(second.status).toBe(201);
        expect(second.body.data.booking._id).toBe(first.body.data.booking._id);
        expect(await Booking.countDocuments({ paymentIntentId: intent.paymentIntentId })).toBe(1);
    });

    test("rejects an intent that hasn't succeeded", async () => {
        const user = await createUser();
        const intent = await createIntentFor(user);
        stripeMock.paymentIntents.retrieve.mockResolvedValue({
            id: intent.paymentIntentId,
            status: "requires_payment_method"
        });

        const res = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookieFor(user))
            .send({ paymentIntentId: intent.paymentIntentId });

        expect(res.status).toBe(400);
        expect(await Booking.countDocuments()).toBe(0);
    });

    test("404s for an unknown intent", async () => {
        const user = await createUser();
        stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error("No such payment_intent"));

        const res = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookieFor(user))
            .send({ paymentIntentId: "pi_ghost" });
        expect(res.status).toBe(404);
    });

    test("rejects finalizing another customer's payment (Stripe customer mismatch)", async () => {
        const owner = await createUser();
        const intent = await createIntentFor(owner);
        mockRetrieveSucceeded(intent, { customer: `cus_of_${owner._id}` });

        const attacker = await createUser({ stripeCustomerId: "cus_attacker" });
        const res = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookieFor(attacker))
            .send({ paymentIntentId: intent.paymentIntentId });

        expect(res.status).toBe(403);
        expect(await Booking.countDocuments()).toBe(0);
    });

    test("rejects finalizing another user's draft (pending owner mismatch)", async () => {
        const owner = await createUser();
        const intent = await createIntentFor(owner);
        // Attacker has no Stripe customer, so the draft-ownership check must catch it.
        mockRetrieveSucceeded(intent);

        const attacker = await createUser();
        const res = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookieFor(attacker))
            .send({ paymentIntentId: intent.paymentIntentId });

        expect(res.status).toBe(403);
    });

    test("rejects an amount mismatch between the charge and the draft", async () => {
        const user = await createUser();
        const intent = await createIntentFor(user);
        mockRetrieveSucceeded(intent, { amount: toMinorUnits(intent.amount) - 100 });

        const res = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookieFor(user))
            .send({ paymentIntentId: intent.paymentIntentId });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/amount mismatch/i);
    });

    test("refunds an orphaned charge (draft expired before finalize)", async () => {
        const user = await createUser();
        const intent = await createIntentFor(user);
        // Simulate the TTL reaper claiming the draft before finalize arrives.
        await PendingBooking.deleteMany({ paymentIntentId: intent.paymentIntentId });
        mockRetrieveSucceeded(intent);
        stripeMock.refunds.create.mockResolvedValue({ id: "re_orphan" });

        const res = await api.post("/api/v1/payment/booking/finalize")
            .set("Cookie", cookieFor(user))
            .send({ paymentIntentId: intent.paymentIntentId });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/refunded/i);
        expect(stripeMock.refunds.create).toHaveBeenCalledWith(
            { payment_intent: intent.paymentIntentId },
            { idempotencyKey: `refund:intent:${intent.paymentIntentId}` }
        );
        expect(await Booking.countDocuments()).toBe(0);
    });
});

describe("saved-card management", () => {
    test("GET /methods returns [] for a user with no Stripe customer", async () => {
        const user = await createUser();
        const res = await api.get("/api/v1/payment/methods").set("Cookie", cookieFor(user));
        expect(res.status).toBe(200);
        expect(res.body.data.paymentMethods).toEqual([]);
        expect(stripeMock.paymentMethods.list).not.toHaveBeenCalled();
    });

    test("GET /methods maps Stripe cards and flags the default", async () => {
        const user = await createUser({
            stripeCustomerId: "cus_1",
            defaultPaymentMethodId: "pm_b"
        });
        stripeMock.paymentMethods.list.mockResolvedValue({
            data: [
                { id: "pm_a", card: { brand: "visa", last4: "4242", exp_month: 4, exp_year: 2030 } },
                { id: "pm_b", card: { brand: "mastercard", last4: "4444", exp_month: 5, exp_year: 2031 } }
            ]
        });

        const res = await api.get("/api/v1/payment/methods").set("Cookie", cookieFor(user));
        expect(res.status).toBe(200);
        expect(res.body.data.paymentMethods).toEqual([
            { id: "pm_a", brand: "visa", last4: "4242", expMonth: 4, expYear: 2030, isDefault: false },
            { id: "pm_b", brand: "mastercard", last4: "4444", expMonth: 5, expYear: 2031, isDefault: true }
        ]);
    });

    test("POST /methods/setup-intent returns a clientSecret", async () => {
        const user = await createUser({ stripeCustomerId: "cus_1" });
        stripeMock.setupIntents.create.mockResolvedValue({ client_secret: "seti_secret_1" });

        const res = await api.post("/api/v1/payment/methods/setup-intent")
            .set("Cookie", cookieFor(user));
        expect(res.status).toBe(201);
        expect(res.body.data.clientSecret).toBe("seti_secret_1");
        expect(stripeMock.setupIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({ customer: "cus_1", usage: "off_session" })
        );
    });

    test("PATCH /methods/:id/default is ownership-checked", async () => {
        const user = await createUser({ stripeCustomerId: "cus_mine" });
        stripeMock.paymentMethods.retrieve.mockResolvedValue({ id: "pm_theirs", customer: "cus_theirs" });

        const denied = await api.patch("/api/v1/payment/methods/pm_theirs/default")
            .set("Cookie", cookieFor(user));
        expect(denied.status).toBe(404);

        stripeMock.paymentMethods.retrieve.mockResolvedValue({ id: "pm_mine", customer: "cus_mine" });
        const ok = await api.patch("/api/v1/payment/methods/pm_mine/default")
            .set("Cookie", cookieFor(user));
        expect(ok.status).toBe(200);
        expect((await User.findById(user._id)).defaultPaymentMethodId).toBe("pm_mine");
    });

    test("DELETE /methods/:id detaches an owned card and clears a matching default", async () => {
        const user = await createUser({
            stripeCustomerId: "cus_mine",
            defaultPaymentMethodId: "pm_mine"
        });
        stripeMock.paymentMethods.retrieve.mockResolvedValue({ id: "pm_mine", customer: "cus_mine" });
        stripeMock.paymentMethods.detach.mockResolvedValue({});

        const res = await api.delete("/api/v1/payment/methods/pm_mine")
            .set("Cookie", cookieFor(user));
        expect(res.status).toBe(200);
        expect(stripeMock.paymentMethods.detach).toHaveBeenCalledWith("pm_mine");
        expect((await User.findById(user._id)).defaultPaymentMethodId).toBeUndefined();
    });

    test("DELETE /methods/:id never detaches someone else's card", async () => {
        const user = await createUser({ stripeCustomerId: "cus_mine" });
        stripeMock.paymentMethods.retrieve.mockResolvedValue({ id: "pm_theirs", customer: "cus_theirs" });

        const res = await api.delete("/api/v1/payment/methods/pm_theirs")
            .set("Cookie", cookieFor(user));
        expect(res.status).toBe(404);
        expect(stripeMock.paymentMethods.detach).not.toHaveBeenCalled();
    });
});
