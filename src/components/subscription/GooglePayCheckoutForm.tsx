import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { Security } from '@mui/icons-material';
import { SubscriptionPlan, PaymentProvider } from '../../types/payment';
import { useAuth } from '../../contexts/AuthContext';

interface GooglePayCheckoutFormProps {
  plan: SubscriptionPlan;
  provider: PaymentProvider;
  total: number;
  couponCode?: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

declare global {
  interface Window {
    google?: {
      payments: {
        api: {
          PaymentsClient: new (options: any) => any;
        };
      };
    };
  }
}

const GooglePayCheckoutForm: React.FC<GooglePayCheckoutFormProps> = ({
  plan,
  provider,
  total,
  couponCode,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing
}) => {
  const { user } = useAuth();
  const [paymentsClient, setPaymentsClient] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [isGooglePayReady, setIsGooglePayReady] = useState(false);

  useEffect(() => {
    // Load Google Pay API
    const loadGooglePayScript = () => {
      if (window.google?.payments?.api) {
        initializeGooglePay();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://pay.google.com/gp/p/js/pay.js';
      script.onload = initializeGooglePay;
      script.onerror = () => {
        onError('Failed to load Google Pay');
      };
      document.head.appendChild(script);
    };

    const initializeGooglePay = () => {
      if (!window.google?.payments?.api) {
        onError('Google Pay not available');
        return;
      }

      const client = new window.google.payments.api.PaymentsClient({
        environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST'
      });

      setPaymentsClient(client);
      checkCanMakePayment(client);
    };

    const checkCanMakePayment = async (client: any) => {
      try {
        const isReadyToPayRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['MASTERCARD', 'VISA']
            }
          }]
        };

        const response = await client.isReadyToPay(isReadyToPayRequest);
        setCanMakePayment(response.result);
        setIsGooglePayReady(true);
      } catch (err) {
        onError('Google Pay is not available');
        setIsGooglePayReady(true);
      }
    };

    loadGooglePayScript();
  }, [onError]);

  const createPaymentRequest = () => {
    return {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['MASTERCARD', 'VISA'],
          billingAddressRequired: true,
          billingAddressParameters: {
            format: 'FULL'
          }
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'stripe',
            'stripe:version': '2020-08-27',
            'stripe:publishableKey': process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ''
          }
        }
      }],
      merchantInfo: {
        merchantName: 'AI Image Anonymizer',
        merchantId: process.env.REACT_APP_GOOGLE_PAY_MERCHANT_ID || ''
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: total.toFixed(2),
        currencyCode: 'AUD',
        countryCode: 'AU'
      }
    };
  };

  const handleGooglePayClick = async () => {
    if (!paymentsClient || !canMakePayment) {
      onError('Google Pay is not available');
      return;
    }

    setIsProcessing(true);
    onError('');

    try {
      const paymentRequest = createPaymentRequest();
      const paymentData = await paymentsClient.loadPaymentData(paymentRequest);

      // Process payment on backend
      const response = await fetch('/api/payments/googlepay/process', {
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
          couponCode,
          paymentData: paymentData.paymentMethodData.tokenizationData.token
        })
      });

      if (!response.ok) {
        throw new Error('Payment processing failed');
      }

      const { subscriptionId } = await response.json();
      onSuccess(subscriptionId);
    } catch (err) {
      if (err instanceof Error && err.message.includes('CANCELED')) {
        onError('Payment was cancelled');
      } else {
        onError(err instanceof Error ? err.message : 'Google Pay payment failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isGooglePayReady) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading Google Pay...
        </Typography>
      </Box>
    );
  }

  if (!canMakePayment) {
    return (
      <Alert severity="warning">
        Google Pay is not available on this device or browser. Please use a different payment method.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Google Pay Info */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="body2" gutterBottom>
          <strong>Pay with Google Pay</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use your saved payment methods from Google for a quick and secure checkout.
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

      {/* Google Pay Button */}
      <Button
        onClick={handleGooglePayClick}
        disabled={isProcessing}
        fullWidth
        sx={{
          background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
          color: 'white',
          py: 1.5,
          mb: 3,
          fontSize: '1.1rem',
          fontWeight: 'bold',
          '&:hover': {
            background: 'linear-gradient(135deg, #3367d6 0%, #2e7d32 100%)',
          },
          '&:disabled': {
            background: '#ccc',
          }
        }}
      >
        {isProcessing ? (
          <>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            Processing...
          </>
        ) : (
          <>
            <Box
              component="img"
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCA0MCAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjI0IDguMzQ2OUgxOC4xNFY5Ljc2SDEzLjkyVjExLjE3M0gxNy42NlYxMi41ODdIMTMuOTJWMTQuNzMzSDE4LjE0VjE2LjE0N0gxMi4yNFY4LjM0NjlaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMjMuNTggOC4xNzM0QzI1LjUyIDguMTczNCAyNi44MzMzIDkuNjI2NyAyNi44MzMzIDEyLjI2QzI2LjgzMzMgMTQuODkzMyAyNS41MiAxNi4zNDY3IDIzLjU4IDE2LjM0NjdDMjEuNjQgMTYuMzQ2NyAyMC4zMjY3IDE0Ljg5MzMgMjAuMzI2NyAxMi4yNkMyMC4zMjY3IDkuNjI2NyAyMS42NCAxOC4xNzM0IDIzLjU4IDguMTczNFpNMjMuNTggOS40OEMyMi40OCAxMy40OCAyMS44NjY3IDEyLjI2IDIxLjg2NjcgMTIuMjZDMjEuODY2NyAxMS4wNCAyMi40OCA5LjQ4IDIzLjU4IDkuNDhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K"
              alt="Google Pay"
              sx={{ mr: 1, height: 20 }}
            />
            Pay with Google Pay
          </>
        )}
      </Button>

      {/* Security Notice */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security fontSize="small" />
          <Typography variant="body2">
            Google Pay protects your payment info with advanced security and never shares your actual card number.
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

export default GooglePayCheckoutForm;