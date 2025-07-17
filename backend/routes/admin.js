const express = require('express');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { 
  validateUpdateUser, 
  validateCreateSubscriptionPlan,
  validateCreateCoupon,
  validatePagination,
  validateSearchUsers,
  validateUuidParam
} = require('../middleware/validateRequest');
const { asyncHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');
const dbService = require('../services/database');
const redisService = require('../services/redis');

const router = express.Router();

// Apply admin rate limiting and authentication to all routes
router.use(rateLimiter.admin);
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard statistics
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Get user statistics
  const userStatsResult = await dbService.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
      COUNT(CASE WHEN membership_level = 'premium' THEN 1 END) as premium_users,
      COUNT(CASE WHEN membership_level = 'enterprise' THEN 1 END) as enterprise_users,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
    FROM users
  `);

  // Get subscription statistics
  const subscriptionStatsResult = await dbService.query(`
    SELECT 
      COUNT(*) as total_subscriptions,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
      SUM(CASE WHEN status = 'active' THEN amount_paid_aud ELSE 0 END) as monthly_revenue
    FROM user_subscriptions
  `);

  // Get payment statistics
  const paymentStatsResult = await dbService.query(`
    SELECT 
      COUNT(*) as total_payments,
      COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
      SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN status = 'succeeded' AND created_at >= NOW() - INTERVAL '30 days' THEN amount ELSE 0 END) as revenue_30d
    FROM payments
  `);

  // Get API usage statistics
  const apiUsageResult = await dbService.query(`
    SELECT 
      COUNT(*) as total_api_calls,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as api_calls_24h,
      AVG(response_time_ms) as avg_response_time
    FROM api_usage_logs
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `);

  // Get recent activity
  const recentActivityResult = await dbService.query(`
    SELECT 
      action,
      description,
      created_at,
      u.name as user_name,
      u.email as user_email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY created_at DESC
    LIMIT 10
  `);

  res.json({
    userStats: userStatsResult.rows[0],
    subscriptionStats: subscriptionStatsResult.rows[0],
    paymentStats: paymentStatsResult.rows[0],
    apiUsageStats: apiUsageResult.rows[0],
    recentActivity: recentActivityResult.rows
  });
}));

// User management
router.get('/users', 
  validatePagination,
  validateSearchUsers,
  asyncHandler(async (req, res) => {
    const { page, limit, sortBy = 'created_at', sortOrder } = req.query;
    const { query, role, membershipLevel, isActive, createdAfter, createdBefore } = req.query;
    
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (query) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      queryParams.push(`%${query}%`);
      paramIndex++;
    }

    if (role) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    if (membershipLevel) {
      whereConditions.push(`membership_level = $${paramIndex}`);
      queryParams.push(membershipLevel);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    if (createdAfter) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(createdAfter);
      paramIndex++;
    }

    if (createdBefore) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(createdBefore);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['created_at', 'name', 'email', 'role', 'membership_level', 'usage_count'];
    const orderBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    const usersResult = await dbService.query(`
      SELECT 
        id, email, name, role, membership_level, subscription_status,
        usage_count, usage_limit, is_active, email_verified, avatar_url,
        created_at, last_login_at
      FROM users
      ${whereClause}
      ORDER BY ${orderBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    const countResult = await dbService.query(`
      SELECT COUNT(*) FROM users ${whereClause}
    `, queryParams);

    res.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  })
);

// Get specific user
router.get('/users/:id', 
  validateUuidParam('id'),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;

    const userResult = await dbService.query(`
      SELECT 
        id, email, name, role, membership_level, subscription_status,
        usage_count, usage_limit, is_active, email_verified, avatar_url,
        created_at, last_login_at, updated_at
      FROM users
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = userResult.rows[0];

    // Get user's subscriptions
    const subscriptionsResult = await dbService.query(`
      SELECT s.*, sp.name as plan_name
      FROM user_subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `, [userId]);

    // Get user's payments
    const paymentsResult = await dbService.query(`
      SELECT 
        id, amount, currency, status, payment_method, created_at, processed_at
      FROM payments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    // Get user's API keys (without showing actual keys)
    const apiKeysResult = await dbService.query(`
      SELECT 
        ak.id, ak.key_name, ak.priority, ak.is_active, ak.last_used_at,
        ak.success_count, ak.error_count, ak.created_at,
        ap.display_name as provider_name
      FROM api_keys ak
      JOIN api_providers ap ON ak.provider_id = ap.id
      WHERE ak.user_id = $1
      ORDER BY ak.created_at DESC
    `, [userId]);

    res.json({
      user,
      subscriptions: subscriptionsResult.rows,
      payments: paymentsResult.rows,
      apiKeys: apiKeysResult.rows
    });
  })
);

