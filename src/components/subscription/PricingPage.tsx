import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Badge
} from '@mui/material';
import {
  CheckCircle,
  Star,
  Devices,
  Security,
  MonetizationOn,
  AccessTime,
  Close
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionPlan, PaymentProvider } from '../../types/payment';

interface PricingPageProps {
  onSelectPlan: (plan: SubscriptionPlan) => void;
  onClose: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onSelectPlan, onClose }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Mock data - In real app, fetch from API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockPlans: SubscriptionPlan[] = [
          {
            id: '1',
            planCode: 'premium_1year',
            name: '1-Year Access',
            description: 'Full access to all tools for one year',
            priceAUD: 24.95,
            priceUSD: 16.95,
            currencyDefault: 'AUD',
            durationMonths: 12,
            isLifetime: false,
            deviceLimit: 10,
            usageLimit: 10000,
            features: [
              'Access for one year',
              'Full access to all tools',
              'For use on up to 10 devices',
              'No company logo',
              '30-day money-back guarantee'
            ],
            removesBranding: true,
            moneyBackGuaranteeDays: 30,
            isActive: true,
            isFeatured: false,
            sortOrder: 1
          },
          {
            id: '2',
            planCode: 'premium_lifetime',
            name: 'Permanent Access',
            description: 'One-time fee, not a subscription',
            priceAUD: 49.95,
            priceUSD: 33.95,
            currencyDefault: 'AUD',
            isLifetime: true,
            deviceLimit: 10,
            usageLimit: 999999,
            features: [
              'Lifetime access',
              'Full access to all tools',
              'For use on up to 10 devices',
              'No company logo',
              '30-day money-back guarantee'
            ],
            removesBranding: true,
            moneyBackGuaranteeDays: 30,
            isActive: true,
            isFeatured: true,
            sortOrder: 2
          }
        ];

        setPlans(mockPlans);
      } catch (err) {
        setError('Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const getFeatureIcon = (feature: string) => {
    if (feature.toLowerCase().includes('device')) return <Devices fontSize="small" />;
    if (feature.toLowerCase().includes('guarantee')) return <Security fontSize="small" />;
    if (feature.toLowerCase().includes('lifetime') || feature.toLowerCase().includes('year')) return <AccessTime fontSize="small" />;
    return <CheckCircle fontSize="small" />;
  };

  const formatPrice = (priceAUD: number, priceUSD: number) => {
    return {
      aud: priceAUD.toFixed(2),
      usd: priceUSD.toFixed(2)
    };
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
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" gutterBottom fontWeight="bold">
              Choose Your Plan
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              Upgrade to Premium for unlimited access to all features
            </Typography>
            {user && (
              <Chip
                label={`Current: ${user.membershipLevel.toUpperCase()}`}
                color={user.membershipLevel === 'free' ? 'default' : 'success'}
                variant="outlined"
              />
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 4 }}>
              {error}
            </Alert>
          )}

          {/* Pricing Cards */}
          <Grid container spacing={4} justifyContent="center">
            {plans.map((plan) => {
              const prices = formatPrice(plan.priceAUD, plan.priceUSD);
              const isPopular = plan.isFeatured;

              return (
                <Grid item xs={12} md={6} key={plan.id}>
                  <Card
                    sx={{
                      position: 'relative',
                      height: '100%',
                      border: isPopular ? 3 : 1,
                      borderColor: isPopular ? 'primary.main' : 'divider',
                      transform: isPopular ? 'scale(1.05)' : 'none',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: isPopular ? 'scale(1.05)' : 'scale(1.02)',
                        boxShadow: 6
                      }
                    }}
                  >
                    {/* Popular badge */}
                    {isPopular && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -10,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 1
                        }}
                      >
                        <Chip
                          icon={<Star />}
                          label="MOST POPULAR"
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                    )}

                    <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Plan header */}
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          {plan.name}
                        </Typography>
                        
                        <Stack direction="row" alignItems="baseline" justifyContent="center" spacing={1} sx={{ mb: 1 }}>
                          <Typography variant="h3" fontWeight="bold" color="primary.main">
                            AU${prices.aud}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            (US${prices.usd})
                          </Typography>
                        </Stack>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {plan.description}
                        </Typography>

                        {plan.isLifetime && (
                          <Chip
                            label="One-time fee, not a subscription"
                            color="success"
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </Box>

                      {/* Features list */}
                      <Box sx={{ flex: 1, mb: 3 }}>
                        <List dense>
                          {plan.features.map((feature, index) => (
                            <ListItem key={index} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <CheckCircle color="success" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={feature}
                                primaryTypographyProps={{ fontSize: '0.9rem' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>

                      {/* Action button */}
                      <Button
                        variant={isPopular ? "contained" : "outlined"}
                        color="primary"
                        size="large"
                        fullWidth
                        onClick={() => onSelectPlan(plan)}
                        sx={{
                          py: 1.5,
                          fontSize: '1.1rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {plan.isLifetime ? 'Get Lifetime Access' : 'Get 1-Year Access'}
                      </Button>

                      {/* Additional info */}
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {plan.moneyBackGuaranteeDays}-day money-back guarantee
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Additional information */}
          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Why Choose Premium?
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Security sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Professional Quality
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Advanced AI detection with higher accuracy and better results
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Devices sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Multi-Device Access
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use on up to 10 devices including desktop, tablet, and mobile
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <MonetizationOn sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Money-Back Guarantee
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Full refund within 30 days if you're not completely satisfied
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Secure payment processing • Instant activation • Cancel anytime
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default PricingPage;