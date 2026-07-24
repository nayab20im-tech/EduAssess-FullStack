const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User.model');

let googleAuthConfigured = false;

const configurePassport = () => {
  const clientID = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientID || !clientSecret) {
    console.warn('⚠️ Google login is disabled because Google OAuth credentials are missing.');
    googleAuthConfigured = false;
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          'http://localhost:5000/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('Google did not provide an email address.'), null);
          }

          let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email }],
          }).select('+password');

          if (user) {
            user.googleId = profile.id;
            user.profileImage = profile.photos?.[0]?.value || user.profileImage;
            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName || email.split('@')[0],
              email,
              password: `${profile.id}-${Date.now()}-${Math.random()}`,
              googleId: profile.id,
              profileImage: profile.photos?.[0]?.value || null,
              role: 'Student',
              status: 'Active',
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  googleAuthConfigured = true;
  return true;
};

const isGoogleAuthConfigured = () => googleAuthConfigured;

module.exports = { configurePassport, isGoogleAuthConfigured };
