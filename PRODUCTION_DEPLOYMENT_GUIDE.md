# 🚀 完整生产部署指南
## AI图像匿名化应用 - Ubuntu云服务器部署

**本指南包含完整的生产级后端系统和支付功能的部署流程**

---

## 📋 部署概览

✅ **已完成的系统组件：**
- ✅ 完整的Node.js后端API (认证、支付、用户管理、管理员面板)
- ✅ Stripe和PayPal支付集成
- ✅ JWT认证和会话管理
- ✅ API密钥管理和加密存储
- ✅ 速率限制和安全中间件
- ✅ PostgreSQL数据库架构和迁移
- ✅ Redis缓存和会话存储
- ✅ PM2进程管理配置
- ✅ Nginx反向代理和负载均衡
- ✅ 自动备份和监控脚本

---

## 🗂️ 部署文件结构

```
mosaic-blur-app/
├── backend/
│   ├── package.json              # 后端依赖配置
│   ├── app.js                    # 主应用入口
│   ├── ecosystem.config.js       # PM2配置
│   ├── .env.example             # 环境变量模板
│   ├── services/
│   │   ├── database.js          # 数据库服务
│   │   └── redis.js             # Redis服务
│   ├── middleware/
│   │   ├── auth.js              # 认证中间件
│   │   ├── rateLimiter.js       # 速率限制
│   │   ├── errorHandler.js      # 错误处理
│   │   └── validateRequest.js   # 请求验证
│   ├── routes/
│   │   ├── auth.js              # 认证路由
│   │   ├── payments.js          # 支付路由
│   │   ├── users.js             # 用户管理
│   │   ├── admin.js             # 管理员功能
│   │   └── apiKeys.js           # API密钥管理
│   └── scripts/
│       ├── setup.sh             # 服务器初始化
│       ├── deploy.sh            # 部署脚本
│       └── migrate.js           # 数据库迁移
├── nginx.conf                   # Nginx配置
├── database_schema.sql          # 数据库架构
└── 前端文件...
```

---

## 🎯 第一步：服务器初始化

### 1. 运行服务器设置脚本

```bash
# 下载设置脚本到服务器
wget https://raw.githubusercontent.com/yourusername/mosaic-blur-app/main/backend/scripts/setup.sh

# 给脚本执行权限
chmod +x setup.sh

# 以root权限运行设置脚本
sudo ./setup.sh
```

**设置脚本会自动完成：**
- ✅ 安装Node.js 18.x, PM2, PostgreSQL, Redis, Nginx
- ✅ 创建应用目录和用户权限
- ✅ 配置防火墙和安全设置
- ✅ 设置自动备份和监控
- ✅ 创建数据库和用户
- ✅ 安装SSL证书工具

---

## 🎯 第二步：克隆和配置应用

### 1. 克隆应用代码

```bash
# 切换到应用目录
cd /var/www/mosaic-blur-app

# 克隆代码（替换为您的仓库地址）
git clone https://github.com/yourusername/mosaic-blur-app.git .

# 设置正确的权限
sudo chown -R www-data:www-data /var/www/mosaic-blur-app
```

### 2. 配置后端环境变量

```bash
# 复制环境变量模板
cd /var/www/mosaic-blur-app/backend
cp .env.example .env.production

# 编辑环境配置
nano .env.production
```

**关键配置项：**

```env
# 基础配置
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com

# 数据库（使用setup.sh创建的配置）
DATABASE_URL=postgresql://app_user:secure_password_123@localhost:5432/image_anonymizer
REDIS_URL=redis://localhost:6379

# JWT密钥（生成强密钥）
JWT_SECRET=your-super-secure-jwt-secret-32-chars-minimum
REFRESH_TOKEN_SECRET=your-refresh-token-secret-32-chars

# 支付系统配置
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxx

PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_MODE=live

# 邮件服务
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@your-domain.com

# 安全配置
ENCRYPTION_KEY=your-32-byte-encryption-key-change-this
ADMIN_ACCESS_CODE=your-secure-admin-code
```

### 3. 安装依赖和运行迁移

```bash
# 安装后端依赖
cd /var/www/mosaic-blur-app/backend
npm ci --production

# 运行数据库迁移
node scripts/migrate.js

# 安装前端依赖并构建
cd /var/www/mosaic-blur-app
npm ci
npm run build
```

---

## 🎯 第三步：配置SSL和域名

### 1. 更新域名配置

```bash
# 更新Nginx配置中的域名
sed -i 's/your-domain.com/youractual-domain.com/g' /var/www/mosaic-blur-app/nginx.conf

# 复制Nginx配置
sudo cp /var/www/mosaic-blur-app/nginx.conf /etc/nginx/sites-available/mosaic-blur-app

# 启用站点
sudo ln -s /etc/nginx/sites-available/mosaic-blur-app /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 测试Nginx配置
sudo nginx -t
```

### 2. 获取SSL证书

```bash
# 使用Certbot获取Let's Encrypt证书
sudo certbot --nginx -d youractual-domain.com -d www.youractual-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

---

## 🎯 第四步：启动应用服务

### 1. 启动后端服务

```bash
# 切换到后端目录
cd /var/www/mosaic-blur-app/backend

# 使用PM2启动应用
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save

# 设置PM2开机自启
pm2 startup
```

### 2. 重启Nginx

```bash
# 重启Nginx
sudo systemctl restart nginx

# 检查服务状态
sudo systemctl status nginx
pm2 status
```

---

## 🎯 第五步：配置支付系统

### 1. Stripe配置

**在Stripe Dashboard中：**
1. 获取Live模式的API密钥
2. 配置Webhook端点：`https://your-domain.com/api/payments/stripe/webhook`
3. 选择事件：`payment_intent.succeeded`, `payment_intent.payment_failed`
4. 复制Webhook签名密钥到环境变量

