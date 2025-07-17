const { Pool } = require('pg');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Database query error', { text, error: error.message });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection test successful', { timestamp: result.rows[0].now });
      return true;
    } catch (error) {
      logger.error('Database connection test failed', { error: error.message });
      throw error;
    }
  }

  async close() {
    try {
      await this.pool.end();
      logger.info('Database pool closed');
    } catch (error) {
      logger.error('Error closing database pool', { error: error.message });
      throw error;
    }
  }

  // Transaction helper
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // User operations
  async createUser(userData) {
    const { email, passwordHash, name, googleId = null } = userData;
    const query = `
      INSERT INTO users (email, password_hash, name, google_id, email_verified)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role, membership_level, created_at
    `;
    const values = [email, passwordHash, name, googleId, googleId ? true : false];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const query = `
      SELECT id, email, name, password_hash, role, membership_level, 
             subscription_status, usage_count, usage_limit, is_active,
             google_id, email_verified, created_at, last_login_at
      FROM users 
      WHERE email = $1 AND is_active = true
    `;
    const result = await this.query(query, [email]);
    return result.rows[0] || null;
  }

  async getUserById(id) {
    const query = `
      SELECT id, email, name, role, membership_level, subscription_status,
             usage_count, usage_limit, is_active, avatar_url, created_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    const result = await this.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateUserLastLogin(userId) {
    const query = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    await this.query(query, [userId]);
  }

  async incrementUserUsage(userId) {
    const query = `
      UPDATE users 
      SET usage_count = usage_count + 1 
      WHERE id = $1
      RETURNING usage_count, usage_limit
    `;
    const result = await this.query(query, [userId]);
    return result.rows[0];
  }

  // Subscription operations
  async createSubscription(subscriptionData) {
    const { userId, planId, status, amountPaid, currency, paymentId } = subscriptionData;
    const query = `
      INSERT INTO user_subscriptions 
      (user_id, plan_id, status, starts_at, amount_paid_aud, currency_paid, payment_id)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)
      RETURNING id, status, starts_at
    `;
    const values = [userId, planId, status, amountPaid, currency, paymentId];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async updateSubscriptionStatus(subscriptionId, status, userId = null) {
    let query = `
      UPDATE user_subscriptions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    let values = [status, subscriptionId];

    if (userId) {
      query += ' AND user_id = $3';
      values.push(userId);
    }

    query += ' RETURNING id, status, updated_at';
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getUserActiveSubscription(userId) {
    const query = `
      SELECT s.*, p.name as plan_name, p.usage_limit as plan_usage_limit
      FROM user_subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = $1 
        AND s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)
      ORDER BY s.starts_at DESC
      LIMIT 1
    `;
    const result = await this.query(query, [userId]);
    return result.rows[0] || null;
  }

  // Payment operations
  async createPayment(paymentData) {
    const {
      userId, subscriptionId, providerId, externalPaymentId,
      amount, currency, status, paymentMethod
    } = paymentData;
    
    const query = `
      INSERT INTO payments 
      (user_id, subscription_id, provider_id, external_payment_id, 
       amount, currency, status, payment_method, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING id, status, created_at
    `;
    const values = [
      userId, subscriptionId, providerId, externalPaymentId,
      amount, currency, status, paymentMethod
    ];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async updatePaymentStatus(paymentId, status, metadata = {}) {
    const query = `
      UPDATE payments 
      SET status = $1, 
          processed_at = CASE WHEN $1 = 'succeeded' THEN CURRENT_TIMESTAMP ELSE processed_at END,
          failed_at = CASE WHEN $1 = 'failed' THEN CURRENT_TIMESTAMP ELSE failed_at END,
          metadata = $2
      WHERE id = $3
      RETURNING id, status, processed_at
    `;
    const result = await this.query(query, [status, JSON.stringify(metadata), paymentId]);
    return result.rows[0];
  }

  // API Key operations
  async createApiKey(apiKeyData) {
    const { userId, providerId, keyName, encryptedApiKey, keyHash, priority } = apiKeyData;
    const query = `
      INSERT INTO api_keys 
      (user_id, provider_id, key_name, encrypted_api_key, key_hash, priority)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, key_name, priority, created_at
    `;
    const values = [userId, providerId, keyName, encryptedApiKey, keyHash, priority || 1];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getUserApiKeys(userId) {
    const query = `
      SELECT ak.id, ak.key_name, ak.priority, ak.is_active, ak.last_used_at,
             ak.success_count, ak.error_count, ak.created_at,
             ap.name as provider_name, ap.display_name as provider_display_name
      FROM api_keys ak
      JOIN api_providers ap ON ak.provider_id = ap.id
      WHERE ak.user_id = $1 AND ak.is_active = true
      ORDER BY ak.priority ASC, ak.created_at DESC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  // Audit logging
  async createAuditLog(logData) {
    const { userId, action, resourceType, resourceId, description, ipAddress, userAgent } = logData;
    const query = `
      INSERT INTO audit_logs 
      (user_id, action, resource_type, resource_id, description, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `;
    const values = [userId, action, resourceType, resourceId, description, ipAddress, userAgent];
    const result = await this.query(query, values);
    return result.rows[0];
  }
}

// Create singleton instance
const dbService = new DatabaseService();

module.exports = dbService;