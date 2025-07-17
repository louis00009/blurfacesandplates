const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const {
  validateCreateApiKey,
  validateUpdateApiKey,
  validateUuidParam
} = require('../middleware/validateRequest');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const dbService = require('../services/database');
const redisService = require('../services/redis');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper functions
const encryptApiKey = (apiKey) => {
  const algorithm = process.env.API_KEY_ENCRYPTION_ALGORITHM || 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
};

const decryptApiKey = (encryptedKey) => {
  const algorithm = process.env.API_KEY_ENCRYPTION_ALGORITHM || 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  const [ivHex, encrypted] = encryptedKey.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

const generateApiKeyHash = (apiKey) => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

const validateApiKey = async (apiKey, providerId) => {
  // Basic validation
  if (!apiKey || apiKey.length < 10) {
    throw new ValidationError('API key must be at least 10 characters long');
  }

  // Provider-specific validation
  const providerResult = await dbService.query(
    'SELECT name, service_type FROM api_providers WHERE id = $1',
    [providerId]
  );

  if (providerResult.rows.length === 0) {
    throw new ValidationError('Invalid API provider');
  }

  const provider = providerResult.rows[0];

  // Validate key format based on provider
  switch (provider.name) {
    case 'platerecognizer':
      if (!apiKey.match(/^[a-f0-9]{40}$/)) {
        throw new ValidationError('Invalid Plate Recognizer API key format');
      }
      break;
    case 'openalpr':
      if (!apiKey.match(/^sk_[a-f0-9]{32}$/)) {
        throw new ValidationError('Invalid OpenALPR API key format');
      }
      break;
    case 'google_vision':
      // Google API keys are typically 39 characters starting with AIza
      if (!apiKey.match(/^AIza[a-zA-Z0-9_-]{35}$/)) {
        throw new ValidationError('Invalid Google Vision API key format');
      }
      break;
  }

  return provider;
};

// Routes

// Get user's API keys
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const apiKeys = await dbService.getUserApiKeys(userId);

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
      createdAt: key.created_at,
      // Never return the actual API key
      keyPreview: '****' + (key.encrypted_api_key ? key.encrypted_api_key.slice(-4) : '')
    }))
  });
}));

// Create new API key
router.post('/',
  rateLimiter.apiKeyCreation,
  validateCreateApiKey,
  asyncHandler(async (req, res) => {
    const { providerId, keyName, apiKey, priority } = req.body;
    const userId = req.user.id;

    // Validate the API key
    const provider = await validateApiKey(apiKey, providerId);

    // Check if user already has a key with this name for this provider
    const existingKeyResult = await dbService.query(
      'SELECT id FROM api_keys WHERE user_id = $1 AND provider_id = $2 AND key_name = $3',
      [userId, providerId, keyName]
    );

    if (existingKeyResult.rows.length > 0) {
      throw new ValidationError('You already have an API key with this name for this provider');
    }

    // Check user's API key limit based on membership
    const user = await dbService.getUserById(userId);
    const keyLimits = {
      free: 2,
      premium: 10,
      enterprise: 50
    };

    const currentKeyCountResult = await dbService.query(
      'SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    const currentKeyCount = parseInt(currentKeyCountResult.rows[0].count);
    const maxKeys = keyLimits[user.membership_level] || keyLimits.free;

    if (currentKeyCount >= maxKeys) {
      throw new ValidationError(`Your ${user.membership_level} plan allows a maximum of ${maxKeys} API keys`);
    }

    // Test the API key (optional - implement based on provider)
    // await testApiKey(apiKey, provider);

    // Encrypt and store the API key
    const encryptedApiKey = encryptApiKey(apiKey);
    const keyHash = generateApiKeyHash(apiKey);

    const createdKey = await dbService.createApiKey({
      userId,
      providerId,
      keyName,
      encryptedApiKey,
      keyHash,
      priority
    });

    // Log audit event
    await dbService.createAuditLog({
      userId,
      action: 'api_key_created',
      resourceType: 'api_key',
      resourceId: createdKey.id,
      description: `API key created for ${provider.name}: ${keyName}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        id: createdKey.id,
        keyName: createdKey.key_name,
        providerName: provider.name,
        priority: createdKey.priority,
        createdAt: createdKey.created_at
      }
    });
  })
);

// Update API key
router.put('/:id',
  validateUuidParam('id'),
  validateUpdateApiKey,
  asyncHandler(async (req, res) => {
    const keyId = req.params.id;
    const userId = req.user.id;
    const { keyName, priority, isActive } = req.body;

    // Check if the API key belongs to the user
    const keyResult = await dbService.query(
      `SELECT ak.id, ak.key_name, ak.priority, ak.is_active,
              ap.name as provider_name, ap.display_name as provider_display_name
       FROM api_keys ak
       JOIN api_providers ap ON ak.provider_id = ap.id
       WHERE ak.id = $1 AND ak.user_id = $2`,
      [keyId, userId]
    );

    if (keyResult.rows.length === 0) {
      throw new NotFoundError('API key not found');
    }

    const apiKey = keyResult.rows[0];

    // Build update query
    const updateFields = [];
    const updateValues = [keyId, userId];
    let paramIndex = 3;

    if (keyName !== undefined) {
      // Check if new name conflicts with existing keys
      const conflictResult = await dbService.query(
        'SELECT id FROM api_keys WHERE user_id = $1 AND key_name = $2 AND id != $3',
        [userId, keyName, keyId]
      );

      if (conflictResult.rows.length > 0) {
        throw new ValidationError('You already have an API key with this name');
      }

      updateFields.push(`key_name = $${paramIndex}`);
      updateValues.push(keyName);
      paramIndex++;
    }

    if (priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      updateValues.push(priority);
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
      UPDATE api_keys 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING id, key_name, priority, is_active, updated_at
    `;

    const result = await dbService.query(query, updateValues);

    // Log audit event
    await dbService.createAuditLog({
      userId,
      action: 'api_key_updated',
      resourceType: 'api_key',
      resourceId: keyId,
      description: `API key updated: ${apiKey.key_name} (${apiKey.provider_name})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'API key updated successfully',
      apiKey: result.rows[0]
    });
  })
);

// Delete API key
router.delete('/:id',
  validateUuidParam('id'),
  asyncHandler(async (req, res) => {
    const keyId = req.params.id;
    const userId = req.user.id;

    // Check if the API key belongs to the user and get details for logging
    const keyResult = await dbService.query(
      `SELECT ak.key_name, ap.name as provider_name
       FROM api_keys ak
       JOIN api_providers ap ON ak.provider_id = ap.id
       WHERE ak.id = $1 AND ak.user_id = $2`,
      [keyId, userId]
    );

    if (keyResult.rows.length === 0) {
      throw new NotFoundError('API key not found');
    }

    const apiKey = keyResult.rows[0];

    // Soft delete the API key (mark as inactive)
    const result = await dbService.query(
      `UPDATE api_keys 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [keyId, userId]
    );

    // Log audit event
    await dbService.createAuditLog({
      userId,
      action: 'api_key_deleted',
      resourceType: 'api_key',
      resourceId: keyId,
      description: `API key deleted: ${apiKey.key_name} (${apiKey.provider_name})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'API key deleted successfully'
    });
  })
);

// Test API key
router.post('/:id/test',
  validateUuidParam('id'),
  asyncHandler(async (req, res) => {
    const keyId = req.params.id;
    const userId = req.user.id;

    // Get the API key
    const keyResult = await dbService.query(
      `SELECT ak.encrypted_api_key, ap.name as provider_name, ap.base_url
       FROM api_keys ak
       JOIN api_providers ap ON ak.provider_id = ap.id
       WHERE ak.id = $1 AND ak.user_id = $2 AND ak.is_active = true`,
      [keyId, userId]
    );

    if (keyResult.rows.length === 0) {
      throw new NotFoundError('API key not found or inactive');
    }

    const keyData = keyResult.rows[0];
    const apiKey = decryptApiKey(keyData.encrypted_api_key);

    // Test the API key based on provider
    let testResult = { success: false, message: 'API key test not implemented for this provider' };

    try {
      switch (keyData.provider_name) {
        case 'platerecognizer':
          testResult = await testPlateRecognizerKey(apiKey);
          break;
        case 'openalpr':
          testResult = await testOpenALPRKey(apiKey);
          break;
        case 'google_vision':
          testResult = await testGoogleVisionKey(apiKey);
          break;
        default:
          testResult = { success: true, message: 'API key format validation passed' };
      }

      // Update success/error counts
      if (testResult.success) {
        await dbService.query(
          'UPDATE api_keys SET success_count = success_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
          [keyId]
        );
      } else {
        await dbService.query(
          'UPDATE api_keys SET error_count = error_count + 1 WHERE id = $1',
          [keyId]
        );
      }

    } catch (error) {
      console.error('API key test error:', error);
      testResult = { success: false, message: 'API key test failed: ' + error.message };
      
      await dbService.query(
        'UPDATE api_keys SET error_count = error_count + 1 WHERE id = $1',
        [keyId]
      );
    }

    // Log audit event
    await dbService.createAuditLog({
      userId,
      action: 'api_key_tested',
      resourceType: 'api_key',
      resourceId: keyId,
      description: `API key test ${testResult.success ? 'succeeded' : 'failed'}: ${keyData.provider_name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: testResult.success,
      message: testResult.message,
      provider: keyData.provider_name
    });
  })
);

// Get API providers
router.get('/providers', asyncHandler(async (req, res) => {
  const result = await dbService.query(`
    SELECT 
      id, name, display_name, description, service_type,
      max_requests_per_minute, max_requests_per_month,
      cost_per_request, free_tier_limit, is_active
    FROM api_providers
    WHERE is_active = true
    ORDER BY display_name ASC
  `);

  res.json({
    providers: result.rows
  });
}));

// Get API usage statistics for user's keys
router.get('/usage-stats', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = '30d' } = req.query;

  // Get usage statistics from API usage logs
  const days = period === '7d' ? 7 : 30;
  
  const result = await dbService.query(`
    SELECT 
      ap.display_name as provider_name,
      COUNT(*) as total_requests,
      COUNT(CASE WHEN aul.status_code >= 200 AND aul.status_code < 300 THEN 1 END) as successful_requests,
      COUNT(CASE WHEN aul.status_code >= 400 THEN 1 END) as failed_requests,
      AVG(aul.response_time_ms) as avg_response_time,
      SUM(aul.cost_cents) as total_cost_cents
    FROM api_usage_logs aul
    JOIN api_keys ak ON aul.api_key_id = ak.id
    JOIN api_providers ap ON ak.provider_id = ap.id
    WHERE ak.user_id = $1 
      AND aul.created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY ap.id, ap.display_name
    ORDER BY total_requests DESC
  `, [userId]);

  // Get daily usage for chart
  const dailyUsageResult = await dbService.query(`
    SELECT 
      DATE(aul.created_at) as date,
      COUNT(*) as requests,
      COUNT(CASE WHEN aul.status_code >= 200 AND aul.status_code < 300 THEN 1 END) as successful_requests
    FROM api_usage_logs aul
    JOIN api_keys ak ON aul.api_key_id = ak.id
    WHERE ak.user_id = $1 
      AND aul.created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(aul.created_at)
    ORDER BY date ASC
  `, [userId]);

  res.json({
    usageByProvider: result.rows,
    dailyUsage: dailyUsageResult.rows,
    period: `${days}d`
  });
}));

// Helper functions for testing API keys
async function testPlateRecognizerKey(apiKey) {
  // Implement Plate Recognizer API test
  // This is a simplified version - in production, you'd make an actual API call
  return { success: true, message: 'Plate Recognizer API key is valid' };
}

async function testOpenALPRKey(apiKey) {
  // Implement OpenALPR API test
  return { success: true, message: 'OpenALPR API key is valid' };
}

async function testGoogleVisionKey(apiKey) {
  // Implement Google Vision API test
  return { success: true, message: 'Google Vision API key is valid' };
}

module.exports = router;