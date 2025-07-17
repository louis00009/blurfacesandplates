-- =====================================================
-- PAYMENT & SUBSCRIPTION DATABASE SCHEMA
-- Extension to existing schema for payment processing
-- =====================================================

-- =====================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Plan Details
    plan_code VARCHAR(50) NOT NULL UNIQUE, -- 'premium_1year', 'premium_lifetime'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Pricing
    price_aud DECIMAL(10, 2) NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    currency_default VARCHAR(3) DEFAULT 'AUD',
    
    -- Plan Features
    duration_months INTEGER, -- NULL for lifetime
    is_lifetime BOOLEAN DEFAULT FALSE,
    device_limit INTEGER DEFAULT 10,
    usage_limit INTEGER DEFAULT 10000,
    
    -- Features
    features JSONB NOT NULL DEFAULT '[]',
    remove_branding BOOLEAN DEFAULT TRUE,
    money_back_guarantee_days INTEGER DEFAULT 30,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. PAYMENT PROVIDERS TABLE
-- =====================================================
CREATE TABLE payment_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Provider Details
    provider_code VARCHAR(50) NOT NULL UNIQUE, -- 'stripe', 'paypal', 'googlepay'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Configuration
    is_active BOOLEAN DEFAULT TRUE,
    supports_subscriptions BOOLEAN DEFAULT TRUE,
    supports_one_time BOOLEAN DEFAULT TRUE,
    
    -- Processing Fees
    fee_percentage DECIMAL(5, 4) DEFAULT 0.0290, -- 2.9%
    fee_fixed_cents INTEGER DEFAULT 30, -- 30 cents
    
    -- UI Configuration
    logo_url TEXT,
    button_color VARCHAR(7) DEFAULT '#007cba',
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. USER SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    -- Subscription Details
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'refunded')),
    
    -- Dates
    starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- NULL for lifetime
    cancelled_at TIMESTAMP,
    
    -- Pricing at time of purchase
    amount_paid_aud DECIMAL(10, 2) NOT NULL,
    amount_paid_usd DECIMAL(10, 2),
    currency_paid VARCHAR(3) NOT NULL,
    
    -- Payment Reference
    payment_id UUID, -- References payments table
    
    -- Auto-renewal (for future subscription plans)
    auto_renew BOOLEAN DEFAULT FALSE,
    renewal_reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- Refund Information
    refund_requested_at TIMESTAMP,
    refund_reason TEXT,
    refund_amount DECIMAL(10, 2),
    refund_processed_at TIMESTAMP,
    
    -- Usage Tracking
    device_count INTEGER DEFAULT 0,
    last_device_check TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, plan_id, created_at), -- Prevent duplicate simultaneous subscriptions
    CHECK (expires_at IS NULL OR expires_at > starts_at)
);

-- =====================================================
-- 4. PAYMENTS TABLE
-- =====================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    provider_id UUID NOT NULL REFERENCES payment_providers(id),
    
    -- Payment Details
    external_payment_id VARCHAR(255) NOT NULL, -- Stripe/PayPal/Google Pay ID
    payment_intent_id VARCHAR(255), -- For Stripe
    
    -- Amount Information
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    amount_refunded DECIMAL(10, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),
    
    -- Payment Method
    payment_method VARCHAR(50), -- 'card', 'paypal', 'google_pay', 'apple_pay'
    payment_method_details JSONB, -- Store card last 4 digits, etc.
    
    -- Processing Information
    processor_fee_cents INTEGER DEFAULT 0,
    net_amount DECIMAL(10, 2), -- Amount after fees
    
    -- Failure Information
    failure_code VARCHAR(100),
    failure_message TEXT,
    failure_reason VARCHAR(100),
    
    -- Receipt Information
    receipt_email VARCHAR(255),
    receipt_url TEXT,
    invoice_pdf_url TEXT,
    
    -- Fraud Prevention
    risk_score INTEGER, -- 0-100, provider risk assessment
    risk_level VARCHAR(20), -- 'low', 'medium', 'high'
    
    -- Metadata
    description TEXT,
    metadata JSONB,
    
    -- Processing Timestamps
    processed_at TIMESTAMP,
    failed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_payments_user (user_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_external_id (external_payment_id),
    INDEX idx_payments_date (created_at)
);

-- =====================================================
-- 5. PAYMENT ATTEMPTS TABLE (For tracking retries)
-- =====================================================
CREATE TABLE payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    
    -- Attempt Details
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
    
    -- Error Information
    error_code VARCHAR(100),
    error_message TEXT,
    error_type VARCHAR(50), -- 'card_declined', 'network_error', etc.
    
    -- Processing Time
    processing_time_ms INTEGER,
    
    -- Provider Response
    provider_response JSONB,
    
    -- Timestamps
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Constraints
    UNIQUE(payment_id, attempt_number)
);

