import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  PayPalButtons,
  usePayPalScriptReducer
} from '@paypal/react-paypal-js';
import { Security } from '@mui/icons-material';
import { SubscriptionPlan, PaymentProvider } from '../../types/payment';
import { useAuth } from '../../contexts/AuthContext';

interface PayPalCheckoutFormProps {
  plan: SubscriptionPlan;
  provider: PaymentProvider;
  total: number;
  couponCode?: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

const PayPalCheckoutForm: React.FC<PayPalCheckoutFormProps> = ({
  plan,
  provider,
  total,
  couponCode,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing
}) => {
  const [{ isPending }] = usePayPalScriptReducer();
  const { user } = useAuth();

  const createOrder = async () => {
    try {
      setIsProcessing(true);
      onError('');

      // Create order on backend
      const response = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId: plan.id,
          providerId: provider.id,
          amount: total,
          currency: 'AUD',
          couponCode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const { orderId } = await response.json();
      return orderId;
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create PayPal order');
      setIsProcessing(false);
      throw err;
    }
  };

  const onApprove = async (data: any) => {
    try {
      // Capture payment on backend
      const response = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderId: data.orderID
        })
      });

      if (!response.ok) {
        throw new Error('Failed to capture PayPal payment');
      }

      const { subscriptionId } = await response.json();
      onSuccess(subscriptionId);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment capture failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const onCancel = () => {
    setIsProcessing(false);
    onError('Payment was cancelled');
  };

  const onError_PayPal = (err: any) => {
    setIsProcessing(false);
    onError('PayPal payment failed. Please try again.');
    console.error('PayPal Error:', err);
  };

  if (isPending) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading PayPal...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* PayPal Info */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="body2" gutterBottom>
          <strong>Pay with PayPal</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You'll be redirected to PayPal to complete your payment securely. 
          You can pay with your PayPal balance, bank account, or credit/debit card.
        </Typography>
      </Paper>

      {/* Order Summary */}
      <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Order Summary
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">{plan.name}</Typography>
          <Typography variant="body2">AU${total.toFixed(2)}</Typography>
        </Box>
        {couponCode && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="success.main">
              Coupon: {couponCode}
            </Typography>
            <Typography variant="body2" color="success.main">
              Discount applied
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: 1, borderColor: 'divider', pt: 1 }}>
          <Typography variant="body1">Total</Typography>
          <Typography variant="body1">AU${total.toFixed(2)}</Typography>
        </Box>
      </Box>

      {/* PayPal Buttons */}
      <Box sx={{ mb: 3 }}>
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal'
          }}
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={onCancel}
          onError={onError_PayPal}
          disabled={isProcessing}
        />
      </Box>

      {/* Security Notice */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security fontSize="small" />
          <Typography variant="body2">
            PayPal protects your financial information with industry-leading security and fraud prevention.
          </Typography>
        </Box>
      </Alert>

      {/* Terms */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
        By completing your purchase, you agree to our Terms of Service and Privacy Policy.
        {plan.moneyBackGuaranteeDays > 0 && (
          <> You have {plan.moneyBackGuaranteeDays} days to request a full refund.</>
        )}
      </Typography>
    </Box>
  );
};

export default PayPalCheckoutForm;