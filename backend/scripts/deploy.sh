#!/bin/bash

# Production Deployment Script for Mosaic Blur App Backend
# Usage: ./deploy.sh [environment]

set -e  # Exit on any error

# Configuration
ENVIRONMENTS=("production" "staging")
DEFAULT_ENV="production"
ENVIRONMENT=${1:-$DEFAULT_ENV}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check if environment is valid
if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    error "Invalid environment: $ENVIRONMENT"
    echo "Valid environments: ${ENVIRONMENTS[*]}"
    exit 1
fi

log "Starting deployment to $ENVIRONMENT environment..."

# Load environment-specific configuration
case $ENVIRONMENT in
    "production")
        APP_PATH="/var/www/mosaic-blur-app"
        BACKEND_PATH="$APP_PATH/backend"
        FRONTEND_PATH="$APP_PATH"
        NGINX_CONFIG="/etc/nginx/sites-available/mosaic-blur-app"
        PM2_ENV="production"
        ;;
    "staging")
        APP_PATH="/var/www/mosaic-blur-app-staging"
        BACKEND_PATH="$APP_PATH/backend"
        FRONTEND_PATH="$APP_PATH"
        NGINX_CONFIG="/etc/nginx/sites-available/mosaic-blur-app-staging"
        PM2_ENV="staging"
        ;;
esac

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check if directories exist
if [ ! -d "$APP_PATH" ]; then
    error "Application directory does not exist: $APP_PATH"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_PATH" ]; then
    error "Backend directory does not exist: $BACKEND_PATH"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    error "PM2 is not installed"
    exit 1
fi

# Check if Node.js is the correct version
NODE_VERSION=$(node --version)
REQUIRED_VERSION="v18"
if [[ ! $NODE_VERSION == $REQUIRED_VERSION* ]]; then
    warn "Node.js version might not be compatible. Current: $NODE_VERSION, Required: $REQUIRED_VERSION+"
fi

# Check if environment file exists
ENV_FILE="$BACKEND_PATH/.env.$ENVIRONMENT"
if [ ! -f "$ENV_FILE" ]; then
    error "Environment file does not exist: $ENV_FILE"
    exit 1
fi

log "Pre-deployment checks passed!"

# Backup current deployment
log "Creating backup of current deployment..."
BACKUP_DIR="/backups/mosaic-blur-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# Backup database
log "Backing up database..."
sudo -u postgres pg_dump mosaic_blur_db > "$BACKUP_PATH.sql"

# Backup current code (if exists)
if [ -d "$BACKEND_PATH" ]; then
    tar -czf "$BACKUP_PATH.tar.gz" -C "$APP_PATH" . 2>/dev/null || true
fi

log "Backup created at $BACKUP_PATH"

# Git operations
log "Updating code from repository..."
cd "$APP_PATH"

# Check git status
if [ -d ".git" ]; then
    # Stash any local changes
    git stash push -m "Auto-stash before deployment $TIMESTAMP" || true
    
    # Fetch latest changes
    git fetch origin
    
    # Checkout and pull the appropriate branch
    if [ "$ENVIRONMENT" = "production" ]; then
        git checkout main
        git pull origin main
    else
        git checkout develop
        git pull origin develop
    fi
else
    error "Not a git repository. Please ensure the application is cloned from git."
    exit 1
fi

# Backend deployment
log "Deploying backend..."
cd "$BACKEND_PATH"

# Install/update dependencies
log "Installing backend dependencies..."
npm ci --production

# Run database migrations
log "Running database migrations..."
if [ -f "scripts/migrate.js" ]; then
    node scripts/migrate.js
else
    warn "No migration script found"
fi

# Check backend configuration
log "Validating backend configuration..."
if [ -f "scripts/validate-config.js" ]; then
    node scripts/validate-config.js
fi

# Frontend deployment
log "Deploying frontend..."
cd "$FRONTEND_PATH"

# Install frontend dependencies
log "Installing frontend dependencies..."
npm ci

# Build frontend
log "Building frontend..."
npm run build

# Validate build
if [ ! -d "build" ]; then
    error "Frontend build failed - build directory not found"
    exit 1
fi

# Test backend startup
log "Testing backend startup..."
cd "$BACKEND_PATH"

# Stop PM2 if running
pm2 stop mosaic-blur-backend 2>/dev/null || true

# Test startup
timeout 30s node app.js &
TEST_PID=$!
sleep 5

# Check if the process is still running
if ! kill -0 $TEST_PID 2>/dev/null; then
    error "Backend failed to start properly"
    exit 1
fi

