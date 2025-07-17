// Admin Configuration Types

export interface AdminConfiguration {
  id: string;
  configKey: string;
  configValue: string;
  displayName: string;
  description: string;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'file' | 'color';
  inputType: 'text' | 'textarea' | 'select' | 'checkbox' | 'file' | 'color' | 'number' | 'email';
  inputOptions?: any;
  isRequired: boolean;
  validationRules?: any;
  defaultValue?: string;
  category: string;
  subcategory?: string;
  sortOrder: number;
  requiresRestart: boolean;
  isSensitive: boolean;
  adminLevelRequired: 'admin' | 'super_admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  templateCode: string;
  name: string;
  description: string;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate?: string;
  availableVariables: string[];
  sampleData?: any;
  isActive: boolean;
  isSystemTemplate: boolean;
  category: 'notification' | 'receipt' | 'marketing';
  priority: number;
  version: number;
  parentTemplateId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface DocumentTemplate {
  id: string;
  templateCode: string;
  name: string;
  description: string;
  htmlTemplate: string;
  cssStyles: string;
  documentType: 'receipt' | 'invoice' | 'certificate';
  pageSize: string;
  orientation: 'portrait' | 'landscape';
  availableVariables: string[];
  sampleData?: any;
  isActive: boolean;
  isSystemTemplate: boolean;
  includeLogo: boolean;
  includeCompanyDetails: boolean;
  version: number;
  parentTemplateId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface SystemBranding {
  id: string;
  companyName: string;
  companyTagline?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  emailHeaderImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  supportEmail: string;
  salesEmail?: string;
  phoneNumber?: string;
  companyAddressLine1?: string;
  companyAddressLine2?: string;
  companyCity?: string;
  companyState?: string;
  companyPostalCode?: string;
  companyCountry: string;
  abnNumber?: string;
  taxNumber?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  termsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  refundPolicyUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export interface PaymentProviderCredential {
  id: string;
  providerId: string;
  credentialKey: string;
  encryptedValue: string;
  environment: 'sandbox' | 'production';
  description?: string;
  lastTestedAt?: Date;
  testStatus?: 'success' | 'failed' | 'pending';
  testResult?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  conversionRate: number;
  churnRate: number;
  averageRevenuePerUser: number;
  popularPlan: string;
  recentPayments: number;
  failedPayments: number;
}

export interface ConfigurationCategory {
  category: string;
  displayName: string;
  description: string;
  icon: string;
  subcategories: ConfigurationSubcategory[];
}

export interface ConfigurationSubcategory {
  subcategory: string;
  displayName: string;
  configs: AdminConfiguration[];
}

// Form data types
export interface ConfigurationFormData {
  [key: string]: string | number | boolean | File;
}

export interface TemplatePreview {
  subject?: string;
  htmlContent: string;
  textContent?: string;
  variables: Record<string, any>;
}

export interface BulkOperation {
  action: 'activate' | 'deactivate' | 'delete';
  entityType: 'plans' | 'coupons' | 'templates' | 'users';
  entityIds: string[];
  reason?: string;
}

// Analytics types
export interface RevenueAnalytics {
  date: string;
  revenue: number;
  paymentCount: number;
  conversionRate: number;
}

export interface PlanAnalytics {
  planName: string;
  subscriptions: number;
  revenue: number;
  conversionRate: number;
}

export interface PaymentMethodAnalytics {
  method: string;
  count: number;
  revenue: number;
  successRate: number;
}