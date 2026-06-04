// Modules
const express = require("express");
const passport = require("passport");

// Controllers
const { signup, signin, logout, getMe, googleCallback, verifyEmail, resendVerificationEmail } = require("../controllers/auth.controller");

// Middlewares
const { protect } = require("../middlewares/protect.middleware");

const authRouter = express.Router();

// Public routes
authRouter.post("/signup", signup);
authRouter.post("/signin", signin);

// Email verification (links opened from the inbox -> must stay public)
authRouter.get("/verify-email/:token", verifyEmail);
authRouter.post("/resend-verification", resendVerificationEmail);

// Google OAuth
authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
authRouter.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/signin" }), googleCallback);

// Protected routes (require a valid auth cookie)
authRouter.use(protect); // everything below this line is guarded
authRouter.post("/logout", logout);
authRouter.get("/me", getMe);

module.exports = authRouter;
