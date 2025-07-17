-- =====================================================
-- AI Image Anonymizer Database Schema
-- PostgreSQL Database Structure
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth users
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
    
    -- Indexes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- 2. API PROVIDERS TABLE
-- =====================================================
CREATE TABLE api_providers (
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
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES api_providers(id) ON DELETE CASCADE,
    
    -- Key Management
    key_name VARCHAR(100) NOT NULL,
    encrypted_api_key TEXT NOT NULL, -- Encrypted using AES-256
    key_hash VARCHAR(64) NOT NULL,   -- SHA-256 hash for verification
    
    -- Configuration
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Usage Limits (override provider defaults)
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
-- 4. API USAGE LOGS TABLE
-- =====================================================
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    provider_id UUID NOT NULL REFERENCES api_providers(id) ON DELETE CASCADE,
    
    -- Request Details
    request_method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    request_size INTEGER, -- in bytes
    response_size INTEGER, -- in bytes
    
    -- Performance
    response_time_ms INTEGER,
    status_code INTEGER NOT NULL,
    
    -- Business Logic
    detection_type VARCHAR(50), -- 'face', 'license_plate', 'ocr'
    objects_detected INTEGER DEFAULT 0,
    confidence_score DECIMAL(5, 4), -- 0.0000 to 1.0000
    
    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Costs
    cost_cents INTEGER DEFAULT 0, -- cost in cents
    
    -- Metadata
    user_agent TEXT,
    ip_address INET,
    session_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_usage_user_date (user_id, created_at),
    INDEX idx_usage_provider_date (provider_id, created_at),
    INDEX idx_usage_status (status_code),
    INDEX idx_usage_detection_type (detection_type)
);

-- =====================================================
-- 5. USER SESSIONS TABLE
-- =====================================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session Data
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_session_token (session_token),
    INDEX idx_session_user (user_id),
    INDEX idx_session_expires (expires_at)
);

-- =====================================================
-- 6. ADMIN AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action Details
    action VARCHAR(100) NOT NULL, -- 'api_key_created', 'user_updated', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'api_key', 'user', 'system'
    resource_id UUID,
    
    -- Change Details
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    
    -- Metadata
    description TEXT,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_date (created_at),
    INDEX idx_audit_resource (resource_type, resource_id)
);

-- =====================================================
-- 7. SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'integer', 'boolean', 'json')),
    
    -- Metadata
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by non-admin users
    category VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- 8. IMAGE PROCESSING JOBS TABLE
-- =====================================================
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Job Details
    original_filename VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash VARCHAR(64) NOT NULL, -- SHA-256 for deduplication
    mime_type VARCHAR(100) NOT NULL,
    
    -- Processing Settings
    settings JSONB NOT NULL, -- Store processing configuration
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Results
    faces_detected INTEGER DEFAULT 0,
    plates_detected INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    
    -- Storage
    original_file_path TEXT,
    processed_file_path TEXT,
    
    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Costs
    total_cost_cents INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Indexes
    INDEX idx_jobs_user (user_id),
    INDEX idx_jobs_status (status),
    INDEX idx_jobs_date (created_at),
    INDEX idx_jobs_hash (file_hash)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_membership ON users(membership_level, subscription_status);
CREATE INDEX idx_users_usage_reset ON users(usage_reset_date);

