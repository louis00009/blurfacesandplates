#!/bin/bash

# Initial Server Setup Script for Mosaic Blur App
# This script sets up a fresh Ubuntu server for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run this script as root (use sudo)"
    exit 1
fi

log "Starting Ubuntu server setup for Mosaic Blur App..."

# Update system packages
log "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common build-essential

# Install Node.js 18.x LTS
log "Installing Node.js 18.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log "Node.js version: $NODE_VERSION"
log "NPM version: $NPM_VERSION"

# Install PM2 globally
log "Installing PM2..."
npm install -g pm2

# Install PostgreSQL
log "Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

log "Configuring PostgreSQL..."

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE image_anonymizer;"
sudo -u postgres psql -c "CREATE USER app_user WITH PASSWORD 'secure_password_123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE image_anonymizer TO app_user;"

# Configure PostgreSQL for remote connections (if needed)
PG_VERSION=$(sudo -u postgres psql -c "SELECT version();" | grep -oP "PostgreSQL \K[0-9]+")
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"

# Update postgresql.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONFIG_DIR/postgresql.conf"

# Update pg_hba.conf for local connections
echo "local   all             app_user                                md5" >> "$PG_CONFIG_DIR/pg_hba.conf"

# Restart PostgreSQL
systemctl restart postgresql

# Install Redis
log "Installing Redis..."
apt install -y redis-server

# Configure Redis
log "Configuring Redis..."
sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

# Start and enable Redis
systemctl start redis-server
systemctl enable redis-server

# Test Redis
redis-cli ping

# Install Nginx
log "Installing Nginx..."
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Configure firewall
log "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Install Certbot for SSL
log "Installing Certbot for SSL certificates..."
apt install -y certbot python3-certbot-nginx

# Create application directories
log "Creating application directories..."
mkdir -p /var/www/mosaic-blur-app
mkdir -p /var/www/mosaic-blur-app/backend
mkdir -p /var/www/mosaic-blur-app/uploads
mkdir -p /var/log/mosaic-blur-app
mkdir -p /backups/mosaic-blur-app

# Set proper permissions
chown -R www-data:www-data /var/www/mosaic-blur-app
chmod -R 755 /var/www/mosaic-blur-app
chmod -R 775 /var/www/mosaic-blur-app/uploads

# Create log directory permissions
chown -R www-data:www-data /var/log/mosaic-blur-app
chmod -R 755 /var/log/mosaic-blur-app

# Create backup directory
chown -R www-data:www-data /backups/mosaic-blur-app
chmod -R 755 /backups/mosaic-blur-app

# Install additional tools
log "Installing additional tools..."
apt install -y htop iotop nethogs ncdu jq tree

# Install monitoring tools
log "Installing monitoring tools..."
apt install -y fail2ban logrotate

# Configure fail2ban
log "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
backend = systemd

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Configure logrotate for application logs
log "Configuring log rotation..."
cat > /etc/logrotate.d/mosaic-blur-app << EOF
/var/log/mosaic-blur-app/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs > /dev/null 2>&1 || true
    endscript
}
EOF

# Create environment template
log "Creating environment template..."
cat > /var/www/mosaic-blur-app/backend/.env.example << EOF
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
FRONTEND_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://app_user:secure_password_123@localhost:5432/image_anonymizer
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secure-jwt-secret-32-chars-minimum-change-this
JWT_EXPIRE=24h
REFRESH_TOKEN_SECRET=your-refresh-token-secret-32-chars-change-this

# Payment Systems
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxx

PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_MODE=live

# Email Service
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=AI Image Anonymizer

# Security
ENCRYPTION_KEY=your-32-byte-encryption-key-change-this-in-production
ADMIN_ACCESS_CODE=your-secure-admin-code-change-this
BCRYPT_ROUNDS=12

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_PATH=/var/www/mosaic-blur-app/uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,image/webp

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/mosaic-blur-app
EOF

# Create backup script
log "Creating backup script..."
cat > /usr/local/bin/backup-mosaic-app.sh << 'EOF'
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
cp /var/www/mosaic-blur-app/backend/.env.production $BACKUP_DIR/env_backup_$DATE 2>/dev/null || true

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "env_backup_*" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/backup-mosaic-app.sh

# Add backup to crontab
log "Setting up automated backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-mosaic-app.sh") | crontab -

# Create system monitoring script
log "Creating system monitoring script..."
cat > /usr/local/bin/monitor-mosaic-app.sh << 'EOF'
#!/bin/bash

# Check if PM2 process is running
if ! pm2 jlist | jq -e '.[] | select(.name=="mosaic-blur-backend" and .pm2_env.status=="online")' > /dev/null; then
    echo "Backend service is down, attempting restart..."
    pm2 restart mosaic-blur-backend
    
    # Send alert if webhook URL is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🚨 Mosaic Blur App backend was down and has been restarted"}' \
            "$SLACK_WEBHOOK_URL"
    fi
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "Disk usage is high: ${DISK_USAGE}%"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"⚠️ Disk usage is high: ${DISK_USAGE}%\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 85 ]; then
    echo "Memory usage is high: ${MEMORY_USAGE}%"
