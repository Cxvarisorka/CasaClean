// Third party modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Env config (load before anything reads process.env)
dotenv.config();

// Fail fast on missing/weak configuration (JWT secret, CLIENT_URL, …) BEFORE
// any middleware is wired up — a misconfigured server must not accept traffic.
const { isProduction, assertEnv } = require('./utils/env.util');
assertEnv();

const cookieParser = require('cookie-parser');
const passport = require("passport");
const Sentry = require("@sentry/node");

// Configs
const connectDB = require('./config/db.config');
require("./config/passport.config");
require("./config/sentry.config");


// Custom middlewares
const globalErrorHandler = require('./controllers/error.controller');
const csrfGuard = require('./middlewares/csrf.middleware');
const sanitizeMongo = require('./middlewares/sanitize.middleware');
const { globalLimiter } = require('./middlewares/rateLimit.middleware');
const AppError = require('./utils/appError.util');
const { UPLOADS_ROOT, ensureUploadDirs } = require('./utils/upload.util');
// Required for its closeTransport() side-channel, used by the shutdown handler to
// release the pooled SMTP sockets.
const sendEmail = require('./utils/email.util');
const { describeStorage, storageDriver } = require('./services/imageStorage.service');

// Routers
const authRouter = require('./routers/auth.router');
const cityRouter = require('./routers/city.router');
const serviceRouter = require('./routers/service.router');
const bookingRouter = require('./routers/booking.router');
const specialRequestRouter = require('./routers/specialRequest.router');
const cleaningToolRouter = require('./routers/cleaningTool.router');
const reviewRouter = require('./routers/review.router');
const workerRouter = require('./routers/worker.router');
const paymentRouter = require('./routers/payment.router');
const subscriptionRouter = require('./routers/subscription.router');
const invoiceRouter = require('./routers/invoice.router');
const contactMessageRouter = require('./routers/contactMessage.router');

// Imported without side effects. startJobs is invoked only after app.listen so
// server/tests can safely require this app object without starting cron.
const { startJobs, stopJobs } = require('./jobs');

// Stripe webhook (raw-body handler; mounted before the JSON parser & CSRF guard)
const { handleStripeWebhook } = require('./controllers/webhook.controller');

// Express app init
const app = express();

// Production deployments sit behind a reverse proxy (Render/Heroku/nginx).
// Trusting the first hop makes req.ip the real client address, so rate
// limiting keys on the actual user instead of lumping everyone together
// under the proxy's IP. (1 hop, not `true` — trusting every hop would let
// clients spoof X-Forwarded-For to dodge the limiter.)
if (isProduction) {
    app.set('trust proxy', 1);
}

// --- Global middlewares ---

// Security headers (X-Content-Type-Options, frameguard, HSTS in prod, …).
app.use(helmet({
    // HSTS only makes sense over HTTPS; enabling it on plain-HTTP localhost
    // would poison the browser's HTTPS-only cache for the dev domain.
    strictTransportSecurity: isProduction
}));

// --- Stripe webhook (MUST come before express.json, cookieParser, csrfGuard and
// the global rate limiter) ---------------------------------------------------
// Stripe signs the webhook against the RAW request bytes, so this route needs
// the unparsed body (express.raw). The request also carries no auth cookie and
// no X-Requested-With header — both of which the normal pipeline would reject.
// Mounting it here (under /webhooks, outside /api/v1) keeps it fully isolated and
// off the global rate limiter so Stripe's retry bursts are never throttled.
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Health check for load balancers / uptime monitors. Mounted before the rate
// limiter (a probe every few seconds must never eat into user quota) and
// before auth — it exposes nothing but liveness and DB readiness.
app.get('/healthz', (req, res) => {
    const dbReady = mongoose.connection.readyState === 1; // 1 = connected
    res.status(dbReady ? 200 : 503).json({
        status: dbReady ? 'ok' : 'degraded',
        db: dbReady ? 'connected' : 'disconnected'
    });
});