# Kill test process
kill $TEST_PID 2>/dev/null || true
wait $TEST_PID 2>/dev/null || true

log "Backend startup test passed!"

# Update Nginx configuration if changed
log "Updating Nginx configuration..."
if [ -f "$APP_PATH/nginx.conf" ] && [ -f "$NGINX_CONFIG" ]; then
    if ! cmp -s "$APP_PATH/nginx.conf" "$NGINX_CONFIG"; then
        warn "Nginx configuration has changed"
        sudo cp "$APP_PATH/nginx.conf" "$NGINX_CONFIG"
        sudo nginx -t
        if [ $? -eq 0 ]; then
            log "Nginx configuration updated and validated"
        else
            error "Nginx configuration validation failed"
            exit 1
        fi
    fi
fi

# Deploy with PM2
log "Starting services with PM2..."
cd "$BACKEND_PATH"

# Start/restart backend with PM2
pm2 start ecosystem.config.js --env $PM2_ENV 2>/dev/null || pm2 reload ecosystem.config.js --env $PM2_ENV

# Save PM2 configuration
pm2 save

# Wait for services to start
log "Waiting for services to start..."
sleep 10

# Health checks
log "Running health checks..."

# Check PM2 status
PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="mosaic-blur-backend") | .pm2_env.status')
if [ "$PM2_STATUS" != "online" ]; then
    error "Backend service is not online. Status: $PM2_STATUS"
    pm2 logs mosaic-blur-backend --lines 20
    exit 1
fi

# Check HTTP health endpoint
HEALTH_URL="http://localhost:5000/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HTTP_STATUS" != "200" ]; then
    error "Health check failed. HTTP Status: $HTTP_STATUS"
    pm2 logs mosaic-blur-backend --lines 20
    exit 1
fi

log "Health checks passed!"

# Reload Nginx if configuration changed
if [ -f "$APP_PATH/nginx.conf" ] && [ -f "$NGINX_CONFIG" ]; then
    if ! cmp -s "$APP_PATH/nginx.conf" "$NGINX_CONFIG"; then
        log "Reloading Nginx..."
        sudo systemctl reload nginx
    fi
fi

# Clean up old backups (keep last 10)
log "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
ls -t backup_*.sql 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

# Final verification
log "Running final verification..."

# Check if frontend is accessible
if command -v curl &> /dev/null; then
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/health" || echo "000")
    if [ "$FRONTEND_STATUS" = "200" ]; then
        log "Frontend is accessible"
    else
        warn "Frontend health check returned status: $FRONTEND_STATUS"
    fi
fi

# Show deployment summary
log "Deployment Summary:"
echo "===================="
echo "Environment: $ENVIRONMENT"
echo "Backend Status: $(pm2 jlist | jq -r '.[] | select(.name=="mosaic-blur-backend") | .pm2_env.status')"
echo "Backend Memory: $(pm2 jlist | jq -r '.[] | select(.name=="mosaic-blur-backend") | .monit.memory' | numfmt --to=iec)"
echo "Backend CPU: $(pm2 jlist | jq -r '.[] | select(.name=="mosaic-blur-backend") | .monit.cpu')%"
echo "Uptime: $(pm2 jlist | jq -r '.[] | select(.name=="mosaic-blur-backend") | .pm2_env.pm_uptime' | xargs -I {} date -d @{} +%Y-%m-%d\ %H:%M:%S)"
echo "Git Commit: $(git rev-parse --short HEAD)"
echo "Deployed At: $(date +'%Y-%m-%d %H:%M:%S')"
echo "===================="

# Send notification (if configured)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    COMMIT_MSG=$(git log -1 --pretty=%B)
    COMMIT_HASH=$(git rev-parse --short HEAD)
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{
            \"text\":\"🚀 Deployment completed successfully!\",
            \"attachments\":[{
                \"color\":\"good\",
                \"fields\":[
                    {\"title\":\"Environment\",\"value\":\"$ENVIRONMENT\",\"short\":true},
                    {\"title\":\"Commit\",\"value\":\"$COMMIT_HASH\",\"short\":true},
                    {\"title\":\"Message\",\"value\":\"$COMMIT_MSG\",\"short\":false}
                ]
            }]
        }" \
        "$SLACK_WEBHOOK_URL" || true
fi

log "🎉 Deployment to $ENVIRONMENT completed successfully!"

# Show useful commands
info "Useful commands:"
echo "  View logs: pm2 logs mosaic-blur-backend"
echo "  Monitor: pm2 monit"
echo "  Restart: pm2 restart mosaic-blur-backend"
echo "  Status: pm2 status"