// Referential-integrity guards on catalogue hard deletes.
//
// Mongo enforces no foreign keys, so deleting a referenced city/service/add-on/
// tool/worker used to succeed and leave dangling ObjectIds behind: bookings that
// render as "Service #undefined", populate() returning null, and active
// recurring plans that only discover the problem when their next charge fails
// reference resolution. Every one of these models has an `enabled` flag, so
// soft-disable is the supported way to retire a record.
const { api } = require("../setup/testEnv");
const {
    createAdmin,
    createUser,
    cookieFor,
    createCity,
    createService,
    createSpecialRequest,
    createCleaningTool,
    createWorker,
    createPaidBooking
} = require("../setup/fixtures");
const { createSubscription } = require("../setup/subscriptionFixtures");

const City = require("../../models/city.model");
const Service = require("../../models/service.model");
const SpecialRequest = require("../../models/specialRequest.model");
const CleaningTool = require("../../models/cleaningTool.model");
const Worker = require("../../models/worker.model");
const Booking = require("../../models/booking.model");

describe("a referenced catalogue record cannot be hard-deleted", () => {
    test("city referenced by a booking", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        await createPaidBooking(user, service, city);

        const res = await api.delete(`/api/v1/city/${city._id}`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/bookings/i);
        expect(res.body.message).toMatch(/disable it instead/i);
        expect(await City.exists({ _id: city._id })).toBeTruthy();
    });

    test("city referenced only by a recurring subscription", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        await createSubscription(user, service, city);

        const res = await api.delete(`/api/v1/city/${city._id}`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/recurring subscriptions/i);
        expect(await City.exists({ _id: city._id })).toBeTruthy();
    });

    test("service referenced by a booking", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        await createPaidBooking(user, service, city);

        const res = await api.delete(`/api/v1/service/${service._id}`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(409);
        expect(await Service.exists({ _id: service._id })).toBeTruthy();
    });

    test("add-on referenced by a booking", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const addon = await createSpecialRequest();
        await createPaidBooking(user, service, city, { specialRequests: [addon._id] });

        const res = await api.delete(`/api/v1/special-request/${addon._id}`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(409);
        expect(await SpecialRequest.exists({ _id: addon._id })).toBeTruthy();
    });

    test("cleaning tool referenced by a booking", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const tool = await createCleaningTool();
        await createPaidBooking(user, service, city, { cleaningTools: [tool._id] });

        const res = await api.delete(`/api/v1/cleaning-tool/${tool._id}`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(409);
        expect(await CleaningTool.exists({ _id: tool._id })).toBeTruthy();
    });

    test("worker assigned to a booking", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const worker = await createWorker();
        await createPaidBooking(user, service, city, { workers: [worker._id] });

        const res = await api.delete(`/api/v1/worker/${worker._id}`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(409);
        expect(await Worker.exists({ _id: worker._id })).toBeTruthy();
    });

    test("add-on still listed on a service", async () => {
        const admin = await createAdmin();
        const addon = await createSpecialRequest();
        await createService({
            allSpecialRequests: false,
            specialRequests: [addon._id]
        });

        const res = await api.delete(`/api/v1/special-request/${addon._id}`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/service add-on lists/i);
    });
});

describe("an unreferenced catalogue record still deletes cleanly", () => {
    test("city, service, add-on, tool and worker", async () => {
        const admin = await createAdmin();
        const cookie = cookieFor(admin);

        const city = await createCity();
        const service = await createService();
        const addon = await createSpecialRequest();
        const tool = await createCleaningTool();
        const worker = await createWorker();

        const results = await Promise.all([
            api.delete(`/api/v1/city/${city._id}`).set("Cookie", cookie),
            api.delete(`/api/v1/service/${service._id}`).set("Cookie", cookie),
            api.delete(`/api/v1/special-request/${addon._id}`).set("Cookie", cookie),
            api.delete(`/api/v1/cleaning-tool/${tool._id}`).set("Cookie", cookie),
            api.delete(`/api/v1/worker/${worker._id}`).set("Cookie", cookie)
        ]);

        expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    });

    test("a cancelled booking still blocks deletion (records are permanent)", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const booking = await createPaidBooking(user, service, city);
        await Booking.updateOne({ _id: booking._id }, { $set: { status: "cancelled" } });

        const res = await api.delete(`/api/v1/city/${city._id}`)
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(409);
    });
});