-- =====================================================
-- 6. SUBSCRIPTION FEATURES TABLE
-- =====================================================
CREATE TABLE subscription_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Feature Details
    feature_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Feature Type
    feature_type VARCHAR(30) NOT NULL CHECK (feature_type IN ('boolean', 'limit', 'access')),
    
    -- Display
    icon VARCHAR(50), -- Icon name/class
    is_highlighted BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. PLAN FEATURES MAPPING TABLE
-- =====================================================
CREATE TABLE plan_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES subscription_features(id) ON DELETE CASCADE,
    
    -- Feature Value
    feature_value TEXT NOT NULL, -- 'true', '10000', 'unlimited', etc.
    
    -- Display
    display_text VARCHAR(200), -- Custom display text for this plan-feature combo
    is_highlighted BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(plan_id, feature_id)
);

-- =====================================================
-- 8. WEBHOOKS TABLE (For payment provider notifications)
-- =====================================================
CREATE TABLE payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES payment_providers(id),
    
    -- Webhook Details
    external_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    
    -- Data
    webhook_data JSONB NOT NULL,
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    processing_attempts INTEGER DEFAULT 0,
    
    -- Error Handling
    error_message TEXT,
    last_error_at TIMESTAMP,
    
    -- Timestamps
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_webhooks_provider (provider_id),
    INDEX idx_webhooks_event_id (external_event_id),
    INDEX idx_webhooks_processed (processed),
    INDEX idx_webhooks_received (received_at)
);

-- =====================================================
-- 9. COUPON CODES TABLE
-- =====================================================
CREATE TABLE coupon_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Coupon Details
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Discount
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount_amount DECIMAL(10, 2), -- Max discount for percentage coupons
    
    -- Usage Limits
    usage_limit INTEGER, -- NULL for unlimited
    usage_count INTEGER DEFAULT 0,
    user_usage_limit INTEGER DEFAULT 1, -- How many times one user can use it
    
    -- Validity
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    
    -- Plan Restrictions
    applicable_plans UUID[], -- Array of plan IDs, NULL for all plans
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (discount_value > 0),
    CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- =====================================================
-- 10. COUPON USAGE TABLE
-- =====================================================
CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupon_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id),
    
    -- Usage Details
    discount_applied DECIMAL(10, 2) NOT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    final_amount DECIMAL(10, 2) NOT NULL,
    
    -- Timestamps
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(coupon_id, user_id, payment_id)
);

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert subscription plans
INSERT INTO subscription_plans (plan_code, name, description, price_aud, price_usd, duration_months, is_lifetime, device_limit, usage_limit, features, sort_order) VALUES
('premium_1year', '1-Year Premium Access', 'Full access to all tools for one year', 24.95, 16.95, 12, FALSE, 10, 10000, 
 '["full_access", "no_branding", "multi_device", "money_back_guarantee"]', 1),
('premium_lifetime', 'Lifetime Premium Access', 'One-time payment for permanent access', 49.95, 33.95, NULL, TRUE, 10, 999999, 
 '["lifetime_access", "full_access", "no_branding", "multi_device", "money_back_guarantee"]', 2);

-- Insert payment providers
INSERT INTO payment_providers (provider_code, display_name, description, fee_percentage, fee_fixed_cents, logo_url, button_color, sort_order) VALUES
('stripe', 'Credit/Debit Card', 'Pay securely with your credit or debit card', 0.0290, 30, '/images/providers/stripe.svg', '#635bff', 1),
('paypal', 'PayPal', 'Pay with your PayPal account', 0.0349, 0, '/images/providers/paypal.svg', '#0070ba', 2),
('googlepay', 'Google Pay', 'Pay quickly with Google Pay', 0.0290, 30, '/images/providers/googlepay.svg', '#4285f4', 3);

-- Insert subscription features
INSERT INTO subscription_features (feature_code, name, description, feature_type, icon, is_highlighted, sort_order) VALUES
('full_access', 'Full access to all tools', 'Access to all image processing features', 'boolean', 'check', TRUE, 1),
('no_branding', 'No company logo', 'Remove branding from processed images', 'boolean', 'hide', TRUE, 2),
('multi_device', 'Multi-device support', 'Use on up to 10 devices', 'limit', 'devices', TRUE, 3),
('money_back_guarantee', '30-day money-back guarantee', 'Full refund within 30 days', 'boolean', 'guarantee', TRUE, 4),
('lifetime_access', 'Lifetime access', 'Never expires, pay once use forever', 'boolean', 'infinity', TRUE, 5),
('unlimited_processing', 'Unlimited processing', 'No monthly limits on image processing', 'boolean', 'unlimited', FALSE, 6);

