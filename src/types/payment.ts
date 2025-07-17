// Payment and Subscription Types

export interface SubscriptionPlan {
  id: string;
  planCode: string;
  name: string;
  description: string;
  priceAUD: number;
  priceUSD: number;
  currencyDefault: string;
  durationMonths?: number;
  isLifetime: boolean;
  deviceLimit: number;
  usageLimit: number;
  features: string[];
  removesBranding: boolean;
  moneyBackGuaranteeDays: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export interface PaymentProvider {
  id: string;
  providerCode: 'stripe' | 'paypal' | 'googlepay';
  displayName: string;
  description: string;
  isActive: boolean;
  supportsSubscriptions: boolean;
  supportsOneTime: boolean;
  feePercentage: number;
  feeFixedCents: number;
  logoUrl: string;
  buttonColor: string;
  sortOrder: number;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'refunded';
  startsAt: Date;
  expiresAt?: Date;
  cancelledAt?: Date;
  amountPaidAUD: number;
  amountPaidUSD?: number;
  currencyPaid: string;
  paymentId?: string;
  autoRenew: boolean;
  deviceCount: number;
  plan?: SubscriptionPlan;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  providerId: string;
  externalPaymentId: string;
  paymentIntentId?: string;
  amount: number;
  currency: string;
  amountRefunded: number;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentMethodDetails?: any;
  processorFeeCents: number;
  netAmount?: number;
  failureCode?: string;
  failureMessage?: string;
  receiptEmail?: string;
  receiptUrl?: string;
  invoicePdfUrl?: string;
  riskScore?: number;
  riskLevel?: string;
  description?: string;
  metadata?: any;
  processedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  provider?: PaymentProvider;
}

export interface SubscriptionFeature {
  id: string;
  featureCode: string;
  name: string;
  description: string;
  featureType: 'boolean' | 'limit' | 'access';
  icon: string;
  isHighlighted: boolean;
  sortOrder: number;
}

export interface PlanFeature {
  id: string;
  planId: string;
  featureId: string;
  featureValue: string;
  displayText: string;
  isHighlighted: boolean;
  feature?: SubscriptionFeature;
}

export interface CouponCode {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  userUsageLimit: number;
  validFrom: Date;
  validUntil?: Date;
  applicablePlans?: string[];
  isActive: boolean;
}

export interface PaymentIntent {
  planId: string;
  providerId: string;
  amount: number;
  currency: string;
  couponCode?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  subscriptionId?: string;
  error?: string;
  redirectUrl?: string;
}

// Frontend state interfaces
export interface PricingState {
  plans: SubscriptionPlan[];
  providers: PaymentProvider[];
  selectedPlan?: SubscriptionPlan;
  selectedProvider?: PaymentProvider;
  couponCode: string;
  couponValid: boolean;
  couponDiscount: number;
  isLoading: boolean;
  error?: string;
}

export interface CheckoutState {
  step: 'plan' | 'payment' | 'processing' | 'success' | 'error';
  paymentIntent?: PaymentIntent;
  paymentResult?: PaymentResult;
  isProcessing: boolean;
  error?: string;
}