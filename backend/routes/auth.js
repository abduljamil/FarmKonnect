const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
  signup,
  signin,
  logout,
  getMe,
  getUsersCount,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  googleCallback,
  googleSignIn,
} = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/auth');
const { authLimiter } = require('../middleware/limiter');

// Rate limiting for auth routes - DISABLED for development
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 10,
//   message: { success: false, message: 'Too many attempts, please try again later.' }
// });

// Public routes (rate limiting enabled)
router.post('/signup', authLimiter, signup);
router.post('/signin', authLimiter, signin);

// Email verification routes
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

// Password reset routes
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

// Google OAuth — browser redirect flow (used by the web app)
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/signin?error=google_auth_failed`,
    session: false
  }),
  googleCallback
);

// Mobile native Google sign-in — POST { idToken } from expo-auth-session.
// Rate-limited identically to other auth routes to prevent brute force.
router.post('/google', authLimiter, googleSignIn);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/stats/users', protect, getUsersCount);

// Admin routes for user management (requires admin role)
router.get('/users', protect, isAdmin, getAllUsers);
router.post('/users', protect, isAdmin, createUser);
router.put('/users/:id', protect, isAdmin, updateUser);
router.delete('/users/:id', protect, isAdmin, deleteUser);

module.exports = router;