// Update user
router.put('/users/:id',
  validateUuidParam('id'),
  validateUpdateUser,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { name, email, role, membershipLevel, usageLimit, isActive } = req.body;

    // Build update query
    const updateFields = [];
    const updateValues = [userId];
    let paramIndex = 2;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (email !== undefined) {
      // Check if email is already taken
      const existingUser = await dbService.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        throw new ValidationError('Email is already taken by another user');
      }
      
      updateFields.push(`email = $${paramIndex}`, `email_verified = false`);
      updateValues.push(email);
      paramIndex++;
    }

    if (role !== undefined) {
      // Only super admin can change roles
      if (req.user.role !== 'super_admin') {
        throw new ValidationError('Only super admin can change user roles');
      }
      updateFields.push(`role = $${paramIndex}`);
      updateValues.push(role);
      paramIndex++;
    }

    if (membershipLevel !== undefined) {
      updateFields.push(`membership_level = $${paramIndex}`);
      updateValues.push(membershipLevel);
      paramIndex++;
    }

    if (usageLimit !== undefined) {
      updateFields.push(`usage_limit = $${paramIndex}`);
      updateValues.push(usageLimit);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(isActive);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id, email, name, role, membership_level, usage_limit, is_active
    `;

    const result = await dbService.query(query, updateValues);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    // Log audit event
    await dbService.createAuditLog({
      userId: req.user.id,
      action: 'user_updated_by_admin',
      resourceType: 'user',
      resourceId: userId,
      description: `User updated by admin: ${req.user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  })
);

