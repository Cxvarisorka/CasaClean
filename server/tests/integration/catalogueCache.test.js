// The public catalogue lists are served from an in-process TTL cache
// (utils/catalogueCache.util.js). A cache is only as good as its worst failure,
// and for this one there are exactly two ways to be badly wrong:
//
//   1. serving stale data after an admin edited the catalogue, and
//   2. serving an admin's ?includeDisabled=true response — which contains
//      soft-disabled records — to the public.
//
// Everything here pins one of those two properties. The freshness tests
// deliberately go through the HTTP write endpoints rather than writing to the
// database directly, because it is the controllers' invalidate() calls that are
// under test; a direct model write bypasses exactly the thing being verified.
const { api } = require("../setup/testEnv");
const {
    createUser,
    createAdmin,
    cookieFor,
    createCity,
    createService,
    createSpecialRequest,
    createCleaningTool,
    createPaidBooking
} = require("../setup/fixtures");

const catalogueCache = require("../../utils/catalogueCache.util");
const Review = require("../../models/review.model");

// Names written through the HTTP layer are normalised by utils/formatName.util.js
// (capitalised first letter, rest lower-cased), so a test that posts "Cache Town"
// must expect what the API actually stored.
const stored = (name) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

describe("catalogue cache: freshness after admin writes", () => {
    test("a newly created city appears on the public list immediately", async () => {
        const admin = await createAdmin();

        // Prime the cache with the pre-write state.
        const before = await api.get("/api/v1/city");
        expect(before.body.data.cities).toHaveLength(0);

        const created = await api
            .post("/api/v1/city")
            .set("Cookie", cookieFor(admin))
            .send({ name: "Cache Town", workingHourStarts: "09:00", workingHourEnds: "17:30" });
        expect(created.status).toBe(201);

        const after = await api.get("/api/v1/city");
        expect(after.body.data.cities.map((c) => c.name)).toContain(stored("Cache Town"));
    });

    test("disabling a city removes it from the public list immediately", async () => {
        const admin = await createAdmin();
        const city = await createCity({ name: "Vanishing Town" });

        const before = await api.get("/api/v1/city");
        expect(before.body.data.cities.map((c) => c.name)).toContain("Vanishing Town");

        const edited = await api
            .patch(`/api/v1/city/${city._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ enabled: false });
        expect(edited.status).toBe(200);

        const after = await api.get("/api/v1/city");
        expect(after.body.data.cities.map((c) => c.name)).not.toContain("Vanishing Town");
    });

    test("deleting a city removes it from the public list immediately", async () => {
        const admin = await createAdmin();
        const city = await createCity({ name: "Doomed Town" });

        await api.get("/api/v1/city"); // prime

        const deleted = await api
            .delete(`/api/v1/city/${city._id}`)
            .set("Cookie", cookieFor(admin));
        expect(deleted.status).toBe(200);

        const after = await api.get("/api/v1/city");
        expect(after.body.data.cities.map((c) => c.name)).not.toContain("Doomed Town");
    });

    test("a price edit on an add-on is reflected on the public list immediately", async () => {
        const admin = await createAdmin();
        const addOn = await createSpecialRequest({ name: "Fridge Clean", price: 10 });

        const before = await api.get("/api/v1/special-request");
        expect(before.body.data.specialRequests[0].price).toBe(10);

        const edited = await api
            .patch(`/api/v1/special-request/${addOn._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ price: 25 });
        expect(edited.status).toBe(200);

        const after = await api.get("/api/v1/special-request");
        expect(after.body.data.specialRequests[0].price).toBe(25);
    });

    test("editing a service is reflected on the public list immediately", async () => {
        const admin = await createAdmin();
        const service = await createService({ name: "Deep Clean", pricePerHour: 20 });

        const before = await api.get("/api/v1/service");
        expect(before.body.data.services[0].pricePerHour).toBe(20);

        const edited = await api
            .patch(`/api/v1/service/${service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ pricePerHour: 35 });
        expect(edited.status).toBe(200);

        const after = await api.get("/api/v1/service");
        expect(after.body.data.services[0].pricePerHour).toBe(35);
    });

    test("editing a cleaning tool is reflected on the public list immediately", async () => {
        const admin = await createAdmin();
        const tool = await createCleaningTool({ name: "Steam Mop", price: 5 });

        const before = await api.get("/api/v1/cleaning-tool");
        expect(before.body.data.cleaningTools[0].price).toBe(5);

        const edited = await api
            .patch(`/api/v1/cleaning-tool/${tool._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ price: 9 });
        expect(edited.status).toBe(200);

        const after = await api.get("/api/v1/cleaning-tool");
        expect(after.body.data.cleaningTools[0].price).toBe(9);
    });
});

