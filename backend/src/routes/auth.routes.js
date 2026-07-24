const express = require('express');
const passport = require('passport');
const router = express.Router();

const { login, register, getMe, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { isGoogleAuthConfigured } = require('../config/passport');
const { generateToken, setAuthCookie } = require('../utils/auth');

const getPrimaryClientUrl = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');

const requireGoogleAuth = (req, res, next) => {
  if (!isGoogleAuthConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Google login is not configured on this server.',
    });
  }
  return next();
};

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', logout);

router.get(
  '/google',
  requireGoogleAuth,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  requireGoogleAuth,
  passport.authenticate('google', {
    failureRedirect: `${getPrimaryClientUrl()}/login?error=google_auth_failed`,
    session: false,
  }),
  (req, res) => {
    const token = generateToken(req.user);
    setAuthCookie(res, token);
    // The short-lived redirect fragment is read only by the frontend and is
    // not sent to servers or analytics. It lets authentication keep working
    // when browsers block third-party cookies between Vercel and Render.
    res.redirect(`${getPrimaryClientUrl()}/oauth/callback#token=${encodeURIComponent(token)}`);
  }
);

module.exports = router;
