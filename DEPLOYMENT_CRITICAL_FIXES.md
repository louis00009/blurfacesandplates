# 🚨 关键部署修复指南
## 让支付系统和所有功能完全生效

**当前问题：仅配置Nginx无法让支付系统等功能工作，需要完整的后端API支持。**

---

## 🔍 当前缺失的关键组件

### 1. **后端API服务器** (必需)
```bash
# 需要实现的API端点：
POST /api/auth/login           # 用户登录
POST /api/auth/register        # 用户注册
POST /api/payments/create-intent    # Stripe支付
POST /api/payments/paypal/create-order  # PayPal支付
POST /api/payments/confirm     # 支付确认
GET  /api/users/profile        # 用户信息
```

### 2. **Stripe/PayPal配置** (必需)
- Stripe API密钥
- PayPal客户端ID和密钥
- Webhook配置

### 3. **环境变量** (必需)
```env
# 支付系统
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx

# JWT认证
JWT_SECRET=xxx
```

---

## 🛠️ 快速修复方案

### 方案1：Mock后端服务 (快速测试)

创建临时后端模拟：

```bash
# 1. 安装Express服务
npm install express cors dotenv jsonwebtoken

# 2. 创建简单后端
mkdir backend
cd backend
```

创建 `backend/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Mock用户登录
app.post('/api/auth/login', (req, res) => {
  const token = jwt.sign(
    { id: '1', email: req.body.email },
    process.env.JWT_SECRET || 'mock-secret',
    { expiresIn: '24h' }
  );
  res.json({ token, user: { id: '1', email: req.body.email } });
});

// Mock支付API
app.post('/api/payments/create-intent', (req, res) => {
  // 返回模拟的支付意图
  res.json({
    clientSecret: 'pi_mock_client_secret',
    subscriptionId: 'sub_mock_' + Date.now()
  });
});

app.post('/api/payments/paypal/create-order', (req, res) => {
  res.json({
    orderId: 'ORDER_MOCK_' + Date.now()
  });
});

app.post('/api/payments/confirm', (req, res) => {
  res.json({ success: true });
});

app.listen(5000, () => {
  console.log('Mock backend running on port 5000');
});
```

启动Mock后端：
```bash
cd backend
node server.js
```

### 方案2：完整生产后端 (推荐)

#### A. 安装Node.js后端依赖

```bash
# 在服务器上创建后端目录
mkdir -p /var/www/mosaic-blur-app-backend
cd /var/www/mosaic-blur-app-backend

# 初始化后端项目
npm init -y

# 安装核心依赖
npm install express cors helmet compression morgan
npm install jsonwebtoken bcryptjs
npm install pg redis stripe paypal-rest-sdk
npm install dotenv joi express-rate-limit
npm install multer uuid crypto-js
npm install nodemailer

# 安装开发依赖
npm install -D nodemon typescript @types/node
```

#### B. 创建后端环境配置

```bash
# 创建生产环境配置
nano /var/www/mosaic-blur-app-backend/.env.production
```

