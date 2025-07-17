const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

// Request validation middleware factory
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[property];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/["\\]/g, ''),
        value: detail.context?.value
      }));

      return next(new ValidationError('Request validation failed', details));
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // User authentication
  login: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(6).max(128).required()
  }),

  register: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    name: Joi.string().min(2).max(100).required(),
    acceptTerms: Joi.boolean().valid(true).required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required().max(255)
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  }),

  // User profile
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email().max(255),
    avatarUrl: Joi.string().uri().max(500).allow('', null)
  }),

  // Payment
  createPaymentIntent: Joi.object({
    planId: Joi.string().uuid().required(),
    providerId: Joi.string().uuid().required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().valid('AUD', 'USD').default('AUD'),
    couponCode: Joi.string().max(50).allow('', null),
    billingDetails: Joi.object({
      name: Joi.string().max(100).required(),
      email: Joi.string().email().max(255).required(),
      address: Joi.object({
        line1: Joi.string().max(200).required(),
        city: Joi.string().max(100).required(),
        state: Joi.string().max(100).required(),
        postal_code: Joi.string().max(20).required(),
        country: Joi.string().length(2).default('AU')
      }).required()
    }).required()
  }),

  confirmPayment: Joi.object({
    paymentIntentId: Joi.string().required(),
    subscriptionId: Joi.string().uuid().required()
  }),

  createPayPalOrder: Joi.object({
    planId: Joi.string().uuid().required(),
    providerId: Joi.string().uuid().required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().valid('AUD', 'USD').default('AUD'),
    couponCode: Joi.string().max(50).allow('', null)
  }),

  capturePayPalOrder: Joi.object({
    orderId: Joi.string().required()
  }),

  // API Keys
  createApiKey: Joi.object({
    providerId: Joi.string().uuid().required(),
    keyName: Joi.string().min(2).max(100).required(),
    apiKey: Joi.string().min(10).max(500).required(),
    priority: Joi.number().integer().min(1).max(10).default(1)
  }),

  updateApiKey: Joi.object({
    keyName: Joi.string().min(2).max(100),
    priority: Joi.number().integer().min(1).max(10),
    isActive: Joi.boolean()
  }),

  // Admin operations
  updateUser: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email().max(255),
    role: Joi.string().valid('user', 'admin', 'super_admin'),
    membershipLevel: Joi.string().valid('free', 'premium', 'enterprise'),
    usageLimit: Joi.number().integer().min(0),
    isActive: Joi.boolean()
  }),

  createSubscriptionPlan: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).required(),
    priceAUD: Joi.number().positive().precision(2).required(),
    priceUSD: Joi.number().positive().precision(2).required(),
    durationMonths: Joi.number().integer().min(1).max(60),
    isLifetime: Joi.boolean().default(false),
    deviceLimit: Joi.number().integer().min(1).required(),
    usageLimit: Joi.number().integer().min(1).required(),
    features: Joi.array().items(Joi.string().max(200)).required(),
    removesBranding: Joi.boolean().default(false),
    moneyBackGuaranteeDays: Joi.number().integer().min(0).max(365).default(30),
    isActive: Joi.boolean().default(true),
    isFeatured: Joi.boolean().default(false)
  }),

  // Coupon codes
  createCoupon: Joi.object({
    code: Joi.string().min(3).max(50).uppercase().required(),
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500),
    discountType: Joi.string().valid('percentage', 'fixed_amount').required(),
    discountValue: Joi.number().positive().required(),
    maxDiscountAmount: Joi.number().positive(),
    usageLimit: Joi.number().integer().min(1),
    userUsageLimit: Joi.number().integer().min(1).default(1),
    validFrom: Joi.date().required(),
    validUntil: Joi.date().greater(Joi.ref('validFrom')),
    applicablePlans: Joi.array().items(Joi.string().uuid()),
    isActive: Joi.boolean().default(true)
  }),

  // File upload
  fileUpload: Joi.object({
    fileName: Joi.string().max(255).required(),
    fileSize: Joi.number().integer().positive().max(52428800).required(), // 50MB
    mimeType: Joi.string().valid(
      'image/jpeg',
      'image/png', 
      'image/jpg',
      'image/webp'
    ).required()
  }),

  // Processing settings
  processingSettings: Joi.object({
    enableFaceDetection: Joi.boolean().default(true),
    enablePlateDetection: Joi.boolean().default(true),
    blur: Joi.boolean().default(true),
    mosaic: Joi.boolean().default(false),
    blurAmount: Joi.number().integer().min(1).max(100).default(50),
    mosaicAmount: Joi.number().integer().min(1).max(50).default(12),
    highlightMode: Joi.boolean().default(false),
    highlightColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#FF0000'),
    plateOpacity: Joi.number().min(0).max(1).default(0.8),
    detectionMethod: Joi.string().valid('smartAPI', 'local', 'hybrid').default('smartAPI')
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().max(50),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Search and filtering
  searchUsers: Joi.object({
    query: Joi.string().max(200),
    role: Joi.string().valid('user', 'admin', 'super_admin'),
    membershipLevel: Joi.string().valid('free', 'premium', 'enterprise'),
    isActive: Joi.boolean(),
    createdAfter: Joi.date(),
    createdBefore: Joi.date()
  }),

  // System settings
  updateSystemSetting: Joi.object({
    value: Joi.string().required(),
    description: Joi.string().max(500)
  })
};

// Specific validation middleware functions
const validateLogin = validateRequest(schemas.login);
const validateRegister = validateRequest(schemas.register);
const validateForgotPassword = validateRequest(schemas.forgotPassword);
const validateResetPassword = validateRequest(schemas.resetPassword);
const validateChangePassword = validateRequest(schemas.changePassword);
const validateUpdateProfile = validateRequest(schemas.updateProfile);
const validateCreatePaymentIntent = validateRequest(schemas.createPaymentIntent);
const validateConfirmPayment = validateRequest(schemas.confirmPayment);
const validateCreatePayPalOrder = validateRequest(schemas.createPayPalOrder);
const validateCapturePayPalOrder = validateRequest(schemas.capturePayPalOrder);
const validateCreateApiKey = validateRequest(schemas.createApiKey);
const validateUpdateApiKey = validateRequest(schemas.updateApiKey);
const validateUpdateUser = validateRequest(schemas.updateUser);
const validateCreateSubscriptionPlan = validateRequest(schemas.createSubscriptionPlan);
const validateCreateCoupon = validateRequest(schemas.createCoupon);
const validateFileUpload = validateRequest(schemas.fileUpload);
const validateProcessingSettings = validateRequest(schemas.processingSettings);

// Query parameter validation
const validatePagination = validateRequest(schemas.pagination, 'query');
const validateSearchUsers = validateRequest(schemas.searchUsers, 'query');

// Parameter validation
const validateUuidParam = (paramName) => {
  return validateRequest(
    Joi.object({
      [paramName]: Joi.string().uuid().required()
    }),
    'params'
  );
};

module.exports = {
  validateRequest,
  schemas,
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateCreatePaymentIntent,
  validateConfirmPayment,
  validateCreatePayPalOrder,
  validateCapturePayPalOrder,
  validateCreateApiKey,
  validateUpdateApiKey,
  validateUpdateUser,
  validateCreateSubscriptionPlan,
  validateCreateCoupon,
  validateFileUpload,
  validateProcessingSettings,
  validatePagination,
  validateSearchUsers,
  validateUuidParam
};