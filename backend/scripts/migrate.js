const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of executed migrations
    const executedResult = await client.query(
      'SELECT filename FROM migrations ORDER BY executed_at'
    );
    
    const executedMigrations = new Set(
      executedResult.rows.map(row => row.filename)
    );
    
    // Read migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    
    try {
      await fs.access(migrationsDir);
    } catch (error) {
      console.log('📁 Creating migrations directory...');
      await fs.mkdir(migrationsDir, { recursive: true });
      
      // Create initial migration file
      const initialMigration = `-- Initial database schema
-- This migration creates the complete database schema for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    
    -- Authentication
    google_id VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    
    -- Membership
    membership_level VARCHAR(20) DEFAULT 'free' CHECK (membership_level IN ('free', 'premium', 'enterprise')),
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'expired', 'cancelled')),
    membership_expires_at TIMESTAMP,
    
    -- Usage Tracking
    usage_limit INTEGER DEFAULT 50,
    usage_count INTEGER DEFAULT 0,
    usage_reset_date DATE DEFAULT CURRENT_DATE,
    
    -- Access Control
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);

-- =====================================================
-- 2. API PROVIDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_url VARCHAR(500) NOT NULL,
    
    -- Service Configuration
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('license_plate', 'face_detection', 'ocr')),
    max_requests_per_minute INTEGER DEFAULT 60,
    max_requests_per_month INTEGER,
    
    -- Pricing
    cost_per_request DECIMAL(10, 6) DEFAULT 0.00,
    free_tier_limit INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    requires_api_key BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. API KEYS TABLE (ENCRYPTED)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES api_providers(id) ON DELETE CASCADE,
    
    -- Key Management
    key_name VARCHAR(100) NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    key_hash VARCHAR(64) NOT NULL,
    
    -- Configuration
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Usage Limits
    custom_rate_limit INTEGER,
    custom_monthly_limit INTEGER,
    
    -- Monitoring
    last_used_at TIMESTAMP,
    error_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, provider_id, key_name),
    CHECK (priority >= 1 AND priority <= 10)
);

-- =====================================================
-- 4. SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_aud DECIMAL(10, 2) NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    currency_default VARCHAR(3) DEFAULT 'AUD',
    duration_months INTEGER,
    is_lifetime BOOLEAN DEFAULT FALSE,
    device_limit INTEGER NOT NULL,
    usage_limit INTEGER NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    removes_branding BOOLEAN DEFAULT FALSE,
    money_back_guarantee_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. USER SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'refunded')),
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    amount_paid_aud DECIMAL(10, 2) NOT NULL,
    amount_paid_usd DECIMAL(10, 2),
    currency_paid VARCHAR(3) NOT NULL,
    payment_id VARCHAR(255),
    auto_renew BOOLEAN DEFAULT FALSE,
    device_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    provider_id UUID NOT NULL REFERENCES api_providers(id),
    external_payment_id VARCHAR(255) NOT NULL,
    payment_intent_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    amount_refunded DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),
    payment_method VARCHAR(50),
    payment_method_details JSONB,
    processor_fee_cents INTEGER DEFAULT 0,
    net_amount DECIMAL(10, 2),
    failure_code VARCHAR(100),
    failure_message TEXT,
    receipt_email VARCHAR(255),
    receipt_url TEXT,
    invoice_pdf_url TEXT,
    risk_score INTEGER,
    risk_level VARCHAR(20),
    description TEXT,
    metadata JSONB,
    processed_at TIMESTAMP,
    failed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. COUPON CODES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount_amount DECIMAL(10, 2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    user_usage_limit INTEGER DEFAULT 1,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP,
    applicable_plans JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. API USAGE LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    provider_id UUID NOT NULL REFERENCES api_providers(id) ON DELETE CASCADE,
    request_method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    request_size INTEGER,
    response_size INTEGER,
    response_time_ms INTEGER,
    status_code INTEGER NOT NULL,
    detection_type VARCHAR(50),
    objects_detected INTEGER DEFAULT 0,
    confidence_score DECIMAL(5, 4),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    user_agent TEXT,
    ip_address INET,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 9. USER SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 11. SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'integer', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- 12. USER PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 13. USER NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_membership ON users(membership_level, subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_usage_reset ON users(usage_reset_date);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_priority ON api_keys(user_id, priority);

CREATE INDEX IF NOT EXISTS idx_usage_user_date ON api_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_provider_date ON api_usage_logs(provider_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_status ON api_usage_logs(status_code);

CREATE INDEX IF NOT EXISTS idx_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_session_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_payment_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON user_notifications(user_id, is_read);
`;
      
      await fs.writeFile(
        path.join(migrationsDir, '001_initial_schema.sql'),
        initialMigration
      );
      
      console.log('✅ Created initial migration file');
    }
    
    // Get migration files
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📋 Found ${migrationFiles.length} migration files`);
    
    let executed = 0;
    
    for (const file of migrationFiles) {
      if (executedMigrations.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }
      
      console.log(`🔄 Executing migration: ${file}`);
      
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      
      try {
        // Begin transaction
        await client.query('BEGIN');
        
        // Execute migration
        await client.query(migrationSQL);
        
        // Record migration as executed
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [file]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`✅ Migration ${file} executed successfully`);
        executed++;
        
      } catch (error) {
        // Rollback transaction
        await client.query('ROLLBACK');
        console.error(`❌ Migration ${file} failed:`, error.message);
        throw error;
      }
    }
    
    if (executed === 0) {
      console.log('✅ No new migrations to execute');
    } else {
      console.log(`✅ Successfully executed ${executed} migrations`);
    }
    
    // Seed initial data
    await seedInitialData(client);
    
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedInitialData(client) {
  console.log('🌱 Seeding initial data...');
  
  try {
    // Check if data already exists
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('⏭️  Data already exists, skipping seed');
      return;
    }
    
    // Insert default API providers
    await client.query(`
      INSERT INTO api_providers (name, display_name, description, base_url, service_type, max_requests_per_minute, max_requests_per_month, free_tier_limit) VALUES
      ('platerecognizer', 'Plate Recognizer', 'Professional license plate recognition API', 'https://api.platerecognizer.com', 'license_plate', 60, 2500, 1000),
      ('openalpr', 'OpenALPR', 'Open source license plate recognition', 'https://api.openalpr.com', 'license_plate', 30, 1000, 1000),
      ('google_vision', 'Google Cloud Vision', 'Google Cloud Vision API for text detection', 'https://vision.googleapis.com', 'license_plate', 600, 5000, 1000),
      ('stripe', 'Stripe', 'Stripe payment processor', 'https://api.stripe.com', 'license_plate', 100, 10000, 0),
      ('paypal', 'PayPal', 'PayPal payment processor', 'https://api.paypal.com', 'license_plate', 100, 10000, 0)
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Insert default subscription plans
    await client.query(`
      INSERT INTO subscription_plans (plan_code, name, description, price_aud, price_usd, device_limit, usage_limit, features, is_active, is_featured, sort_order) VALUES
      ('free', 'Free Plan', 'Basic image processing with limited usage', 0.00, 0.00, 1, 50, '["Face detection", "Basic license plate detection", "Standard image formats"]', true, false, 1),
      ('premium', 'Premium Plan', 'Advanced features with higher usage limits', 9.99, 7.99, 3, 1000, '["Advanced face detection", "Enhanced license plate recognition", "Priority processing", "Email support"]', true, true, 2),
      ('enterprise', 'Enterprise Plan', 'Full features with unlimited usage', 29.99, 24.99, 10, 10000, '["All premium features", "API access", "Custom integrations", "Priority support", "Advanced analytics"]', true, false, 3)
      ON CONFLICT (plan_code) DO NOTHING
    `);
    
    // Insert system settings
    await client.query(`
      INSERT INTO system_settings (key, value, data_type, description, is_public, category) VALUES
      ('max_file_size_mb', '50', 'integer', 'Maximum file size for uploads in MB', true, 'upload'),
      ('allowed_file_types', '["image/jpeg", "image/png", "image/jpg", "image/webp"]', 'json', 'Allowed file types for upload', true, 'upload'),
      ('default_usage_limit_free', '50', 'integer', 'Default monthly usage limit for free users', false, 'limits'),
      ('default_usage_limit_premium', '1000', 'integer', 'Default monthly usage limit for premium users', false, 'limits'),
      ('default_usage_limit_enterprise', '10000', 'integer', 'Default monthly usage limit for enterprise users', false, 'limits'),
      ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false, 'system'),
      ('registration_enabled', 'true', 'boolean', 'Allow new user registration', false, 'auth'),
      ('google_oauth_enabled', 'true', 'boolean', 'Enable Google OAuth login', false, 'auth')
      ON CONFLICT (key) DO NOTHING
    `);
    
    // Create default admin user (password: 'admin123' - should be changed immediately)
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 12);
    
    await client.query(`
      INSERT INTO users (email, password_hash, name, role, membership_level, usage_limit, email_verified) VALUES
      ('admin@example.com', $1, 'System Administrator', 'super_admin', 'enterprise', 999999, true)
      ON CONFLICT (email) DO NOTHING
    `, [adminPassword]);
    
    console.log('✅ Initial data seeded successfully');
    console.log('⚠️  Default admin credentials: admin@example.com / admin123 (CHANGE IMMEDIATELY)');
    
  } catch (error) {
    console.error('❌ Error seeding initial data:', error.message);
    throw error;
  }
}

