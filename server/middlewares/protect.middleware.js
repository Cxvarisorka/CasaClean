const { promisify } = require("util");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");

/**
 * Auth guard: verifies the JWT cookie and attaches the user to req.user.
 */
const protect = catchAsync(async (req, res, next) => {
    const token = req.cookies?.lt;

    if (!token) {
        return next(new AppError("Authorization is required!", 401));
    }

    // jwt.verify THROWS on an invalid/expired token (it doesn't return falsy),
    // so the old `if (!payload)` check was dead code. The throw is caught by
    // catchAsync and translated to a 401 in the global error handler
    // (JsonWebTokenError / TokenExpiredError).
    const payload = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // This runs on every authenticated request. .lean() returns a plain object
    // (no Mongoose hydration) — req.user is only ever read (never .save()'d or
    // used to call instance methods), so the lighter object is all we need.
    const user = await User.findById(payload.id).lean();

    if (!user) {
        return next(new AppError("The user for this token no longer exists!", 401));
    }

    req.user = user;
    next();
});

/**
 * Optional auth: like protect, but NEVER rejects. A valid auth cookie attaches
 * the user to req.user; anything else (no cookie, expired/invalid token,
 * deleted user) lets the request continue anonymously.
 *
 * Used on public endpoints whose response is richer for an admin — e.g. the
 * catalogue lists, where ?includeDisabled=true only takes effect when the
 * caller's live DB role is admin.
 */
const attachUser = async (req, res, next) => {
    try {
        const token = req.cookies?.lt;
        if (token) {
            const payload = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
            const user = await User.findById(payload.id).lean();
            if (user) req.user = user;
        }
    } catch (err) {
        // Invalid/expired token on a public route -> treat as anonymous.
    }
    next();
};

/**
 * Role guard: use AFTER protect, e.g. router.delete("/:id", protect, restrictTo("admin"), ...)
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError("You do not have permission to perform this action!", 403));
        }
        next();
    };
};

module.exports = {protect, attachUser, restrictTo};
