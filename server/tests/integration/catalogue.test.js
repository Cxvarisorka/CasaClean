// Catalogue resources: cities, services, special requests, cleaning tools and
// workers. The pattern is shared — public reads show only enabled records,
// ?includeDisabled=true is honoured exclusively for a live admin role, and all
// writes are admin-gated.
const { api } = require("../setup/testEnv");
const {
    createUser,
    createAdmin,
    cookieFor,
    createCity,
    createService,
    createSpecialRequest,
    createCleaningTool,
    createWorker
} = require("../setup/fixtures");

const Service = require("../../models/service.model");

describe("cities", () => {
    test("public list returns only enabled cities", async () => {
        await createCity({ name: "Enabled Town" });
        await createCity({ name: "Disabled Town", enabled: false });

        const res = await api.get("/api/v1/city");
        expect(res.status).toBe(200);
        const names = res.body.data.cities.map((c) => c.name);
        expect(names).toContain("Enabled Town");
        expect(names).not.toContain("Disabled Town");
    });

    test("?includeDisabled=true is ignored for anonymous and non-admin callers", async () => {
        await createCity({ name: "Hidden Town", enabled: false });

        const anon = await api.get("/api/v1/city?includeDisabled=true");
        expect(anon.body.data.cities).toHaveLength(0);

        const user = await createUser();
        const asUser = await api.get("/api/v1/city?includeDisabled=true")
            .set("Cookie", cookieFor(user));
        expect(asUser.body.data.cities).toHaveLength(0);
    });

    test("?includeDisabled=true works for an admin", async () => {
        await createCity({ name: "Hidden Town", enabled: false });
        const admin = await createAdmin();
        const res = await api.get("/api/v1/city?includeDisabled=true")
            .set("Cookie", cookieFor(admin));
        expect(res.body.data.cities.map((c) => c.name)).toContain("Hidden Town");
    });

    test("GET /:id returns one city and 404s when missing", async () => {
        const city = await createCity();
        const found = await api.get(`/api/v1/city/${city._id}`);
        expect(found.status).toBe(200);
        expect(found.body.data.city.name).toBe(city.name);

        const missing = await api.get("/api/v1/city/64b000000000000000000000");
        expect(missing.status).toBe(404);
    });

    test("creation is admin-only", async () => {
        const body = { name: "milan", workingHourStarts: "09:00", workingHourEnds: "17:30" };

        const anon = await api.post("/api/v1/city").send(body);
        expect(anon.status).toBe(401);

        const user = await createUser();
        const asUser = await api.post("/api/v1/city").set("Cookie", cookieFor(user)).send(body);
        expect(asUser.status).toBe(403);

        const admin = await createAdmin();
        const asAdmin = await api.post("/api/v1/city").set("Cookie", cookieFor(admin)).send(body);
        expect(asAdmin.status).toBe(201);
        // formatName normalises the casing.
        expect(asAdmin.body.data.city.name).toBe("Milan");
    });

    test("duplicate city names are rejected with 409", async () => {
        const admin = await createAdmin();
        await createCity({ name: "Rome" });
        const res = await api.post("/api/v1/city")
            .set("Cookie", cookieFor(admin))
            .send({ name: "rome", workingHourStarts: "09:00", workingHourEnds: "17:30" });
        expect(res.status).toBe(409);
    });

    test("PATCH toggles enabled and edits working hours", async () => {
        const admin = await createAdmin();
        const city = await createCity();
        const res = await api.patch(`/api/v1/city/${city._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ enabled: false, workingHourEnds: "18:00" });
        expect(res.status).toBe(200);
        expect(res.body.data.city.enabled).toBe(false);
        expect(res.body.data.city.workingHourEnds).toBe("18:00");
    });

    test("DELETE removes a city", async () => {
        const admin = await createAdmin();
        const city = await createCity();
        const res = await api.delete(`/api/v1/city/${city._id}`)
            .set("Cookie", cookieFor(admin));
        expect(res.status).toBe(200);
        const gone = await api.get(`/api/v1/city/${city._id}`);
        expect(gone.status).toBe(404);
    });
});

describe("services", () => {
    test("public list returns only enabled services", async () => {
        await createService({ name: "Visible Service" });
        await createService({ name: "Hidden Service", enabled: false });

        const res = await api.get("/api/v1/service");
        expect(res.status).toBe(200);
        const names = res.body.data.services.map((s) => s.name);
        expect(names).toContain("Visible Service");
        expect(names).not.toContain("Hidden Service");
    });

    test("admin creates a service restricted to specific cities", async () => {
        const admin = await createAdmin();
        const city = await createCity();

        const res = await api.post("/api/v1/service")
            .set("Cookie", cookieFor(admin))
            .send({
                name: "Deep Cleaning Test",
                description: "Intensive top-to-bottom cleaning session.",
                pricePerHour: 25.5,
                allCities: false,
                cities: [String(city._id)]
            });

        expect(res.status).toBe(201);
        expect(res.body.data.service.pricePerHour).toBe(25.5);
        expect(res.body.data.service.cities).toEqual([String(city._id)]);
    });

    test("allCities:true clears any stale city list (pre-save hook)", async () => {
        const city = await createCity();
        const service = await Service.create({
            name: "Everywhere Cleaning",
            description: "Available in every city we operate in.",
            pricePerHour: 20,
            allCities: true,
            cities: [city._id]
        });
        expect(service.cities).toHaveLength(0);
    });

    test("creation is admin-only", async () => {
        const user = await createUser();
        const res = await api.post("/api/v1/service")
            .set("Cookie", cookieFor(user))
            .send({
                name: "Sneaky Service",
                description: "Should never be created by a normal user.",
                pricePerHour: 1,
                cities: []
            });
        expect(res.status).toBe(403);
    });

    test("recurrence is off by default and stores a deduplicated, sorted cadence list", async () => {
        const admin = await createAdmin();

        const oneOff = await api.post("/api/v1/service")
            .set("Cookie", cookieFor(admin))
            .send({
                name: "One Off Cleaning",
                description: "A single deep clean, never repeated.",
                pricePerHour: 30,
                allCities: true,
                cities: []
            });

        expect(oneOff.status).toBe(201);
        expect(oneOff.body.data.service.recurringEnabled).toBe(false);
        expect(oneOff.body.data.service.recurringIntervalDays).toEqual([]);

        const recurring = await api.post("/api/v1/service")
            .set("Cookie", cookieFor(admin))
            .send({
                name: "Weekly Upkeep Test",
                description: "A repeating tidy-up on a fixed cadence.",
                pricePerHour: 20,
                allCities: true,
                cities: [],
                recurringEnabled: true,
                recurringIntervalDays: [14, 7, 7]
            });

        expect(recurring.status).toBe(201);
        expect(recurring.body.data.service.recurringEnabled).toBe(true);
        expect(recurring.body.data.service.recurringIntervalDays).toEqual([7, 14]);
    });

    test("instant booking is off unless an admin turns it on, and survives an unrelated edit", async () => {
        const admin = await createAdmin();

        // Fail-closed: a service that says nothing about it waits out the
        // 48-hour advance notice like every other one.
        const scheduled = await api.post("/api/v1/service")
            .set("Cookie", cookieFor(admin))
            .send({
                name: "Scheduled Only Cleaning",
                description: "Booked ahead, like everything else.",
                pricePerHour: 20,
                allCities: true,
                cities: []
            });

        expect(scheduled.status).toBe(201);
        expect(scheduled.body.data.service.allowInstantBooking).toBe(false);

        const instant = await api.post("/api/v1/service")
            .set("Cookie", cookieFor(admin))
            .send({
                name: "Same Day Cleaning",
                description: "Staffed today.",
                pricePerHour: 25,
                allCities: true,
                cities: [],
                allowInstantBooking: true
            });

        expect(instant.status).toBe(201);
        expect(instant.body.data.service.allowInstantBooking).toBe(true);

        // A rename must not quietly put the service back on the 48-hour wait.
        const renamed = await api.patch(`/api/v1/service/${instant.body.data.service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ name: "Same Day Cleaning Renamed" });

        expect(renamed.status).toBe(200);
        expect(renamed.body.data.service.allowInstantBooking).toBe(true);

        // And turning it off is a real edit.
        const off = await api.patch(`/api/v1/service/${instant.body.data.service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ allowInstantBooking: false });

        expect(off.status).toBe(200);
        expect(off.body.data.service.allowInstantBooking).toBe(false);
    });

    test("stores per-language copy, dropping the blanks a half-finished language leaves", async () => {
        const admin = await createAdmin();

        const res = await api.post("/api/v1/service")
            .set("Cookie", cookieFor(admin))
            .send({
                name: "Translated Cleaning",
                description: "Intensive top-to-bottom cleaning session.",
                includes: ["Kitchen", "Bathroom"],
                pricePerHour: 25,
                allCities: true,
                cities: [],
                translations: {
                    it: {
                        name: "Pulizia Tradotta",
                        // Left blank in the panel — must not be stored, so the
                        // Italian card falls back to the English description.
                        description: "   ",
                        includes: ["Cucina", "  "]
                    },
                    // Nothing filled in at all: not a translation.
                    ru: { name: "", subtitle: "" }
                }
            });

        expect(res.status).toBe(201);
        const { translations } = res.body.data.service;
        expect(translations.it).toEqual({ name: "Pulizia Tradotta", includes: ["Cucina"] });
        expect(translations.ru).toBeUndefined();
    });

    test("translations are replaced wholesale, and untouched by an unrelated edit", async () => {
        const admin = await createAdmin();
        const service = await createService({
            translations: { it: { name: "Pulizia" }, ka: { name: "დასუფთავება" } }
        });

        // A price-only edit leaves every translation in place.
        const priced = await api.patch(`/api/v1/service/${service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ pricePerHour: 21 });
        expect(priced.status).toBe(200);
        expect(Object.keys(priced.body.data.service.translations).sort()).toEqual(["it", "ka"]);

        // Sending the map back without Georgian removes that translation.
        const replaced = await api.patch(`/api/v1/service/${service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ translations: { it: { name: "Pulizia Profonda" } } });
        expect(replaced.status).toBe(200);
        expect(replaced.body.data.service.translations).toEqual({
            it: { name: "Pulizia Profonda" }
        });
    });

    test("rejects copy for a language the platform does not support", async () => {
        const admin = await createAdmin();
        const service = await createService();

        const res = await api.patch(`/api/v1/service/${service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ translations: { fr: { name: "Nettoyage" } } });

        expect(res.status).toBe(400);
    });

    test("turning recurrence off clears the cadence list, and out-of-range cadences are rejected", async () => {
        const admin = await createAdmin();
        const service = await createService({
            recurringEnabled: true,
            recurringIntervalDays: [7]
        });

        const tooLong = await api.patch(`/api/v1/service/${service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ recurringIntervalDays: [30] });
        expect(tooLong.status).toBe(400);

        const tooShort = await api.patch(`/api/v1/service/${service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ recurringIntervalDays: [0] });
        expect(tooShort.status).toBe(400);

        // An unrelated edit must leave the cadence list alone...
        const renamed = await api.patch(`/api/v1/service/${service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ pricePerHour: 22 });
        expect(renamed.status).toBe(200);
        expect(renamed.body.data.service.recurringIntervalDays).toEqual([7]);

        // ...while switching recurrence off drops it.
        const disabled = await api.patch(`/api/v1/service/${service._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ recurringEnabled: false });
        expect(disabled.status).toBe(200);
        expect(disabled.body.data.service.recurringEnabled).toBe(false);
        expect(disabled.body.data.service.recurringIntervalDays).toEqual([]);
    });
});