// Trigger functions
async function createTriggerFunctions(client) {
  console.log('🔧 Creating trigger functions...');
  
  await client.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = CURRENT_TIMESTAMP;
       RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
  
  // Apply triggers to tables with updated_at
  const tablesWithUpdatedAt = [
    'users', 
    'api_providers', 
    'api_keys', 
    'subscription_plans',
    'user_subscriptions',
    'coupon_codes',
    'system_settings',
    'user_preferences'
  ];
  
  for (const table of tablesWithUpdatedAt) {
    await client.query(`
      DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
      CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table} 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }
  
  console.log('✅ Trigger functions created');
}

// Usage tracking functions
async function createUsageFunctions(client) {
  console.log('📊 Creating usage tracking functions...');
  
  await client.query(`
    CREATE OR REPLACE FUNCTION reset_monthly_usage()
    RETURNS void AS $$
    BEGIN
        UPDATE users 
        SET usage_count = 0, 
            usage_reset_date = CURRENT_DATE
        WHERE usage_reset_date < CURRENT_DATE - INTERVAL '1 month';
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  await client.query(`
    CREATE OR REPLACE FUNCTION increment_user_usage(user_uuid UUID)
    RETURNS boolean AS $$
    DECLARE
        current_usage INTEGER;
        usage_limit_val INTEGER;
    BEGIN
        SELECT usage_count, usage_limit INTO current_usage, usage_limit_val
        FROM users WHERE id = user_uuid;
        
        IF current_usage >= usage_limit_val THEN
            RETURN FALSE;
        END IF;
        
        UPDATE users 
        SET usage_count = usage_count + 1,
            last_login_at = CURRENT_TIMESTAMP
        WHERE id = user_uuid;
        
        RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  console.log('✅ Usage tracking functions created');
}

// Main execution
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Database migrations completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };