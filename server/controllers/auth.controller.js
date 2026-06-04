const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const { VERIFICATION_TOKEN_TTL_HOURS } = require("../models/user.model");
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");
const sendEmail = require("../utils/email.util");
const { verificationEmail } = require("../utils/emailTemplates.util");

/**
 * Issue a fresh verification token for a user, persist it and email the link.
 *
 * Shared by signup and the "resend" endpoint. If sending fails we roll back the
 * token fields so a stale, never-delivered token can't linger on the account.
 *
 * @param {import("mongoose").Document} user - a local (non-Google) user
 */
const sendVerificationEmail = async (user) => {
    // Raw token goes in the URL; only its hash is stored on the user.
    const rawToken = user.createVerificationToken();
    await user.save({ validateBeforeSave: false });

    // The link points at the API, which verifies then redirects to the client.
    const verificationUrl = `${process.env.SERVER_URL}/api/v1/auth/verify-email/${rawToken}`;

    const { subject, html, text } = verificationEmail({
        fullname: user.fullname,
        url: verificationUrl,
        expiresInHours: VERIFICATION_TOKEN_TTL_HOURS
    });

    try {
        await sendEmail({ email: user.email, subject, html, text });
    } catch (err) {
        // Undo the token so the user can cleanly request a new one later.
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save({ validateBeforeSave: false });

        throw new AppError("We couldn't send the verification email. Please try again later.", 502);
    }
};

/**
 * Signs a JWT for a given user.
 * Only non-sensitive, stable claims go into the payload (id + role).
 */
const signToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

/**
 * Creates a JWT, sets it as a secure http-only cookie and sends the response.
 * Centralised so signup/signin/refresh all behave identically.
 */
const createSendToken = (user, res, statusCode = 200) => {
    // FIX: this used to call signToken(users) -> "users" was undefined and
    // crashed every login. Pass the actual user object.
    const token = signToken(user);

    const isProd = process.env.NODE_ENV === "prod";

    res.cookie("lt", token, {
        maxAge: process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000,
        // Cross-site cookies must be SameSite=None AND Secure, so we only
        // relax to "None" in prod where HTTPS (secure) is guaranteed.
        sameSite: isProd ? "None" : "Lax",
        httpOnly: true,        // not readable from JS -> mitigates XSS token theft
        secure: isProd         // only sent over HTTPS in production
    });

    // Never leak the password hash, even though it's select:false by default.
    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        message: "Successfully signed in!",
        data: { user }
    });
};

// POST /api/v1/auth/signup -> creates a new (unverified) user and emails a
// verification link. The account stays inactive until the link is clicked.
const signup = catchAsync(async (req, res, next) => {
    const { fullname, email, phone, password } = req.body;

    // Whitelist fields explicitly so a client can't inject role/isVerified.
    const user = await User.create({ fullname, email, phone, password });

    // Generate + email the verification link (throws an AppError on send failure,
    // which catchAsync forwards to the global error handler).
    await sendVerificationEmail(user);

    res.status(201).json({
        status: "success",
        message: "Account created! Please check your email to verify your account."
    });
});

// POST /api/v1/auth/signin -> authenticates a user and issues a token
const signin = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Guard against missing credentials before hitting the DB.
    if (!email || !password) {
        return next(new AppError("Please provide email and password!", 400));
    }

    // password is select:false on the schema, so opt back in for comparison.
    const user = await User.findOne({ email }).select("+password");

    // Use one generic message for both branches so we don't reveal whether
    // an email exists (prevents user enumeration).
    if (!user || !(await user.comparePassword(password))) {
        return next(new AppError("Credentials are incorrect!", 401));
    }

    // Block local accounts that haven't confirmed their email yet. (Google
    // users are created with isVerified:true, so they pass straight through.)
    if (!user.isVerified) {
        return next(new AppError("Please verify your email before signing in.", 403));
    }

    createSendToken(user, res);
});

// POST /api/v1/auth/logout -> clears the auth cookie
const logout = (req, res) => {
    // Overwrite the cookie with an already-expired one to remove it.
    res.cookie("lt", "", {
        maxAge: 0,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "prod" ? "None" : "Lax",
        secure: process.env.NODE_ENV === "prod"
    });

    res.status(200).json({
        status: "success",
        message: "Successfully logged out!"
    });
};

// GET /api/v1/auth/me -> returns the currently authenticated user
// (req.user is populated by the protect middleware)
const getMe = (req, res) => {
    res.status(200).json({
        status: "success",
        data: { user: req.user }
    });
};

const googleCallback = catchAsync(async (req, res, next) => {
    createSendToken(req.user, res);
});

// GET /api/v1/auth/verify-email/:token -> confirms a user's email.
// This URL is opened directly from the email in a browser, so on completion we
// REDIRECT to the client sign-in page (with a status flag) instead of returning
// raw JSON the user would otherwise see.
const verifyEmail = catchAsync(async (req, res, next) => {
    // Re-hash the raw token from the URL to match what we stored at signup.
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    // Must match the hash AND still be within the expiry window.
    const user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: Date.now() }
    }).select("+verificationToken +verificationTokenExpires");

    if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/signin?verified=failed`);
    }

    // Flip the account to verified and clear the now-used token.
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.redirect(`${process.env.CLIENT_URL}/signin?verified=success`);
});

// POST /api/v1/auth/resend-verification -> re-sends the verification link.
// Responds with the SAME generic message in every case so the endpoint can't be
// used to discover which emails are registered (prevents user enumeration).
const resendVerificationEmail = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError("Please provide an email address.", 400));
    }

    const genericResponse = {
        status: "success",
        message: "If an unverified account exists for that email, a new verification link has been sent."
    };

    const user = await User.findOne({ email });

    // Silently no-op for unknown emails, Google accounts and already-verified
    // users — but always reply identically.
    if (!user || user.provider !== "local" || user.isVerified) {
        return res.status(200).json(genericResponse);
    }

    await sendVerificationEmail(user);

    res.status(200).json(genericResponse);
});

module.exports = { signup, signin, logout, getMe, googleCallback, verifyEmail, resendVerificationEmail };
