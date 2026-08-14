/**
 * Image storage — Cloudinary, with a local-disk fallback.
 *
 * WHY THIS EXISTS
 * ---------------
 * Admin-uploaded service cover images used to be written to `server/uploads/`
 * and served off this server's own filesystem. That works on a VPS and fails
 * quietly everywhere else: on Render (and any container host without a mounted
 * disk) the filesystem is ephemeral, so every deploy and every restart deletes
 * every uploaded image while the database keeps pointing at them. The result is
 * a catalogue of broken images that nobody notices until a customer does.
 *
 * So uploads go to Cloudinary when it is configured, and to disk when it is not.
 *
 * TWO DRIVERS, ONE INTERFACE
 * --------------------------
 *   cloudinary — used whenever credentials are present. Stores an absolute
 *                https URL on the document.
 *   local      — the previous behaviour. Stores a relative `/uploads/services/…`
 *                path. Kept as the default so a fresh clone, the test suite and
 *                local development all work with no account and no credentials.
 *
 * DELETION DISPATCHES ON THE VALUE, NOT THE ACTIVE DRIVER. A database written
 * before the switch still holds `/uploads/…` paths, and those must remain
 * deletable after Cloudinary is turned on — otherwise enabling it would strand
 * every existing file on disk forever. `removeServiceImage` therefore looks at
 * what the stored string IS, not at what the current driver would produce.
 *
 * Anything we do not recognise as ours — a hosted URL an admin pasted in, a
 * legacy data: URL, a Cloudinary URL belonging to someone else's account — is
 * left strictly alone. Deleting a third party's asset because it happened to be
 * referenced here would be a far worse bug than an orphaned file.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

const {
    SERVICE_IMAGE_DIR,
    SERVICE_IMAGE_URL_PREFIX,
    ALLOWED_IMAGE_TYPES,
    ensureUploadDirs,
    serviceImageUrl,
    isManagedServiceImage,
    removeServiceImage: removeLocalServiceImage
} = require("../utils/upload.util");

// --- Configuration ---------------------------------------------------------

/*
 * The SDK reads CLOUDINARY_URL (cloudinary://key:secret@cloud) on its own, but
 * we also accept the three fields separately because some hosts' secret
 * managers are awkward with URL-shaped values containing credentials.
 */
const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
const hasCloudinaryParts = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

const cloudinaryEnabled = hasCloudinaryUrl || hasCloudinaryParts;

// Top-level folder, so one Cloudinary account can host several environments
// without them deleting each other's assets.
const CLOUDINARY_FOLDER = (process.env.CLOUDINARY_FOLDER || "casaclean").replace(/^\/+|\/+$/g, "");
const SERVICE_FOLDER = `${CLOUDINARY_FOLDER}/services`;

if (cloudinaryEnabled) {
    cloudinary.config({
        ...(hasCloudinaryParts && {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        }),
        // Always deliver over https — an http image on an https page is blocked
        // as mixed content and the card silently renders empty.
        secure: true
    });
}

/** Which driver a NEW upload will use. */
const storageDriver = () => (cloudinaryEnabled ? "cloudinary" : "local");

/** One-line description for the boot log. */
const describeStorage = () =>
    cloudinaryEnabled
        ? `Cloudinary (folder: ${SERVICE_FOLDER})`
        : `local disk (${SERVICE_IMAGE_DIR}) — uploads will NOT survive a redeploy on an ephemeral host`;

// --- Upload ----------------------------------------------------------------

/** Random, unguessable asset name. Never derived from the client's filename. */
const randomAssetName = () => `${Date.now()}-${crypto.randomBytes(12).toString("hex")}`;

/**
 * Upload a buffer to Cloudinary and resolve to its delivery URL.
 *
 * `upload_stream` is callback-based, hence the manual Promise. `resource_type:
 * "image"` (not "auto") means Cloudinary itself refuses anything that is not an
 * image — a second, server-side check behind multer's MIME allow-list, and the
 * one that actually inspects the bytes rather than a client-supplied header.
 */
const uploadToCloudinary = (buffer, publicId) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: SERVICE_FOLDER,
                public_id: publicId,
                resource_type: "image",
                // The admin panel already downscales; this is a backstop so a
                // 5 MB original can never be served to a phone as-is.
                transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto" }],
                overwrite: false,
                invalidate: true
            },
            (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(buffer);
    });

