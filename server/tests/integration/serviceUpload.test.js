// Service cover-image upload (multer).
//
// Covers the whole round trip: an admin posts multipart/form-data, the file
// lands in server/uploads/services, the document stores the relative path, the
// static mount serves it back, and the file is unlinked whenever it stops being
// referenced (replaced, service deleted, or the request failed after the upload).
const fs = require("fs");
const path = require("path");

const { api } = require("../setup/testEnv");
const { createUser, createAdmin, cookieFor, createCity, createService } = require("../setup/fixtures");

const Service = require("../../models/service.model");
const { SERVICE_IMAGE_DIR, SERVICE_IMAGE_URL_PREFIX } = require("../../utils/upload.util");

// Smallest possible valid PNG (1x1, transparent).
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
);

/** Absolute path of the file a stored `/uploads/services/x.png` value points at. */
const diskPath = (imageValue) =>
    path.join(SERVICE_IMAGE_DIR, imageValue.slice(SERVICE_IMAGE_URL_PREFIX.length));

const exists = (imageValue) => fs.existsSync(diskPath(imageValue));

/** How many files the upload directory currently holds. */
const uploadCount = () =>
    fs.existsSync(SERVICE_IMAGE_DIR) ? fs.readdirSync(SERVICE_IMAGE_DIR).length : 0;

/**
 * Post a valid service as multipart. Arrays are JSON-encoded and scalars are
 * strings — exactly how the admin panel's FormData encoder sends them.
 */
const postService = (cookie, { name, cityId, attach = true, ...extra }) => {
    let req = api
        .post("/api/v1/service")
        .set("Cookie", cookie)
        .field("name", name)
        .field("description", "A thorough clean of the whole property.")
        .field("pricePerHour", "24.5")
        .field("allCities", "false")
        .field("cities", JSON.stringify([String(cityId)]))
        .field("allSpecialRequests", "false")
        .field("specialRequests", "[]")
        .field("includes", JSON.stringify(["Kitchen", "Bathroom"]));

    for (const [key, value] of Object.entries(extra)) req = req.field(key, value);
    if (attach) req = req.attach("image", PNG, { filename: "cover.png", contentType: "image/png" });

    return req;
};

// The suite writes real files; start and finish from a clean directory so a
// leaked file from one test can never satisfy another's assertion.
const wipeUploads = () => {
    if (!fs.existsSync(SERVICE_IMAGE_DIR)) return;
    for (const file of fs.readdirSync(SERVICE_IMAGE_DIR)) {
        fs.unlinkSync(path.join(SERVICE_IMAGE_DIR, file));
    }
};

beforeEach(wipeUploads);
afterAll(wipeUploads);