describe("special requests", () => {
    test("public list returns only enabled add-ons", async () => {
        await createSpecialRequest({ name: "Fridge Cleaning" });
        await createSpecialRequest({ name: "Retired Add-on", enabled: false });

        const res = await api.get("/api/v1/special-request");
        expect(res.status).toBe(200);
        const names = res.body.data.specialRequests.map((r) => r.name);
        expect(names).toContain("Fridge Cleaning");
        expect(names).not.toContain("Retired Add-on");
    });

    test("admin creates an add-on; normal users cannot", async () => {
        const admin = await createAdmin();
        const created = await api.post("/api/v1/special-request")
            .set("Cookie", cookieFor(admin))
            .send({ name: "Inside Oven", price: 12 });
        expect(created.status).toBe(201);

        const user = await createUser();
        const denied = await api.post("/api/v1/special-request")
            .set("Cookie", cookieFor(user))
            .send({ name: "Nope", price: 1 });
        expect(denied.status).toBe(403);
    });

    test("negative prices are rejected", async () => {
        const admin = await createAdmin();
        const res = await api.post("/api/v1/special-request")
            .set("Cookie", cookieFor(admin))
            .send({ name: "Bad Price", price: -5 });
        expect(res.status).toBe(400);
    });
});

describe("cleaning tools", () => {
    test("public list returns only enabled tools", async () => {
        await createCleaningTool({ name: "Vacuum Cleaner" });
        await createCleaningTool({ name: "Broken Tool", enabled: false });

        const res = await api.get("/api/v1/cleaning-tool");
        expect(res.status).toBe(200);
        const names = res.body.data.cleaningTools.map((t) => t.name);
        expect(names).toContain("Vacuum Cleaner");
        expect(names).not.toContain("Broken Tool");
    });

    test("admin creates a tool; normal users cannot", async () => {
        const admin = await createAdmin();
        const created = await api.post("/api/v1/cleaning-tool")
            .set("Cookie", cookieFor(admin))
            .send({ name: "Steam Cleaner", price: 8 });
        expect(created.status).toBe(201);

        const user = await createUser();
        const denied = await api.post("/api/v1/cleaning-tool")
            .set("Cookie", cookieFor(user))
            .send({ name: "Nope", price: 1 });
        expect(denied.status).toBe(403);
    });
});