// Delete user (soft delete)
router.delete('/users/:id',
  requireSuperAdmin,
  validateUuidParam('id'),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;

    // Prevent self-deletion
    if (userId === req.user.id) {
      throw new ValidationError('Cannot delete your own account');
    }

    await dbService.transaction(async (client) => {
      // Soft delete user
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

    // Log audit event
    await dbService.createAuditLog({
      userId: req.user.id,
      action: 'user_deleted_by_admin',
      resourceType: 'user',
      resourceId: userId,
      description: `User deleted by admin: ${req.user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'User deleted successfully'
    });
  })
);

// Subscription plan management
router.get('/subscription-plans', asyncHandler(async (req, res) => {
  const result = await dbService.query(`
    SELECT * FROM subscription_plans
    ORDER BY sort_order ASC, created_at ASC
  `);

  res.json({
    plans: result.rows
  });
}));

router.post('/subscription-plans',
  requireSuperAdmin,
  validateCreateSubscriptionPlan,
  asyncHandler(async (req, res) => {
    const planData = req.body;
    
    const result = await dbService.query(`
      INSERT INTO subscription_plans 
      (name, description, price_aud, price_usd, duration_months, is_lifetime,
       device_limit, usage_limit, features, removes_branding, money_back_guarantee_days,
       is_active, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      planData.name, planData.description, planData.priceAUD, planData.priceUSD,
      planData.durationMonths, planData.isLifetime, planData.deviceLimit, 
      planData.usageLimit, JSON.stringify(planData.features), planData.removesBranding,
      planData.moneyBackGuaranteeDays, planData.isActive, planData.isFeatured
    ]);

    // Log audit event
    await dbService.createAuditLog({
      userId: req.user.id,
      action: 'subscription_plan_created',
      resourceType: 'subscription_plan',
      resourceId: result.rows[0].id,
      description: `Subscription plan created: ${planData.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'Subscription plan created successfully',
      plan: result.rows[0]
    });
  })
);

// Coupon management
router.get('/coupons', 
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    const result = await dbService.query(`
      SELECT 
        id, code, name, description, discount_type, discount_value,
        max_discount_amount, usage_count, usage_limit, user_usage_limit,
        valid_from, valid_until, is_active, created_at
      FROM coupon_codes
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await dbService.query(
      'SELECT COUNT(*) FROM coupon_codes'
    );

    res.json({
      coupons: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  })
);

router.post('/coupons',
  requireSuperAdmin,
  validateCreateCoupon,
  asyncHandler(async (req, res) => {
    const couponData = req.body;
    
    // Check if coupon code already exists
    const existingCoupon = await dbService.query(
      'SELECT id FROM coupon_codes WHERE code = $1',
      [couponData.code.toUpperCase()]
    );

    if (existingCoupon.rows.length > 0) {
      throw new ValidationError('Coupon code already exists');
    }

    const result = await dbService.query(`
      INSERT INTO coupon_codes 
      (code, name, description, discount_type, discount_value, max_discount_amount,
       usage_limit, user_usage_limit, valid_from, valid_until, applicable_plans, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      couponData.code.toUpperCase(), couponData.name, couponData.description,
      couponData.discountType, couponData.discountValue, couponData.maxDiscountAmount,
      couponData.usageLimit, couponData.userUsageLimit, couponData.validFrom,
      couponData.validUntil, JSON.stringify(couponData.applicablePlans || []),
      couponData.isActive
    ]);

    // Log audit event
    await dbService.createAuditLog({
      userId: req.user.id,
      action: 'coupon_created',
      resourceType: 'coupon',
      resourceId: result.rows[0].id,
      description: `Coupon created: ${couponData.code}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon: result.rows[0]
    });
  })
);

// System settings
router.get('/system-settings', asyncHandler(async (req, res) => {
  const result = await dbService.query(`
    SELECT key, value, data_type, description, is_public, category
    FROM system_settings
    ORDER BY category, key
  `);

  res.json({
    settings: result.rows
  });
}));

router.put('/system-settings/:key',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    const { value, description } = req.body;

    if (!value) {
      throw new ValidationError('Value is required');
    }

    const result = await dbService.query(`
      UPDATE system_settings 
      SET value = $1, description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP, updated_by = $3
      WHERE key = $4
      RETURNING *
    `, [value, description, req.user.id, key]);

    if (result.rows.length === 0) {
      throw new NotFoundError('System setting not found');
    }

    // Log audit event
    await dbService.createAuditLog({
      userId: req.user.id,
      action: 'system_setting_updated',
      resourceType: 'system_setting',
      resourceId: key,
      description: `System setting updated: ${key}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'System setting updated successfully',
      setting: result.rows[0]
    });
  })
);

// Audit logs
router.get('/audit-logs',
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const { userId, action, resourceType, severity } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (userId) {
      whereConditions.push(`a.user_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }

    if (action) {
      whereConditions.push(`a.action ILIKE $${paramIndex}`);
      queryParams.push(`%${action}%`);
      paramIndex++;
    }

    if (resourceType) {
      whereConditions.push(`a.resource_type = $${paramIndex}`);
      queryParams.push(resourceType);
      paramIndex++;
    }

    if (severity) {
      whereConditions.push(`a.severity = $${paramIndex}`);
      queryParams.push(severity);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await dbService.query(`
      SELECT 
        a.id, a.action, a.resource_type, a.resource_id, a.description,
        a.ip_address, a.severity, a.created_at,
        u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    const countResult = await dbService.query(`
      SELECT COUNT(*) FROM audit_logs a ${whereClause}
    `, queryParams);

    res.json({
      auditLogs: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  })
);

// Analytics and reports
router.get('/analytics/revenue', asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  const days = period === '7d' ? 7 : 30;

  const result = await dbService.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as transaction_count,
      SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as revenue,
      COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_transactions
    FROM payments
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  res.json({
    revenueData: result.rows
  });
}));

router.get('/analytics/users', asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  const days = period === '7d' ? 7 : 30;

  const result = await dbService.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as new_users,
      COUNT(CASE WHEN membership_level = 'premium' THEN 1 END) as premium_signups,
      COUNT(CASE WHEN membership_level = 'enterprise' THEN 1 END) as enterprise_signups
    FROM users
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  res.json({
    userData: result.rows
  });
}));

module.exports = router;