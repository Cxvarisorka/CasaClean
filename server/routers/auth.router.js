// Modules
const express = require("express");
const passport = require("passport");

// Controllers
const { signup, signin, logout, getMe,verifyEmail,resendVerificationEmail } = require("../controllers/auth.controller");

// Middlewares
const { protect } = require("../middlewares/protect.middleware");

const authRouter = express.Router();

// Public routes
authRouter.post("/signup", signup);
authRouter.post("/signin", signin);

//Verifrication
authRouter.get("/verify-email/:token", verifyEmail);
authRouter.post("/resend-verification", resendVerificationEmail);



// Protected routes (require a valid auth cookie)
authRouter.use(protect); // everything below this line is guarded
authRouter.post("/logout", logout);
authRouter.get("/me", getMe);

module.exports = authRouter;
