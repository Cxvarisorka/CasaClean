// Modules
const express = require("express");
const passport = require("passport");

// Controllers
const { signup, signin, logout, getMe, getAllUsers, createUser, updateUser, deleteUser, googleCallback, verifyEmail, resendVerificationEmail } = require("../controllers/auth.controller");

// Middlewares
const { protect, restrictTo } = require("../middlewares/protect.middleware");
const validate = require("../middlewares/validate.middleware");
const { signinLimiter, signupLimiter, emailLimiter } = require("../middlewares/rateLimit.middleware");

// Validations
const { signupSchema, signinSchema, resendEmailVerificationSchema, createUserSchema, updateUserSchema } = require("../validations/auth.validation");

const authRouter = express.Router();

// Public routes — rate limited: signin against brute force / credential
// stuffing; signup & resend-verification because each sends an outbound email
// (inbox bombing + mail quota abuse).
authRouter.post("/signup", signupLimiter, validate(signupSchema), signup);
authRouter.post("/signin", signinLimiter, validate(signinSchema), signin);

// Email verification (links opened from the inbox -> must stay public)
authRouter.get("/verify-email/:token", verifyEmail);
authRouter.post("/resend-verification", emailLimiter, validate(resendEmailVerificationSchema), resendVerificationEmail);

// Google OAuth
authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
authRouter.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/signin` }), googleCallback);

// Protected routes (require a valid auth cookie)
authRouter.use(protect); // everything below this line is guarded
authRouter.post("/logout", logout);
authRouter.get("/me", getMe);

// Admin-only: account management for the admin panel's Users page.
authRouter.use("/users", restrictTo("admin"));
authRouter.get("/users", getAllUsers);
authRouter.post("/users", validate(createUserSchema), createUser);
authRouter.patch("/users/:id", validate(updateUserSchema), updateUser);
authRouter.delete("/users/:id", deleteUser);

module.exports = authRouter;
