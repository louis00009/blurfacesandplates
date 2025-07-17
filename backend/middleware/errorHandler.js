const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log' })
  ]
});

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

class PaymentError extends AppError {
  constructor(message, details = null) {
    super(message, 402, 'PAYMENT_ERROR');
    this.details = details;
  }
}

class ExternalServiceError extends AppError {
  constructor(message, service = null) {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

// Error response formatter
const formatErrorResponse = (error, req) => {
  const response = {
    error: error.message,
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add additional details for specific error types
  if (error instanceof ValidationError && error.details) {
    response.details = error.details;
  }

  if (error instanceof ExternalServiceError && error.service) {
    response.service = error.service;
  }

  if (error instanceof PaymentError && error.details) {
    response.details = error.details;
  }

  // Add request ID if available
  if (req.requestId) {
    response.requestId = req.requestId;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return response;
};

// Database error handler
const handleDatabaseError = (error) => {
  logger.error('Database error:', error);

  // PostgreSQL specific errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return new ConflictError('Resource already exists');
      case '23503': // Foreign key violation
        return new ValidationError('Invalid reference to related resource');
      case '23502': // Not null violation
        return new ValidationError('Required field is missing');
      case '42P01': // Undefined table
        return new AppError('Database configuration error', 500, 'DB_CONFIG_ERROR');
      case '42703': // Undefined column
        return new AppError('Database schema error', 500, 'DB_SCHEMA_ERROR');
      case '28P01': // Invalid password
      case '28000': // Invalid authorization
        return new AppError('Database connection error', 500, 'DB_CONNECTION_ERROR');
      default:
        return new AppError('Database operation failed', 500, 'DB_ERROR');
    }
  }

  return new AppError('Database error', 500, 'DB_ERROR');
};

// JWT error handler
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }
  
  return new AuthenticationError('Token verification failed');
};

// Validation error handler (for Joi validation)
const handleValidationError = (error) => {
  if (error.details) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));
    
    return new ValidationError('Validation failed', details);
  }
  
  return new ValidationError(error.message);
};

// Stripe error handler
const handleStripeError = (error) => {
  logger.error('Stripe error:', error);

  switch (error.type) {
    case 'StripeCardError':
      return new PaymentError('Card was declined', { 
        code: error.code,
        declineCode: error.decline_code 
      });
    case 'StripeRateLimitError':
      return new RateLimitError('Too many requests to payment processor');
    case 'StripeInvalidRequestError':
      return new ValidationError('Invalid payment request');
    case 'StripeAPIError':
      return new ExternalServiceError('Payment processor error', 'stripe');
    case 'StripeConnectionError':
      return new ExternalServiceError('Payment processor unavailable', 'stripe');
    case 'StripeAuthenticationError':
      return new AppError('Payment processor authentication failed', 500, 'STRIPE_AUTH_ERROR');
    default:
      return new PaymentError('Payment processing failed');
  }
};

// PayPal error handler
const handlePayPalError = (error) => {
  logger.error('PayPal error:', error);

  if (error.response && error.response.error) {
    const paypalError = error.response.error;
    return new PaymentError(`PayPal error: ${paypalError.message || 'Payment failed'}`);
  }

  return new ExternalServiceError('PayPal service error', 'paypal');
};

// Redis error handler
const handleRedisError = (error) => {
  logger.error('Redis error:', error);
  return new ExternalServiceError('Cache service error', 'redis');
};

// Main error handler middleware
const errorHandler = (error, req, res, next) => {
  let handledError = error;

  // Log the original error
  logger.error('Error caught by global handler:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Handle specific error types
  if (!error.isOperational) {
    // Database errors
    if (error.code && typeof error.code === 'string' && error.code.match(/^[0-9A-Z]{5}$/)) {
      handledError = handleDatabaseError(error);
    }
    // JWT errors
    else if (error.name && error.name.includes('JsonWebToken')) {
      handledError = handleJWTError(error);
    }
    // Joi validation errors
    else if (error.isJoi || error.name === 'ValidationError') {
      handledError = handleValidationError(error);
    }
    // Stripe errors
    else if (error.type && error.type.startsWith('Stripe')) {
      handledError = handleStripeError(error);
    }
    // PayPal errors
    else if (error.name === 'PayPalError' || (error.response && error.response.error)) {
      handledError = handlePayPalError(error);
    }
    // Redis errors
    else if (error.code === 'ECONNREFUSED' && error.port === 6379) {
      handledError = handleRedisError(error);
    }
    // Multer errors (file upload)
    else if (error.code === 'LIMIT_FILE_SIZE') {
      handledError = new ValidationError('File size too large');
    }
    else if (error.code === 'LIMIT_FILE_COUNT') {
      handledError = new ValidationError('Too many files');
    }
    else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      handledError = new ValidationError('Unexpected file field');
    }
    // Generic unhandled errors
    else {
      handledError = new AppError(
        process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        500,
        'INTERNAL_ERROR'
      );
    }
  }

  // Format and send error response
  const statusCode = handledError.statusCode || 500;
  const errorResponse = formatErrorResponse(handledError, req);

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  PaymentError,
  ExternalServiceError
};