describe("catalogue cache: the admin view is never shared with the public", () => {
    // This is the leak that would matter: an admin fetches the full catalogue
    // including soft-disabled records, and a subsequent anonymous request is
    // served that cached body.
    test("an admin's ?includeDisabled response does not leak to an anonymous caller", async () => {
        const admin = await createAdmin();
        await createCity({ name: "Enabled Town" });
        await createCity({ name: "Secret Town", enabled: false });

        const asAdmin = await api
            .get("/api/v1/city?includeDisabled=true")
            .set("Cookie", cookieFor(admin));
        expect(asAdmin.body.data.cities.map((c) => c.name)).toContain("Secret Town");

        const anon = await api.get("/api/v1/city");
        expect(anon.body.data.cities.map((c) => c.name)).not.toContain("Secret Town");
        expect(anon.body.data.cities.map((c) => c.name)).toContain("Enabled Town");
    });

    test("the reverse order is also safe: a public read does not become an admin read", async () => {
        const admin = await createAdmin();
        await createCity({ name: "Secret Town", enabled: false });

        const anon = await api.get("/api/v1/city");
        expect(anon.body.data.cities).toHaveLength(0);

        const asAdmin = await api
            .get("/api/v1/city?includeDisabled=true")
            .set("Cookie", cookieFor(admin));
        expect(asAdmin.body.data.cities.map((c) => c.name)).toContain("Secret Town");
    });

    test("an admin always reads through the cache, so it sees another admin's write", async () => {
        const admin = await createAdmin();
        const cookie = cookieFor(admin);

        // An admin request must never be *stored* either, or a second admin
        // request could be answered from a snapshot taken before this write.
        await api.get("/api/v1/city").set("Cookie", cookie);

        await api
            .post("/api/v1/city")
            .set("Cookie", cookie)
            .send({ name: "Fresh Town", workingHourStarts: "09:00", workingHourEnds: "17:30" });

        const after = await api.get("/api/v1/city").set("Cookie", cookie);
        expect(after.body.data.cities.map((c) => c.name)).toContain(stored("Fresh Town"));
    });

    test("a signed-in non-admin shares the public cache and never sees disabled records", async () => {
        const user = await createUser();
        await createCity({ name: "Secret Town", enabled: false });
        await createCity({ name: "Open Town" });

        const asUser = await api
            .get("/api/v1/city?includeDisabled=true")
            .set("Cookie", cookieFor(user));
        const names = asUser.body.data.cities.map((c) => c.name);
        expect(names).toContain("Open Town");
        expect(names).not.toContain("Secret Town");
    });
});

describe("catalogue cache: cache-control headers", () => {
    test("a public list is publicly cacheable", async () => {
        await createCity();
        const res = await api.get("/api/v1/city");
        expect(res.headers["cache-control"]).toBe(catalogueCache.PUBLIC_CACHE_CONTROL);
    });

    test("an admin list is never stored by a shared cache", async () => {
        const admin = await createAdmin();
        await createCity();
        const res = await api
            .get("/api/v1/city?includeDisabled=true")
            .set("Cookie", cookieFor(admin));
        expect(res.headers["cache-control"]).toBe(catalogueCache.PRIVATE_CACHE_CONTROL);
    });
});

describe("catalogue cache: pagination keys don't collide", () => {
    test("page 2 is not served the cached body of page 1", async () => {
        await createCity({ name: "Alpha Town" });
        await createCity({ name: "Beta Town" });

        const first = await api.get("/api/v1/city?page=1&limit=1");
        const second = await api.get("/api/v1/city?page=2&limit=1");

        expect(first.body.data.cities).toHaveLength(1);
        expect(second.body.data.cities).toHaveLength(1);
        expect(second.body.data.cities[0].name).not.toBe(first.body.data.cities[0].name);
    });

    test("a different limit is a different cache entry", async () => {
        await createCity({ name: "Alpha Town" });
        await createCity({ name: "Beta Town" });

        const one = await api.get("/api/v1/city?limit=1");
        const two = await api.get("/api/v1/city?limit=2");

        expect(one.body.data.cities).toHaveLength(1);
        expect(two.body.data.cities).toHaveLength(2);
    });
});

describe("catalogue cache: the store itself", () => {
    test("entries expire after the TTL", () => {
        catalogueCache.set("test:1:10", { hello: "world" });
        expect(catalogueCache.get("test:1:10")).toEqual({ hello: "world" });

        const realNow = Date.now;
        Date.now = () => realNow() + catalogueCache.TTL_MS + 1;
        try {
            expect(catalogueCache.get("test:1:10")).toBeUndefined();
        } finally {
            Date.now = realNow;
        }
    });

    test("invalidate only drops the named resource", () => {
        catalogueCache.set("city:1:10", "cities");
        catalogueCache.set("service:1:10", "services");

        catalogueCache.invalidate("city");

        expect(catalogueCache.get("city:1:10")).toBeUndefined();
        expect(catalogueCache.get("service:1:10")).toBe("services");
    });

    test("the store is bounded, so page-probing can't grow it without limit", () => {
        for (let i = 0; i < catalogueCache.MAX_ENTRIES + 50; i += 1) {
            catalogueCache.set(`probe:${i}:10`, i);
        }
        // The oldest entries were evicted rather than accumulating.
        expect(catalogueCache.get("probe:0:10")).toBeUndefined();
        expect(catalogueCache.get(`probe:${catalogueCache.MAX_ENTRIES + 49}:10`)).toBe(
            catalogueCache.MAX_ENTRIES + 49
        );
    });
});

describe("review summary cache", () => {
    // The per-service rating header (count + average) is cached because it is an
    // aggregate over every published review of that service. Publishing is the
    // gate between customer text and the public site, so it must invalidate.
    test("publishing a review updates the public rating summary immediately", async () => {
        const admin = await createAdmin();
        const service = await createService({ name: "Deep Clean" });
        const city = await createCity();
        const user = await createUser();

        const booking = await createPaidBooking(user, service, city, { status: "completed" });
        const review = await Review.create({
            booking: booking._id,
            service_id: service._id,
            user: user._id,
            rating: 5,
            review_text: "Great"
        });

        // Unpublished: the header reads zero, and that answer gets cached.
        const before = await api.get(`/api/v1/review/service/${service._id}`);
        expect(before.body.reviewCount).toBe(0);

        const published = await api
            .patch(`/api/v1/review/${review._id}/publish`)
            .set("Cookie", cookieFor(admin))
            .send({ isPublished: true });
        expect(published.status).toBe(200);

        const after = await api.get(`/api/v1/review/service/${service._id}`);
        expect(after.body.reviewCount).toBe(1);
        expect(after.body.averageRating).toBe(5);
    });
});
