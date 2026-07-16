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
    // tokenVersion is select:false, so opt back in for the revocation check.
    const user = await User.findById(payload.id).select("+tokenVersion").lean();

    if (!user) {
        return next(new AppError("The user for this token no longer exists!", 401));
    }

    // Session revocation: a password change/reset bumps the user's tokenVersion,
    // which must match the token's `v` claim — tokens minted before the bump die
    // here, killing every outstanding session at once. Tokens issued before this
    // claim existed carry no `v`; both sides default to 0 so they stay valid.
    if ((payload.v ?? 0) !== (user.tokenVersion ?? 0)) {
        return next(new AppError("Your session is no longer valid. Please log in again!", 401));
    }
    delete user.tokenVersion; // internal counter — keep it off req.user/API responses

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
            const user = await User.findById(payload.id).select("+tokenVersion").lean();
            // Same revocation rule as protect — a stale token is anonymous here.
            if (user && (payload.v ?? 0) === (user.tokenVersion ?? 0)) {
                delete user.tokenVersion;
                req.user = user;
            }
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
