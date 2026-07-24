const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri || typeof uri !== 'string') {
    throw new Error('MongoDB connection URI is missing. Set MONGODB_URI in .env.');
  }

  try {
    const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE) || 20;
    const minPoolSize = Number(process.env.MONGODB_MIN_POOL_SIZE) || 2;

    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize,
      minPoolSize,
      maxIdleTimeMS: 60000,
    });

    console.log(
      `✅ MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
    );

    return connection;
  } catch (error) {
    const atlasHint =
      /IP that isn't whitelisted|ECONNREFUSED|Server selection timed out|Could not connect to any servers/i.test(
        error.message
      )
        ? ' Check MongoDB Atlas → Network Access and allow your current public IP, then confirm the database user credentials.'
        : '';

    const wrappedError = new Error(`MongoDB connection failed: ${error.message}.${atlasHint}`);
    wrappedError.cause = error;
    throw wrappedError;
  }
};

module.exports = connectDB;
