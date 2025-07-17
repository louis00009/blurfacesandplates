import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel
} from '@mui/material';
import {
  CreditCard,
  PaymentOutlined,
  Security,
  CheckCircle,
  ArrowBack,
  Close
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionPlan, PaymentProvider } from '../../types/payment';
import StripeCheckoutForm from './StripeCheckoutForm';
import PayPalCheckoutForm from './PayPalCheckoutForm';
import GooglePayCheckoutForm from './GooglePayCheckoutForm';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_stripe_key');

interface CheckoutPageProps {
  selectedPlan: SubscriptionPlan;
  onBack: () => void;
  onClose: () => void;
  onSuccess: (subscriptionId: string) => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({
  selectedPlan,
  onBack,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>();
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  // Mock payment providers data - In real app, fetch from API
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockProviders: PaymentProvider[] = [
          {
            id: '1',
            providerCode: 'stripe',
            displayName: 'Credit/Debit Card',
            description: 'Pay securely with your credit or debit card',
            isActive: true,
            supportsSubscriptions: true,
            supportsOneTime: true,
            feePercentage: 0.029,
            feeFixedCents: 30,
            logoUrl: '/images/providers/stripe.svg',
            buttonColor: '#635bff',
            sortOrder: 1
          },
          {
            id: '2',
            providerCode: 'paypal',
            displayName: 'PayPal',
            description: 'Pay with your PayPal account',
            isActive: true,
            supportsSubscriptions: true,
            supportsOneTime: true,
            feePercentage: 0.0349,
            feeFixedCents: 0,
            logoUrl: '/images/providers/paypal.svg',
            buttonColor: '#0070ba',
            sortOrder: 2
          },
          {
            id: '3',
            providerCode: 'googlepay',
            displayName: 'Google Pay',
            description: 'Pay quickly with Google Pay',
            isActive: true,
            supportsSubscriptions: false,
            supportsOneTime: true,
            feePercentage: 0.029,
            feeFixedCents: 30,
            logoUrl: '/images/providers/googlepay.svg',
            buttonColor: '#4285f4',
            sortOrder: 3
          }
        ];

        setProviders(mockProviders);
        setSelectedProvider(mockProviders[0]); // Default to Stripe
      } catch (err) {
        setError('Failed to load payment providers');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      // Simulate coupon validation API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock coupon validation
      if (couponCode.toUpperCase() === 'SAVE10') {
        setCouponDiscount(10);
        setCouponApplied(true);
        setError('');
      } else if (couponCode.toUpperCase() === 'WELCOME20') {
        setCouponDiscount(20);
        setCouponApplied(true);
        setError('');
      } else {
        setError('Invalid coupon code');
        setCouponApplied(false);
        setCouponDiscount(0);
      }
    } catch (err) {
      setError('Failed to validate coupon code');
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    setCouponDiscount(0);
    setError('');
  };

  const calculateTotal = () => {
    const basePrice = selectedPlan.priceAUD;
    const discount = couponApplied ? (basePrice * couponDiscount / 100) : 0;
    return Math.max(0, basePrice - discount);
  };

  const renderPaymentForm = () => {
    if (!selectedProvider) return null;

    switch (selectedProvider.providerCode) {
      case 'stripe':
        return (
          <Elements stripe={stripePromise}>
            <StripeCheckoutForm
              plan={selectedPlan}
              provider={selectedProvider}
              total={calculateTotal()}
              couponCode={couponApplied ? couponCode : undefined}
              onSuccess={onSuccess}
              onError={setError}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </Elements>
        );
      
      case 'paypal':
        return (
          <PayPalScriptProvider options={{
            clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID || 'paypal_client_id',
            currency: 'AUD'
          }}>
            <PayPalCheckoutForm
              plan={selectedPlan}
              provider={selectedProvider}
              total={calculateTotal()}
              couponCode={couponApplied ? couponCode : undefined}
              onSuccess={onSuccess}
              onError={setError}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </PayPalScriptProvider>
        );
      
      case 'googlepay':
        return (
          <GooglePayCheckoutForm
            plan={selectedPlan}
            provider={selectedProvider}
            total={calculateTotal()}
            couponCode={couponApplied ? couponCode : undefined}
            onSuccess={onSuccess}
            onError={setError}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        );
      
      default:
        return <Alert severity="error">Unsupported payment provider</Alert>;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300,
        }}
      >
        <CircularProgress color="primary" size={60} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        p: 2,
      }}
      onClick={onClose}
    >
      <Container
        maxWidth="lg"
        onClick={(e) => e.stopPropagation()}
        sx={{
          backgroundColor: 'white',
          borderRadius: 2,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Button
              startIcon={<ArrowBack />}
              onClick={onBack}
              variant="outlined"
            >
              Back to Plans
            </Button>
            
            <Typography variant="h5" fontWeight="bold">
              Secure Checkout
            </Typography>
            
            <Button
              onClick={onClose}
              sx={{ minWidth: 'auto', p: 1 }}
            >
              <Close />
            </Button>
          </Stack>
        </Box>

        <Box sx={{ p: 4 }}>
          <Grid container spacing={4}>
            {/* Order Summary */}
            <Grid item xs={12} md={5}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Order Summary
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {selectedPlan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPlan.description}
                    </Typography>
                  </Box>

                  <List dense>
                    {selectedPlan.features.slice(0, 4).map((feature, index) => (
                      <ListItem key={index} sx={{ py: 0, px: 0 }}>
                        <CheckCircle color="success" sx={{ fontSize: 16, mr: 1 }} />
                        <ListItemText 
                          primary={feature}
                          primaryTypographyProps={{ fontSize: '0.875rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 2 }} />

                  {/* Pricing breakdown */}
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">
                        {selectedPlan.name}
                      </Typography>
                      <Typography variant="body2">
                        AU${selectedPlan.priceAUD.toFixed(2)}
                      </Typography>
                    </Stack>
                    
                    {couponApplied && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="success.main">
                          Discount ({couponDiscount}%)
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          -AU${(selectedPlan.priceAUD * couponDiscount / 100).toFixed(2)}
                        </Typography>
                      </Stack>
                    )}
                    
                    <Divider />
                    
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="h6" fontWeight="bold">
                        Total
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        AU${calculateTotal().toFixed(2)}
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Coupon Code Section */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Have a coupon code?
                    </Typography>
                    
                    {!couponApplied ? (
                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          placeholder="Enter code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          sx={{ flex: 1 }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim()}
                        >
                          Apply
                        </Button>
                      </Stack>
                    ) : (
                      <Chip
                        label={`${couponCode} - ${couponDiscount}% off`}
                        color="success"
                        onDelete={removeCoupon}
                        deleteIcon={<Close />}
                      />
                    )}
                  </Box>

                  {/* Security notice */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Security color="primary" fontSize="small" />
                      <Typography variant="caption" color="text.secondary">
                        Secure 256-bit SSL encryption
                      </Typography>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Payment Method */}
            <Grid item xs={12} md={7}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Payment Method
                  </Typography>

                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  {/* Payment Provider Selection */}
                  <FormControl component="fieldset" sx={{ mb: 3 }}>
                    <FormLabel component="legend">Choose payment method</FormLabel>
                    <RadioGroup
                      value={selectedProvider?.id || ''}
                      onChange={(e) => {
                        const provider = providers.find(p => p.id === e.target.value);
                        setSelectedProvider(provider);
                      }}
                    >
                      {providers.map((provider) => (
                        <FormControlLabel
                          key={provider.id}
                          value={provider.id}
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  backgroundColor: provider.buttonColor,
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {provider.providerCode === 'stripe' && <CreditCard sx={{ fontSize: 16, color: 'white' }} />}
                                {provider.providerCode === 'paypal' && <PaymentOutlined sx={{ fontSize: 16, color: 'white' }} />}
                                {provider.providerCode === 'googlepay' && <PaymentOutlined sx={{ fontSize: 16, color: 'white' }} />}
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {provider.displayName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {provider.description}
                                </Typography>
                              </Box>
                            </Box>
                          }
                          sx={{ py: 1 }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>

                  <Divider sx={{ mb: 3 }} />

                  {/* Payment Form */}
                  {selectedProvider && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                        Payment Details
                      </Typography>
                      {renderPaymentForm()}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default CheckoutPage;