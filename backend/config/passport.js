const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const configurePassport = () => {
  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        // User exists, return them
        return done(null, user);
      }
      
      // Check if user exists with the same email (signed up with local auth)
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      
      if (email) {
        user = await User.findOne({ email: email.toLowerCase() });
        
        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.authProvider = user.authProvider === 'local' ? 'local' : 'google';
          // If they had an unverified local account, verify it now
          if (!user.isEmailVerified) {
            user.isEmailVerified = true;
          }
          // Update avatar if they don't have one
          if (!user.avatar && profile.photos && profile.photos[0]) {
            user.avatar = profile.photos[0].value;
          }
          await user.save();
          return done(null, user);
        }
      }
      
      // Create new user with Google account
      user = await User.create({
        name: profile.displayName,
        email: email ? email.toLowerCase() : `${profile.id}@google.user`,
        googleId: profile.id,
        authProvider: 'google',
        isEmailVerified: true, // Google already verified their email
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
      });
      
      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));

  // Serialize user for session (not used since we use JWT, but required by passport)
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

module.exports = configurePassport;
