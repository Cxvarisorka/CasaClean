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

    const required = ["MONGO_URI", "JWT_SECRET", "JWT_EXPIRES_IN", "CLIENT_URL", "SERVER_URL", "PORT"];
    for (const name of required) {
        if (!process.env[name]) {
            problems.push(`Missing required environment variable: ${name}`);
        }
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