// Compress JSON responses (catalogue/admin lists are chatty). Mounted after the
// webhook (raw bytes must stay untouched for signature verification).
app.use(compression());

// --- Uploaded files (read-only) ---------------------------------------------
// Admin-uploaded service cover images live on disk under server/uploads and are
// served here. Created at require-time so a fresh clone (uploads/ is
// git-ignored) can serve and write immediately.
//
// Mounted before the global rate limiter: a catalogue page pulls a dozen images
// at once, and static asset fetches must not eat into a visitor's API quota.
// It sits outside /api/v1 and before the routers, so nothing here touches auth.
ensureUploadDirs();
app.use('/uploads', express.static(UPLOADS_ROOT, {
    // Never serve a directory listing or an implicit index.html, and ignore
    // dotfiles entirely — this tree holds nothing but generated image files.
    index: false,
    dotfiles: 'ignore',
    // Filenames are random and immutable (an edit writes a new file and unlinks
    // the old one), so they can be cached hard.
    maxAge: '30d',
    immutable: true,
    setHeaders: (res) => {
        // helmet's default Cross-Origin-Resource-Policy is `same-origin`, which
        // would make the browser refuse to render these images inside the SPA
        // (a different origin). Relax it for this tree only — the files are
        // public product imagery. helmet's global nosniff still applies, so the
        // browser can't reinterpret an image as script.
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// CORS — credentials:true is required so the browser sends/stores the auth
// cookie. The origin is an explicit allow-list (assertEnv guarantees
// CLIENT_URL is set, so this can never silently become reflect-any-origin);
// unknown origins get no CORS headers and their preflights fail.
// CLIENT_URL stays a single canonical origin (it's also used to build
// redirects/links); EXTRA_CORS_ORIGINS (comma-separated, optional) admits
// additional first-party origins such as the www. variant.
const allowedOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.EXTRA_CORS_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser/same-origin requests (no Origin header) and
        // exactly the configured client.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new AppError("Not allowed by CORS", 403));
    },
    credentials: true,
    // Let the browser cache the preflight for a day. Every state-changing call
    // from the SPA is cross-origin AND carries X-Requested-With (the CSRF
    // guard), which makes it non-simple and therefore preflighted — so without
    // this each one paid an extra round trip. The allow-list is static config,
    // so a stale cached preflight can't grant access that was revoked.
    maxAge: 86400
}));

// Global rate limit — per-route stricter limits live on the auth router.
app.use(globalLimiter);

app.use(passport.initialize());

// Body & cookie parsing. The limit caps payload size so a single oversized body
// can't be used to exhaust memory. It's a few MB rather than a few KB because
// the admin can attach an inline service image (a data URL) when creating or
// editing a service; everything else the API receives is compact JSON.
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser()); // populates req.cookies (used by protect middleware)

// CSRF: state-changing requests must carry the custom X-Requested-With header
// (cross-site forms can't set it; cross-origin scripts are blocked by CORS).
app.use(csrfGuard);

// Strip Mongo operator keys ($/.) from body & params (defense in depth on top
// of the per-route Zod validation).
app.use(sanitizeMongo);

