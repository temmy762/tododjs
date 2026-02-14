import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route files
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payment.js';
import sourceRoutes from './routes/source.js';
import albumRoutes from './routes/album.js';
import downloadRoutes from './routes/download.js';
import trackRoutes from './routes/track.js';
import collectionRoutes from './routes/collection.js';
import datePackRoutes from './routes/datePack.js';
import searchRoutes from './routes/search.js';
import uploadStatusRoutes from './routes/uploadStatus.js';
import userRoutes from './routes/user.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import adminRoutes from './routes/admin.js';
import favoriteRoutes from './routes/favorites.js';
import mashupRoutes from './routes/mashup.js';

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use('/api/', limiter);

// CORS - Allow frontend and browser preview proxies
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      /^http:\/\/127\.0\.0\.1:\d+$/  // Allow any port on 127.0.0.1 for browser preview
    ];
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser (except for webhook and file upload routes)
app.use((req, res, next) => {
  // Skip body parser for routes that handle multipart/form-data (file uploads)
  if (req.originalUrl === '/api/payment/webhook' || 
      req.originalUrl.includes('/api/collections') ||
      req.originalUrl.includes('/api/albums') ||
      req.originalUrl.startsWith('/api/tracks/upload') ||
      req.originalUrl.includes('/api/sources') ||
      req.originalUrl.includes('/api/date-packs')) {
    next();
  } else {
    express.json({ limit: '50mb' })(req, res, next);
  }
});

// Cookie parser
app.use(cookieParser());

// Disable socket timeout for upload routes
app.use((req, res, next) => {
  if (req.originalUrl.includes('/api/collections') || 
      req.originalUrl.includes('/api/albums/upload') ||
      req.originalUrl.startsWith('/api/tracks/upload')) {
    req.setTimeout(0);
    res.setTimeout(0);
    if (req.socket) req.socket.setTimeout(0);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.originalUrl}`);
  console.log('Headers:', {
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? 'Bearer ***' : 'none'
  });
  next();
});

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/date-packs', datePackRoutes);
app.use('/api/upload-status', uploadStatusRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/mashups', mashupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TodoDJS API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Set timeout to 0 (no timeout) for large file uploads
server.timeout = 0;
server.keepAliveTimeout = 0;
server.headersTimeout = 0;
server.requestTimeout = 0;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;
