// Centralised environment handling.
//
// Security behaviour (cookie flags, error verbosity) used to be keyed on exact
// string comparisons against NODE_ENV ("dev"/"prod"), which silently degraded
// security for any other value (e.g. the conventional "production"). This
// module is the single source of truth:
//
//   - isProduction is FAIL-SECURE: anything that isn't explicitly a known
//     development value is treated as production.
//   - assertEnv() refuses to start the server with missing or weak secrets.

const DEV_VALUES = ["dev", "development", "test"];

const isProduction = !DEV_VALUES.includes(process.env.NODE_ENV);

// Known-bad placeholder values that must never reach a real deployment.
const PLACEHOLDER_SECRETS = [
    "change-me-to-a-long-random-string",
    "secret",
    "changeme"
];

/**
 * Validate critical configuration at boot. Throwing here aborts startup
 * (see app.js `start()`), which is the point: a server with a forgeable JWT
 * secret or an allow-all CORS policy must not accept traffic.
 */
const assertEnv = () => {
    const problems = [];

    const required = [
        "MONGO_URI", "JWT_SECRET", "JWT_EXPIRES_IN", "CLIENT_URL", "SERVER_URL", "PORT",
        // Governs the auth-cookie lifetime ("Remember me"). A missing/garbage
        // value would make maxAge NaN -> an invalid Max-Age browsers drop or
        // downgrade to a session cookie, silently breaking persistent sign-in.
        "COOKIE_EXPIRES",
        // Stripe: the secret API key (server-side calls) and the webhook signing
        // secret (HMAC verification). Both are required — payments are now a core
        // part of the booking flow, so a server without them is misconfigured.
        "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
        // Google OAuth: the strategy is registered unconditionally at boot, and a
        // missing value would only surface when a user clicks "Sign in with
        // Google" — fail at startup instead.
        "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL",
        // SMTP transport. Without it the server still boots and still accepts
        // signups, but every outbound message is silently lost: nobody can
        // verify an email address (and therefore nobody can sign in), no
        // password can be reset, no confirmation reaches a paying customer and no
        // booking alert reaches the team. That is a dead site that looks alive,
        // which is exactly the failure mode this check exists to prevent.
        // MAIL_FROM is deliberately NOT required — it falls back to
        // MAIL_USERNAME in utils/email.util.js.
        "MAIL_HOST", "MAIL_USERNAME", "MAIL_PASSWORD"
    ];
    for (const name of required) {
        if (!process.env[name]) {
            problems.push(`Missing required environment variable: ${name}`);
        }
    }

    // Presence alone isn't enough — the value is used in arithmetic, so it must
    // be a positive number of days (Number("") is 0 and Number("junk") is NaN;
    // both fail the > 0 check).
    if (process.env.COOKIE_EXPIRES !== undefined && !(Number(process.env.COOKIE_EXPIRES) > 0)) {
        problems.push("COOKIE_EXPIRES must be a positive number (cookie lifetime in days).");
    }

    const jwtSecret = process.env.JWT_SECRET || "";
    if (jwtSecret && jwtSecret.length < 32) {
        problems.push("JWT_SECRET is too short — use at least 32 random characters.");
    }
    if (PLACEHOLDER_SECRETS.includes(jwtSecret.toLowerCase())) {
        problems.push("JWT_SECRET is a known placeholder value — generate a real random secret.");
    }

    if (problems.length > 0) {
        throw new Error(`Invalid server configuration:\n  - ${problems.join("\n  - ")}`);
    }
};

module.exports = { isProduction, assertEnv };
