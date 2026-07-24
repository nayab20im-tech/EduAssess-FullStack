const hasMongoUri = () => Boolean(
  process.env.MONGODB_URI?.trim() || process.env.MONGO_URI?.trim()
);

const validateEnvironment = () => {
  const missing = [];

  if (!hasMongoUri()) missing.push('MONGODB_URI (or MONGO_URI)');
  if (!process.env.JWT_SECRET?.trim()) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`
    );
  }

  if (process.env.JWT_SECRET.trim().length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }
};

module.exports = { validateEnvironment };
