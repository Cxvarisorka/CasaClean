const User = require("../models/user.model");
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");
const jwt = require("jsonwebtoken");

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

// POST /api/v1/auth/signup -> creates a new (unverified) user
const signup = catchAsync(async (req, res, next) => {
    const { fullname, email, phone, password } = req.body;

    // Whitelist fields explicitly so a client can't inject role/isVerified.
    const user = await User.create({ fullname, email, phone, password });

    res.status(201).json({
        status: "success",
        message: "User created successfully, please verify your email!"
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

    // if (!user.isVerified) {
    //     return next(new AppError("Please verify your email first!", 403));
    // }

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

module.exports = { signup, signin, logout, getMe, googleCallback };
