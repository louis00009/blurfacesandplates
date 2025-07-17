const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken, checkUsageLimit } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { validateUpdateProfile } = require('../middleware/validateRequest');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const dbService = require('../services/database');
const redisService = require('../services/redis');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// Helper functions
const ensureUploadDirectory = async () => {
  const uploadPath = process.env.UPLOAD_PATH || './uploads';
  try {
    await fs.access(uploadPath);
  } catch {
    await fs.mkdir(uploadPath, { recursive: true });
  }
  return uploadPath;
};

const generateUniqueFileName = (originalName, userId) => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${userId}_${timestamp}_${random}${ext}`;
};

// Routes

// Get user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await dbService.getUserById(req.user.id);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Get active subscription
  const subscription = await dbService.getUserActiveSubscription(req.user.id);

  // Get usage statistics
  const usageStats = await redisService.getApiUsage(req.user.id);

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
    },
    subscription,
    usageStats: {
      currentMonth: usageStats,
      remaining: Math.max(0, user.usage_limit - user.usage_count)
    }
  });
}));

// Update user profile
router.put('/profile', 
  authenticateToken,
  validateUpdateProfile,
  asyncHandler(async (req, res) => {
    const { name, email, avatarUrl } = req.body;
    const userId = req.user.id;

    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await dbService.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        throw new ValidationError('Email is already taken by another user');
      }
    }

    // Update user profile
    const updateFields = {};
    const updateValues = [userId];
    let queryParts = [];
    let paramIndex = 2;

    if (name !== undefined) {
      queryParts.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (email !== undefined) {
      queryParts.push(`email = $${paramIndex}`, `email_verified = false`);
      updateValues.push(email);
      paramIndex++;
    }

    if (avatarUrl !== undefined) {
      queryParts.push(`avatar_url = $${paramIndex}`);
      updateValues.push(avatarUrl);
      paramIndex++;
    }

    if (queryParts.length === 0) {
      throw new ValidationError('No fields to update');
    }

    queryParts.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE users 
      SET ${queryParts.join(', ')}
      WHERE id = $1
      RETURNING id, email, name, avatar_url, email_verified
    `;

    const result = await dbService.query(query, updateValues);
    const updatedUser = result.rows[0];

    // Log audit event
    await dbService.createAuditLog({
      userId,
      action: 'profile_updated',
      resourceType: 'user',
      resourceId: userId,
      description: 'User profile updated',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  })
);

// Upload avatar
router.post('/upload-avatar',
  rateLimiter.uploads,
  authenticateToken,
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const userId = req.user.id;
    const uploadPath = await ensureUploadDirectory();
    const fileName = generateUniqueFileName(req.file.originalname, userId);
    const filePath = path.join(uploadPath, fileName);

    try {
      // Process and optimize image
      const processedImage = await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Save file
      await fs.writeFile(filePath, processedImage);

      // Update user avatar URL
      const avatarUrl = `/uploads/${fileName}`;
      await dbService.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [avatarUrl, userId]
      );

      // Log audit event
      await dbService.createAuditLog({
        userId,
        action: 'avatar_uploaded',
        resourceType: 'user',
        resourceId: userId,
        description: 'User avatar uploaded',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Avatar uploaded successfully',
        avatarUrl
      });

    } catch (error) {
      console.error('Avatar upload error:', error);
      throw new Error('Failed to process and save avatar');
    }
  })
);

// Get user subscriptions
router.get('/subscriptions', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await dbService.query(
    `SELECT s.*, sp.name as plan_name, sp.description as plan_description,
            sp.device_limit, sp.usage_limit as plan_usage_limit
     FROM user_subscriptions s
     JOIN subscription_plans sp ON s.plan_id = sp.id
     WHERE s.user_id = $1
     ORDER BY s.starts_at DESC`,
    [userId]
  );

  res.json({
    subscriptions: result.rows
  });
}));

