const express = require("express");

const { signup, signin, logout, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/protect.middleware");

const authRouter = express.Router();

// Public routes
authRouter.post("/signup", signup);
authRouter.post("/signin", signin);

// Protected routes (require a valid auth cookie)
authRouter.use(protect); // everything below this line is guarded
authRouter.post("/logout", logout);
authRouter.get("/me", getMe);

module.exports = authRouter;