fi
EOF

chmod +x /usr/local/bin/monitor-mosaic-app.sh

# Add monitoring to crontab (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-mosaic-app.sh") | crontab -

# Install additional security tools
log "Installing additional security tools..."
apt install -y unattended-upgrades apt-listchanges

# Configure automatic security updates
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades
echo 'Unattended-Upgrade::Remove-Unused-Dependencies "true";' >> /etc/apt/apt.conf.d/50unattended-upgrades
echo 'Unattended-Upgrade::Mail "root";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Enable automatic updates
echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades

# Configure SSH security
log "Configuring SSH security..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# SSH hardening
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
echo 'AllowUsers deploy' >> /etc/ssh/sshd_config

# Restart SSH
systemctl restart sshd

# Create deploy user
log "Creating deploy user..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG sudo deploy
    
    # Create SSH directory for deploy user
    mkdir -p /home/deploy/.ssh
    chown deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    
    # Allow deploy user to restart services without password
    echo 'deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx, /bin/systemctl reload nginx, /usr/bin/pm2' >> /etc/sudoers.d/deploy
fi

# Set up PM2 startup for deploy user
log "Configuring PM2 startup..."
sudo -u deploy pm2 startup systemd -u deploy --hp /home/deploy

# Create deployment webhook endpoint (optional)
log "Creating deployment webhook script..."
cat > /usr/local/bin/deploy-webhook.sh << 'EOF'
#!/bin/bash

# Simple webhook handler for GitHub deployments
# Usage: curl -X POST http://your-server:8080/deploy

cd /var/www/mosaic-blur-app
sudo -u deploy git pull origin main
sudo -u deploy ./backend/scripts/deploy.sh production
EOF

chmod +x /usr/local/bin/deploy-webhook.sh

# Final system optimization
log "Applying system optimizations..."

# Increase file limits
echo 'fs.file-max = 65536' >> /etc/sysctl.conf
echo '* soft nofile 65536' >> /etc/security/limits.conf
echo '* hard nofile 65536' >> /etc/security/limits.conf

# Optimize network settings
echo 'net.core.somaxconn = 65536' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65536' >> /etc/sysctl.conf

# Apply sysctl changes
sysctl -p

# Create status script
log "Creating status script..."
cat > /usr/local/bin/app-status.sh << 'EOF'
#!/bin/bash

echo "=== Mosaic Blur App Status ==="
echo "Date: $(date)"
echo ""

echo "=== System Info ==="
echo "Uptime: $(uptime)"
echo "Load: $(cat /proc/loadavg)"
echo "Memory: $(free -h | grep Mem)"
echo "Disk: $(df -h / | tail -1)"
echo ""

echo "=== Services Status ==="
echo "Nginx: $(systemctl is-active nginx)"
echo "PostgreSQL: $(systemctl is-active postgresql)"
echo "Redis: $(systemctl is-active redis-server)"
echo "PM2: $(sudo -u deploy pm2 jlist | jq -r '.[] | select(.name=="mosaic-blur-backend") | .pm2_env.status')"
echo ""

echo "=== Application Health ==="
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/health" || echo "000")
echo "Backend Health: HTTP $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Application is healthy"
else
    echo "❌ Application health check failed"
fi

echo ""
echo "=== Recent Logs ==="
echo "Backend logs (last 5 lines):"
sudo -u deploy pm2 logs mosaic-blur-backend --lines 5 --nostream 2>/dev/null || echo "No PM2 logs available"
EOF

chmod +x /usr/local/bin/app-status.sh

# Print setup summary
log "Setup completed successfully!"
echo ""
echo "=== Setup Summary ==="
echo "✅ Node.js: $(node --version)"
echo "✅ PM2: $(pm2 --version)"
echo "✅ PostgreSQL: $(sudo -u postgres psql -c 'SELECT version();' | head -1)"
echo "✅ Redis: $(redis-cli --version)"
echo "✅ Nginx: $(nginx -v 2>&1)"
echo "✅ Application directories created"
echo "✅ Security configured (fail2ban, firewall, SSH hardening)"
echo "✅ Automated backups configured"
echo "✅ System monitoring configured"
echo ""

echo "=== Next Steps ==="
echo "1. Clone your repository to /var/www/mosaic-blur-app"
echo "2. Copy .env.example to .env.production and configure"
echo "3. Run database migrations"
echo "4. Configure SSL certificate with: certbot --nginx -d your-domain.com"
echo "5. Deploy the application with: ./backend/scripts/deploy.sh"
echo ""

echo "=== Useful Commands ==="
echo "Check status: /usr/local/bin/app-status.sh"
echo "View logs: pm2 logs"
echo "Monitor system: htop"
echo "Check services: systemctl status nginx postgresql redis-server"
echo ""

warn "Don't forget to:"
warn "1. Configure your domain name in Nginx and environment files"
warn "2. Set up your payment processor API keys"
warn "3. Configure email service (SendGrid)"
warn "4. Set strong passwords for database and admin access"
warn "5. Configure SSL certificates"

log "Server setup completed! 🎉"