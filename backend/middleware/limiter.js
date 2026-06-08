const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit for auth routes
  message: { success: false, message: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generous limiter for unauthenticated public-read endpoints (prices, listings,
// weather). Not meant to stop legit dashboard polling, just to block scrapers /
// abuse. Skips the health endpoint so monitoring keeps working.
const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 2 req/sec average per IP
  message: { success: false, message: "Too many requests, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});

// Stricter limiter for write endpoints that don't already have business-layer
// throttling (chat send, alert create, listing create).
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // ~1 write every 2 sec
  message: { success: false, message: "Too many actions, please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, publicReadLimiter, writeLimiter };
