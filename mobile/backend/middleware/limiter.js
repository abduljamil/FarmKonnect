const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit for auth routes
  message: { success: false, message: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter };
