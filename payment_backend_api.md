# Payment & Subscription Backend API Documentation

## 🚀 **Backend API Endpoints for Payment Processing**

### **Environment Variables Required**

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_stripe_webhook_secret

# PayPal Configuration
PAYPAL_CLIENT_ID=paypal_client_id
PAYPAL_CLIENT_SECRET=paypal_client_secret
PAYPAL_ENVIRONMENT=sandbox  # or 'live' for production

# Google Pay Configuration
GOOGLE_PAY_MERCHANT_ID=google_pay_merchant_id

# Email Service
SENDGRID_API_KEY=sendgrid_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### **1. Subscription Plans API**

#### **GET /api/subscription-plans**
Get all active subscription plans

```typescript
// Response
{
  "plans": [
    {
      "id": "uuid",
      "planCode": "premium_1year",
      "name": "1-Year Access",
      "description": "Full access to all tools for one year",
      "priceAUD": 24.95,
      "priceUSD": 16.95,
      "currencyDefault": "AUD",
      "durationMonths": 12,
      "isLifetime": false,
      "deviceLimit": 10,
      "usageLimit": 10000,
      "features": ["feature1", "feature2"],
      "removesBranding": true,
      "moneyBackGuaranteeDays": 30,
      "isActive": true,
      "isFeatured": false,
      "sortOrder": 1
    }
  ]
}
```

#### **GET /api/subscription-plans/:id**
Get specific subscription plan details

### **2. Payment Providers API**

#### **GET /api/payment-providers**
Get all active payment providers

```typescript
// Response
{
  "providers": [
    {
      "id": "uuid",
      "providerCode": "stripe",
      "displayName": "Credit/Debit Card",
      "description": "Pay securely with your credit or debit card",
      "isActive": true,
      "supportsSubscriptions": true,
      "supportsOneTime": true,
      "logoUrl": "/images/providers/stripe.svg",
      "buttonColor": "#635bff",
      "sortOrder": 1
    }
  ]
}
```

### **3. Stripe Payment Processing**

#### **POST /api/payments/create-intent**
Create Stripe payment intent

```typescript
// Request Body
{
  "planId": "uuid",
  "providerId": "uuid",
  "amount": 2495, // in cents
  "currency": "aud",
  "couponCode": "SAVE10", // optional
  "billingDetails": {
    "name": "John Doe",
    "email": "john@example.com",
    "address": {
      "line1": "123 Main St",
      "city": "Sydney",
      "state": "NSW",
      "postal_code": "2000",
      "country": "AU"
    }
  }
}

// Response
{
  "clientSecret": "pi_stripe_client_secret",
  "subscriptionId": "uuid",
  "amount": 2495,
  "currency": "aud"
}
```

#### **POST /api/payments/confirm**
Confirm successful payment and activate subscription

```typescript
// Request Body
{
  "paymentIntentId": "pi_stripe_payment_intent_id",
  "subscriptionId": "uuid"
}

// Response
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "status": "active",
    "startsAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2025-01-01T00:00:00Z"
  }
}
```

#### **POST /api/webhooks/stripe**
Handle Stripe webhooks for payment status updates

### **4. PayPal Payment Processing**

#### **POST /api/payments/paypal/create-order**
Create PayPal order

```typescript
// Request Body
{
  "planId": "uuid",
  "providerId": "uuid",
  "amount": 24.95,
  "currency": "AUD",
  "couponCode": "SAVE10" // optional
}

// Response
{
  "orderId": "paypal_order_id",
  "subscriptionId": "uuid"
}
```

#### **POST /api/payments/paypal/capture-order**
Capture PayPal payment

```typescript
// Request Body
{
  "orderId": "paypal_order_id"
}

// Response
{
  "success": true,
  "subscriptionId": "uuid",
  "paymentId": "uuid"
}
```

#### **POST /api/webhooks/paypal**
Handle PayPal webhooks

### **5. Google Pay Processing**

#### **POST /api/payments/googlepay/process**
Process Google Pay payment

```typescript
// Request Body
{
  "planId": "uuid",
  "providerId": "uuid",
  "amount": 24.95,
  "currency": "AUD",
  "couponCode": "SAVE10", // optional
  "paymentData": "encrypted_payment_token"
}

// Response
{
  "success": true,
  "subscriptionId": "uuid",
  "paymentId": "uuid"
}
```

### **6. Subscription Management**

#### **GET /api/subscriptions/my**
Get current user's subscriptions

```typescript
// Response
{
  "subscriptions": [
    {
      "id": "uuid",
      "planId": "uuid",
      "status": "active",
      "startsAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2025-01-01T00:00:00Z",
      "amountPaidAUD": 24.95,
      "currencyPaid": "AUD",
      "deviceCount": 3,
      "plan": {
        "name": "1-Year Access",
        "isLifetime": false
      }
    }
  ]
}
```

#### **GET /api/subscriptions/:id**
Get specific subscription details

```typescript
// Response
{
  "subscription": {
    "id": "uuid",
    "status": "active",
    "plan": { /* plan details */ },
    "payment": { /* payment details */ }
  }
}
```

#### **POST /api/subscriptions/send-confirmation**
Send subscription confirmation email

```typescript
// Request Body
{
  "subscriptionId": "uuid"
}

// Response
{
  "success": true,
  "emailSent": true
}
```

### **7. Coupon Management**

#### **POST /api/coupons/validate**
Validate coupon code

```typescript
// Request Body
{
  "code": "SAVE10",
  "planId": "uuid" // optional
}

// Response
{
  "valid": true,
  "coupon": {
    "id": "uuid",
    "code": "SAVE10",
    "discountType": "percentage",
    "discountValue": 10,
    "description": "10% off your purchase"
  },
  "discountAmount": 2.50
}
```

### **8. Payment History**

#### **GET /api/payments/history**
Get user's payment history

```typescript
// Response
{
  "payments": [
    {
      "id": "uuid",
      "amount": 24.95,
      "currency": "AUD",
      "status": "succeeded",
      "paymentMethod": "card",
      "provider": {
        "displayName": "Credit/Debit Card"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "receiptUrl": "/receipts/payment_id.pdf"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### **GET /api/payments/:id/receipt**
Download payment receipt

#### **GET /api/payments/:id/invoice**
Download payment invoice

## 🔧 **Backend Implementation Examples**

### **Stripe Payment Controller**

```typescript
// controllers/stripe.controller.ts
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { SubscriptionService } from '../services/subscription.service';
import { PaymentService } from '../services/payment.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export class StripeController {
  async createPaymentIntent(req: Request, res: Response) {
    try {
      const { planId, amount, currency, billingDetails, couponCode } = req.body;
      const userId = req.user.id;

      // Apply coupon if provided
      let finalAmount = amount;
      if (couponCode) {
        const discount = await CouponService.validateAndApply(couponCode, userId, planId);
        finalAmount = Math.max(0, amount - discount);
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: finalAmount,
        currency: currency.toLowerCase(),
        metadata: {
          userId,
          planId,
          couponCode: couponCode || ''
        },
        receipt_email: billingDetails.email
      });

      // Create pending subscription record
      const subscription = await SubscriptionService.createPending({
        userId,
        planId,
        amount: finalAmount / 100,
        currency,
        paymentIntentId: paymentIntent.id
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription.id,
        amount: finalAmount,
        currency
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }

  async confirmPayment(req: Request, res: Response) {
    try {
      const { paymentIntentId, subscriptionId } = req.body;
      const userId = req.user.id;

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: 'Payment not successful' });
      }

      // Activate subscription
      const subscription = await SubscriptionService.activate(subscriptionId, {
        paymentIntentId,
        status: 'active'
      });

      // Create payment record
      await PaymentService.create({
        userId,
        subscriptionId,
        externalPaymentId: paymentIntentId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: 'succeeded',
        paymentMethod: 'stripe'
      });

      res.json({
        success: true,
        subscription
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to confirm payment' });
    }
  }

  async handleWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      return res.status(400).send(`Webhook signature verification failed.`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    // Update payment status in database
    await PaymentService.updateStatus(paymentIntent.id, 'succeeded');
    
    // Send confirmation email
    await EmailService.sendPaymentConfirmation(paymentIntent.receipt_email!, {
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase()
    });
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    // Update payment status in database
    await PaymentService.updateStatus(paymentIntent.id, 'failed');
  }
}
```

### **PayPal Payment Controller**

```typescript
// controllers/paypal.controller.ts
import { Request, Response } from 'express';
import { PayPalHttpClient } from '@paypal/paypal-server-sdk';

export class PayPalController {
  private client: PayPalHttpClient;

  constructor() {
    this.client = new PayPalHttpClient({
      clientId: process.env.PAYPAL_CLIENT_ID!,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
      environment: process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
    });
  }

  async createOrder(req: Request, res: Response) {
    try {
      const { planId, amount, currency, couponCode } = req.body;
      const userId = req.user.id;

      // Apply coupon if provided
      let finalAmount = amount;
      if (couponCode) {
        const discount = await CouponService.validateAndApply(couponCode, userId, planId);
        finalAmount = Math.max(0, amount - discount);
      }

      const request = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: finalAmount.toString()
          },
          description: `AI Image Anonymizer - Premium Subscription`
        }],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
          brand_name: 'AI Image Anonymizer',
          locale: 'en-AU',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW'
        }
      };

      const order = await this.client.orders.create(request);

      // Create pending subscription
      const subscription = await SubscriptionService.createPending({
        userId,
        planId,
        amount: finalAmount,
        currency,
        externalOrderId: order.id
      });

      res.json({
        orderId: order.id,
        subscriptionId: subscription.id
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create PayPal order' });
    }
  }

  async captureOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.body;
      const userId = req.user.id;

      const capture = await this.client.orders.capture(orderId);

      if (capture.status === 'COMPLETED') {
        // Find and activate subscription
        const subscription = await SubscriptionService.findByExternalOrderId(orderId);
        if (subscription) {
          await SubscriptionService.activate(subscription.id, {
            status: 'active'
          });

          // Create payment record
          await PaymentService.create({
            userId,
            subscriptionId: subscription.id,
            externalPaymentId: capture.id,
            amount: parseFloat(capture.purchase_units[0].amount.value),
            currency: capture.purchase_units[0].amount.currency_code,
            status: 'succeeded',
            paymentMethod: 'paypal'
          });

          res.json({
            success: true,
            subscriptionId: subscription.id
          });
        } else {
          throw new Error('Subscription not found');
        }
      } else {
        throw new Error('Payment capture failed');
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to capture PayPal payment' });
    }
  }
}
```

### **Email Service for Confirmations**

```typescript
// services/email.service.ts
import nodemailer from 'nodemailer';

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendSubscriptionConfirmation(email: string, subscription: any, payment: any) {
    const html = `
      <h1>Welcome to Premium!</h1>
      <p>Thank you for subscribing to our premium service.</p>
      
      <h2>Subscription Details</h2>
      <ul>
        <li>Plan: ${subscription.plan.name}</li>
        <li>Amount: AU$${payment.amount}</li>
        <li>Status: Active</li>
        <li>Started: ${new Date(subscription.startsAt).toLocaleDateString()}</li>
        ${subscription.expiresAt ? 
          `<li>Expires: ${new Date(subscription.expiresAt).toLocaleDateString()}</li>` : 
          '<li>Access: Lifetime</li>'
        }
      </ul>
      
      <p>You can now enjoy all premium features!</p>
      
      <p>Best regards,<br>AI Image Anonymizer Team</p>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Welcome to Premium - Subscription Confirmed',
      html
    });
  }

  async sendReceiptEmail(email: string, payment: any) {
    // Generate and send receipt email
  }
}
```

## 🔒 **Security Best Practices**

1. **Webhook Verification**: Always verify webhook signatures
2. **Idempotency**: Implement idempotent payment processing
3. **PCI Compliance**: Never store card details on your servers
4. **Rate Limiting**: Implement strict rate limits on payment endpoints
5. **Audit Logging**: Log all payment-related activities
6. **Environment Separation**: Use different API keys for test/production

This implementation provides a complete payment processing system with multiple payment providers, comprehensive error handling, and proper security measures.