/**
 * Persist an uploaded cover image and return the value to store on the document.
 *
 * Takes multer's in-memory file (`{ buffer, mimetype }`). Nothing is written
 * anywhere until this is called, which is deliberate: the previous disk-storage
 * setup wrote the file before validation had run, so every rejected request left
 * an orphan behind and the router needed a cleanup handler to chase them.
 *
 * @param {{ buffer: Buffer, mimetype: string }} file
 * @returns {Promise<string>} the stored image value
 */
const storeServiceImage = async (file) => {
    if (!file?.buffer) throw new Error("storeServiceImage called without a file buffer");

    const name = randomAssetName();

    if (cloudinaryEnabled) {
        const result = await uploadToCloudinary(file.buffer, name);
        return result.secure_url;
    }

    // Local driver: extension from the MIME type, never from `originalname` —
    // that is what keeps a "logo.php" out of the served tree.
    const ext = ALLOWED_IMAGE_TYPES.get(file.mimetype) || "";
    const filename = `${name}${ext}`;

    ensureUploadDirs();
    await fs.promises.writeFile(path.join(SERVICE_IMAGE_DIR, filename), file.buffer);

    return serviceImageUrl(filename);
};

// --- Deletion --------------------------------------------------------------

/**
 * Recover the Cloudinary public_id from one of OUR delivery URLs.
 *
 * A delivery URL looks like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1712345678/casaclean/services/<name>.jpg
 * and the public_id is the path after the version, without the extension:
 *   casaclean/services/<name>
 *
 * Returns null for anything that is not ours. The folder check is the important
 * one — an admin can paste any URL into the `image` field, including a
 * Cloudinary URL from a different account or a different product, and we must
 * never issue a destroy call for an asset we did not create.
 *
 * (The alternative is storing the public_id in its own column. That would be
 * more robust, but it means a schema field, a strict-Zod field, a multipart
 * coercion entry and an admin form change for a value that is fully recoverable
 * from the URL we generated ourselves.)
 */
const cloudinaryPublicId = (value) => {
    if (typeof value !== "string" || !value.startsWith("http")) return null;

    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }

    if (!/(^|\.)res\.cloudinary\.com$/i.test(url.hostname)) return null;

    // ['', <cloud>, 'image', 'upload', ...rest]
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[1] !== "image" || segments[2] !== "upload") return null;

    const rest = segments.slice(3);
    // Drop the version segment ("v1712345678") when present.
    if (/^v\d+$/.test(rest[0])) rest.shift();

    const publicId = rest.join("/").replace(/\.[a-z0-9]+$/i, "");
    if (!publicId) return null;

    // Only ever delete inside our own folder.
    return publicId.startsWith(`${SERVICE_FOLDER}/`) ? publicId : null;
};

/**
 * Best-effort delete of a stored cover image.
 *
 * Never throws: by the time this runs the admin's request has already succeeded,
 * and an orphaned asset is not a reason to report failure to them. Failures are
 * logged so they are at least visible.
 */
const removeServiceImage = async (value) => {
    if (!value) return;

    // Legacy (or local-driver) path — delete from disk regardless of which
    // driver is active now, so switching to Cloudinary doesn't strand old files.
    if (isManagedServiceImage(value)) {
        return removeLocalServiceImage(value);
    }

    const publicId = cloudinaryPublicId(value);
    if (!publicId) return; // hosted URL, data: URL, or someone else's asset

    if (!cloudinaryEnabled) {
        // A Cloudinary-hosted image but no credentials to delete it with. Say so
        // rather than failing silently — this is a misconfiguration, not a no-op.
        console.error(
            `Cannot delete Cloudinary asset ${publicId}: Cloudinary is not configured on this instance.`
        );
        return;
    }

    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
    } catch (err) {
        console.error(`Failed to remove Cloudinary asset ${publicId}:`, err.message);
    }
};

module.exports = {
    storageDriver,
    describeStorage,
    storeServiceImage,
    removeServiceImage,
    // Exported for tests.
    cloudinaryPublicId,
    SERVICE_FOLDER
};
