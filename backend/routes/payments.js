const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('paypal-rest-sdk');
const { authenticateToken } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const {
  validateCreatePaymentIntent,
  validateConfirmPayment,
  validateCreatePayPalOrder,
  validateCapturePayPalOrder
} = require('../middleware/validateRequest');
const { 
  asyncHandler, 
  PaymentError, 
  ValidationError,
  ExternalServiceError 
} = require('../middleware/errorHandler');
const dbService = require('../services/database');
const redisService = require('../services/redis');

const router = express.Router();

// Configure PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Helper functions
const calculateDiscount = async (couponCode, amount) => {
  if (!couponCode) return { discount: 0, couponValid: false };

  try {
    const couponResult = await dbService.query(
      `SELECT id, discount_type, discount_value, max_discount_amount, usage_count, usage_limit,
              user_usage_limit, valid_from, valid_until, is_active
       FROM coupon_codes 
       WHERE code = $1 AND is_active = true`,
      [couponCode.toUpperCase()]
    );

    if (couponResult.rows.length === 0) {
      return { discount: 0, couponValid: false, error: 'Invalid coupon code' };
    }

    const coupon = couponResult.rows[0];
    const now = new Date();

    // Check validity period
    if (coupon.valid_from > now || (coupon.valid_until && coupon.valid_until < now)) {
      return { discount: 0, couponValid: false, error: 'Coupon has expired' };
    }

    // Check usage limits
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { discount: 0, couponValid: false, error: 'Coupon usage limit reached' };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = amount * (coupon.discount_value / 100);
      if (coupon.max_discount_amount) {
        discount = Math.min(discount, coupon.max_discount_amount);
      }
    } else {
      discount = Math.min(coupon.discount_value, amount);
    }

    return {
      discount: Math.round(discount * 100) / 100,
      couponValid: true,
      couponId: coupon.id
    };
  } catch (error) {
    console.error('Coupon calculation error:', error);
    return { discount: 0, couponValid: false, error: 'Coupon validation failed' };
  }
};

const getSubscriptionPlan = async (planId) => {
  const result = await dbService.query(
    'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
    [planId]
  );
  
  if (result.rows.length === 0) {
    throw new ValidationError('Invalid subscription plan');
  }

  return result.rows[0];
};

const getPaymentProvider = async (providerId) => {
  const result = await dbService.query(
    'SELECT * FROM api_providers WHERE id = $1 AND is_active = true',
    [providerId]
  );
  
  if (result.rows.length === 0) {
    throw new ValidationError('Invalid payment provider');
  }

  return result.rows[0];
};

// Routes

// Create Stripe payment intent
router.post('/create-intent',
  rateLimiter.payments,
  authenticateToken,
  validateCreatePaymentIntent,
  asyncHandler(async (req, res) => {
    const { planId, providerId, amount, currency, couponCode, billingDetails } = req.body;
    const userId = req.user.id;

    // Validate plan and provider
    const plan = await getSubscriptionPlan(planId);
    const provider = await getPaymentProvider(providerId);

    if (provider.provider_code !== 'stripe') {
      throw new ValidationError('Invalid payment provider for Stripe payment');
    }

    // Calculate discount
    const { discount, couponValid, couponId, error } = await calculateDiscount(couponCode, amount);
    if (couponCode && !couponValid) {
      throw new ValidationError(error || 'Invalid coupon code');
    }

    const finalAmount = Math.max(0, amount - discount);
    
    if (finalAmount === 0) {
      throw new ValidationError('Final amount cannot be zero');
    }

    // Create subscription record
    const subscriptionResult = await dbService.createSubscription({
      userId,
      planId,
      status: 'pending',
      amountPaid: finalAmount,
      currency: currency.toUpperCase(),
      paymentId: null
    });

    try {
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId,
          planId,
          subscriptionId: subscriptionResult.id,
          couponCode: couponCode || '',
          couponId: couponId || '',
          originalAmount: amount.toString(),
          discount: discount.toString()
        },
        receipt_email: billingDetails.email,
        shipping: {
          address: {
            line1: billingDetails.address.line1,
            city: billingDetails.address.city,
            state: billingDetails.address.state,
            postal_code: billingDetails.address.postal_code,
            country: billingDetails.address.country
          },
          name: billingDetails.name
        }
      });

      // Store payment intent data in Redis for security
      await redisService.setPaymentIntent(paymentIntent.id, {
        subscriptionId: subscriptionResult.id,
        userId,
        planId,
        providerId,
        originalAmount: amount,
        finalAmount,
        discount,
        couponCode,
        couponId
      });

      // Create payment record
      await dbService.createPayment({
        userId,
        subscriptionId: subscriptionResult.id,
        providerId,
        externalPaymentId: paymentIntent.id,
        amount: finalAmount,
        currency: currency.toUpperCase(),
        status: 'pending',
        paymentMethod: 'stripe'
      });

      // Log audit event
      await dbService.createAuditLog({
        userId,
        action: 'payment_intent_created',
        resourceType: 'payment',
        resourceId: paymentIntent.id,
        description: `Stripe payment intent created for plan: ${plan.name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscriptionResult.id,
        paymentIntentId: paymentIntent.id,
        amount: finalAmount,
        discount,
        couponApplied: couponValid
      });

    } catch (stripeError) {
      // Update subscription status to failed
      await dbService.updateSubscriptionStatus(subscriptionResult.id, 'failed');
      
      console.error('Stripe payment intent creation failed:', stripeError);
      throw new PaymentError('Failed to create payment intent', {
        type: stripeError.type,
        code: stripeError.code
      });
    }
  })
);

// Confirm Stripe payment
router.post('/confirm',
  authenticateToken,
  validateConfirmPayment,
  asyncHandler(async (req, res) => {
    const { paymentIntentId, subscriptionId } = req.body;
    const userId = req.user.id;

    // Get payment intent data from Redis
    const intentData = await redisService.getPaymentIntent(paymentIntentId);
    if (!intentData || intentData.userId !== userId) {
      throw new ValidationError('Invalid payment intent');
    }

    try {
      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new PaymentError('Payment not completed');
      }

      // Start transaction
      await dbService.transaction(async (client) => {
        // Update subscription status
        await client.query(
          `UPDATE user_subscriptions 
           SET status = 'active', starts_at = CURRENT_TIMESTAMP, payment_id = $1
           WHERE id = $2 AND user_id = $3`,
          [paymentIntentId, subscriptionId, userId]
        );

        // Update payment status
        await client.query(
          `UPDATE payments 
           SET status = 'succeeded', processed_at = CURRENT_TIMESTAMP,
               payment_method_details = $1
           WHERE external_payment_id = $2 AND user_id = $3`,
          [JSON.stringify(paymentIntent.payment_method), paymentIntentId, userId]
        );

        // Update user membership if applicable
        const plan = await getSubscriptionPlan(intentData.planId);
        if (plan.membership_level) {
          await client.query(
            `UPDATE users 
             SET membership_level = $1, subscription_status = 'active', usage_limit = $2
             WHERE id = $3`,
            [plan.membership_level, plan.usage_limit, userId]
          );
        }

        // Update coupon usage if applicable
        if (intentData.couponId) {
          await client.query(
            'UPDATE coupon_codes SET usage_count = usage_count + 1 WHERE id = $1',
            [intentData.couponId]
          );
        }
      });

      // Clean up Redis data
      await redisService.deletePaymentIntent(paymentIntentId);

      // Log audit event
      await dbService.createAuditLog({
        userId,
        action: 'payment_completed',
        resourceType: 'payment',
        resourceId: paymentIntentId,
        description: 'Stripe payment completed successfully',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        subscriptionId,
        message: 'Payment completed successfully'
      });

    } catch (error) {
      // Update payment status to failed
      await dbService.updatePaymentStatus(paymentIntentId, 'failed');
      
      if (error.type && error.type.startsWith('Stripe')) {
        throw new PaymentError('Payment verification failed', { 
          stripeError: error.message 
        });
      }
      throw error;
    }
  })
);

// Create PayPal order
router.post('/paypal/create-order',
  rateLimiter.payments,
  authenticateToken,
  validateCreatePayPalOrder,
  asyncHandler(async (req, res) => {
    const { planId, providerId, amount, currency, couponCode } = req.body;
    const userId = req.user.id;

    // Validate plan and provider
    const plan = await getSubscriptionPlan(planId);
    const provider = await getPaymentProvider(providerId);

    if (provider.provider_code !== 'paypal') {
      throw new ValidationError('Invalid payment provider for PayPal payment');
    }

    // Calculate discount
    const { discount, couponValid, couponId, error } = await calculateDiscount(couponCode, amount);
    if (couponCode && !couponValid) {
      throw new ValidationError(error || 'Invalid coupon code');
    }

    const finalAmount = Math.max(0, amount - discount);
    
    if (finalAmount === 0) {
      throw new ValidationError('Final amount cannot be zero');
    }

    // Create subscription record
    const subscriptionResult = await dbService.createSubscription({
      userId,
      planId,
      status: 'pending',
      amountPaid: finalAmount,
      currency: currency.toUpperCase(),
      paymentId: null
    });

    // Create PayPal payment
    const createPayment = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
      },
      transactions: [{
        amount: {
          currency: currency.toUpperCase(),
          total: finalAmount.toFixed(2)
        },
        description: `${plan.name} - AI Image Anonymizer`,
        invoice_number: `SUB-${subscriptionResult.id}`,
        custom: JSON.stringify({
          userId,
          planId,
          subscriptionId: subscriptionResult.id,
          couponCode: couponCode || '',
          couponId: couponId || '',
          originalAmount: amount,
          discount
        })
      }]
    };

    return new Promise((resolve, reject) => {
      paypal.payment.create(createPayment, async (error, payment) => {
        if (error) {
          console.error('PayPal payment creation error:', error);
          
          // Update subscription status to failed
          await dbService.updateSubscriptionStatus(subscriptionResult.id, 'failed');
          
          reject(new ExternalServiceError('Failed to create PayPal order', 'paypal'));
          return;
        }

        try {
          // Store payment data in Redis
          await redisService.setPaymentIntent(payment.id, {
            subscriptionId: subscriptionResult.id,
            userId,
            planId,
            providerId,
            originalAmount: amount,
            finalAmount,
            discount,
            couponCode,
            couponId
          });

          // Create payment record
          await dbService.createPayment({
            userId,
            subscriptionId: subscriptionResult.id,
            providerId,
            externalPaymentId: payment.id,
            amount: finalAmount,
            currency: currency.toUpperCase(),
            status: 'pending',
            paymentMethod: 'paypal'
          });

          // Log audit event
          await dbService.createAuditLog({
            userId,
            action: 'paypal_order_created',
            resourceType: 'payment',
            resourceId: payment.id,
            description: `PayPal order created for plan: ${plan.name}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });

          // Find approval URL
          const approvalUrl = payment.links.find(link => link.rel === 'approval_url');

          resolve(res.json({
            orderId: payment.id,
            subscriptionId: subscriptionResult.id,
            amount: finalAmount,
            discount,
            couponApplied: couponValid,
            approvalUrl: approvalUrl ? approvalUrl.href : null
          }));

        } catch (dbError) {
          console.error('Database error after PayPal payment creation:', dbError);
          reject(new Error('Failed to store payment data'));
        }
      });
    });
  })
);

