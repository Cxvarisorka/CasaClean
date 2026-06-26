// Third party modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

// Models (referenced directly for one-off startup tasks like index sync)
const Review = require('./models/review.model');

// Custom middlewares
const globalErrorHandler = require('./controllers/error.controller');
const csrfGuard = require('./middlewares/csrf.middleware');
const sanitizeMongo = require('./middlewares/sanitize.middleware');
const { globalLimiter } = require('./middlewares/rateLimit.middleware');
const AppError = require('./utils/appError.util');

// Routers
const authRouter = require('./routers/auth.router');
const cityRouter = require('./routers/city.router');
const serviceRouter = require('./routers/service.router');
const bookingRouter = require('./routers/booking.router');
const specialRequestRouter = require('./routers/specialRequest.router');
const reviewRouter = require('./routers/review.router');
const workerRouter = require('./routers/worker.router');
const paymentRouter = require('./routers/payment.router');

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

// CORS — credentials:true is required so the browser sends/stores the auth
// cookie. The origin is an explicit allow-list (assertEnv guarantees
// CLIENT_URL is set, so this can never silently become reflect-any-origin);
// unknown origins get no CORS headers and their preflights fail.
const allowedOrigins = [process.env.CLIENT_URL];
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser/same-origin requests (no Origin header) and
        // exactly the configured client.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new AppError("Not allowed by CORS", 403));
    },
    credentials: true
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
app.use('/api/v1/review', reviewRouter);
app.use('/api/v1/worker', workerRouter);
app.use('/api/v1/payment', paymentRouter);

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

        // Reconcile the Review indexes. Earlier builds used a unique
        // (service_id, user) index — one review per service per user. Reviews
        // are now per-booking (a customer can rate every completed booking), so
        // sync drops that stale index and builds the booking-unique one. Wrapped
        // so an index hiccup never blocks startup.
        try {
            await Review.syncIndexes();
        } catch (indexErr) {
            console.error("Review.syncIndexes failed (non-fatal):", indexErr.message);
        }

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

start();

// Last-resort safety nets: never leave the process running in a corrupted state
// after an unhandled async failure.
process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION 💥 Shutting down...", err);
    process.exit(1);
});
