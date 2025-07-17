# Backend API Structure - Best Practices

## 📁 **Project Structure**

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── admin.controller.ts
│   │   ├── api-keys.controller.ts
│   │   ├── processing.controller.ts
│   │   └── users.controller.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── admin.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── audit.middleware.ts
│   │
│   ├── models/
│   │   ├── User.ts
│   │   ├── ApiKey.ts
│   │   ├── ApiProvider.ts
│   │   ├── ProcessingJob.ts
│   │   └── AuditLog.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── encryption.service.ts
│   │   ├── api-management.service.ts
│   │   ├── image-processing.service.ts
│   │   └── audit.service.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── admin.routes.ts
│   │   ├── api-keys.routes.ts
│   │   ├── processing.routes.ts
│   │   └── users.routes.ts
│   │
│   ├── config/
│   │   ├── database.ts
│   │   ├── auth.ts
│   │   ├── redis.ts
│   │   └── environment.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── error-handler.ts
│   │   ├── validator.ts
│   │   └── constants.ts
│   │
│   └── app.ts
│
├── tests/
├── docker/
├── scripts/
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔐 **Security Implementation**

### **1. Environment Variables (.env)**
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/image_anonymizer
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=24h
REFRESH_TOKEN_SECRET=your-refresh-token-secret
ENCRYPTION_KEY=your-32-byte-encryption-key-for-api-keys

# OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=52428800  # 50MB
UPLOAD_PATH=/uploads

# Admin Access
ADMIN_JWT_SECRET=separate-admin-jwt-secret
ADMIN_SESSION_TIMEOUT=3600  # 1 hour

# Logging
LOG_LEVEL=info
```

### **2. API Routes Structure**

#### **Public Routes (No Auth Required)**
```typescript
// routes/auth.routes.ts
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google-oauth
POST /api/auth/refresh-token
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

#### **User Routes (JWT Required)**
```typescript
// routes/users.routes.ts
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/usage-stats
POST   /api/users/change-password
DELETE /api/users/account
```

#### **Processing Routes (JWT Required)**
```typescript
// routes/processing.routes.ts
POST /api/processing/upload          # Upload and process image
GET  /api/processing/jobs            # List user's jobs
GET  /api/processing/jobs/:id        # Get specific job
GET  /api/processing/jobs/:id/result # Download processed image
```

#### **API Keys Routes (JWT Required)**
```typescript
// routes/api-keys.routes.ts
GET    /api/api-keys                 # List user's API keys
POST   /api/api-keys                 # Create new API key
PUT    /api/api-keys/:id             # Update API key
DELETE /api/api-keys/:id             # Delete API key
POST   /api/api-keys/:id/test        # Test API key
```

#### **Admin Routes (Admin Role Required)**
```typescript
// routes/admin.routes.ts
GET    /api/admin/dashboard          # Admin dashboard stats
GET    /api/admin/users              # List all users
PUT    /api/admin/users/:id          # Update user
DELETE /api/admin/users/:id          # Delete user
GET    /api/admin/api-providers      # Manage API providers
POST   /api/admin/api-providers      # Create provider
PUT    /api/admin/api-providers/:id  # Update provider
GET    /api/admin/usage-analytics    # System-wide usage stats
GET    /api/admin/audit-logs         # Security audit logs
GET    /api/admin/system-settings    # System configuration
PUT    /api/admin/system-settings    # Update system settings
```

## 🛡️ **Security Middleware Implementation**

### **1. Authentication Middleware**
```typescript
// middleware/auth.middleware.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};
```

### **2. Admin Authorization Middleware**
```typescript
// middleware/admin.middleware.ts
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};
```

### **3. Rate Limiting Middleware**
```typescript
// middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const generalRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:general:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

export const apiKeyRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:apikey:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit API key operations
  message: 'Too many API key operations'
});

export const adminRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:admin:',
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit admin operations
  message: 'Too many admin operations'
});
```

