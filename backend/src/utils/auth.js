const jwt = require('jsonwebtoken');

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

const generateToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const setAuthCookie = (res, token) => {
  res.cookie('token', token, cookieOptions());
};

const clearAuthCookie = (res) => {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie('token', options);
};

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  rollNo: user.rollNo || null,
  department: user.department || null,
  profileImage: user.profileImage || null,
});

module.exports = {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  serializeUser,
};
