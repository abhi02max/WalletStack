import 'dotenv/config'; // Must be first so env vars load before other modules evaluate
import http from 'http';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Initialize Sentry before anything else
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE || 0.1),
  });
}

import app from './app.js';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to the database:', error.message);
    console.log('Skipping DB connection for now so you can test routes...');
  }

  try {
    // Connect to Redis
    await connectRedis();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    console.log('Running without cache...');
  }

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