## 🔑 **API Key Management Service**

```typescript
// services/api-management.service.ts
import crypto from 'crypto';
import { ApiKey, ApiProvider } from '../models';

export class ApiKeyService {
  private static encryptionKey = process.env.ENCRYPTION_KEY!;

  static encrypt(apiKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedKey: string): string {
    const [ivHex, encrypted] = encryptedKey.split(':');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static generateKeyHash(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  async storeApiKey(userId: string, providerId: string, keyName: string, apiKey: string) {
    const encryptedKey = ApiKeyService.encrypt(apiKey);
    const keyHash = ApiKeyService.generateKeyHash(apiKey);

    return await ApiKey.create({
      userId,
      providerId,
      keyName,
      encryptedApiKey: encryptedKey,
      keyHash,
      isActive: true
    });
  }

  async getDecryptedApiKey(keyId: string, userId: string): Promise<string | null> {
    const apiKey = await ApiKey.findOne({
      where: { id: keyId, userId, isActive: true }
    });

    if (!apiKey) return null;

    return ApiKeyService.decrypt(apiKey.encryptedApiKey);
  }
}
```

## 🔄 **Admin Access Implementation**

### **1. Secure Admin Login Route**
```typescript
// controllers/admin.controller.ts
export class AdminController {
  async adminLogin(req: Request, res: Response) {
    try {
      const { email, password, adminCode } = req.body;

      // Verify admin code (additional security layer)
      if (adminCode !== process.env.ADMIN_ACCESS_CODE) {
        await AuditService.log({
          action: 'admin_login_failed',
          details: { email, reason: 'invalid_admin_code' },
          ipAddress: req.ip
        });
        return res.status(403).json({ error: 'Invalid admin access code' });
      }

      const user = await User.findOne({ where: { email } });
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate admin-specific JWT with shorter expiration
      const adminToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.ADMIN_JWT_SECRET!,
        { expiresIn: '1h' }
      );

      await AuditService.log({
        userId: user.id,
        action: 'admin_login_success',
        ipAddress: req.ip
      });

      res.json({
        token: adminToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Admin login failed' });
    }
  }
}
```

### **2. Frontend Admin Route Protection**
```typescript
// Frontend: components/admin/AdminRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ 
  children, 
  requireSuperAdmin = false 
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireSuperAdmin && user.role !== 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};
```

## 🚦 **Recommended Deployment Architecture**

### **1. Production Environment Setup**
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=https://api.yourapp.com
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./uploads:/app/uploads

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=image_anonymizer
      - POSTGRES_USER=your_user
      - POSTGRES_PASSWORD=your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

### **2. Security Checklist**

✅ **Authentication & Authorization**
- JWT tokens with proper expiration
- Refresh token rotation
- Role-based access control (RBAC)
- Admin access codes for additional security

✅ **API Key Security**
- AES-256 encryption for stored API keys
- SHA-256 hashing for verification
- Per-user key isolation
- Rate limiting per API key

✅ **Data Protection**
- Row-level security (RLS) in PostgreSQL
- Encrypted database connections
- Secure file upload handling
- Input validation and sanitization

✅ **Monitoring & Auditing**
- Comprehensive audit logging
- Failed login attempt tracking
- API usage monitoring
- Error tracking and alerting

✅ **Infrastructure Security**
- HTTPS/TLS encryption
- Redis for session management
- Rate limiting with Redis
- Docker containerization

## 📱 **Frontend Integration**

### **Admin Access Route Structure**
```typescript
// Frontend routes
/admin/login          # Secure admin login
/admin/dashboard      # Admin overview
/admin/users          # User management
/admin/api-providers  # API provider management
/admin/analytics      # Usage analytics
/admin/audit-logs     # Security audit logs
/admin/settings       # System settings
```

This architecture provides enterprise-grade security for API key management while maintaining separation of concerns between frontend and backend components.