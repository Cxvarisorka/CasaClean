const rateLimit = require("express-rate-limit");

// Shared JSON shape so limiter responses look like every other API error.
const limiterOptions = (max, windowMs, message) => ({
    windowMs,
    max,
    standardHeaders: true,   // RateLimit-* headers so clients can back off
    legacyHeaders: false,
    message: { success: false, status: "fail", message }
});

// Global backstop for the whole API — generous enough for normal browsing,
// tight enough to blunt scripted abuse.
const globalLimiter = rateLimit(
    limiterOptions(300, 15 * 60 * 1000, "Too many requests. Please try again later.")
);

// Brute-force / credential-stuffing protection on sign-in.
const signinLimiter = rateLimit(
    limiterOptions(10, 15 * 60 * 1000, "Too many sign-in attempts. Please try again in 15 minutes.")
);

// Account-creation spam protection.
const signupLimiter = rateLimit(
    limiterOptions(10, 60 * 60 * 1000, "Too many accounts created from this address. Please try again later.")
);

// Email-sending endpoints: each request triggers an outbound email, so these
// are the tightest limits (protects the victim's inbox AND our mail quota).
const emailLimiter = rateLimit(
    limiterOptions(5, 60 * 60 * 1000, "Too many requests. Please try again later.")
);

// Booking creation: tighter than the global limit to prevent booking-spam and
// runaway test scripts from filling the collection.
const bookingLimiter = rateLimit(
    limiterOptions(20, 15 * 60 * 1000, "Too many booking requests. Please try again later.")
);

// Payment endpoints (intent creation, setup intents): each creates a Stripe
// object, so keep them on a tight limit to blunt abuse without blocking a normal
// checkout (which only needs one or two intents).
const paymentLimiter = rateLimit(
    limiterOptions(30, 15 * 60 * 1000, "Too many payment requests. Please try again later.")
);

module.exports = { globalLimiter, signinLimiter, signupLimiter, emailLimiter, bookingLimiter, paymentLimiter };