-- API Keys table indexes
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_provider ON api_keys(provider_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_priority ON api_keys(user_id, priority);

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert default API providers
INSERT INTO api_providers (name, display_name, description, base_url, service_type, max_requests_per_minute, max_requests_per_month, free_tier_limit) VALUES
('platerecognizer', 'Plate Recognizer', 'Professional license plate recognition API', 'https://api.platerecognizer.com', 'license_plate', 60, 2500, 1000),
('openalpr', 'OpenALPR', 'Open source license plate recognition', 'https://api.openalpr.com', 'license_plate', 30, 1000, 1000),
('google_vision', 'Google Cloud Vision', 'Google Cloud Vision API for text detection', 'https://vision.googleapis.com', 'license_plate', 600, 5000, 1000),
('azure_vision', 'Azure Computer Vision', 'Microsoft Azure Computer Vision API', 'https://westcentralus.api.cognitive.microsoft.com', 'license_plate', 240, 5000, 5000),
('aws_rekognition', 'AWS Rekognition', 'Amazon Web Services Rekognition API', 'https://rekognition.us-east-1.amazonaws.com', 'license_plate', 300, 5000, 5000);

-- Insert default system settings
INSERT INTO system_settings (key, value, data_type, description, is_public, category) VALUES
('max_file_size_mb', '50', 'integer', 'Maximum file size for uploads in MB', TRUE, 'upload'),
('allowed_file_types', '["image/jpeg", "image/png", "image/jpg", "image/webp"]', 'json', 'Allowed file types for upload', TRUE, 'upload'),
('default_usage_limit_free', '50', 'integer', 'Default monthly usage limit for free users', FALSE, 'limits'),
('default_usage_limit_premium', '1000', 'integer', 'Default monthly usage limit for premium users', FALSE, 'limits'),
('default_usage_limit_enterprise', '10000', 'integer', 'Default monthly usage limit for enterprise users', FALSE, 'limits'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', FALSE, 'system'),
('registration_enabled', 'true', 'boolean', 'Allow new user registration', FALSE, 'auth'),
('google_oauth_enabled', 'true', 'boolean', 'Enable Google OAuth login', FALSE, 'auth');

-- Create a default super admin user (password: 'admin123')
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, name, role, membership_level, usage_limit, email_verified) VALUES
('admin@example.com', '$2b$10$8K1p/a0dqbA77Gj.G6zGa.Wt8TUK5JB7Jc8MgRxUo4aNvCpHGz3W6', 'System Administrator', 'super_admin', 'enterprise', 999999, TRUE);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_providers_updated_at BEFORE UPDATE ON api_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS FOR USAGE TRACKING
-- =====================================================

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET usage_count = 0, 
        usage_reset_date = CURRENT_DATE
    WHERE usage_reset_date < CURRENT_DATE - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_user_usage(user_uuid UUID)
RETURNS boolean AS $$
DECLARE
    current_usage INTEGER;
    usage_limit_val INTEGER;
BEGIN
    SELECT usage_count, usage_limit INTO current_usage, usage_limit_val
    FROM users WHERE id = user_uuid;
    
    IF current_usage >= usage_limit_val THEN
        RETURN FALSE; -- Usage limit exceeded
    END IF;
    
    UPDATE users 
    SET usage_count = usage_count + 1,
        last_login_at = CURRENT_TIMESTAMP
    WHERE id = user_uuid;
    
    RETURN TRUE; -- Success
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- User statistics view
CREATE VIEW user_stats AS
SELECT 
    membership_level,
    subscription_status,
    COUNT(*) as user_count,
    AVG(usage_count) as avg_usage,
    SUM(usage_count) as total_usage
FROM users 
WHERE is_active = TRUE
GROUP BY membership_level, subscription_status;

-- API usage statistics view
CREATE VIEW api_usage_stats AS
SELECT 
    p.display_name as provider_name,
    DATE(l.created_at) as usage_date,
    COUNT(*) as request_count,
    AVG(l.response_time_ms) as avg_response_time,
    COUNT(CASE WHEN l.status_code >= 200 AND l.status_code < 300 THEN 1 END) as success_count,
    COUNT(CASE WHEN l.status_code >= 400 THEN 1 END) as error_count,
    SUM(l.cost_cents) as total_cost_cents
FROM api_usage_logs l
JOIN api_providers p ON l.provider_id = p.id
GROUP BY p.display_name, DATE(l.created_at)
ORDER BY usage_date DESC, provider_name;

-- =====================================================
-- SECURITY POLICIES (Row Level Security)
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own API keys
CREATE POLICY api_keys_user_isolation ON api_keys
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- Policy: Users can only see their own usage logs
CREATE POLICY usage_logs_user_isolation ON api_usage_logs
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- Policy: Users can only see their own processing jobs
CREATE POLICY jobs_user_isolation ON processing_jobs
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- Policy: Users can only see their own sessions
CREATE POLICY sessions_user_isolation ON user_sessions
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- =====================================================
-- CLEANUP PROCEDURES
-- =====================================================

-- Procedure to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Procedure to clean up old audit logs (keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULED JOBS (requires pg_cron extension)
-- =====================================================

-- Uncomment if pg_cron is available
-- SELECT cron.schedule('reset-monthly-usage', '0 0 1 * *', 'SELECT reset_monthly_usage();');
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');
-- SELECT cron.schedule('cleanup-audit-logs', '0 3 1 * *', 'SELECT cleanup_old_audit_logs();');

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- Grant permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;