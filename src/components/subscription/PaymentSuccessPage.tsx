import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  CheckCircle,
  Download,
  Email,
  Receipt,
  Star,
  Close
} from '@mui/icons-material';
import { UserSubscription, Payment } from '../../types/payment';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentSuccessPageProps {
  subscriptionId: string;
  onClose: () => void;
}

const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({
  subscriptionId,
  onClose
}) => {
  const { user, updateProfile } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription>();
  const [payment, setPayment] = useState<Payment>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      try {
        const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch subscription details');
        }

        const data = await response.json();
        setSubscription(data.subscription);
        setPayment(data.payment);

        // Update user profile to reflect new membership
        if (user) {
          await updateProfile({
            membershipLevel: 'premium',
            subscriptionStatus: 'active'
          });
        }

        // Send confirmation email
        try {
          await fetch('/api/subscriptions/send-confirmation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ subscriptionId })
          });
          setEmailSent(true);
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription details');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionDetails();
  }, [subscriptionId, user, updateProfile]);

  const downloadReceipt = async () => {
    if (!payment?.receiptUrl) return;

    try {
      const response = await fetch(payment.receiptUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download receipt');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${payment.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download receipt:', err);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
        maxWidth="md"
        onClick={(e) => e.stopPropagation()}
        sx={{
          backgroundColor: 'white',
          borderRadius: 2,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        {/* Close button */}
        <Button
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            minWidth: 'auto',
            p: 1,
            zIndex: 1
          }}
        >
          <Close />
        </Button>

        <Box sx={{ py: 6, px: 4 }}>
          {error ? (
            <Alert severity="error">
              {error}
            </Alert>
          ) : (
            <>
              {/* Success Header */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <CheckCircle
                  sx={{
                    fontSize: 80,
                    color: 'success.main',
                    mb: 2
                  }}
                />
                <Typography variant="h3" gutterBottom fontWeight="bold" color="success.main">
                  Payment Successful!
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                  Welcome to Premium! Your subscription is now active.
                </Typography>
                
                {subscription?.plan && (
                  <Chip
                    icon={<Star />}
                    label={`${subscription.plan.name} - Active`}
                    color="success"
                    size="medium"
                    sx={{ fontSize: '1rem', px: 2, py: 1 }}
                  />
                )}
              </Box>

              {/* Subscription Details */}
              {subscription && (
                <Card sx={{ mb: 4 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Subscription Details
                    </Typography>
                    
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Plan:</Typography>
                        <Typography fontWeight="medium">
                          {subscription.plan?.name}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Status:</Typography>
                        <Chip
                          label={subscription.status.toUpperCase()}
                          color="success"
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Started:</Typography>
                        <Typography fontWeight="medium">
                          {formatDate(subscription.startsAt)}
                        </Typography>
                      </Box>
                      
                      {subscription.expiresAt ? (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography color="text.secondary">Expires:</Typography>
                          <Typography fontWeight="medium">
                            {formatDate(subscription.expiresAt)}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography color="text.secondary">Access:</Typography>
                          <Typography fontWeight="medium" color="success.main">
                            Lifetime
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Payment Details */}
              {payment && (
                <Card sx={{ mb: 4 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Payment Details
                    </Typography>
                    
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Amount Paid:</Typography>
                        <Typography fontWeight="medium">
                          AU${payment.amount.toFixed(2)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Payment Method:</Typography>
                        <Typography fontWeight="medium">
                          {payment.provider?.displayName}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Transaction ID:</Typography>
                        <Typography fontWeight="medium" variant="body2">
                          {payment.externalPaymentId}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Date:</Typography>
                        <Typography fontWeight="medium">
                          {formatDate(payment.createdAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Email Confirmation */}
              {emailSent && (
                <Alert severity="success" sx={{ mb: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Email fontSize="small" />
                    <Typography variant="body2">
                      Confirmation email sent to {user?.email}
                    </Typography>
                  </Stack>
                </Alert>
              )}

              {/* Action Buttons */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                {payment?.receiptUrl && (
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={downloadReceipt}
                    fullWidth
                  >
                    Download Receipt
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  startIcon={<Receipt />}
                  onClick={() => window.open(`/api/payments/${payment?.id}/invoice`, '_blank')}
                  fullWidth
                >
                  View Invoice
                </Button>
              </Stack>

              <Divider sx={{ mb: 4 }} />

              {/* What's Next */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  What's Next?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  You now have full access to all premium features. Start processing your images with advanced AI detection!
                </Typography>
                
                <Button
                  variant="contained"
                  size="large"
                  onClick={onClose}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Start Using Premium Features
                </Button>
              </Box>

              {/* Support Information */}
              <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Need help? Contact our support team at{' '}
                  <a href="mailto:support@imageapp.com" style={{ color: 'inherit' }}>
                    support@imageapp.com
                  </a>
                  <br />
                  Remember: You have a 30-day money-back guarantee.
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default PaymentSuccessPage;