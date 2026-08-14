// Image storage — which assets we are willing to delete.
//
// The `image` field accepts any string an admin types, including a URL pointing
// at somebody else's Cloudinary account. `cloudinaryPublicId` is what decides
// whether a value names an asset WE created and may therefore destroy. Getting
// it wrong in the permissive direction means issuing delete calls for assets we
// do not own; getting it wrong in the strict direction only orphans a file.
//
// These run with no Cloudinary credentials configured (the default in tests), so
// they exercise the parser itself rather than the SDK.

const { cloudinaryPublicId, storageDriver, SERVICE_FOLDER } = require("../../services/imageStorage.service");

const url = (pathname) => `https://res.cloudinary.com/demo-cloud${pathname}`;

describe("storageDriver", () => {
    it("falls back to local disk when Cloudinary is not configured", () => {
        // Which is what keeps a fresh clone, CI and this suite working with no
        // account and no credentials.
        expect(storageDriver()).toBe("local");
    });
});

describe("cloudinaryPublicId", () => {
    it("recovers the public id from one of our delivery URLs", () => {
        expect(cloudinaryPublicId(url(`/image/upload/v1712345678/${SERVICE_FOLDER}/abc123.jpg`)))
            .toBe(`${SERVICE_FOLDER}/abc123`);
    });

    it("works without a version segment", () => {
        expect(cloudinaryPublicId(url(`/image/upload/${SERVICE_FOLDER}/abc123.png`)))
            .toBe(`${SERVICE_FOLDER}/abc123`);
    });

    it("strips only the extension, keeping dots inside the name", () => {
        expect(cloudinaryPublicId(url(`/image/upload/v1/${SERVICE_FOLDER}/a.b.c.webp`)))
            .toBe(`${SERVICE_FOLDER}/a.b.c`);
    });

    describe("refuses anything that is not ours", () => {
        it.each([
            ["a different Cloudinary folder", url("/image/upload/v1/someone-else/services/x.jpg")],
            ["the folder as a prefix, not a parent", url(`/image/upload/v1/${SERVICE_FOLDER}-evil/x.jpg`)],
            ["a non-Cloudinary host", "https://res.cloudinary.com.evil.test/image/upload/v1/casaclean/services/x.jpg"],
            ["a plain hosted image", "https://images.unsplash.com/photo-123.jpg"],
            ["a video resource path", url(`/video/upload/v1/${SERVICE_FOLDER}/x.mp4`)],
            ["a local upload path", "/uploads/services/abc123.png"],
            ["a legacy data URL", "data:image/png;base64,iVBORw0KGgo="],
            ["an empty value", ""],
            ["a non-string", 42],
            ["a malformed URL", "https://"]
        ])("%s", (_label, value) => {
            expect(cloudinaryPublicId(value)).toBeNull();
        });
    });

    it("never returns a public id outside the service folder", () => {
        // Belt and braces on the property that actually matters: whatever the
        // input, a returned id is always inside the folder we own.
        const inputs = [
            url(`/image/upload/v1/${SERVICE_FOLDER}/ok.jpg`),
            url("/image/upload/v1/other/thing.jpg"),
            url("/image/upload/v1/../casaclean/services/x.jpg"),
            "https://images.unsplash.com/photo-123.jpg"
        ];
        for (const input of inputs) {
            const id = cloudinaryPublicId(input);
            if (id !== null) expect(id.startsWith(`${SERVICE_FOLDER}/`)).toBe(true);
        }
    });
});
