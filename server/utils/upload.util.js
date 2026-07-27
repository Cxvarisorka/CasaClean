/**
 * Local upload store.
 *
 * Admin-uploaded imagery (currently only the service cover image) is written to
 * `server/uploads/<resource>/` and served read-only from `/uploads/...` by
 * app.js. Documents store the *relative* public path (e.g.
 * `/uploads/services/ab12….jpg`) rather than an absolute URL, so moving the API
 * between hosts/ports doesn't invalidate every stored image — the client
 * resolves it against the API origin at render time.
 *
 * Everything in here is deliberately paranoid about paths: a value coming out
 * of the database is still attacker-influenceable in principle, so deletions
 * are confined to the upload directory and reject anything that escapes it.
 */

const fs = require("fs");
const path = require("path");

// Root of the served upload tree. `path.resolve` so every comparison below is
// against a normalised absolute path.
const UPLOADS_ROOT = path.resolve(__dirname, "..", "uploads");

// Per-resource sub-directory + the public URL prefix it is served under. The
// two must stay in sync with the express.static mount in app.js.
const SERVICE_IMAGE_DIR = path.join(UPLOADS_ROOT, "services");
const SERVICE_IMAGE_URL_PREFIX = "/uploads/services/";

// Image types accepted for upload, mapped to the extension we store them under.
// The extension is derived from the (multer-parsed) MIME type, never from the
// client-supplied filename — that's what keeps a "logo.php" out of the tree.
const ALLOWED_IMAGE_TYPES = new Map([
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"]
]);

/**
 * Create the upload directories if they don't exist yet. Called at boot (and
 * defensively before each upload) so a fresh clone — where `uploads/` is
 * git-ignored — doesn't fail the first write with ENOENT.
 */
const ensureUploadDirs = () => {
    fs.mkdirSync(SERVICE_IMAGE_DIR, { recursive: true });
};

/** Relative public path for a stored service image filename. */
const serviceImageUrl = (filename) => `${SERVICE_IMAGE_URL_PREFIX}${filename}`;

/** True when `value` is a path this server owns (and may therefore delete). */
const isManagedServiceImage = (value) =>
    typeof value === "string" && value.startsWith(SERVICE_IMAGE_URL_PREFIX);

/**
 * Best-effort delete of a previously stored service image.
 *
 * No-ops for anything that isn't one of our own uploads (hosted URLs, legacy
 * inline data URLs, empty values) and for any path that would resolve outside
 * the upload directory. Failures are logged, never thrown: losing an orphaned
 * file is not a reason to fail the admin's request.
 */
const removeServiceImage = async (value) => {
    if (!isManagedServiceImage(value)) return;

    // Drop any query/hash the value may carry, then keep only the final path
    // segment — `..` and nested paths can never survive path.basename.
    const filename = path.basename(value.slice(SERVICE_IMAGE_URL_PREFIX.length).split(/[?#]/)[0]);
    if (!filename || filename === "." || filename === "..") return;

    const target = path.resolve(SERVICE_IMAGE_DIR, filename);

    // Belt and braces: refuse to unlink anything outside the upload directory.
    if (path.dirname(target) !== SERVICE_IMAGE_DIR) return;

    try {
        await fs.promises.unlink(target);
    } catch (err) {
        // ENOENT just means it was already gone (double edit, manual cleanup).
        if (err.code !== "ENOENT") {
            console.error(`Failed to remove upload ${filename}:`, err.message);
        }
    }
};

module.exports = {
    UPLOADS_ROOT,
    SERVICE_IMAGE_DIR,
    SERVICE_IMAGE_URL_PREFIX,
    ALLOWED_IMAGE_TYPES,
    ensureUploadDirs,
    serviceImageUrl,
    isManagedServiceImage,
    removeServiceImage
};
