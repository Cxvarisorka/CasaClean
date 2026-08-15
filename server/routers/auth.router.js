// Modules
const express = require("express");
const passport = require("passport");
const crypto = require("crypto");

// Controllers
const { signup, signin, logout, getMe, getAllUsers, createUser, updateUser, deleteUser, googleCallback, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, updateMe, updateMyTaxProfile, refreshMyTaxStatus, updateMyPassword, deleteMe } = require("../controllers/auth.controller");

// Middlewares
const { protect, restrictTo } = require("../middlewares/protect.middleware");
const validate = require("../middlewares/validate.middleware");
const { signinLimiter, signupLimiter, emailLimiter, paymentLimiter } = require("../middlewares/rateLimit.middleware");

// Utils
const { isProduction } = require("../utils/env.util");

// Validations
const { signupSchema, signinSchema, resendEmailVerificationSchema, createUserSchema, updateUserSchema, forgotPasswordSchema, resetPasswordSchema, updateMeSchema, updateMyTaxProfileSchema, refreshMyTaxStatusSchema, updateMyPasswordSchema, deleteMeSchema } = require("../validations/auth.validation");

const authRouter = express.Router();

// Public routes — rate limited: signin against brute force / credential
// stuffing; signup & resend-verification because each sends an outbound email
// (inbox bombing + mail quota abuse).
authRouter.post("/signup", signupLimiter, validate(signupSchema), signup);
authRouter.post("/signin", signinLimiter, validate(signinSchema), signin);

// Email verification (links opened from the inbox -> must stay public)
authRouter.get("/verify-email/:token", verifyEmail);
authRouter.post("/resend-verification", emailLimiter, validate(resendEmailVerificationSchema), resendVerificationEmail);

// Password reset. forgot-password sends an outbound email -> emailLimiter;
// reset-password consumes a 256-bit one-time token, but the signinLimiter still
// blunts blind token-guessing runs.
authRouter.post("/forgot-password", emailLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password/:token", signinLimiter, validate(resetPasswordSchema), resetPassword);

// --- Google OAuth -----------------------------------------------------------
// Login-CSRF protection via the OAuth `state` parameter: the start route mints
// a random nonce, stores it in a short-lived httpOnly cookie and sends it to
// Google; the callback only proceeds when Google echoes back the exact nonce
// this browser started with. Without this, an attacker could complete the OAuth
// dance themselves and trick a victim's browser into finishing it — silently
// logging the victim into the attacker's account. SameSite=Lax is deliberate:
// the callback is a top-level GET navigation from Google, which Lax allows.
const OAUTH_STATE_COOKIE = "oauth_state";

authRouter.get("/google", (req, res, next) => {
    const state = crypto.randomBytes(16).toString("hex");
    res.cookie(OAUTH_STATE_COOKIE, state, {
        maxAge: 10 * 60 * 1000, // the whole Google round-trip takes seconds
        httpOnly: true,
        sameSite: "Lax",
        secure: isProduction
    });
    passport.authenticate("google", { scope: ["profile", "email"], state })(req, res, next);
});

const verifyOAuthState = (req, res, next) => {
    const expected = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE); // one-time use either way

    if (!expected || req.query.state !== expected) {
        return res.redirect(`${process.env.CLIENT_URL}/signin?error=oauth_state`);
    }
    next();
};

authRouter.get("/google/callback", verifyOAuthState, passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/signin` }), googleCallback);

// Protected routes (require a valid auth cookie)
authRouter.use(protect); // everything below this line is guarded
authRouter.post("/logout", logout);
authRouter.get("/me", getMe);

// Profile self-service. The password change re-checks the current password, so
// it's rate limited like signin (it's an online password-guessing oracle
// otherwise); account deletion confirms the password too and gets the same.
authRouter.patch("/me", validate(updateMeSchema), updateMe);
// VAT profile. Rate limited like the other Stripe-touching routes: each save can
// register a tax id and kick off a VIES lookup, so it must not be free to spam.
authRouter.patch("/me/tax-profile", paymentLimiter, validate(updateMyTaxProfileSchema), updateMyTaxProfile);
authRouter.post("/me/tax-profile/refresh", paymentLimiter, validate(refreshMyTaxStatusSchema), refreshMyTaxStatus);
authRouter.patch("/me/password", signinLimiter, validate(updateMyPasswordSchema), updateMyPassword);
authRouter.delete("/me", signinLimiter, validate(deleteMeSchema), deleteMe);

// Admin-only: account management for the admin panel's Users page.
authRouter.use("/users", restrictTo("admin"));
authRouter.get("/users", getAllUsers);
authRouter.post("/users", validate(createUserSchema), createUser);
authRouter.patch("/users/:id", validate(updateUserSchema), updateUser);
authRouter.delete("/users/:id", deleteUser);

module.exports = authRouter;