// Capture PayPal payment
router.post('/paypal/capture-order',
  authenticateToken,
  validateCapturePayPalOrder,
  asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const userId = req.user.id;

    // Get payment data from Redis
    const paymentData = await redisService.getPaymentIntent(orderId);
    if (!paymentData || paymentData.userId !== userId) {
      throw new ValidationError('Invalid PayPal order');
    }

    return new Promise((resolve, reject) => {
      paypal.payment.execute(orderId, { payer_id: req.body.payerId || 'dummy' }, async (error, payment) => {
        if (error) {
          console.error('PayPal payment execution error:', error);
          
          // Update payment status to failed
          await dbService.updatePaymentStatus(orderId, 'failed');
          
          reject(new PaymentError('PayPal payment execution failed'));
          return;
        }

        if (payment.state !== 'approved') {
          reject(new PaymentError('PayPal payment not approved'));
          return;
        }

        try {
          // Start transaction
          await dbService.transaction(async (client) => {
            // Update subscription status
            await client.query(
              `UPDATE user_subscriptions 
               SET status = 'active', starts_at = CURRENT_TIMESTAMP, payment_id = $1
               WHERE id = $2 AND user_id = $3`,
              [orderId, paymentData.subscriptionId, userId]
            );

            // Update payment status
            await client.query(
              `UPDATE payments 
               SET status = 'succeeded', processed_at = CURRENT_TIMESTAMP,
                   payment_method_details = $1
               WHERE external_payment_id = $2 AND user_id = $3`,
              [JSON.stringify(payment), orderId, userId]
            );

            // Update user membership if applicable
            const plan = await getSubscriptionPlan(paymentData.planId);
            if (plan.membership_level) {
              await client.query(
                `UPDATE users 
                 SET membership_level = $1, subscription_status = 'active', usage_limit = $2
                 WHERE id = $3`,
                [plan.membership_level, plan.usage_limit, userId]
              );
            }

            // Update coupon usage if applicable
            if (paymentData.couponId) {
              await client.query(
                'UPDATE coupon_codes SET usage_count = usage_count + 1 WHERE id = $1',
                [paymentData.couponId]
              );
            }
          });

          // Clean up Redis data
          await redisService.deletePaymentIntent(orderId);

          // Log audit event
          await dbService.createAuditLog({
            userId,
            action: 'paypal_payment_completed',
            resourceType: 'payment',
            resourceId: orderId,
            description: 'PayPal payment completed successfully',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });

          resolve(res.json({
            success: true,
            subscriptionId: paymentData.subscriptionId,
            message: 'PayPal payment completed successfully'
          }));

        } catch (dbError) {
          console.error('Database error after PayPal payment execution:', dbError);
          reject(new Error('Failed to update payment status'));
        }
      });
    });
  })
);

