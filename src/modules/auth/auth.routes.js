const router = require("express").Router();
const ctrl = require("./auth.controller");
const authMiddleware = require("../../middleware/auth");
const rateLimit = require("express-rate-limit");

// Stricter limit on auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post("/register", authLimiter, ctrl.register);
router.post("/login",    authLimiter, ctrl.login);
router.post("/forgot-password",     authLimiter, ctrl.forgotPassword);
router.post("/verify-otp",          authLimiter, ctrl.verifyOtp);
router.post("/reset-password",      authLimiter, ctrl.resetPassword);
router.get("/me", authMiddleware, ctrl.me);

module.exports = router;