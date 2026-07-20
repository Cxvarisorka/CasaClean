// Reviews: per-completed-booking creation, ownership rules, public listing and
// the admin overview.
const { api } = require("../setup/testEnv");
const {
    createUser,
    createAdmin,
    cookieFor,
    createCity,
    createService,
    createPaidBooking
} = require("../setup/fixtures");

const Review = require("../../models/review.model");

const seedCompletedBooking = async (user) => {
    const service = await createService();
    const city = await createCity();
    const booking = await createPaidBooking(user, service, city, { status: "completed" });
    return { service, city, booking };
};

describe("POST /api/v1/review/booking/:bookingId", () => {
    test("a customer can review their own COMPLETED booking", async () => {
        const user = await createUser();
        const { booking, service } = await seedCompletedBooking(user);

        const res = await api.post(`/api/v1/review/booking/${booking._id}`)
            .set("Cookie", cookieFor(user))
            .send({ rating: 5, review_text: "Spotless!" });

        expect(res.status).toBe(201);
        expect(res.body.data.review.rating).toBe(5);
        // service_id is derived from the booking, never from the client.
        expect(res.body.data.review.service_id).toBe(String(service._id));
    });

    test("rejects reviewing a booking that isn't completed", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city, { status: "confirmed" });

        const res = await api.post(`/api/v1/review/booking/${booking._id}`)
            .set("Cookie", cookieFor(user))
            .send({ rating: 4, review_text: "Too early!" });
        expect(res.status).toBe(403);
    });

    test("rejects reviewing someone else's booking", async () => {
        const owner = await createUser();
        const attacker = await createUser();
        const { booking } = await seedCompletedBooking(owner);

        const res = await api.post(`/api/v1/review/booking/${booking._id}`)
            .set("Cookie", cookieFor(attacker))
            .send({ rating: 1, review_text: "Not mine!" });
        expect(res.status).toBe(403);
    });

    test("allows at most one review per booking", async () => {
        const user = await createUser();
        const { booking } = await seedCompletedBooking(user);
        const cookie = cookieFor(user);

        const first = await api.post(`/api/v1/review/booking/${booking._id}`)
            .set("Cookie", cookie)
            .send({ rating: 5, review_text: "First!" });
        expect(first.status).toBe(201);

        const second = await api.post(`/api/v1/review/booking/${booking._id}`)
            .set("Cookie", cookie)
            .send({ rating: 4, review_text: "Second!" });
        expect(second.status).toBe(409);
    });

    test("rejects out-of-range or non-integer ratings", async () => {
        const user = await createUser();
        const { booking } = await seedCompletedBooking(user);
        const cookie = cookieFor(user);

        for (const rating of [0, 6, 3.5]) {
            const res = await api.post(`/api/v1/review/booking/${booking._id}`)
                .set("Cookie", cookie)
                .send({ rating, review_text: "Bad rating" });
            expect(res.status).toBe(400);
        }
    });
});

describe("reading reviews", () => {
    test("GET /review/service/:serviceId is public and scoped to the service", async () => {
        const user = await createUser();
        const { booking, service } = await seedCompletedBooking(user);
        await Review.create({
            booking: booking._id,
            service_id: service._id,
            user: user._id,
            rating: 5,
            review_text: "Great!"
        });
        const { service: otherService } = await seedCompletedBooking(await createUser());

        const res = await api.get(`/api/v1/review/service/${service._id}`);
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(1);
        expect(res.body.data.reviews[0].review_text).toBe("Great!");

        const empty = await api.get(`/api/v1/review/service/${otherService._id}`);
        expect(empty.body.results).toBe(0);
    });

    test("GET /review/my returns only the caller's reviews", async () => {
        const alice = await createUser();
        const bob = await createUser();
        const a = await seedCompletedBooking(alice);
        const b = await seedCompletedBooking(bob);
        await Review.create({
            booking: a.booking._id, service_id: a.service._id, user: alice._id,
            rating: 5, review_text: "Alice's review"
        });
        await Review.create({
            booking: b.booking._id, service_id: b.service._id, user: bob._id,
            rating: 3, review_text: "Bob's review"
        });

        const res = await api.get("/api/v1/review/my").set("Cookie", cookieFor(alice));
        expect(res.status).toBe(200);
        expect(res.body.results).toBe(1);
        expect(res.body.data.reviews[0].review_text).toBe("Alice's review");
    });

    test("GET /review (admin overview) is admin-only", async () => {
        const user = await createUser();
        const denied = await api.get("/api/v1/review").set("Cookie", cookieFor(user));
        expect(denied.status).toBe(403);

        const admin = await createAdmin();
        const res = await api.get("/api/v1/review").set("Cookie", cookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("reviewCount");
    });
});

describe("editing and deleting reviews", () => {
    const seedReview = async (user) => {
        const { booking, service } = await seedCompletedBooking(user);
        return Review.create({
            booking: booking._id,
            service_id: service._id,
            user: user._id,
            rating: 3,
            review_text: "Original text"
        });
    };

    test("the author can edit their review", async () => {
        const user = await createUser();
        const review = await seedReview(user);

        const res = await api.patch(`/api/v1/review/${review._id}`)
            .set("Cookie", cookieFor(user))
            .send({ rating: 5, review_text: "Updated text" });
        expect(res.status).toBe(200);
        expect(res.body.data.review.rating).toBe(5);
        expect(res.body.data.review.review_text).toBe("Updated text");
    });

    test("someone else cannot edit it", async () => {
        const user = await createUser();
        const attacker = await createUser();
        const review = await seedReview(user);

        const res = await api.patch(`/api/v1/review/${review._id}`)
            .set("Cookie", cookieFor(attacker))
            .send({ rating: 1 });
        expect(res.status).toBe(403);
    });

    test("the author can delete their review; a stranger cannot; an admin can", async () => {
        const user = await createUser();
        const stranger = await createUser();
        const admin = await createAdmin();

        const own = await seedReview(user);
        const denied = await api.delete(`/api/v1/review/${own._id}`)
            .set("Cookie", cookieFor(stranger));
        expect(denied.status).toBe(403);

        const byAuthor = await api.delete(`/api/v1/review/${own._id}`)
            .set("Cookie", cookieFor(user));
        expect(byAuthor.status).toBe(200);
        expect(await Review.findById(own._id)).toBeNull();

        const another = await seedReview(user);
        const byAdmin = await api.delete(`/api/v1/review/${another._id}`)
            .set("Cookie", cookieFor(admin));
        expect(byAdmin.status).toBe(200);
    });
});
