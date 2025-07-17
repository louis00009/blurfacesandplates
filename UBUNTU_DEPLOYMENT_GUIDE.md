# Ubuntu Cloud Server Deployment Guide
## AI Image Anonymizer (Mosaic Blur App)

This guide covers deploying the React-based AI image anonymizer application to an Ubuntu cloud server.

## 📋 Prerequisites

- Ubuntu 20.04+ cloud server (minimum 2GB RAM, 2 CPU cores)
- Domain name (optional but recommended)
- Root or sudo access

## 🛠️ Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # For development mode
```

### 2. Install Node.js 18+ (Required by package.json)

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.x or higher
npm --version
```

### 3. Install PostgreSQL (Required for backend)

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configure PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE image_anonymizer;"
sudo -u postgres psql -c "CREATE USER app_user WITH PASSWORD 'secure_password_123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE image_anonymizer TO app_user;"

# Initialize database schema
sudo -u postgres psql -d image_anonymizer -f /path/to/database_schema.sql
```

### 4. Install Redis (For rate limiting and sessions)

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping  # Should return PONG
```

### 5. Install Nginx (Reverse proxy and static file serving)

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🚀 Application Deployment

### 1. Clone and Prepare Application

```bash
# Create application directory
sudo mkdir -p /var/www/mosaic-blur-app
sudo chown $USER:$USER /var/www/mosaic-blur-app

# Clone repository
cd /var/www/mosaic-blur-app
git clone https://github.com/yourusername/mosaic-blur-app.git .

# Install dependencies
npm install

# Build the application
npm run build
```

### 2. Environment Configuration

Create production environment file:

```bash
# Create production environment file
sudo nano /var/www/mosaic-blur-app/.env.production
```

Add the following configuration:

```env
# React App Configuration
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false

# Backend Configuration (if implementing backend)
DATABASE_URL=postgresql://app_user:secure_password_123@localhost:5432/image_anonymizer
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRE=24h
ENCRYPTION_KEY=your-32-byte-encryption-key-for-api-keys-change-this

# API Keys (Add your actual API keys)
REACT_APP_PLATERECOGNIZER_API_KEY=your_platerecognizer_key
REACT_APP_OPENALPR_API_KEY=your_openalpr_key
REACT_APP_GOOGLE_VISION_API_KEY=your_google_vision_key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# File Upload
MAX_FILE_SIZE=52428800  # 50MB
UPLOAD_PATH=/var/www/mosaic-blur-app/uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Admin Access
ADMIN_ACCESS_CODE=your-secure-admin-code-change-this
ADMIN_JWT_SECRET=separate-admin-jwt-secret-change-this
```

### 3. Create Upload Directory

```bash
# Create upload directory with proper permissions
mkdir -p /var/www/mosaic-blur-app/uploads
sudo chown www-data:www-data /var/www/mosaic-blur-app/uploads
sudo chmod 755 /var/www/mosaic-blur-app/uploads
```

### 4. Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/mosaic-blur-app
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Root directory
    root /var/www/mosaic-blur-app/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API routes (if implementing backend)
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
    }

    # Static assets caching
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Models directory (AI models)
    location /models/ {
        expires 1d;
        add_header Cache-Control "public";
    }

    # File upload handling
    location /uploads/ {
        alias /var/www/mosaic-blur-app/uploads/;
        expires 1h;
    }

    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|env\.production|env\.local)$ {
        deny all;
    }

    # File size limits
    client_max_body_size 50M;
}
```

Enable the site:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/mosaic-blur-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔄 Process Management with PM2

### 1. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2
```

### 2. Create Process Configuration

Create PM2 ecosystem file:

```bash
nano /var/www/mosaic-blur-app/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'mosaic-blur-frontend',
      script: 'serve',
      args: '-s build -l 3000',
      cwd: '/var/www/mosaic-blur-app',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
    // Add backend configuration if implementing separate backend
    // {
    //   name: 'mosaic-blur-backend',
    //   script: 'dist/app.js',
    //   cwd: '/var/www/mosaic-blur-app/backend',
    //   env: {
    //     NODE_ENV: 'production',
    //     PORT: 5000
    //   },
    //   instances: 2,
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: '500M'
    // }
  ]
};
```

### 3. Start Application

```bash
# Install serve package for serving static files
npm install -g serve

# Start with PM2
cd /var/www/mosaic-blur-app
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the command

# Check application status
pm2 status
pm2 logs
```

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check firewall status
sudo ufw status verbose
```

### 2. File Permissions

```bash
# Set proper file permissions
sudo chown -R www-data:www-data /var/www/mosaic-blur-app/build
sudo chmod -R 755 /var/www/mosaic-blur-app/build
sudo chmod -R 755 /var/www/mosaic-blur-app/uploads

# Secure environment files
sudo chmod 600 /var/www/mosaic-blur-app/.env.production
```

### 3. Database Security

```bash
# Secure PostgreSQL installation
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'new_secure_postgres_password';"

# Configure PostgreSQL authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Change 'peer' to 'md5' for local connections

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 📊 Monitoring and Maintenance

### 1. Log Management

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/mosaic-blur-app
```

Add:
```
/var/www/mosaic-blur-app/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Backup Script

Create backup script:

```bash
sudo nano /usr/local/bin/backup-app.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/mosaic-blur-app"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump image_anonymizer > $BACKUP_DIR/db_backup_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz /var/www/mosaic-blur-app/uploads

# Backup configuration
cp /var/www/mosaic-blur-app/.env.production $BACKUP_DIR/env_backup_$DATE

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and schedule:

```bash
sudo chmod +x /usr/local/bin/backup-app.sh

# Add to crontab (daily backup at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-app.sh
```

## 🚀 Deployment Script

Create automated deployment script:

```bash
nano /var/www/mosaic-blur-app/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest changes
git pull origin main

# Install/update dependencies
npm ci

# Build application
npm run build

# Restart PM2 processes
pm2 restart ecosystem.config.js

# Reload Nginx
sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
```

Make executable:

```bash
chmod +x /var/www/mosaic-blur-app/deploy.sh
```

## 🔧 Troubleshooting

### Common Issues

1. **Permission denied errors:**
   ```bash
   sudo chown -R www-data:www-data /var/www/mosaic-blur-app
   sudo chmod -R 755 /var/www/mosaic-blur-app
   ```

2. **PM2 not starting:**
   ```bash
   pm2 kill
   pm2 start ecosystem.config.js
   ```

3. **Database connection issues:**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "\l"  # List databases
   ```

4. **Nginx 502 errors:**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   pm2 status
   ```

### Monitoring Commands

```bash
# Check application status
pm2 status
pm2 logs

# Check system resources
htop
df -h
free -h

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check application logs
pm2 logs mosaic-blur-frontend
```

## 📞 Admin Access

After deployment, access the admin panel:

1. Navigate to: `https://your-domain.com/admin`
2. Use admin credentials:
   - Email: `admin@example.com`
   - Password: `admin123` (change immediately)
   - Admin Code: Value from `.env.production`

## 🎯 Performance Optimization

1. **Enable Gzip compression** (already configured in Nginx)
2. **Configure caching headers** (already configured)
3. **Optimize images** before deployment
4. **Monitor resource usage** with `htop` and `pm2 monit`
5. **Set up CDN** for static assets (optional)

Your AI Image Anonymizer application is now deployed and ready for production use on Ubuntu cloud server!