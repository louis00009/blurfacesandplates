const jwt = require('jsonwebtoken');
const dbService = require('../services/database');
const redisService = require('../services/redis');

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await dbService.getUserById(decoded.id);
    if (!user || !user.is_active) {
      return res.status(403).json({ 
        error: 'User account is inactive or deleted',
        code: 'USER_INACTIVE'
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      membershipLevel: user.membership_level,
      usageCount: user.usage_count,
      usageLimit: user.usage_limit
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid access token',
        code: 'TOKEN_INVALID'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await dbService.getUserById(decoded.id);
      
      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          membershipLevel: user.membership_level,
          usageCount: user.usage_count,
          usageLimit: user.usage_limit
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Role-based authorization
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Admin authorization
const requireAdmin = requireRole(['admin', 'super_admin']);

// Super admin authorization
const requireSuperAdmin = requireRole('super_admin');

// Membership level check
const requireMembership = (levels) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userLevel = req.user.membershipLevel;
    const allowedLevels = Array.isArray(levels) ? levels : [levels];

    if (!allowedLevels.includes(userLevel)) {
      return res.status(403).json({ 
        error: `Upgrade required. Current plan: ${userLevel}`,
        code: 'UPGRADE_REQUIRED',
        currentPlan: userLevel,
        requiredPlan: allowedLevels
      });
    }

    next();
  };
};

// Usage limit check
const checkUsageLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const { usageCount, usageLimit } = req.user;

    if (usageCount >= usageLimit) {
      return res.status(429).json({ 
        error: 'Usage limit exceeded',
        code: 'USAGE_LIMIT_EXCEEDED',
        usageCount,
        usageLimit,
        message: 'Please upgrade your plan or wait for the next billing cycle'
      });
    }

    next();
  } catch (error) {
    console.error('Usage limit check error:', error);
    return res.status(500).json({ 
      error: 'Usage limit check failed',
      code: 'USAGE_CHECK_ERROR'
    });
  }
};

// Session-based authentication (for admin panel)
const authenticateSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

    if (!sessionId) {
      return res.status(401).json({ 
        error: 'Session ID required',
        code: 'SESSION_MISSING'
      });
    }

    // Get session from Redis
    const sessionData = await redisService.getSession(sessionId);
    if (!sessionData) {
      return res.status(403).json({ 
        error: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      });
    }

    // Verify user still exists and is active
    const user = await dbService.getUserById(sessionData.userId);
    if (!user || !user.is_active) {
      await redisService.deleteSession(sessionId);
      return res.status(403).json({ 
        error: 'User account is inactive',
        code: 'USER_INACTIVE'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionId
    };

    // Extend session
    await redisService.setSession(sessionId, sessionData, 3600);

    next();
  } catch (error) {
    console.error('Session auth error:', error);
    return res.status(500).json({ 
      error: 'Session authentication failed',
      code: 'SESSION_AUTH_ERROR'
    });
  }
};

// API key authentication (for external API access)
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required',
        code: 'API_KEY_MISSING'
      });
    }

    // Hash the provided API key
    const crypto = require('crypto');
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find API key in database
    const result = await dbService.query(
      `SELECT ak.user_id, ak.id as api_key_id, u.email, u.name, u.is_active
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1 AND ak.is_active = true`,
      [hashedKey]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Invalid API key',
        code: 'API_KEY_INVALID'
      });
    }

    const keyData = result.rows[0];

    if (!keyData.is_active) {
      return res.status(403).json({ 
        error: 'User account is inactive',
        code: 'USER_INACTIVE'
      });
    }

    req.user = {
      id: keyData.user_id,
      email: keyData.email,
      name: keyData.name,
      apiKeyId: keyData.api_key_id,
      authMethod: 'api_key'
    };

    // Update last used timestamp
    await dbService.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [keyData.api_key_id]
    );

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    return res.status(500).json({ 
      error: 'API key authentication failed',
      code: 'API_KEY_AUTH_ERROR'
    });
  }
};

// Refresh token middleware
const authenticateRefreshToken = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    req.tokenData = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    } else {
      console.error('Refresh token error:', error);
      return res.status(500).json({ 
        error: 'Refresh token validation failed',
        code: 'REFRESH_TOKEN_ERROR'
      });
    }
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireMembership,
  checkUsageLimit,
  authenticateSession,
  authenticateApiKey,
  authenticateRefreshToken
};