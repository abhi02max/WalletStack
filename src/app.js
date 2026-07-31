import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import * as Sentry from "@sentry/node";
import stockRoutes from './routes/stock.routes.js';
import watchlistRoutes from './routes/watchlist.routes.js';
import aiRoutes from './routes/ai.routes.js';
import healthRoutes from './routes/health.routes.js';
import userRoutes from './routes/user.routes.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app = express();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WalletStack API',
      version: '1.0.0',
      description: 'API documentation for WalletStack personal finance and market intelligence platform',
    },
    servers: [
      {
        url: 'http://localhost:5001/api',
        description: 'Development server',
      },
      {
        url: 'https://api.walletstack.in/api',
        description: 'Production server',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// SECURITY Middleware: Helmet sets HTTP headers to prevent XSS, Clickjacking, and sniffing
app.use(helmet());

// Middleware: JSON Parsing
app.use(express.json());

// Middleware: Cookie Parser (required for reading HttpOnly refresh token cookies)
app.use(cookieParser());

// SECURITY Middleware: Sanitize data against NoSQL query injections
app.use(mongoSanitize());

// SECURITY Middleware: CORS for frontend requests
// In production, restrict this to your specific frontend URL
const productionOrigins = (process.env.CLIENT_URL || 'https://walletstack.in,https://www.walletstack.in')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? productionOrigins
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use((req, res, next) => cors({
  origin: function(origin, callback) {
    let isSameOrigin = false;

    if (origin) {
      try {
        const requestHost = req.get('x-forwarded-host') || req.get('host');
        isSameOrigin = new URL(origin).host === requestHost;
      } catch {
        isSameOrigin = false;
      }
    }

    if (!origin || isSameOrigin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
})(req, res, next));

// SECURITY Middleware: Rate Limiting
// Development: Very lenient or disabled on localhost
// Production: Strict limits to prevent brute-force and DDoS attacks
const isDevelopment = process.env.NODE_ENV !== 'production';

// General API rate limiter (loose in dev, strict in prod)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Live dashboards can legitimately make several requests per minute.
  max: isDevelopment ? 10000 : 1500,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || (isDevelopment && req.ip === '::1'),
});
// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

// Middleware: Basic Logging (Morgan)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Sentry Error Handler must be after all routes and before other error handlers
Sentry.setupExpressErrorHandler(app);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

export default app;