### 2. PayPal配置

**在PayPal Developer Dashboard中：**
1. 创建Live应用
2. 获取Client ID和Client Secret
3. 配置Webhook URL：`https://your-domain.com/api/payments/paypal/webhook`
4. 更新环境变量

### 3. 更新前端环境变量

```bash
# 创建前端生产环境文件
nano /var/www/mosaic-blur-app/.env.production
```

```env
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxx
REACT_APP_PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxx
GENERATE_SOURCEMAP=false
```

重新构建前端：

```bash
cd /var/www/mosaic-blur-app
npm run build
```

---

## 🎯 第六步：运行自动部署

```bash
# 给部署脚本执行权限
chmod +x /var/www/mosaic-blur-app/backend/scripts/deploy.sh

# 运行部署脚本
cd /var/www/mosaic-blur-app
./backend/scripts/deploy.sh production
```

**部署脚本会自动：**
- ✅ 验证所有服务配置
- ✅ 备份当前部署和数据库
- ✅ 更新代码并安装依赖
- ✅ 运行数据库迁移
- ✅ 重启服务并验证健康状态
- ✅ 清理旧备份文件

---

## 🎯 第七步：验证部署

### 1. 健康检查

```bash
# 检查所有服务状态
/usr/local/bin/app-status.sh

# 检查具体服务
curl https://your-domain.com/health
curl https://your-domain.com/api/health
```

### 2. 测试支付功能

1. **访问应用**：`https://your-domain.com`
2. **注册测试账户**
3. **测试Stripe支付**：使用测试卡号 `4242424242424242`
4. **测试PayPal支付**：使用PayPal沙盒账户
5. **访问管理面板**：`https://your-domain.com/admin`
   - 用户名：`admin@example.com`
   - 密码：`admin123` （立即更改！）

### 3. 监控日志

```bash
# 查看应用日志
pm2 logs mosaic-blur-backend

# 查看Nginx访问日志
sudo tail -f /var/log/nginx/access.log

# 查看系统日志
sudo journalctl -f
```

---

## 🔐 安全配置检查清单

### ✅ 必须完成的安全配置：

1. **更改默认密码**
   ```bash
   # 登录管理面板更改admin账户密码
   # 更改数据库密码
   # 更改所有默认密钥
   ```

2. **配置强密钥**
   ```bash
   # 生成强JWT密钥
   openssl rand -hex 32
   
   # 生成加密密钥
   openssl rand -hex 32
   ```

3. **设置环境变量权限**
   ```bash
   sudo chmod 600 /var/www/mosaic-blur-app/backend/.env.production
   sudo chown www-data:www-data /var/www/mosaic-blur-app/backend/.env.production
   ```

4. **配置备份加密**
   ```bash
   # 设置GPG加密备份（可选）
   sudo apt install gnupg
   gpg --gen-key
   ```

---

## 📊 监控和维护

### 1. 自动监控（已配置）

- ✅ **进程监控**：每5分钟检查PM2进程状态
- ✅ **磁盘监控**：磁盘使用率超过85%时告警
- ✅ **内存监控**：内存使用率监控
- ✅ **自动备份**：每日凌晨2点自动备份

### 2. 手动监控命令

```bash
# 应用状态
/usr/local/bin/app-status.sh

# PM2监控界面
pm2 monit

# 系统资源监控
htop

# 网络监控
nethogs

# 磁盘使用
ncdu /var/www/mosaic-blur-app
```

### 3. 日常维护

```bash
# 重启应用（零停机）
pm2 reload mosaic-blur-backend

# 查看性能指标
pm2 show mosaic-blur-backend

# 清理日志
pm2 flush

# 手动备份
/usr/local/bin/backup-mosaic-app.sh
```

---

## 🚨 故障排除

### 常见问题和解决方案

1. **后端服务启动失败**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep 5000
   
   # 检查环境变量
   pm2 env 0
   
   # 查看详细错误
   pm2 logs mosaic-blur-backend --lines 50
   ```

2. **数据库连接失败**
   ```bash
   # 检查PostgreSQL状态
   sudo systemctl status postgresql
   
   # 测试数据库连接
   psql -U app_user -d image_anonymizer -h localhost
   
   # 重启数据库
   sudo systemctl restart postgresql
   ```

3. **支付功能异常**
   ```bash
   # 检查Webhook配置
   curl -X POST https://your-domain.com/api/payments/stripe/webhook
   
   # 查看支付日志
   pm2 logs mosaic-blur-backend | grep payment
   ```

4. **SSL证书问题**
   ```bash
   # 检查证书状态
   sudo certbot certificates
   
   # 强制更新证书
   sudo certbot renew --force-renewal
   ```

---

## 🎉 部署完成！

**您的AI图像匿名化应用现已完全部署并运行在生产环境中！**

### 🔗 重要链接：

- **应用访问**：`https://your-domain.com`
- **管理面板**：`https://your-domain.com/admin`
- **API文档**：`https://your-domain.com/api`
- **健康检查**：`https://your-domain.com/health`

### 📞 支持和更新：

- **查看状态**：`/usr/local/bin/app-status.sh`
- **应用日志**：`pm2 logs mosaic-blur-backend`
- **重新部署**：`./backend/scripts/deploy.sh production`

### 🎯 下一步建议：

1. **配置域名邮箱**用于系统通知
2. **设置监控告警**（如Slack通知）
3. **配置CDN**以提升静态资源加载速度
4. **设置负载均衡**（如需要水平扩展）
5. **实施额外安全措施**（如WAF）

---

**部署完成！您的应用现在已经具备完整的生产级功能，包括用户认证、支付处理、管理员功能和自动化监控。** 🚀