describe("workers", () => {
    test("the whole resource is admin-only (even reads)", async () => {
        const user = await createUser();
        const asUser = await api.get("/api/v1/worker").set("Cookie", cookieFor(user));
        expect(asUser.status).toBe(403);

        const anon = await api.get("/api/v1/worker");
        expect(anon.status).toBe(401);
    });

    test("admin can create, list, edit and delete workers", async () => {
        const admin = await createAdmin();
        const cookie = cookieFor(admin);

        const created = await api.post("/api/v1/worker")
            .set("Cookie", cookie)
            .send({ fullname: "Anna Cleaner", email: "anna@test.casaclean.local" });
        expect(created.status).toBe(201);
        const id = created.body.data.worker._id;

        const listed = await api.get("/api/v1/worker").set("Cookie", cookie);
        expect(listed.status).toBe(200);
        expect(listed.body.data.workers.some((w) => w._id === id)).toBe(true);

        const edited = await api.patch(`/api/v1/worker/${id}`)
            .set("Cookie", cookie)
            .send({ enabled: false });
        expect(edited.status).toBe(200);
        expect(edited.body.data.worker.enabled).toBe(false);

        const deleted = await api.delete(`/api/v1/worker/${id}`).set("Cookie", cookie);
        expect(deleted.status).toBe(200);
    });
});

