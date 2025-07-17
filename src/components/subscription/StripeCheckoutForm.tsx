import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Lock } from '@mui/icons-material';
import { SubscriptionPlan, PaymentProvider } from '../../types/payment';
import { useAuth } from '../../contexts/AuthContext';

interface StripeCheckoutFormProps {
  plan: SubscriptionPlan;
  provider: PaymentProvider;
  total: number;
  couponCode?: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
  plan,
  provider,
  total,
  couponCode,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  
  const [billingDetails, setBillingDetails] = useState({
    name: user?.name || '',
    email: user?.email || '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'AU'
    }
  });

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: false,
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card element not found');
      return;
    }

    setIsProcessing(true);
    onError('');

    try {
      // Step 1: Create payment intent on backend
      const paymentIntentResponse = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId: plan.id,
          providerId: provider.id,
          amount: Math.round(total * 100), // Convert to cents
          currency: 'aud',
          couponCode,
          billingDetails
        })
      });

      if (!paymentIntentResponse.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret, subscriptionId } = await paymentIntentResponse.json();

      // Step 2: Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: billingDetails.name,
            email: billingDetails.email,
            address: billingDetails.address,
          },
        }
      });

      if (error) {
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent.status === 'succeeded') {
        // Step 3: Confirm subscription activation on backend
        const confirmResponse = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            subscriptionId
          })
        });

        if (!confirmResponse.ok) {
          throw new Error('Payment succeeded but subscription activation failed');
        }

        onSuccess(subscriptionId);
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBillingChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setBillingDetails(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Billing Information */}
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
        Billing Information
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Full Name"
            value={billingDetails.name}
            onChange={(e) => handleBillingChange('name', e.target.value)}
            required
            fullWidth
            size="small"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            label="Email"
            type="email"
            value={billingDetails.email}
            onChange={(e) => handleBillingChange('email', e.target.value)}
            required
            fullWidth
            size="small"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            label="Address"
            value={billingDetails.address.line1}
            onChange={(e) => handleBillingChange('address.line1', e.target.value)}
            required
            fullWidth
            size="small"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="City"
            value={billingDetails.address.city}
            onChange={(e) => handleBillingChange('address.city', e.target.value)}
            required
            fullWidth
            size="small"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="State"
            value={billingDetails.address.state}
            onChange={(e) => handleBillingChange('address.state', e.target.value)}
            required
            fullWidth
            size="small"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Postal Code"
            value={billingDetails.address.postal_code}
            onChange={(e) => handleBillingChange('address.postal_code', e.target.value)}
            required
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      {/* Card Information */}
      <Typography variant="subtitle2" gutterBottom>
        Card Information
      </Typography>
      
      <Box
        sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mb: 3,
          backgroundColor: 'white'
        }}
      >
        <CardElement options={cardElementOptions} />
      </Box>

      {/* Security Notice */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock fontSize="small" />
          <Typography variant="body2">
            Your payment information is encrypted and secure. We don't store your card details.
          </Typography>
        </Box>
      </Alert>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={!stripe || isProcessing}
        sx={{
          py: 1.5,
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}
      >
        {isProcessing ? (
          <>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            Processing Payment...
          </>
        ) : (
          `Pay AU$${total.toFixed(2)}`
        )}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
        By completing your purchase, you agree to our Terms of Service and Privacy Policy.
        {plan.moneyBackGuaranteeDays > 0 && (
          <> You have {plan.moneyBackGuaranteeDays} days to request a full refund.</>
        )}
      </Typography>
    </Box>
  );
};

export default StripeCheckoutForm;