// Stripe webhook endpoint
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Check if webhook already processed
  const webhookId = req.headers['stripe-signature'];
  if (await redisService.isWebhookProcessed(webhookId)) {
    return res.json({ received: true, status: 'already_processed' });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      
      // Additional processing can be done here
      // The main processing is done in the /confirm endpoint
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('PaymentIntent failed:', failedPayment.id);
      
      // Update payment status to failed
      await dbService.updatePaymentStatus(failedPayment.id, 'failed', {
        failure_code: failedPayment.last_payment_error?.code,
        failure_message: failedPayment.last_payment_error?.message
      });
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}));

// Get user's payment history
router.get('/history',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await dbService.query(
      `SELECT p.id, p.amount, p.currency, p.status, p.payment_method,
              p.created_at, p.processed_at, p.receipt_url,
              sp.name as plan_name, pp.display_name as provider_name
       FROM payments p
       LEFT JOIN user_subscriptions us ON p.subscription_id = us.id
       LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
       LEFT JOIN api_providers pp ON p.provider_id = pp.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await dbService.query(
      'SELECT COUNT(*) FROM payments WHERE user_id = $1',
      [userId]
    );

    res.json({
      payments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  })
);

// Validate coupon code
router.post('/validate-coupon',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { couponCode, amount } = req.body;

    if (!couponCode) {
      return res.json({ valid: false, error: 'Coupon code is required' });
    }

    const result = await calculateDiscount(couponCode, amount);
    
    res.json({
      valid: result.couponValid,
      discount: result.discount,
      error: result.error || null
    });
  })
);

module.exports = router;