const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = require('../config/db');
const { validateEnvironment } = require('../config/env');
const { configurePassport } = require('../config/passport');
const { createApp } = require('../app');
const User = require('../models/User.model');

const run = async () => {
  validateEnvironment();
  configurePassport();
  await connectDB();

  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const email = `eduassess.verify.${Date.now()}@example.com`;
  const password = 'VerifyPass123!';

  try {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: process.env.CLIENT_URL || 'http://localhost:5173',
      },
      body: JSON.stringify({
        name: 'EduAssess Verification User',
        email,
        password,
        role: 'Student',
      }),
    });
    const registerBody = await registerResponse.json();

    if (!registerResponse.ok || !registerBody.success) {
      throw new Error(
        `Registration request failed (${registerResponse.status}): ${
          registerBody.message || 'Unknown error'
        }`
      );
    }

    const storedUser = await User.findOne({ email }).select('+password');
    if (!storedUser) {
      throw new Error('Registration returned success, but the user was not found in MongoDB.');
    }

    if (storedUser.password === password) {
      throw new Error('The password was stored as plain text.');
    }

    if (!(await storedUser.comparePassword(password))) {
      throw new Error('The stored password hash could not be verified.');
    }

    const meResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${registerBody.token}`,
        Origin: process.env.CLIENT_URL || 'http://localhost:5173',
      },
    });
    const meBody = await meResponse.json();

    if (!meResponse.ok || meBody.user?.email !== email) {
      throw new Error(`Authenticated user check failed: ${meBody.message || 'Unknown error'}`);
    }

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: process.env.CLIENT_URL || 'http://localhost:5173',
      },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = await loginResponse.json();

    if (!loginResponse.ok || !loginBody.success) {
      throw new Error(`Login verification failed: ${loginBody.message || 'Unknown error'}`);
    }

    console.log('✅ Full authentication verification passed.');
    console.log(`✅ User was written to MongoDB collection: ${User.collection.collectionName}`);
    console.log('✅ Password hashing, registration, token authentication, and login are working.');
  } finally {
    await User.deleteOne({ email });
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
};

run().catch(async (error) => {
  console.error(`❌ Authentication verification failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