// Get user API keys
router.get('/api-keys', authenticateToken, asyncHandler(async (req, res) => {
  const apiKeys = await dbService.getUserApiKeys(req.user.id);

  res.json({
    apiKeys: apiKeys.map(key => ({
      id: key.id,
      keyName: key.key_name,
      providerName: key.provider_name,
      providerDisplayName: key.provider_display_name,
      priority: key.priority,
      isActive: key.is_active,
      lastUsedAt: key.last_used_at,
      successCount: key.success_count,
      errorCount: key.error_count,
      createdAt: key.created_at
    }))
  });
}));

// Get usage statistics
router.get('/usage-stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = '30d' } = req.query;

  // Get current usage
  const user = await dbService.getUserById(userId);
  
  // Get API usage history
  const days = period === '7d' ? 7 : 30;
  const usageHistory = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const usage = await redisService.getApiUsage(userId, null, dateStr);
    usageHistory.push({
      date: dateStr,
      usage
    });
  }

  // Get usage by provider
  const providerUsage = {};
  const providers = ['platerecognizer', 'openalpr', 'google_vision'];
  
  for (const provider of providers) {
    providerUsage[provider] = await redisService.getApiUsage(userId, provider);
  }

  res.json({
    currentUsage: {
      count: user.usage_count,
      limit: user.usage_limit,
      remaining: Math.max(0, user.usage_limit - user.usage_count),
      resetDate: user.usage_reset_date
    },
    usageHistory,
    providerUsage,
    membershipLevel: user.membership_level
  });
}));

// Delete user account
router.delete('/account',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Start transaction to ensure data consistency
    await dbService.transaction(async (client) => {
      // Soft delete user (set is_active to false)
      await client.query(
        'UPDATE users SET is_active = false, email = $1 WHERE id = $2',
        [`deleted_${userId}_${Date.now()}@deleted.com`, userId]
      );

      // Cancel active subscriptions
      await client.query(
        `UPDATE user_subscriptions 
         SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      // Deactivate API keys
      await client.query(
        'UPDATE api_keys SET is_active = false WHERE user_id = $1',
        [userId]
      );
    });

    // Clear user sessions from Redis
    // Note: This is a simplified approach. In production, you might want to track sessions differently
    
    // Log audit event
    await dbService.createAuditLog({
      userId,
      action: 'account_deleted',
      resourceType: 'user',
      resourceId: userId,
      description: 'User account deleted',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Account deleted successfully'
    });
  })
);

// Get user notifications/messages
router.get('/notifications', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE user_id = $1';
  const queryParams = [userId];

  if (unreadOnly === 'true') {
    whereClause += ' AND is_read = false';
  }

  const result = await dbService.query(
    `SELECT id, title, message, type, is_read, created_at
     FROM user_notifications
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
    [...queryParams, limit, offset]
  );

  const countResult = await dbService.query(
    `SELECT COUNT(*) FROM user_notifications ${whereClause}`,
    queryParams
  );

  res.json({
    notifications: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    }
  });
}));

// Mark notification as read
router.put('/notifications/:id/read',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await dbService.query(
      `UPDATE user_notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Notification not found');
    }

    res.json({
      message: 'Notification marked as read'
    });
  })
);

// Update user preferences/settings
router.put('/preferences',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const preferences = req.body;

    // Validate preferences structure
    const allowedPreferences = [
      'notifications',
      'theme',
      'language',
      'autoSave',
      'defaultSettings'
    ];

    const validPreferences = {};
    for (const key of allowedPreferences) {
      if (preferences[key] !== undefined) {
        validPreferences[key] = preferences[key];
      }
    }

    // Store preferences in database or create user_preferences table
    // For now, we'll use a simple JSON column approach
    await dbService.query(
      `INSERT INTO user_preferences (user_id, preferences)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET preferences = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(validPreferences)]
    );

    res.json({
      message: 'Preferences updated successfully',
      preferences: validPreferences
    });
  })
);

// Get user preferences
router.get('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await dbService.query(
    'SELECT preferences FROM user_preferences WHERE user_id = $1',
    [userId]
  );

  const preferences = result.rows.length > 0 
    ? JSON.parse(result.rows[0].preferences)
    : {};

  res.json({
    preferences
  });
}));

module.exports = router;