// --- Routers ---
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/city', cityRouter);
app.use('/api/v1/service', serviceRouter);
app.use('/api/v1/booking', bookingRouter)
app.use('/api/v1/special-request', specialRequestRouter);
app.use('/api/v1/cleaning-tool', cleaningToolRouter);
app.use('/api/v1/review', reviewRouter);
app.use('/api/v1/worker', workerRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/invoice', invoiceRouter);
app.use('/api/v1/contact', contactMessageRouter);

// 404 — any unmatched route falls through to here.
// Express 5 changed the wildcard syntax; use a named splat ("/*splat").
app.all('/*splat', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

// Centralised error handler (must be the LAST middleware)
app.use(globalErrorHandler);

// Connect to the database FIRST, then start accepting traffic. Starting the
// listener before the DB is ready means early requests hit an unconnected
// Mongoose and fail; a failed connection aborts startup instead of running a
// server that can't serve anything.
const start = async () => {
    try {
        await connectDB();

        // Reconcile indexes with the schemas — sync drops indexes that no longer
        // exist in code and builds the ones that do. Examples of why it matters:
        //   - Review: earlier builds used a unique (service_id, user) index;
        //     reviews are now per-booking, so the booking-unique one replaces it.
        //   - Booking/User: drops the retired customerEmail and role+isVerified
        //     indexes (no query ever used them — pure write overhead).
        //   - Invoice: the unique `booking` and `number` indexes are what make
        //     issuing idempotent and numbering collision-proof, so they must
        //     exist before the first payment lands.
        //   - PendingBooking/PaymentAttempt/StripeEvent carry TTL indexes that
        //     are the ONLY thing expiring those collections.
        //
        // This iterates every registered model rather than a hand-written list.
        // In production `autoIndex` is off (config/db.config.js), so this is the
        // only thing that creates indexes at all — and a model missing from a
        // hand-written list would silently lose its indexes, which for the TTL
        // collections means unbounded growth. Registration happens via the
        // router requires above, so every model is present by now.
        // Wrapped so an index hiccup never blocks startup.
        try {
            await Promise.all(
                Object.values(mongoose.models).map((model) => model.syncIndexes())
            );
        } catch (indexErr) {
            console.error("syncIndexes failed (non-fatal):", indexErr.message);
        }

        const server = app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
            console.log(`Image storage: ${describeStorage()}`);

            /*
             * On a container host (Render, Fly, most PaaS) the filesystem is
             * ephemeral: every deploy and restart wipes it, taking every
             * admin-uploaded service image with it while the database keeps
             * pointing at them. This is not fatal — a mounted disk is a valid
             * setup — but it is silent, and a silently broken catalogue is worth
             * shouting about once at boot.
             */
            if (isProduction && storageDriver() === "local") {
                console.warn(
                    "WARNING: uploads are going to this server's local disk in production.\n" +
                    "         Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET),\n" +
                    "         or make sure a persistent volume is mounted at the uploads path —\n" +
                    "         otherwise every service image is deleted on the next deploy."
                );
            }
        });
        startJobs();

        // Graceful shutdown: on SIGTERM/SIGINT (deploys, Ctrl-C, platform
        // restarts) stop accepting new connections, let in-flight requests —
        // including webhook processing — finish, then close the DB connection.
        // The 10s timer is a hard backstop so a stuck connection can't block
        // the deploy forever.
        const shutdown = (signal) => {
            stopJobs();
            console.log(`${signal} received — shutting down gracefully...`);
            server.close(async () => {
                try {
                    // The SMTP transport is pooled, so it holds open sockets that
                    // would keep the event loop alive past this point. Optional
                    // call: the mail module is mocked in tests, where it has no
                    // such method.
                    sendEmail.closeTransport?.();
                    await mongoose.connection.close();
                } finally {
                    process.exit(0);
                }
            });
            setTimeout(() => {
                console.error("Forced shutdown: open connections didn't close in time.");
                process.exit(1);
            }, 10_000).unref();
        };
        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

// Only boot (connect + listen + process-level safety nets) when this file is
// run directly (`node app.js`). The test suites require the app object and
// manage their own database connection, so requiring this module must stay
// side-effect free.
if (require.main === module) {
    start();

    // Last-resort safety nets: never leave the process running in a corrupted state
    // after an unhandled failure — sync (uncaughtException) or async (rejection).
    process.on("uncaughtException", (err) => {
        console.error("UNCAUGHT EXCEPTION 💥 Shutting down...", err);
        process.exit(1);
    });

    process.on("unhandledRejection", (err) => {
        console.error("UNHANDLED REJECTION 💥 Shutting down...", err);
        process.exit(1);
    });
}

module.exports = app;
