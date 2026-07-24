const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const courseRoutes = require('./routes/course.routes');
const subjectRoutes = require('./routes/subject.routes');
const quizRoutes = require('./routes/quiz.routes');
const submissionRoutes = require('./routes/submission.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');
const activityLogRoutes = require('./routes/activityLog.routes');

const configuredOrigins = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = origin.replace(/\/$/, '');
  if (configuredOrigins().includes(normalizedOrigin)) return true;

  return (
    process.env.NODE_ENV !== 'production' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin)
  );
};

const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') {
    // Render, Vercel proxies, and similar hosts forward the real client IP.
    // Trust exactly one reverse proxy so rate limiting does not treat the
    // platform proxy as every student's IP.
    app.set('trust proxy', 1);
  }
  app.use(helmet());

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        const error = new Error(`CORS blocked request from origin: ${origin}`);
        error.statusCode = 403;
        callback(error);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(process.env.NODE_ENV === 'development' ? morgan('dev') : morgan('combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(passport.initialize());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.API_RATE_LIMIT_MAX) ||
      (process.env.NODE_ENV === 'production' ? 6000 : 15000),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      req.method === 'OPTIONS' ||
      req.path === '/health' ||
      req.path === '/api/health',
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
  });
  app.use('/api/', limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || req.path === '/me' || req.path === '/logout',
    message: {
      success: false,
      message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
    },
  });

  const healthResponse = (req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const readyState = mongoose.connection.readyState;
    const databaseConnected = readyState === 1;

    res.status(databaseConnected ? 200 : 503).json({
      success: databaseConnected,
      service: 'EduAssess API',
      database: states[readyState] || 'unknown',
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to the EduAssess API',
      health: '/api/health',
    });
  });
  app.get('/health', healthResponse);
  app.get('/api/health', healthResponse);

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/subjects', subjectRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/activity', activityLogRoutes);

  app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
  });

  app.use(errorHandler);
  return app;
};

module.exports = { createApp, isAllowedOrigin };
