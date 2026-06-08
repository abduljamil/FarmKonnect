const authService = require('../services/authService');
const User = require('../models/User');
const crypto = require('crypto');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../services/emailService');

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    
    // Send verification email
    try {
      // We need to fetch the full user document to generate token
      const user = await User.findById(result.user.id);
      if (user) {
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();
        await sendVerificationEmail(user, verificationToken);
      }
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Don't fail signup if email fails
    }
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Determine appropriate status code
    const statusCode = error.message.includes('already exists') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error registering user',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/signin
// @access  Public
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const result = await authService.loginUser(email, password);
    
    // Set cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: isProduction && process.env.COOKIE_SECURE !== 'false',
      sameSite: isProduction ? 'strict' : 'lax',
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: result.user
    });
  } catch (error) {
    console.error('Signin error:', error);
    
    // Determine appropriate status code
    const statusCode = error.message.includes('Invalid') ? 401 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error logging in',
    });
  }
};

// Note: logout function moved below googleCallback to group related auth functions

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);
    
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error fetching user',
    });
  }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;
    
    // Generate token
    const result = authService.generateTokenForUser(user);
    
    // Set token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: isProduction && process.env.COOKIE_SECURE !== 'false',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Redirect to frontend signin page to complete auth flow
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/signin?auth=success`);
  } catch (error) {
    console.error('Google callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/signin?error=google_auth_failed`);
  }
};

// @desc    Mobile Google sign-in — accepts a Google ID token from the
//         expo-auth-session flow on the device, verifies it directly with
//         Google's tokeninfo endpoint, then upserts the FarmKonnect user
//         and returns our own session JWT. This is the native equivalent of
//         the browser-redirect flow in googleCallback above.
// @route   POST /api/auth/google
// @access  Public
exports.googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required' });
    }

    // Verify the ID token directly with Google. Pulling in google-auth-library
    // is heavier; the public tokeninfo endpoint is fine for low-volume mobile
    // sign-ins and avoids a new dependency. If you swap to google-auth-library
    // later, replace this block with `new OAuth2Client().verifyIdToken({...})`.
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyRes.ok) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }
    const payload = await verifyRes.json();

    // Validate audience — must match one of our configured Google client IDs.
    // We accept any of the iOS / Android / web variants since expo-auth-session
    // uses different aud values per platform.
    const allowedAuds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_ID_IOS,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
      process.env.GOOGLE_CLIENT_ID_WEB,
      process.env.GOOGLE_CLIENT_ID_EXPO,
    ].filter(Boolean);
    if (allowedAuds.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Google sign-in is not configured on the server',
      });
    }
    if (!allowedAuds.includes(payload.aud)) {
      return res.status(401).json({ success: false, message: 'Token audience mismatch' });
    }

    if (!payload.email_verified) {
      return res.status(401).json({ success: false, message: 'Google email not verified' });
    }

    const email = (payload.email || '').toLowerCase();
    if (!email) {
      return res.status(401).json({ success: false, message: 'Google token missing email' });
    }

    // Upsert the user — by email first (so Google sign-in works for existing
    // password accounts), then by googleId.
    let user = await User.findOne({ $or: [{ email }, { googleId: payload.sub }] });
    if (!user) {
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        authProvider: 'google',
        isEmailVerified: true,
        avatar: payload.picture,
      });
    } else {
      // Backfill googleId / avatar if missing
      let dirty = false;
      if (!user.googleId)        { user.googleId = payload.sub; dirty = true; }
      if (!user.isEmailVerified) { user.isEmailVerified = true; dirty = true; }
      if (!user.avatar && payload.picture) { user.avatar = payload.picture; dirty = true; }
      if (dirty) await user.save();
    }

    const result = authService.generateTokenForUser(user);

    // Also set the cookie so the same session works on web if the user opens
    // the website in the device's browser later.
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: isProduction && process.env.COOKIE_SECURE !== 'false',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ success: false, message: error.message || 'Google sign-in failed' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Clear the token cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', '', {
      httpOnly: true,
      secure: isProduction && process.env.COOKIE_SECURE !== 'false',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0)
    });
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error logging out',
    });
  }
};

// @desc    Verify email with token
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
    }

    // Auto-login after verification
    const result = authService.generateTokenForUser(user);
    
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: isProduction && process.env.COOKIE_SECURE !== 'false',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      user: result.user
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email',
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'This email is already verified. Please sign in.',
      });
    }
    
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();
    
    await sendVerificationEmail(user, verificationToken);
    
    res.status(200).json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending verification email',
    });
  }
};

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      });
    }

    // Don't allowing resetting password for Google Auth users
    if (user.authProvider === 'google') {
        return res.status(400).json({
            success: false,
            message: 'This account uses Google sign-in. Please sign in with Google.',
        });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user, resetToken);

      res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully',
      });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Email send error:', emailError);
      res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again.',
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing request',
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
    });
  }
};

// @desc    Get users count
// @route   GET /api/auth/stats/users
// @access  Private
exports.getUsersCount = async (req, res) => {
  try {
    const result = await authService.getUsersCount();
    
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get users count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users count',
    });
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await authService.getAllUsers({}, page, limit);
    
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
    });
  }
};

// @desc    Create user (Admin)
// @route   POST /api/auth/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.user
    });
  } catch (error) {
    console.error('Create user error:', error);
    const statusCode = error.message.includes('already exists') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error creating user',
    });
  }
};

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const result = await authService.updateUser(req.params.id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: result,
    });
  } catch (error) {
    console.error('Update user error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error updating user',
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    await authService.deleteUser(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error deleting user',
    });
  }
};
