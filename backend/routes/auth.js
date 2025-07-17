const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');
const { 
  validateLogin, 
  validateRegister, 
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword 
} = require('../middleware/validateRequest');
const rateLimiter = require('../middleware/rateLimiter');
const { asyncHandler, ValidationError, AuthenticationError, ConflictError } = require('../middleware/errorHandler');
const dbService = require('../services/database');
const redisService = require('../services/redis');

const router = express.Router();

// Email service setup
const emailTransporter = nodemailer.createTransporter({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

// Helper functions
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      membershipLevel: user.membership_level 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: `${process.env.FROM_NAME || 'AI Image Anonymizer'} <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Thank you for registering with AI Image Anonymizer. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          If you didn't create an account with us, please ignore this email.
        </p>
      </div>
    `
  };

  await emailTransporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: `${process.env.FROM_NAME || 'AI Image Anonymizer'} <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset for your AI Image Anonymizer account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>
      </div>
    `
  };

  await emailTransporter.sendMail(mailOptions);
};

// Routes

// Register
router.post('/register', validateRegister, asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  // Check if user already exists
  const existingUser = await dbService.getUserByEmail(email);
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Create user
  const user = await dbService.createUser({
    email,
    passwordHash,
    name
  });

  // Store verification token
  await redisService.setTemporaryData('email_verification', verificationToken, {
    userId: user.id,
    email: user.email
  }, 86400); // 24 hours

  // Send verification email
  try {
    await sendVerificationEmail(email, verificationToken);
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    // Continue with registration even if email fails
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Log audit event
  await dbService.createAuditLog({
    userId: user.id,
    action: 'user_registered',
    resourceType: 'user',
    resourceId: user.id,
    description: 'User registered successfully',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    message: 'Registration successful',
    tokens: {
      accessToken,
      refreshToken
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      membershipLevel: user.membership_level,
      emailVerified: false
    }
  });
}));

// Login
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await dbService.getUserByEmail(email);
  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    // Log failed login attempt
    await dbService.createAuditLog({
      userId: user.id,
      action: 'login_failed',
      resourceType: 'user',
      resourceId: user.id,
      description: 'Invalid password',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    throw new AuthenticationError('Invalid email or password');
  }

  // Update last login
  await dbService.updateUserLastLogin(user.id);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Log successful login
  await dbService.createAuditLog({
    userId: user.id,
    action: 'login_successful',
    resourceType: 'user',
    resourceId: user.id,
    description: 'User logged in successfully',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    message: 'Login successful',
    tokens: {
      accessToken,
      refreshToken
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      membershipLevel: user.membership_level,
      usageCount: user.usage_count,
      usageLimit: user.usage_limit,
      emailVerified: user.email_verified
    }
  });
}));

// Refresh token
router.post('/refresh', authenticateRefreshToken, asyncHandler(async (req, res) => {
  const { id } = req.tokenData;

  // Verify user still exists and is active
  const user = await dbService.getUserById(id);
  if (!user || !user.is_active) {
    throw new AuthenticationError('User account is inactive');
  }

  // Generate new tokens
  const { accessToken, refreshToken } = generateTokens(user);

  res.json({
    message: 'Token refreshed successfully',
    tokens: {
      accessToken,
      refreshToken
    }
  });
}));

// Verify email
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Verification token is required');
  }

  // Get verification data from Redis
  const verificationData = await redisService.getTemporaryData('email_verification', token);
  if (!verificationData) {
    throw new ValidationError('Invalid or expired verification token');
  }

  // Update user email verification status
  await dbService.query(
    'UPDATE users SET email_verified = true WHERE id = $1',
    [verificationData.userId]
  );

  // Remove verification token
  await redisService.deleteTemporaryData('email_verification', token);

  // Log audit event
  await dbService.createAuditLog({
    userId: verificationData.userId,
    action: 'email_verified',
    resourceType: 'user',
    resourceId: verificationData.userId,
    description: 'Email address verified',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    message: 'Email verified successfully'
  });
}));

// Forgot password
router.post('/forgot-password', 
  rateLimiter.passwordReset,
  validateForgotPassword, 
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Find user (always return success for security)
    const user = await dbService.getUserByEmail(email);
    
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Store reset token
      await redisService.setTemporaryData('password_reset', resetToken, {
        userId: user.id,
        email: user.email
      }, 3600); // 1 hour

      // Send reset email
      try {
        await sendPasswordResetEmail(email, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }

      // Log audit event
      await dbService.createAuditLog({
        userId: user.id,
        action: 'password_reset_requested',
        resourceType: 'user',
        resourceId: user.id,
        description: 'Password reset requested',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // Always return success message for security
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  })
);

// Reset password
router.post('/reset-password', validateResetPassword, asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Get reset data from Redis
  const resetData = await redisService.getTemporaryData('password_reset', token);
  if (!resetData) {
    throw new ValidationError('Invalid or expired reset token');
  }

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Update password
  await dbService.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [passwordHash, resetData.userId]
  );

  // Remove reset token
  await redisService.deleteTemporaryData('password_reset', token);

  // Log audit event
  await dbService.createAuditLog({
    userId: resetData.userId,
    action: 'password_reset_completed',
    resourceType: 'user',
    resourceId: resetData.userId,
    description: 'Password reset completed',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    message: 'Password reset successfully'
  });
}));

// Change password (authenticated)
router.post('/change-password', 
  authenticateToken,
  validateChangePassword,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user data
    const user = await dbService.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      throw new AuthenticationError('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await dbService.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );

    // Log audit event
    await dbService.createAuditLog({
      userId,
      action: 'password_changed',
      resourceType: 'user',
      resourceId: userId,
      description: 'Password changed successfully',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Password changed successfully'
    });
  })
);

// Logout
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a real implementation, you might want to blacklist the token
  // For now, we'll just log the logout event
  
  await dbService.createAuditLog({
    userId: req.user.id,
    action: 'logout',
    resourceType: 'user',
    resourceId: req.user.id,
    description: 'User logged out',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    message: 'Logged out successfully'
  });
}));

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await dbService.getUserById(req.user.id);
  
  if (!user) {
    throw new AuthenticationError('User not found');
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      membershipLevel: user.membership_level,
      subscriptionStatus: user.subscription_status,
      usageCount: user.usage_count,
      usageLimit: user.usage_limit,
      avatarUrl: user.avatar_url,
      emailVerified: user.email_verified,
      createdAt: user.created_at
    }
  });
}));

// Resend verification email
router.post('/resend-verification', 
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await dbService.getUserById(req.user.id);
    
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.email_verified) {
      return res.json({
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store verification token
    await redisService.setTemporaryData('email_verification', verificationToken, {
      userId: user.id,
      email: user.email
    }, 86400); // 24 hours

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      throw new Error('Failed to send verification email');
    }

    res.json({
      message: 'Verification email sent successfully'
    });
  })
);

module.exports = router;