/*
 * Multilingual copy is one shared implementation (utils/translations.util.js +
 * models/translations.schema.js + validations/translations.validation.js) that
 * every catalogue resource mounts, so the contract is exercised once per
 * resource rather than re-specified per controller. Services get their own
 * cases above — their copy has the most fields (including a list).
 */
describe("multilingual catalogue copy", () => {
    const resources = [
        {
            label: "city",
            url: "/api/v1/city",
            key: "city",
            create: { name: "Translated Town", workingHourStarts: "09:00", workingHourEnds: "18:00" }
        },
        {
            label: "special request",
            url: "/api/v1/special-request",
            key: "specialRequest",
            create: { name: "Translated Add-on", price: 12 }
        },
        {
            label: "cleaning tool",
            url: "/api/v1/cleaning-tool",
            key: "cleaningTool",
            create: { name: "Translated Tool", price: 5 }
        }
    ];

    describe.each(resources)("$label", ({ url, key, create }) => {
        test("stores per-language copy and drops the blanks a half-finished language leaves", async () => {
            const admin = await createAdmin();

            const res = await api.post(url)
                .set("Cookie", cookieFor(admin))
                .send({
                    ...create,
                    translations: {
                        it: { name: "Nome Tradotto" },
                        // Touched in the panel but never filled: not a translation.
                        ru: { name: "   " }
                    }
                });

            expect(res.status).toBe(201);
            expect(res.body.data[key].translations).toEqual({ it: { name: "Nome Tradotto" } });
        });

        test("translations are replaced wholesale, and untouched by an unrelated edit", async () => {
            const admin = await createAdmin();
            const cookie = cookieFor(admin);

            const created = await api.post(url)
                .set("Cookie", cookie)
                .send({
                    ...create,
                    translations: { it: { name: "Nome" }, ka: { name: "სახელი" } }
                });
            expect(created.status).toBe(201);
            const id = created.body.data[key]._id;

            // Flipping an unrelated field leaves every translation in place.
            const toggled = await api.patch(`${url}/${id}`)
                .set("Cookie", cookie)
                .send({ enabled: false });
            expect(toggled.status).toBe(200);
            expect(Object.keys(toggled.body.data[key].translations).sort()).toEqual(["it", "ka"]);

            // Sending the map back without Georgian removes that translation.
            const replaced = await api.patch(`${url}/${id}`)
                .set("Cookie", cookie)
                .send({ translations: { it: { name: "Nuovo Nome" } } });
            expect(replaced.status).toBe(200);
            expect(replaced.body.data[key].translations).toEqual({ it: { name: "Nuovo Nome" } });

            // An empty map clears them all without touching the default-locale copy.
            const cleared = await api.patch(`${url}/${id}`)
                .set("Cookie", cookie)
                .send({ translations: {} });
            expect(cleared.status).toBe(200);
            expect(cleared.body.data[key].translations).toEqual({});
            expect(cleared.body.data[key].name).toBe(created.body.data[key].name);
        });

        test("rejects copy for a language the platform does not support", async () => {
            const admin = await createAdmin();

            const res = await api.post(url)
                .set("Cookie", cookieFor(admin))
                .send({ ...create, translations: { fr: { name: "Nom" } } });

            expect(res.status).toBe(400);
        });

        test("rejects the default locale — it lives in the root fields", async () => {
            const admin = await createAdmin();

            const res = await api.post(url)
                .set("Cookie", cookieFor(admin))
                .send({ ...create, translations: { en: { name: "Name" } } });

            expect(res.status).toBe(400);
        });
    });
});
