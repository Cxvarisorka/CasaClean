// Third party modules
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Env config (load before anything reads process.env)
dotenv.config();

const cookieParser = require('cookie-parser');
const passport = require("passport");
const Sentry = require("@sentry/node");

// Configs
const connectDB = require('./config/db.config');
require("./config/passport.config");
require("./config/sentry.config");

// Custom middlewares
const globalErrorHandler = require('./controllers/error.controller');
const AppError = require('./utils/appError.util');

// Routers
const authRouter = require('./routers/auth.router');
const cityRouter = require('./routers/city.router');
const serviceRouter = require('./routers/service.router');
const bookingRouter = require('./routers/booking.router');
const specialRequestRouter = require('./routers/specialRequest.router');
const reviewRouter = require('./routers/review.router');

// Express app init
const app = express();

// --- Global middlewares ---

// CORS — credentials:true is required so the browser sends/stores the auth cookie.
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

app.use(passport.initialize());

// Body & cookie parsing. The limit caps payload size so a single oversized body
// can't be used to exhaust memory. It's a few MB rather than a few KB because
// the admin can attach an inline service image (a data URL) when creating or
// editing a service; everything else the API receives is compact JSON.
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser()); // populates req.cookies (used by protect middleware)

// --- Routers ---
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/city', cityRouter);
app.use('/api/v1/service', serviceRouter);
app.use('/api/v1/booking', bookingRouter)
app.use('/api/v1/special-request', specialRequestRouter);
app.use('/api/v1/review', reviewRouter);

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
