const AppError = require("../utils/appError.util");

/**
 * CSRF defense for cookie-based auth (custom-header pattern).
 *
 * The session lives in a cookie the browser attaches automatically, so a
 * malicious site could otherwise submit state-changing requests on behalf of
 * a logged-in victim (classic CSRF). Cross-site HTML forms and top-level
 * navigations CANNOT set custom headers, and setting one from a cross-origin
 * fetch/XHR triggers a CORS preflight that our strict CORS config rejects.
 *
 * Therefore: every state-changing request must carry
 * `X-Requested-With: XMLHttpRequest` (the client's axios instance sends it on
 * every call). Safe methods (GET/HEAD/OPTIONS) are exempt — they must remain
 * side-effect free, and exempting them keeps email-verification links and the
 * Google OAuth redirects working.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const csrfGuard = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    if (req.headers["x-requested-with"] !== "XMLHttpRequest") {
        return next(new AppError("Missing required request header.", 403));
    }

    next();
};

module.exports = csrfGuard;