describe("service image upload", () => {
    test("stores the file on disk and the relative path on the document", async () => {
        const admin = await createAdmin();
        const city = await createCity();

        const res = await postService(cookieFor(admin), { name: "Deep Cleaning", cityId: city._id });

        expect(res.status).toBe(201);
        const { service } = res.body.data;
        expect(service.image).toMatch(/^\/uploads\/services\/\d+-[a-f0-9]{24}\.png$/);
        expect(exists(service.image)).toBe(true);

        // The stored value must survive a re-read, not just the create response.
        const stored = await Service.findById(service._id);
        expect(stored.image).toBe(service.image);
    });

    test("multipart text fields are re-typed for the strict schema", async () => {
        const admin = await createAdmin();
        const city = await createCity();

        const res = await postService(cookieFor(admin), { name: "Window Cleaning", cityId: city._id });

        expect(res.status).toBe(201);
        const { service } = res.body.data;
        expect(service.pricePerHour).toBe(24.5);      // "24.5" -> number
        expect(service.allCities).toBe(false);         // "false" -> boolean
        expect(service.cities).toEqual([String(city._id)]); // JSON string -> array
        expect(service.specialRequests).toEqual([]);   // "[]" -> empty array
        expect(service.includes).toEqual(["Kitchen", "Bathroom"]);
    });

    test("the uploaded file is served back from /uploads", async () => {
        const admin = await createAdmin();
        const city = await createCity();

        const created = await postService(cookieFor(admin), { name: "Office Cleaning", cityId: city._id });
        const res = await api.get(created.body.data.service.image);

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toBe("image/png");
        // Cross-origin embedding must be allowed, otherwise the SPA (a different
        // origin) can't render the image.
        expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
        expect(res.body).toEqual(PNG);
    });

    test("rejects a non-image upload and writes nothing", async () => {
        const admin = await createAdmin();
        const city = await createCity();

        const res = await api
            .post("/api/v1/service")
            .set("Cookie", cookieFor(admin))
            .field("name", "Sneaky Service")
            .field("description", "A thorough clean of the whole property.")
            .field("pricePerHour", "24.5")
            .field("allCities", "true")
            .field("cities", "[]")
            .attach("image", Buffer.from("<?php echo 1; ?>"), {
                filename: "shell.php",
                contentType: "application/x-httpd-php"
            });

        expect(res.status).toBe(400);
        expect(uploadCount()).toBe(0);
        expect(await Service.countDocuments()).toBe(0);
    });

    test("a request that fails after the upload leaves no orphan file", async () => {
        const admin = await createAdmin();
        const city = await createCity();
        // formatName() canonicalises to "Deep cleaning", which is what the
        // duplicate check compares against.
        await createService({ name: "Deep cleaning" });

        // Duplicate name -> 409, raised only after multer has written the file.
        const res = await postService(cookieFor(admin), { name: "Deep Cleaning", cityId: city._id });

        expect(res.status).toBe(409);
        expect(uploadCount()).toBe(0);
    });

    test("validation failures also clean up the uploaded file", async () => {
        const admin = await createAdmin();
        const city = await createCity();

        // Name is under the 5-character minimum -> 400 from validate().
        const res = await postService(cookieFor(admin), { name: "Ab", cityId: city._id });

        expect(res.status).toBe(400);
        expect(uploadCount()).toBe(0);
    });

    test("uploading is admin-only", async () => {
        const city = await createCity();
        const user = await createUser();

        const anon = await postService([], { name: "Anon Service", cityId: city._id });
        expect(anon.status).toBe(401);

        const asUser = await postService(cookieFor(user), { name: "User Service", cityId: city._id });
        expect(asUser.status).toBe(403);

        expect(uploadCount()).toBe(0);
    });

    test("replacing the image on edit removes the previous file", async () => {
        const admin = await createAdmin();
        const city = await createCity();
        const cookie = cookieFor(admin);

        const created = await postService(cookie, { name: "Deep Cleaning", cityId: city._id });
        const original = created.body.data.service.image;

        const edited = await api
            .patch(`/api/v1/service/${created.body.data.service._id}`)
            .set("Cookie", cookie)
            .attach("image", PNG, { filename: "new-cover.png", contentType: "image/png" });

        expect(edited.status).toBe(200);
        const replacement = edited.body.data.service.image;
        expect(replacement).not.toBe(original);
        expect(exists(replacement)).toBe(true);
        expect(exists(original)).toBe(false);
        expect(uploadCount()).toBe(1);
    });

    test("an edit that doesn't touch the image keeps the file", async () => {
        const admin = await createAdmin();
        const city = await createCity();
        const cookie = cookieFor(admin);

        const created = await postService(cookie, { name: "Deep Cleaning", cityId: city._id });
        const image = created.body.data.service.image;

        // The admin panel echoes the stored path back on a plain JSON edit; it
        // must validate and leave the file alone.
        const edited = await api
            .patch(`/api/v1/service/${created.body.data.service._id}`)
            .set("Cookie", cookie)
            .send({ pricePerHour: 30, image });

        expect(edited.status).toBe(200);
        expect(edited.body.data.service.image).toBe(image);
        expect(exists(image)).toBe(true);
    });

    test("clearing the image removes the file", async () => {
        const admin = await createAdmin();
        const city = await createCity();
        const cookie = cookieFor(admin);

        const created = await postService(cookie, { name: "Deep Cleaning", cityId: city._id });
        const image = created.body.data.service.image;

        const edited = await api
            .patch(`/api/v1/service/${created.body.data.service._id}`)
            .set("Cookie", cookie)
            .send({ image: "" });

        expect(edited.status).toBe(200);
        expect(edited.body.data.service.image).toBe("");
        expect(exists(image)).toBe(false);
    });

    test("deleting the service removes the file", async () => {
        const admin = await createAdmin();
        const city = await createCity();
        const cookie = cookieFor(admin);

        const created = await postService(cookie, { name: "Deep Cleaning", cityId: city._id });
        const image = created.body.data.service.image;

        const res = await api
            .delete(`/api/v1/service/${created.body.data.service._id}`)
            .set("Cookie", cookie);

        expect(res.status).toBe(200);
        expect(exists(image)).toBe(false);
    });

    test("the static mount does not expose files outside the upload tree", async () => {
        const res = await api.get("/uploads/services/..%2f..%2fapp.js");
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});
