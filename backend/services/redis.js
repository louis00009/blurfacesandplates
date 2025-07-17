const Redis = require('ioredis');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

class RedisService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });

    this.redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    this.redis.on('close', () => {
      logger.info('Redis connection closed');
    });
  }

  async testConnection() {
    try {
      await this.redis.ping();
      logger.info('Redis connection test successful');
      return true;
    } catch (error) {
      logger.error('Redis connection test failed:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
      throw error;
    }
  }

  // Session management
  async setSession(sessionId, userData, expirationSeconds = 86400) {
    try {
      const key = `session:${sessionId}`;
      await this.redis.setex(key, expirationSeconds, JSON.stringify(userData));
      return true;
    } catch (error) {
      logger.error('Failed to set session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Failed to delete session:', error);
      throw error;
    }
  }

  // Rate limiting helpers
  async incrementRateLimit(key, windowMs, maxRequests) {
    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, Math.ceil(windowMs / 1000));
      }
      return {
        current,
        remaining: Math.max(0, maxRequests - current),
        resetTime: Date.now() + windowMs
      };
    } catch (error) {
      logger.error('Failed to increment rate limit:', error);
      throw error;
    }
  }

  // Cache management
  async set(key, value, expirationSeconds = 3600) {
    try {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      await this.redis.setex(key, expirationSeconds, value);
      return true;
    } catch (error) {
      logger.error('Failed to set cache:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Failed to get cache:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Failed to delete cache:', error);
      throw error;
    }
  }

  // Lock mechanism for critical operations
  async acquireLock(lockKey, expirationSeconds = 30) {
    try {
      const result = await this.redis.set(
        `lock:${lockKey}`, 
        Date.now(), 
        'PX', 
        expirationSeconds * 1000, 
        'NX'
      );
      return result === 'OK';
    } catch (error) {
      logger.error('Failed to acquire lock:', error);
      return false;
    }
  }

  async releaseLock(lockKey) {
    try {
      await this.redis.del(`lock:${lockKey}`);
      return true;
    } catch (error) {
      logger.error('Failed to release lock:', error);
      return false;
    }
  }

  // Payment processing cache
  async setPaymentIntent(intentId, data, expirationSeconds = 3600) {
    const key = `payment_intent:${intentId}`;
    return await this.set(key, data, expirationSeconds);
  }

  async getPaymentIntent(intentId) {
    const key = `payment_intent:${intentId}`;
    return await this.get(key);
  }

  async deletePaymentIntent(intentId) {
    const key = `payment_intent:${intentId}`;
    return await this.del(key);
  }

  // API usage tracking
  async trackApiUsage(userId, provider, endpoint) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const keys = [
        `api_usage:${userId}:${today}`,
        `api_usage:${userId}:${provider}:${today}`,
        `api_usage:global:${provider}:${today}`
      ];

      const pipeline = this.redis.pipeline();
      keys.forEach(key => {
        pipeline.incr(key);
        pipeline.expire(key, 86400 * 7); // 7 days
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Failed to track API usage:', error);
      return false;
    }
  }

  async getApiUsage(userId, provider = null, date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      let key = `api_usage:${userId}`;
      
      if (provider) {
        key += `:${provider}`;
      }
      key += `:${targetDate}`;

      const usage = await this.redis.get(key);
      return parseInt(usage) || 0;
    } catch (error) {
      logger.error('Failed to get API usage:', error);
      return 0;
    }
  }

  // Webhook deduplication
  async isWebhookProcessed(webhookId) {
    try {
      const key = `webhook:${webhookId}`;
      const exists = await this.redis.exists(key);
      if (!exists) {
        await this.redis.setex(key, 3600, '1'); // Mark as processed for 1 hour
        return false;
      }
      return true;
    } catch (error) {
      logger.error('Failed to check webhook processing:', error);
      return false;
    }
  }

  // User temporary data (password reset tokens, etc.)
  async setTemporaryData(type, identifier, data, expirationSeconds = 3600) {
    const key = `temp:${type}:${identifier}`;
    return await this.set(key, data, expirationSeconds);
  }

  async getTemporaryData(type, identifier) {
    const key = `temp:${type}:${identifier}`;
    return await this.get(key);
  }

  async deleteTemporaryData(type, identifier) {
    const key = `temp:${type}:${identifier}`;
    return await this.del(key);
  }

  // Health check
  async healthCheck() {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        status: 'ok',
        latency: `${latency}ms`,
        memory
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService;