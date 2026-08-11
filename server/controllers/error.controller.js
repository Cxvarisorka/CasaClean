const AppError = require("../utils/appError.util");
const { isProduction } = require("../utils/env.util");

// --- Error transformers: turn 3rd-party/DB errors into operational AppErrors ---

// Mongoose: invalid ObjectId / wrong type for a field
const handleCastError = (err) =>
    new AppError(`Invalid ${err.path}: ${err.value}.`, 400);

// MongoDB: unique-index violation (e.g. duplicate email)
const handleDuplicateFields = (err) => {
    const field = Object.keys(err.keyValue || {})[0];
    return new AppError(`'${field}' already in use. Please use another value.`, 409);
};

// Mongoose: schema validation failed (required/enum/etc.)
const handleValidationError = (err) => {
    const messages = Object.values(err.errors).map((e) => e.message);
    return new AppError(`Invalid input. ${messages.join(" ")}`, 400);
};

// jsonwebtoken errors
const handleJWTError = () =>
    new AppError("Invalid token. Please log in again!", 401);
const handleJWTExpired = () =>
    new AppError("Your session has expired. Please log in again!", 401);

// Stripe errors. The SDK tags errors with a `type`; turn the common ones into
// operational AppErrors with a client-safe message (card declines surface their
// reason; everything else stays generic).
const STRIPE_ERROR_TYPES = new Set([
    "StripeCardError",
    "StripeInvalidRequestError",
    "StripeRateLimitError",
    "StripeAuthenticationError",
    "StripeAPIError",
    "StripeConnectionError"
]);
const isStripeError = (err) =>
    typeof err?.type === "string" && err.type.startsWith("Stripe");
const handleStripeError = (err) => {
    console.error("Stripe error", {
        type: err.type,
        code: err.code,
        param: err.param,
        requestId: err.requestId,
        message: err.message
    });

    switch (err.type) {
        case "StripeCardError":
            // e.g. card declined / insufficient funds — safe to show the reason.
            return new AppError(err.message || "Your card was declined.", 402);
        case "StripeRateLimitError":
            return new AppError("Too many payment requests. Please try again shortly.", 429);
        case "StripeInvalidRequestError":
            return new AppError("Invalid payment request.", 400);
        default:
            // Auth/API/connection issues are our problem, not the customer's.
            return new AppError("Payment processing failed. Please try again later.", 502);
    }
};

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
        errors: err.details || [],
        // Same key the production envelope uses, so the client reads field
        // errors identically in both environments.
        ...(err.details ? { fields: err.details } : {})
    });
};

const sendErrorProd = (err, res) => {
    // Trusted, expected errors -> send detail to the client.
    if (err.isOperational) {
        // `details` on an operational AppError is only ever our own per-field
        // validation messages (validate.middleware flattens Zod's fieldErrors
        // into it), so it carries no internals. Sending it lets the UI say WHICH
        // field was rejected instead of a bare "Validation failed!".
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
            ...(err.details ? { fields: err.details } : {})
        });
    }

    // Unknown/programming errors -> don't leak internals.
    console.error("UNEXPECTED ERROR 💥", err);
    res.status(500).json({
        success: false,
        status: "error",
        message: "Something went wrong!"
    });
};

const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    // Normalise known DB/JWT/Stripe errors into operational AppErrors BEFORE the
    // dev/prod split, so both environments return the same status codes (an
    // invalid JWT is a 401 everywhere — not a 500 in dev and a 401 in prod).
    // Copy first so we don't mutate the original error object.
    let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
    error.message = err.message;

    if (err.name === "CastError") error = handleCastError(err);
    if (err.code === 11000) error = handleDuplicateFields(err);
    if (err.name === "ValidationError") error = handleValidationError(err);
    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpired();
    if (isStripeError(err) && STRIPE_ERROR_TYPES.has(err.type)) error = handleStripeError(err);

    // Fail-secure: stacks/error internals are only sent when the environment
    // is EXPLICITLY a development one (see utils/env.util.js). Any unknown
    // NODE_ENV value gets the safe production behaviour.
    if (!isProduction) {
        // Keep the ORIGINAL stack/details — the normalised copy points at the
        // handler, which is useless for debugging.
        error.stack = err.stack;
        if (error.details == null) error.details = err.details;
        return sendErrorDev(error, res);
    }

    sendErrorProd(error, res);
};

module.exports = globalErrorHandler;
