const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisService = require('../services/redis');

// Custom rate limit handler
const rateLimitHandler = (req, res) => {
  const retryAfter = Math.round(req.rateLimit.resetTime / 1000);
  
  res.status(429).json({
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter,
    limit: req.rateLimit.limit,
    remaining: req.rateLimit.remaining,
    resetTime: new Date(req.rateLimit.resetTime).toISOString()
  });
};

// Custom key generator that includes user ID if available
const keyGenerator = (req) => {
  if (req.user && req.user.id) {
    return `user:${req.user.id}:${req.ip}`;
  }
  return req.ip;
};

// Skip rate limiting for certain conditions
const skipRateLimit = (req) => {
  // Skip for health checks
  if (req.url === '/health') return true;
  
  // Skip for super admins (if authenticated)
  if (req.user && req.user.role === 'super_admin') return true;
  
  return false;
};

// General API rate limiter
const general = rateLimit({
  store: new RedisStore({
    client: redisService.redis,
    prefix: 'rl:general:',
  }),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: rateLimitHandler,
  keyGenerator,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication routes rate limiter (stricter)
const auth = rateLimit({
  store: new RedisStore({
    client: redisService.redis,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: rateLimitHandler,
  keyGenerator: (req) => req.ip, // Don't include user ID for auth routes
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment routes rate limiter (very strict)
const payments = rateLimit({
  store: new RedisStore({
    client: redisService.redis,
    prefix: 'rl:payments:',
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit payment operations
  message: rateLimitHandler,
  keyGenerator,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin routes rate limiter
const admin = rateLimit({
  store: new RedisStore({
    client: redisService.redis,
    prefix: 'rl:admin:',
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // More lenient for admin operations
  message: rateLimitHandler,
  keyGenerator,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter
const uploads = rateLimit({
  store: new RedisStore({
    client: redisService.redis,
    prefix: 'rl:uploads:',
  }),
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 uploads per 10 minutes
  message: rateLimitHandler,
  keyGenerator,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// API key creation rate limiter
const apiKeyCreation = rateLimit({
  store: new RedisStore({
    client: redisService.redis,
    prefix: 'rl:apikey:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 API key operations per hour
  message: rateLimitHandler,
  keyGenerator,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiter
const passwordReset = rateLimit({
  store: new RedisStore({
    client: redisService.redis,
    prefix: 'rl:password_reset:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: rateLimitHandler,
  keyGenerator: (req) => req.body.email || req.ip,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook rate limiter (for external services)
const webhooks = rateLimit({
  store: new RedisStore({
    client: redisService.redis,
    prefix: 'rl:webhooks:',
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // High limit for legitimate webhooks
  message: rateLimitHandler,
  keyGenerator: (req) => {
    // Use different keys for different webhook sources
    const userAgent = req.get('User-Agent') || 'unknown';
    return `${req.ip}:${userAgent.substring(0, 50)}`;
  },
  skip: (req) => {
    // Skip rate limiting for verified webhook sources
    const userAgent = req.get('User-Agent') || '';
    const trustedSources = ['Stripe', 'PayPal', 'GitHub'];
    return trustedSources.some(source => userAgent.includes(source));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Dynamic rate limiter based on user membership level
const membershipBasedLimiter = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const membershipLimits = {
    free: { windowMs: 15 * 60 * 1000, max: 50 },
    premium: { windowMs: 15 * 60 * 1000, max: 200 },
    enterprise: { windowMs: 15 * 60 * 1000, max: 1000 }
  };

  const userLevel = req.user.membershipLevel || 'free';
  const limits = membershipLimits[userLevel] || membershipLimits.free;

  const dynamicLimiter = rateLimit({
    store: new RedisStore({
      client: redisService.redis,
      prefix: `rl:membership:${userLevel}:`,
    }),
    windowMs: limits.windowMs,
    max: limits.max,
    message: {
      error: 'Membership rate limit exceeded',
      code: 'MEMBERSHIP_RATE_LIMIT',
      currentPlan: userLevel,
      message: userLevel === 'free' 
        ? 'Upgrade to premium for higher rate limits'
        : 'You have exceeded your plan\'s rate limit'
    },
    keyGenerator: (req) => req.user.id,
    standardHeaders: true,
    legacyHeaders: false,
  });

  return dynamicLimiter(req, res, next);
};

// Custom rate limiter for specific endpoints
const createCustomLimiter = (options) => {
  return rateLimit({
    store: new RedisStore({
      client: redisService.redis,
      prefix: options.prefix || 'rl:custom:',
    }),
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || rateLimitHandler,
    keyGenerator: options.keyGenerator || keyGenerator,
    skip: options.skip || skipRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  general,
  auth,
  payments,
  admin,
  uploads,
  apiKeyCreation,
  passwordReset,
  webhooks,
  membershipBasedLimiter,
  createCustomLimiter
};