-- Map features to plans
INSERT INTO plan_features (plan_id, feature_id, feature_value, display_text, is_highlighted) 
SELECT 
    sp.id, 
    sf.id, 
    CASE 
        WHEN sf.feature_code = 'multi_device' THEN '10'
        WHEN sf.feature_code = 'lifetime_access' AND sp.plan_code = 'premium_lifetime' THEN 'true'
        WHEN sf.feature_code = 'lifetime_access' AND sp.plan_code = 'premium_1year' THEN 'false'
        ELSE 'true'
    END,
    CASE 
        WHEN sf.feature_code = 'multi_device' THEN 'For use on up to 10 devices'
        WHEN sf.feature_code = 'lifetime_access' AND sp.plan_code = 'premium_lifetime' THEN 'Lifetime access'
        WHEN sf.feature_code = 'lifetime_access' AND sp.plan_code = 'premium_1year' THEN 'Access for one year'
        ELSE sf.description
    END,
    sf.is_highlighted
FROM subscription_plans sp
CROSS JOIN subscription_features sf
WHERE (sf.feature_code != 'lifetime_access' OR sp.plan_code IN ('premium_lifetime', 'premium_1year'));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Subscription plans
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_featured ON subscription_plans(is_featured);

-- User subscriptions
CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expires ON user_subscriptions(expires_at);
CREATE INDEX idx_user_subscriptions_active ON user_subscriptions(user_id, status) WHERE status = 'active';

-- Payment providers
CREATE INDEX idx_payment_providers_active ON payment_providers(is_active);

-- Coupon codes
CREATE INDEX idx_coupon_codes_code ON coupon_codes(code);
CREATE INDEX idx_coupon_codes_active ON coupon_codes(is_active);
CREATE INDEX idx_coupon_codes_valid ON coupon_codes(valid_from, valid_until);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_providers_updated_at BEFORE UPDATE ON payment_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_features_updated_at BEFORE UPDATE ON subscription_features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupon_codes_updated_at BEFORE UPDATE ON coupon_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS FOR SUBSCRIPTION MANAGEMENT
-- =====================================================

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION user_has_active_subscription(user_uuid UUID)
RETURNS boolean AS $$
DECLARE
    subscription_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO subscription_count
    FROM user_subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    RETURN subscription_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current subscription
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid UUID)
RETURNS TABLE(
    subscription_id UUID,
    plan_name VARCHAR,
    status VARCHAR,
    expires_at TIMESTAMP,
    is_lifetime BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        sp.name,
        us.status,
        us.expires_at,
        sp.is_lifetime
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to expire subscriptions
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void AS $$
BEGIN
    UPDATE user_subscriptions 
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Revenue analytics view
CREATE VIEW revenue_analytics AS
SELECT 
    DATE(p.created_at) as payment_date,
    pp.display_name as payment_provider,
    sp.name as plan_name,
    COUNT(*) as payment_count,
    SUM(p.amount) as total_revenue,
    AVG(p.amount) as avg_payment,
    COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments
FROM payments p
JOIN payment_providers pp ON p.provider_id = pp.id
LEFT JOIN user_subscriptions us ON p.subscription_id = us.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
GROUP BY DATE(p.created_at), pp.display_name, sp.name
ORDER BY payment_date DESC;

-- Subscription analytics view
CREATE VIEW subscription_analytics AS
SELECT 
    sp.name as plan_name,
    sp.plan_code,
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN us.status = 'active' THEN 1 END) as active_subscriptions,
    COUNT(CASE WHEN us.status = 'expired' THEN 1 END) as expired_subscriptions,
    COUNT(CASE WHEN us.status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
    AVG(us.amount_paid_aud) as avg_price,
    SUM(us.amount_paid_aud) as total_revenue
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
GROUP BY sp.name, sp.plan_code
ORDER BY total_subscriptions DESC;

-- =====================================================
-- SECURITY POLICIES (Row Level Security)
-- =====================================================

-- Enable RLS on payment-related tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Policies for user subscriptions
CREATE POLICY user_subscriptions_isolation ON user_subscriptions
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- Policies for payments
CREATE POLICY payments_isolation ON payments
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- Policies for coupon usage
CREATE POLICY coupon_usage_isolation ON coupon_usage
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- =====================================================
-- END OF PAYMENT SCHEMA
-- =====================================================