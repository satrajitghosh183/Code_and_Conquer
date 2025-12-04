import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

/**
 * Security middleware configuration for production
 */

// Helmet for security headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for game assets
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Compression for response bodies
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balanced compression
  threshold: 1024 // Only compress responses > 1KB
});

// Rate limiting factory - creates rate limiter with proper defaults
export const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
  const max = options.max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;
  
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    }
    // Use default keyGenerator - it handles IPv6 properly
  });
};

// Strict rate limiter for authentication endpoints
export const createAuthRateLimiter = () => createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
});

// Rate limiter for code execution (expensive operation)
export const createExecutionRateLimiter = () => createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 executions per minute
});

// General API rate limiter
export const createApiRateLimiter = () => createRateLimiter();

// Request sanitization middleware
export const sanitizeRequest = (req, res, next) => {
  // Remove any null bytes from request body
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(/\0/g, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
};

// Trust proxy configuration for production (when behind load balancer)
export const trustProxy = (app) => {
  if (process.env.NODE_ENV === 'production') {
    // Trust first proxy (e.g., Fly.io, Railway, Render)
    app.set('trust proxy', 1);
  }
};
