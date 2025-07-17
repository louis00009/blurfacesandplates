-- =====================================================
-- ADMIN CONFIGURATION & TEMPLATE MANAGEMENT SCHEMA
-- Extension for comprehensive admin control
-- =====================================================

-- =====================================================
-- 1. EMAIL TEMPLATES TABLE
-- =====================================================
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template Identification
    template_code VARCHAR(100) NOT NULL UNIQUE, -- 'subscription_confirmation', 'payment_receipt', etc.
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Template Content
    subject_template TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    
    -- Variables Documentation
    available_variables JSONB DEFAULT '[]', -- ['{{user_name}}', '{{plan_name}}', etc.]
    sample_data JSONB, -- Sample data for preview
    
    -- Template Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_system_template BOOLEAN DEFAULT FALSE, -- Cannot be deleted
    
    -- Categorization
    category VARCHAR(50) DEFAULT 'notification', -- 'notification', 'receipt', 'marketing'
    priority INTEGER DEFAULT 0,
    
    -- Version Control
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES email_templates(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- 2. DOCUMENT TEMPLATES TABLE (Receipts, Invoices)
-- =====================================================
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template Identification
    template_code VARCHAR(100) NOT NULL UNIQUE, -- 'payment_receipt', 'invoice', 'refund_receipt'
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Template Content
    html_template TEXT NOT NULL, -- HTML template for PDF generation
    css_styles TEXT, -- Custom CSS for styling
    
    -- Document Settings
    document_type VARCHAR(50) NOT NULL, -- 'receipt', 'invoice', 'certificate'
    page_size VARCHAR(20) DEFAULT 'A4', -- 'A4', 'Letter', etc.
    orientation VARCHAR(20) DEFAULT 'portrait', -- 'portrait', 'landscape'
    
    -- Variables and Sample Data
    available_variables JSONB DEFAULT '[]',
    sample_data JSONB,
    
    -- Template Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_system_template BOOLEAN DEFAULT FALSE,
    
    -- Branding
    include_logo BOOLEAN DEFAULT TRUE,
    include_company_details BOOLEAN DEFAULT TRUE,
    
    -- Version Control
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES document_templates(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- 3. ADMIN CONFIGURATION TABLE
-- =====================================================
CREATE TABLE admin_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Configuration Key
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    
    -- Configuration Metadata
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    data_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json', 'file', 'color'
    
    -- Input Configuration
    input_type VARCHAR(50) DEFAULT 'text', -- 'text', 'textarea', 'select', 'checkbox', 'file', 'color'
    input_options JSONB, -- For select inputs, validation rules, etc.
    
    -- Validation
    is_required BOOLEAN DEFAULT FALSE,
    validation_rules JSONB, -- min, max, pattern, etc.
    default_value TEXT,
    
    -- Organization
    category VARCHAR(100) NOT NULL, -- 'payment', 'email', 'branding', 'system'
    subcategory VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    
    -- Permissions
    requires_restart BOOLEAN DEFAULT FALSE, -- If changing requires system restart
    is_sensitive BOOLEAN DEFAULT FALSE, -- Hide value in UI
    admin_level_required VARCHAR(20) DEFAULT 'admin', -- 'admin', 'super_admin'
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- 4. PAYMENT PROVIDER CREDENTIALS TABLE
-- =====================================================
CREATE TABLE payment_provider_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES payment_providers(id) ON DELETE CASCADE,
    
    -- Credential Details
    credential_key VARCHAR(100) NOT NULL, -- 'api_key', 'secret_key', 'webhook_secret'
    encrypted_value TEXT NOT NULL, -- Encrypted credential value
    
    -- Environment
    environment VARCHAR(20) DEFAULT 'production', -- 'sandbox', 'production'
    
    -- Metadata
    description TEXT,
    last_tested_at TIMESTAMP,
    test_status VARCHAR(20), -- 'success', 'failed', 'pending'
    test_result TEXT,
    
    -- Security
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    UNIQUE(provider_id, credential_key, environment)
);

-- =====================================================
-- 5. TEMPLATE PREVIEW HISTORY TABLE
-- =====================================================
CREATE TABLE template_previews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template Reference
    template_type VARCHAR(20) NOT NULL, -- 'email', 'document'
    template_id UUID NOT NULL, -- References email_templates or document_templates
    
    -- Preview Details
    preview_data JSONB NOT NULL, -- Data used for preview
    rendered_output TEXT, -- Generated HTML/content
    
    -- User Context
    generated_by UUID REFERENCES users(id),
    ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. SYSTEM BRANDING TABLE
-- =====================================================
CREATE TABLE system_branding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Branding Elements
    company_name VARCHAR(200) DEFAULT 'AI Image Anonymizer',
    company_tagline VARCHAR(500),
    
    -- Logo and Images
    logo_url TEXT,
    logo_dark_url TEXT, -- For dark themes
    favicon_url TEXT,
    email_header_image_url TEXT,
    
    -- Colors
    primary_color VARCHAR(7) DEFAULT '#1976d2', -- Hex color
    secondary_color VARCHAR(7) DEFAULT '#dc004e',
    accent_color VARCHAR(7) DEFAULT '#ed6c02',
    
    -- Contact Information
    support_email VARCHAR(255) DEFAULT 'support@imageapp.com',
    sales_email VARCHAR(255),
    phone_number VARCHAR(50),
    
    -- Address
    company_address_line1 VARCHAR(200),
    company_address_line2 VARCHAR(200),
    company_city VARCHAR(100),
    company_state VARCHAR(100),
    company_postal_code VARCHAR(20),
    company_country VARCHAR(100) DEFAULT 'Australia',
    
    -- Legal
    abn_number VARCHAR(50), -- Australian Business Number
    tax_number VARCHAR(50),
    
    -- Social Media
    website_url TEXT,
    facebook_url TEXT,
    twitter_url TEXT,
    linkedin_url TEXT,
    
    -- Terms and Policies
    terms_of_service_url TEXT,
    privacy_policy_url TEXT,
    refund_policy_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Email templates
CREATE INDEX idx_email_templates_code ON email_templates(template_code);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

-- Document templates
CREATE INDEX idx_document_templates_code ON document_templates(template_code);
CREATE INDEX idx_document_templates_type ON document_templates(document_type);
CREATE INDEX idx_document_templates_active ON document_templates(is_active);

-- Admin configuration
CREATE INDEX idx_admin_config_key ON admin_configuration(config_key);
CREATE INDEX idx_admin_config_category ON admin_configuration(category);
CREATE INDEX idx_admin_config_active ON admin_configuration(is_active);

-- Payment provider credentials
CREATE INDEX idx_provider_credentials_provider ON payment_provider_credentials(provider_id);
CREATE INDEX idx_provider_credentials_env ON payment_provider_credentials(environment);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_configuration_updated_at BEFORE UPDATE ON admin_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_provider_credentials_updated_at BEFORE UPDATE ON payment_provider_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_branding_updated_at BEFORE UPDATE ON system_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT SYSTEM CONFIGURATION
-- =====================================================

-- Insert default admin configuration
INSERT INTO admin_configuration (config_key, config_value, display_name, description, data_type, input_type, category, subcategory, sort_order, default_value) VALUES

-- Payment Settings
('payment_currency_default', 'AUD', 'Default Currency', 'Default currency for new subscriptions', 'string', 'select', 'payment', 'general', 1, 'AUD'),
('payment_tax_rate', '10', 'Tax Rate (%)', 'GST/Tax rate applied to payments', 'number', 'number', 'payment', 'general', 2, '10'),
('payment_receipt_auto_send', 'true', 'Auto-send Receipts', 'Automatically send receipts via email', 'boolean', 'checkbox', 'payment', 'receipts', 3, 'true'),
('payment_invoice_auto_generate', 'true', 'Auto-generate Invoices', 'Automatically generate invoices for payments', 'boolean', 'checkbox', 'payment', 'invoices', 4, 'true'),

-- Email Settings
('email_from_name', 'AI Image Anonymizer', 'From Name', 'Name shown in email "From" field', 'string', 'text', 'email', 'general', 10, 'AI Image Anonymizer'),
('email_from_address', 'noreply@imageapp.com', 'From Email', 'Email address used as sender', 'string', 'email', 'email', 'general', 11, 'noreply@imageapp.com'),
('email_reply_to', 'support@imageapp.com', 'Reply-To Email', 'Email for customer replies', 'string', 'email', 'email', 'general', 12, 'support@imageapp.com'),
('email_smtp_host', '', 'SMTP Host', 'SMTP server hostname', 'string', 'text', 'email', 'smtp', 13, ''),
('email_smtp_port', '587', 'SMTP Port', 'SMTP server port', 'number', 'number', 'email', 'smtp', 14, '587'),
('email_smtp_encryption', 'tls', 'SMTP Encryption', 'SMTP encryption method', 'string', 'select', 'email', 'smtp', 15, 'tls'),

-- Subscription Settings
('subscription_trial_days', '0', 'Trial Period (Days)', 'Free trial period for new subscriptions', 'number', 'number', 'subscription', 'general', 20, '0'),
('subscription_grace_period_days', '3', 'Grace Period (Days)', 'Grace period after expiration', 'number', 'number', 'subscription', 'general', 21, '3'),
('subscription_auto_downgrade', 'true', 'Auto-downgrade Expired', 'Automatically downgrade expired subscriptions', 'boolean', 'checkbox', 'subscription', 'general', 22, 'true'),

-- Branding Settings
('branding_company_name', 'AI Image Anonymizer', 'Company Name', 'Company name shown in emails and documents', 'string', 'text', 'branding', 'general', 30, 'AI Image Anonymizer'),
('branding_primary_color', '#1976d2', 'Primary Color', 'Main brand color', 'string', 'color', 'branding', 'colors', 31, '#1976d2'),
('branding_logo_url', '', 'Logo URL', 'Company logo URL', 'string', 'file', 'branding', 'images', 32, ''),

-- System Settings
('system_maintenance_mode', 'false', 'Maintenance Mode', 'Enable maintenance mode', 'boolean', 'checkbox', 'system', 'general', 40, 'false'),
('system_registration_enabled', 'true', 'Allow Registration', 'Allow new user registration', 'boolean', 'checkbox', 'system', 'access', 41, 'true'),
('system_max_file_size_mb', '50', 'Max File Size (MB)', 'Maximum upload file size', 'number', 'number', 'system', 'uploads', 42, '50'),

-- Security Settings
('security_session_timeout_hours', '24', 'Session Timeout (Hours)', 'User session timeout', 'number', 'number', 'security', 'general', 50, '24'),
('security_max_login_attempts', '5', 'Max Login Attempts', 'Maximum failed login attempts', 'number', 'number', 'security', 'general', 51, '5'),
('security_password_min_length', '8', 'Min Password Length', 'Minimum password length', 'number', 'number', 'security', 'passwords', 52, '8');

-- Insert default system branding
INSERT INTO system_branding (
    company_name, company_tagline, primary_color, secondary_color, accent_color,
    support_email, company_country, website_url, is_active
) VALUES (
    'AI Image Anonymizer',
    'Professional AI-powered image privacy protection',
    '#1976d2', '#dc004e', '#ed6c02',
    'support@imageapp.com', 'Australia',
    'https://imageapp.com', TRUE
);

-- =====================================================
-- DEFAULT EMAIL TEMPLATES
-- =====================================================

-- Subscription Confirmation Email
INSERT INTO email_templates (
    template_code, name, description, subject_template, html_template, text_template,
    available_variables, category, is_system_template, created_by
) VALUES (
    'subscription_confirmation',
    'Subscription Confirmation',
    'Sent when a user successfully subscribes to a premium plan',
    'Welcome to {{plan_name}} - Subscription Confirmed!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; padding: 40px 20px; text-align: center; }
        .content { padding: 40px 20px; }
        .success-icon { font-size: 48px; margin-bottom: 20px; }
        .plan-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { padding: 8px 0; }
        .feature-list li:before { content: "✓"; color: #4caf50; font-weight: bold; margin-right: 10px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .btn { display: inline-block; background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">🎉</div>
            <h1>Welcome to Premium!</h1>
            <p>Your subscription is now active</p>
        </div>
        
        <div class="content">
            <h2>Hi {{user_name}},</h2>
            <p>Thank you for upgrading to <strong>{{plan_name}}</strong>! Your premium subscription is now active and ready to use.</p>
            
            <div class="plan-details">
                <h3>Subscription Details</h3>
                <p><strong>Plan:</strong> {{plan_name}}</p>
                <p><strong>Amount Paid:</strong> {{currency}}${{amount_paid}}</p>
                <p><strong>Started:</strong> {{start_date}}</p>
                {{#expires_at}}<p><strong>Expires:</strong> {{expires_at}}</p>{{/expires_at}}
                {{#is_lifetime}}<p><strong>Access:</strong> Lifetime</p>{{/is_lifetime}}
                <p><strong>Payment Method:</strong> {{payment_method}}</p>
                <p><strong>Transaction ID:</strong> {{transaction_id}}</p>
            </div>
            
            <h3>What you get with Premium:</h3>
            <ul class="feature-list">
                <li>Full access to all image processing tools</li>
                <li>Advanced AI detection algorithms</li>
                <li>Use on up to 10 devices</li>
                <li>No company branding on processed images</li>
                <li>Priority customer support</li>
                <li>30-day money-back guarantee</li>
            </ul>
            
            <a href="{{app_url}}" class="btn">Start Using Premium Features</a>
            
            <h3>Need Help?</h3>
            <p>If you have any questions or need assistance, our support team is here to help:</p>
            <p>Email: <a href="mailto:{{support_email}}">{{support_email}}</a></p>
            
            <p>Thank you for choosing {{company_name}}!</p>
        </div>
        
        <div class="footer">
            <p>{{company_name}} | {{company_address}}</p>
            <p>You received this email because you purchased a subscription.</p>
            <p><a href="{{unsubscribe_url}}">Unsubscribe from marketing emails</a></p>
        </div>
    </div>
</body>
</html>',
    'Welcome to {{plan_name}}!

Hi {{user_name}},

Thank you for upgrading to {{plan_name}}! Your premium subscription is now active.

Subscription Details:
- Plan: {{plan_name}}
- Amount Paid: {{currency}}${{amount_paid}}
- Started: {{start_date}}
{{#expires_at}}- Expires: {{expires_at}}{{/expires_at}}
{{#is_lifetime}}- Access: Lifetime{{/is_lifetime}}
- Payment Method: {{payment_method}}
- Transaction ID: {{transaction_id}}

What you get with Premium:
✓ Full access to all image processing tools
✓ Advanced AI detection algorithms
✓ Use on up to 10 devices
✓ No company branding on processed images
✓ Priority customer support
✓ 30-day money-back guarantee

Start using your premium features: {{app_url}}

Need help? Contact us at {{support_email}}

Thank you for choosing {{company_name}}!',
    '["user_name", "plan_name", "amount_paid", "currency", "start_date", "expires_at", "is_lifetime", "payment_method", "transaction_id", "app_url", "support_email", "company_name", "company_address", "unsubscribe_url"]',
    'notification',
    TRUE,
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
),

-- Payment Receipt Email
(
    'payment_receipt',
    'Payment Receipt',
    'Sent with payment receipt attached',
    'Receipt for your {{plan_name}} purchase - {{transaction_id}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payment Receipt</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .receipt-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .amount { font-size: 24px; font-weight: bold; color: #1976d2; text-align: center; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Receipt</h1>
            <p>Thank you for your payment</p>
        </div>
        
        <div class="content">
            <p>Hi {{user_name}},</p>
            <p>This email confirms that we have received your payment. Your receipt is attached to this email.</p>
            
            <div class="amount">{{currency}}${{amount_paid}}</div>
            
            <div class="receipt-details">
                <h3>Payment Details</h3>
                <p><strong>Item:</strong> {{plan_name}}</p>
                <p><strong>Amount:</strong> {{currency}}${{amount_paid}}</p>
                <p><strong>Payment Date:</strong> {{payment_date}}</p>
                <p><strong>Payment Method:</strong> {{payment_method}}</p>
                <p><strong>Transaction ID:</strong> {{transaction_id}}</p>
                <p><strong>Receipt Number:</strong> {{receipt_number}}</p>
            </div>
            
            <p>If you have any questions about this payment, please contact us at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
            
            <p>Thank you for your business!</p>
            <p>{{company_name}} Team</p>
        </div>
        
        <div class="footer">
            <p>{{company_name}} | {{company_address}}</p>
        </div>
    </div>
</body>
</html>',
    'Payment Receipt - {{transaction_id}}

Hi {{user_name}},

This email confirms that we have received your payment of {{currency}}${{amount_paid}}.

Payment Details:
- Item: {{plan_name}}
- Amount: {{currency}}${{amount_paid}}
- Date: {{payment_date}}
- Method: {{payment_method}}
- Transaction ID: {{transaction_id}}
- Receipt Number: {{receipt_number}}

Your receipt is attached to this email.

Questions? Contact us at {{support_email}}

Thank you!
{{company_name}} Team',
    '["user_name", "plan_name", "amount_paid", "currency", "payment_date", "payment_method", "transaction_id", "receipt_number", "support_email", "company_name", "company_address"]',
    'receipt',
    TRUE,
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
);

-- =====================================================
-- DEFAULT DOCUMENT TEMPLATES
-- =====================================================

-- Payment Receipt Template
INSERT INTO document_templates (
    template_code, name, description, html_template, css_styles,
    document_type, available_variables, is_system_template, created_by
) VALUES (
    'payment_receipt',
    'Payment Receipt',
    'Standard payment receipt template',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt</title>
</head>
<body>
    <div class="receipt">
        <div class="header">
            {{#logo_url}}<img src="{{logo_url}}" alt="{{company_name}}" class="logo">{{/logo_url}}
            <h1>{{company_name}}</h1>
            <div class="company-details">
                {{#company_address_line1}}<p>{{company_address_line1}}</p>{{/company_address_line1}}
                {{#company_address_line2}}<p>{{company_address_line2}}</p>{{/company_address_line2}}
                <p>{{company_city}}, {{company_state}} {{company_postal_code}}</p>
                <p>{{company_country}}</p>
                {{#abn_number}}<p>ABN: {{abn_number}}</p>{{/abn_number}}
            </div>
        </div>
        
        <div class="receipt-title">
            <h2>RECEIPT</h2>
            <p class="receipt-number">Receipt #{{receipt_number}}</p>
        </div>
        
        <div class="customer-details">
            <h3>Bill To:</h3>
            <p><strong>{{customer_name}}</strong></p>
            <p>{{customer_email}}</p>
            {{#billing_address}}
            <p>{{billing_address.line1}}</p>
            {{#billing_address.line2}}<p>{{billing_address.line2}}</p>{{/billing_address.line2}}
            <p>{{billing_address.city}}, {{billing_address.state}} {{billing_address.postal_code}}</p>
            <p>{{billing_address.country}}</p>
            {{/billing_address}}
        </div>
        
        <div class="payment-details">
            <table class="details-table">
                <tr>
                    <td><strong>Payment Date:</strong></td>
                    <td>{{payment_date}}</td>
                </tr>
                <tr>
                    <td><strong>Payment Method:</strong></td>
                    <td>{{payment_method}}</td>
                </tr>
                <tr>
                    <td><strong>Transaction ID:</strong></td>
                    <td>{{transaction_id}}</td>
                </tr>
            </table>
        </div>
        
        <div class="items">
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{plan_name}}</td>
                        <td class="amount">{{currency}}${{amount_paid}}</td>
                    </tr>
                    {{#discount_amount}}
                    <tr>
                        <td>Discount{{#coupon_code}} ({{coupon_code}}){{/coupon_code}}</td>
                        <td class="amount">-{{currency}}${{discount_amount}}</td>
                    </tr>
                    {{/discount_amount}}
                    {{#tax_amount}}
                    <tr>
                        <td>{{tax_name}} ({{tax_rate}}%)</td>
                        <td class="amount">{{currency}}${{tax_amount}}</td>
                    </tr>
                    {{/tax_amount}}
                </tbody>
                <tfoot>
                    <tr class="total">
                        <td><strong>Total Paid</strong></td>
                        <td class="amount"><strong>{{currency}}${{total_amount}}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div class="footer">
            <p class="thank-you">Thank you for your business!</p>
            <p class="support">Questions? Contact us at {{support_email}}</p>
            {{#refund_policy}}<p class="policy">{{refund_policy}}</p>{{/refund_policy}}
        </div>
    </div>
</body>
</html>',
    '.receipt { max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif; }
.header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
.logo { max-height: 60px; margin-bottom: 10px; }
.company-details { margin-top: 10px; color: #666; }
.receipt-title { text-align: center; margin: 30px 0; }
.receipt-title h2 { color: #1976d2; margin: 0; }
.receipt-number { margin: 5px 0; color: #666; }
.customer-details { margin: 30px 0; }
.payment-details { margin: 30px 0; }
.details-table { width: 100%; }
.details-table td { padding: 8px 0; }
.items { margin: 30px 0; }
.items-table { width: 100%; border-collapse: collapse; }
.items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
.items-table thead th { background-color: #f5f5f5; font-weight: bold; }
.items-table .amount { text-align: right; }
.items-table tfoot .total { border-top: 2px solid #1976d2; font-size: 18px; }
.footer { margin-top: 40px; text-align: center; color: #666; }
.thank-you { font-size: 18px; color: #1976d2; font-weight: bold; }
.support { margin: 10px 0; }
.policy { font-size: 12px; margin-top: 20px; }',
    'receipt',
    '["receipt_number", "company_name", "logo_url", "company_address_line1", "company_address_line2", "company_city", "company_state", "company_postal_code", "company_country", "abn_number", "customer_name", "customer_email", "billing_address", "payment_date", "payment_method", "transaction_id", "plan_name", "amount_paid", "currency", "discount_amount", "coupon_code", "tax_amount", "tax_name", "tax_rate", "total_amount", "support_email", "refund_policy"]',
    TRUE,
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
),

-- Invoice Template  
(
    'invoice',
    'Invoice Template',
    'Standard invoice template for subscriptions',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice</title>
</head>
<body>
    <div class="invoice">
        <div class="header">
            {{#logo_url}}<img src="{{logo_url}}" alt="{{company_name}}" class="logo">{{/logo_url}}
            <h1>{{company_name}}</h1>
            <div class="company-details">
                {{#company_address_line1}}<p>{{company_address_line1}}</p>{{/company_address_line1}}
                {{#company_address_line2}}<p>{{company_address_line2}}</p>{{/company_address_line2}}
                <p>{{company_city}}, {{company_state}} {{company_postal_code}}</p>
                <p>{{company_country}}</p>
                {{#abn_number}}<p>ABN: {{abn_number}}</p>{{/abn_number}}
            </div>
        </div>
        
        <div class="invoice-title">
            <h2>INVOICE</h2>
            <div class="invoice-meta">
                <p><strong>Invoice #:</strong> {{invoice_number}}</p>
                <p><strong>Date:</strong> {{invoice_date}}</p>
                <p><strong>Due Date:</strong> {{due_date}}</p>
            </div>
        </div>
        
        <div class="customer-details">
            <h3>Bill To:</h3>
            <p><strong>{{customer_name}}</strong></p>
            <p>{{customer_email}}</p>
            {{#billing_address}}
            <p>{{billing_address.line1}}</p>
            {{#billing_address.line2}}<p>{{billing_address.line2}}</p>{{/billing_address.line2}}
            <p>{{billing_address.city}}, {{billing_address.state}} {{billing_address.postal_code}}</p>
            <p>{{billing_address.country}}</p>
            {{/billing_address}}
        </div>
        
        <div class="items">
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Period</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>{{plan_name}}</strong>
                            <br><small>{{plan_description}}</small>
                        </td>
                        <td>{{service_period}}</td>
                        <td class="amount">{{currency}}${{amount}}</td>
                    </tr>
                    {{#discount_amount}}
                    <tr>
                        <td>Discount{{#coupon_code}} ({{coupon_code}}){{/coupon_code}}</td>
                        <td>-</td>
                        <td class="amount">-{{currency}}${{discount_amount}}</td>
                    </tr>
                    {{/discount_amount}}
                </tbody>
                <tfoot>
                    <tr class="subtotal">
                        <td colspan="2"><strong>Subtotal</strong></td>
                        <td class="amount"><strong>{{currency}}${{subtotal}}</strong></td>
                    </tr>
                    {{#tax_amount}}
                    <tr class="tax">
                        <td colspan="2">{{tax_name}} ({{tax_rate}}%)</td>
                        <td class="amount">{{currency}}${{tax_amount}}</td>
                    </tr>
                    {{/tax_amount}}
                    <tr class="total">
                        <td colspan="2"><strong>Total Amount</strong></td>
                        <td class="amount"><strong>{{currency}}${{total_amount}}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div class="payment-terms">
            <h3>Payment Terms</h3>
            <p>{{payment_terms}}</p>
        </div>
        
        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Questions? Contact us at {{support_email}}</p>
        </div>
    </div>
</body>
</html>',
    '.invoice { max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
.logo { max-height: 60px; }
.company-details { text-align: right; color: #666; }
.invoice-title { display: flex; justify-content: space-between; align-items: flex-start; margin: 30px 0; }
.invoice-title h2 { color: #1976d2; margin: 0; }
.invoice-meta { text-align: right; }
.customer-details { margin: 30px 0; }
.items { margin: 30px 0; }
.items-table { width: 100%; border-collapse: collapse; }
.items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
.items-table thead th { background-color: #f5f5f5; font-weight: bold; }
.items-table .amount { text-align: right; }
.items-table tfoot .total { border-top: 2px solid #1976d2; font-size: 18px; }
.payment-terms { margin: 30px 0; background-color: #f8f9fa; padding: 20px; border-radius: 4px; }
.footer { margin-top: 40px; text-align: center; color: #666; }',
    'invoice',
    '["invoice_number", "invoice_date", "due_date", "company_name", "logo_url", "company_address_line1", "company_address_line2", "company_city", "company_state", "company_postal_code", "company_country", "abn_number", "customer_name", "customer_email", "billing_address", "plan_name", "plan_description", "service_period", "amount", "currency", "discount_amount", "coupon_code", "subtotal", "tax_amount", "tax_name", "tax_rate", "total_amount", "payment_terms", "support_email"]',
    TRUE,
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
);

-- =====================================================
-- FUNCTIONS FOR TEMPLATE MANAGEMENT
-- =====================================================

-- Function to render email template
CREATE OR REPLACE FUNCTION render_email_template(
    template_code_param VARCHAR,
    template_data JSONB
)
RETURNS TABLE(
    subject TEXT,
    html_content TEXT,
    text_content TEXT
) AS $$
DECLARE
    template_record email_templates%ROWTYPE;
    rendered_subject TEXT;
    rendered_html TEXT;
    rendered_text TEXT;
BEGIN
    -- Get template
    SELECT * INTO template_record
    FROM email_templates
    WHERE template_code = template_code_param
    AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Email template not found: %', template_code_param;
    END IF;
    
    -- Simple template rendering (in production, use proper templating engine)
    rendered_subject := template_record.subject_template;
    rendered_html := template_record.html_template;
    rendered_text := template_record.text_template;
    
    -- Basic variable replacement (implement proper Mustache/Handlebars parsing)
    -- This is a simplified version for demonstration
    
    RETURN QUERY SELECT rendered_subject, rendered_html, rendered_text;
END;
$$ LANGUAGE plpgsql;

-- Function to render document template
CREATE OR REPLACE FUNCTION render_document_template(
    template_code_param VARCHAR,
    template_data JSONB
)
RETURNS TABLE(
    html_content TEXT,
    css_styles TEXT
) AS $$
DECLARE
    template_record document_templates%ROWTYPE;
    rendered_html TEXT;
BEGIN
    -- Get template
    SELECT * INTO template_record
    FROM document_templates
    WHERE template_code = template_code_param
    AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document template not found: %', template_code_param;
    END IF;
    
    -- Simple template rendering
    rendered_html := template_record.html_template;
    
    RETURN QUERY SELECT rendered_html, template_record.css_styles;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECURITY POLICIES
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE admin_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Policies for admin access only
CREATE POLICY admin_only_config ON admin_configuration
    FOR ALL TO authenticated_users
    USING (EXISTS (SELECT 1 FROM users WHERE id = current_user_id() AND role IN ('admin', 'super_admin')));

CREATE POLICY admin_only_credentials ON payment_provider_credentials
    FOR ALL TO authenticated_users
    USING (EXISTS (SELECT 1 FROM users WHERE id = current_user_id() AND role IN ('admin', 'super_admin')));

CREATE POLICY admin_only_email_templates ON email_templates
    FOR ALL TO authenticated_users
    USING (EXISTS (SELECT 1 FROM users WHERE id = current_user_id() AND role IN ('admin', 'super_admin')));

CREATE POLICY admin_only_document_templates ON document_templates
    FOR ALL TO authenticated_users
    USING (EXISTS (SELECT 1 FROM users WHERE id = current_user_id() AND role IN ('admin', 'super_admin')));

-- =====================================================
-- END OF ADMIN TEMPLATES SCHEMA
-- =====================================================