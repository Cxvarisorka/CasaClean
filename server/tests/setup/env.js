// Jest setupFiles entry — runs BEFORE any application module is loaded.
//
// app.js calls dotenv.config() and then assertEnv() at require time, so every
// variable the fail-fast check demands must already exist here. dotenv never
// overrides variables that are already set, which means these test values also
// win over a developer's real server/.env (no test can accidentally talk to a
// real database, Stripe account or SMTP host).
process.env.NODE_ENV = "test";

// assertEnv() required configuration.
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/casaclean-test-unused";
process.env.JWT_SECRET = "casaclean-test-jwt-secret-0123456789-0123456789";
process.env.JWT_EXPIRES_IN = "1h";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.SERVER_URL = "http://localhost:3000";
process.env.PORT = "0";
process.env.COOKIE_EXPIRES = "7";
process.env.STRIPE_SECRET_KEY = "sk_test_casaclean_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_casaclean_test_secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.GOOGLE_CALLBACK_URL = "http://localhost:3000/api/v1/auth/google/callback";

// Point the (mocked) mail transport at a dead local address so a missed mock
// can never send real email — it would just time out inside the test.
process.env.MAIL_HOST = "127.0.0.1";
process.env.MAIL_PORT = "2525";
process.env.MAIL_USERNAME = "test";
process.env.MAIL_PASSWORD = "test";

// Keep Sentry disabled in tests.
process.env.SENTRY_DSN = "";

/*
 * Force the LOCAL disk driver for image uploads.
 *
 * These are set to "" rather than deleted, and that distinction is the whole
 * point. dotenv does not override a variable that already EXISTS, but it does
 * inject one that is missing — so `delete` would hand the real value straight
 * back when app.js calls dotenv.config(). An empty string is present (dotenv
 * leaves it alone) and falsy, and services/imageStorage.service.js decides on
 * truthiness, so the local driver wins.
 *
 * Without this, a developer with real Cloudinary credentials in server/.env ran
 * the entire suite against their LIVE account: every run uploaded a real asset
 * into the production folder, and serviceUpload.test.js failed on an assertion
 * about /uploads/... paths for reasons that had nothing to do with the code
 * under test. CI, having no credentials, passed — so the breakage only ever
 * appeared on the machines that could do real damage.
 */
process.env.CLOUDINARY_URL = "";
process.env.CLOUDINARY_CLOUD_NAME = "";
process.env.CLOUDINARY_API_KEY = "";
process.env.CLOUDINARY_API_SECRET = "";

// Refund policy window used by cancelMyBooking (kept at the production default
// so the tests document the real behaviour).
process.env.CANCELLATION_WINDOW_HOURS = "24";
