const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const testConnection = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from .env');
  }

  console.log('Testing MongoDB connection from MONGODB_URI...');
  const connection = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  await connection.connection.db.admin().ping();
  console.log(
    `✅ MongoDB connection successful: ${connection.connection.host}/${connection.connection.name}`
  );
  await mongoose.disconnect();
};

testConnection().catch(async (error) => {
  console.error(`❌ MongoDB connection failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
