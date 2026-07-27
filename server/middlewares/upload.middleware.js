/**
 * File uploads (multer).
 *
 * Only one upload exists today: the single cover image an admin attaches when
 * creating or editing a service. It is stored on disk under
 * `server/uploads/services/` (see utils/upload.util.js) and served read-only
 * from `/uploads/...`.
 *
 * Security posture:
 *   - The route is already behind `protect` + `restrictTo("admin")`, so only a
 *     signed-in admin can reach multer at all.
 *   - `limits` caps the size AND the number of files/fields, so a multipart
 *     body can't be used to exhaust disk or memory.
 *   - Filenames are generated server-side from random bytes plus an extension
 *     derived from the MIME type — the client-supplied `originalname` is never
 *     used, which rules out traversal (`../../app.js`) and double-extension
 *     tricks (`logo.png.php`).
 *   - `fileFilter` rejects anything outside the raster image allow-list. Paired
 *     with helmet's `X-Content-Type-Options: nosniff` on the static mount, a
 *     stored file can't be re-interpreted as script by a browser.
 */

const crypto = require("crypto");
const multer = require("multer");

// Utils
const AppError = require("../utils/appError.util");
const {
    SERVICE_IMAGE_DIR,
    ALLOWED_IMAGE_TYPES,
    ensureUploadDirs
} = require("../utils/upload.util");

// 5 MB — the admin panel downscales client-side before uploading (typically a
// couple hundred KB), so this is a generous backstop rather than a target.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            ensureUploadDirs();
            cb(null, SERVICE_IMAGE_DIR);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        // Random name + allow-listed extension. Never derived from user input.
        const ext = ALLOWED_IMAGE_TYPES.get(file.mimetype) || "";
        cb(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${ext}`);
    }
});

const serviceImageUpload = multer({
    storage,
    limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 1,
        // The service form has ~9 text fields; keep headroom without allowing an
        // unbounded field storm.
        fields: 25
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            return cb(new AppError("Image must be a PNG, JPEG, WebP or GIF file!", 400));
        }
        cb(null, true);
    }
}).single("image");

/**
 * `upload.single("image")` wrapped so multer's own errors become AppErrors and
 * flow through the standard error envelope instead of surfacing as a raw 500.
 *
 * Requests that aren't multipart pass straight through untouched (multer is a
 * no-op on JSON bodies), so the service routes keep accepting their existing
 * JSON payloads — an admin can still supply a hosted image URL instead of a file.
 */
const uploadServiceImage = (req, res, next) => {
    serviceImageUpload(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return next(new AppError("Image is too large — 5 MB maximum!", 413));
            }
            if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") {
                return next(new AppError('Only a single file, sent as "image", may be uploaded!', 400));
            }
            return next(new AppError("Image upload failed!", 400));
        }

        // AppError from fileFilter, or a genuine I/O failure.
        next(err);
    });
};

module.exports = { uploadServiceImage, MAX_IMAGE_BYTES };