```env
# 服务器配置
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# 数据库
DATABASE_URL=postgresql://app_user:secure_password_123@localhost:5432/image_anonymizer
REDIS_URL=redis://localhost:6379

# JWT认证
JWT_SECRET=your-super-secure-jwt-secret-32-chars-minimum
JWT_EXPIRE=24h
REFRESH_TOKEN_SECRET=your-refresh-token-secret-32-chars

# 支付系统 - Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxx

# 支付系统 - PayPal
PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_MODE=live  # sandbox for testing

# 邮件服务
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@your-domain.com

# 安全配置
ENCRYPTION_KEY=your-32-byte-encryption-key-change-this
ADMIN_ACCESS_CODE=your-secure-admin-code

# 文件上传
MAX_FILE_SIZE=52428800
UPLOAD_PATH=/var/www/mosaic-blur-app/uploads

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### C. 快速后端API实现

创建 `/var/www/mosaic-blur-app-backend/app.js`:

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: '.env.production' });

const app = express();

// 中间件
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-domain.com',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

#### D. 关键路由实现

创建路由目录和文件：

```bash
mkdir -p /var/www/mosaic-blur-app-backend/routes
mkdir -p /var/www/mosaic-blur-app-backend/middleware
mkdir -p /var/www/mosaic-blur-app-backend/services
```

**认证路由** (`routes/auth.js`):
```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 注册
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // 检查用户是否已存在
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // 加密密码
    const passwordHash = await bcrypt.hash(password, 12);
    
    // 创建用户
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, email_verified) VALUES ($1, $2, $3, true) RETURNING id, email, name',
      [email, passwordHash, name]
    );
    
    const user = result.rows[0];
    
    // 生成JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 查找用户
    const result = await pool.query(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // 生成JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    // 更新最后登录时间
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
```

**支付路由** (`routes/payments.js`):
```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('paypal-rest-sdk');
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 配置PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Stripe - 创建支付意图
router.post('/create-intent', auth, async (req, res) => {
  try {
    const { planId, amount, currency = 'aud', couponCode } = req.body;
    
    // 创建支付意图
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // 转换为分
      currency: currency.toLowerCase(),
      metadata: {
        userId: req.user.id,
        planId,
        couponCode: couponCode || ''
      }
    });
    
    // 创建订阅记录
    const subscription = await pool.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, amount_paid_aud, currency_paid) 
       VALUES ($1, $2, 'pending', $3, $4) RETURNING id`,
      [req.user.id, planId, amount, currency]
    );
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.rows[0].id
    });
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// 支付确认
router.post('/confirm', auth, async (req, res) => {
  try {
    const { paymentIntentId, subscriptionId } = req.body;
    
    // 验证支付
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // 更新订阅状态
      await pool.query(
        `UPDATE user_subscriptions 
         SET status = 'active', starts_at = CURRENT_TIMESTAMP 
         WHERE id = $1 AND user_id = $2`,
        [subscriptionId, req.user.id]
      );
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
});

// PayPal - 创建订单
router.post('/paypal/create-order', auth, async (req, res) => {
  try {
    const { amount, currency = 'AUD', planId } = req.body;
    
    const createPayment = {
      intent: 'sale',
      payer: { payment_method: 'paypal' },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
      },
      transactions: [{
        amount: {
          currency: currency.toUpperCase(),
          total: amount.toString()
        },
        description: `Subscription Plan Purchase`,
        custom: JSON.stringify({
          userId: req.user.id,
          planId
        })
      }]
    };
    
    paypal.payment.create(createPayment, (error, payment) => {
      if (error) {
        console.error('PayPal create payment error:', error);
        return res.status(500).json({ error: 'Failed to create PayPal order' });
      }
      
      res.json({ orderId: payment.id });
    });
  } catch (error) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

module.exports = router;
```

**认证中间件** (`middleware/auth.js`):
```javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};
```

#### E. 启动后端服务

```bash
# 安装PM2（如果未安装）
npm install -g pm2

# 创建PM2配置
nano /var/www/mosaic-blur-app-backend/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'mosaic-backend',
    script: 'app.js',
    cwd: '/var/www/mosaic-blur-app-backend',
    env_production: {
      NODE_ENV: 'production'
    },
    instances: 2,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

启动后端：
```bash
cd /var/www/mosaic-blur-app-backend
pm2 start ecosystem.config.js --env production
pm2 save
```

#### F. 更新Nginx配置

```bash
sudo nano /etc/nginx/sites-available/mosaic-blur-app
```

在现有配置中添加后端代理：

```nginx
# API代理到后端
location /api/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

# 健康检查
location /health {
    proxy_pass http://localhost:5000;
    access_log off;
}
```

重启Nginx：
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔑 支付系统配置

### 1. Stripe配置

```bash
# 1. 注册Stripe账户：https://stripe.com
# 2. 获取API密钥（Dashboard > Developers > API keys）
# 3. 配置Webhook（Dashboard > Developers > Webhooks）
#    URL: https://your-domain.com/api/payments/stripe/webhook
#    事件: payment_intent.succeeded, payment_intent.payment_failed
```

### 2. PayPal配置

```bash
# 1. 注册PayPal开发者账户：https://developer.paypal.com
# 2. 创建应用获取Client ID和Secret
# 3. 配置Webhook URL: https://your-domain.com/api/payments/paypal/webhook
```

### 3. 前端支付配置

更新前端环境变量：

```bash
nano /var/www/mosaic-blur-app/.env.production
```

添加：
```env
# Stripe公钥
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxx

# PayPal客户端ID
REACT_APP_PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxx

# API地址
REACT_APP_API_URL=https://your-domain.com/api
```

重新构建前端：
```bash
cd /var/www/mosaic-blur-app
npm run build
pm2 restart mosaic-blur-frontend
```

---

## ✅ 验证部署

### 1. 检查服务状态

```bash
# 检查后端运行状态
pm2 status
curl http://localhost:5000/health

# 检查数据库连接
sudo -u postgres psql -d image_anonymizer -c "SELECT COUNT(*) FROM users;"

# 检查Nginx代理
curl https://your-domain.com/api/health
```

### 2. 测试支付流程

1. 访问：`https://your-domain.com`
2. 注册/登录账户
3. 选择订阅计划
4. 测试支付（使用Stripe测试卡：4242424242424242）

### 3. 监控日志

```bash
# 后端日志
pm2 logs mosaic-backend

# Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🚨 关键注意事项

1. **SSL证书必需** - 支付系统要求HTTPS
2. **API密钥安全** - 生产环境使用强密钥
3. **数据库备份** - 定期备份用户和支付数据
4. **监控告警** - 设置支付失败告警
5. **法律合规** - 确保符合支付处理法规

完成以上步骤后，支付系统和所有功能将完全生效！