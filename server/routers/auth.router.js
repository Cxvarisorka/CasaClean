// Modules
const express = require("express");
const passport = require("passport");

// Controllers
const { signup, signin, logout, getMe, getAllUsers, createUser, updateUser, deleteUser, googleCallback, verifyEmail, resendVerificationEmail } = require("../controllers/auth.controller");

// Middlewares
const { protect, restrictTo } = require("../middlewares/protect.middleware");
const validate = require("../middlewares/validate.middleware");

// Validations
const { signupSchema, signinSchema, resendEmailVerificationSchema } = require("../validations/auth.validation");

const authRouter = express.Router();

// Public routes
authRouter.post("/signup", validate(signupSchema), signup);
authRouter.post("/signin", validate(signinSchema), signin);

// Email verification (links opened from the inbox -> must stay public)
authRouter.get("/verify-email/:token", verifyEmail);
authRouter.post("/resend-verification", validate(resendEmailVerificationSchema), resendVerificationEmail);

// Google OAuth
authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
authRouter.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/signin" }), googleCallback);

// Protected routes (require a valid auth cookie)
authRouter.use(protect); // everything below this line is guarded
authRouter.post("/logout", logout);
authRouter.get("/me", getMe);

// Admin-only: account management for the admin panel's Users page.
authRouter.use("/users", restrictTo("admin"));
authRouter.get("/users", getAllUsers);
authRouter.post("/users", createUser);
authRouter.patch("/users/:id", updateUser);
authRouter.delete("/users/:id", deleteUser);

module.exports = authRouter;
