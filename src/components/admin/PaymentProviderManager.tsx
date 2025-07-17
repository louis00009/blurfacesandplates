import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  Save,
  Science,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Refresh
} from '@mui/icons-material';
import { PaymentProvider } from '../../types/payment';
import { PaymentProviderCredential } from '../../types/admin';

interface ProviderConfig extends PaymentProvider {
  credentials: PaymentProviderCredential[];
  testStatus?: 'success' | 'failed' | 'pending';
  lastTested?: Date;
}

const PaymentProviderManager: React.FC = () => {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string>();
  const [testing, setTesting] = useState<string>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['stripe']);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      // Mock data for development - replace with real API call when backend is ready
      const mockProviders = [
        {
          id: '1',
          providerCode: 'stripe' as const,
          displayName: 'Stripe',
          description: 'Accept credit cards, debit cards, and other payment methods',
          isActive: true,
          supportsSubscriptions: true,
          supportsOneTime: true,
          feePercentage: 2.9,
          feeFixedCents: 30,
          logoUrl: '/stripe-logo.png',
          buttonColor: '#635bff',
          sortOrder: 1,
          credentials: [
            {
              id: '1',
              providerId: '1',
              credentialKey: 'publishable_key',
              encryptedValue: 'pk_test_...',
              environment: 'sandbox' as const,
              description: 'Stripe publishable key',
              lastTestedAt: new Date(),
              testStatus: 'success' as const,
              testResult: 'Connection successful',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'admin'
            }
          ],
          testStatus: 'success' as const,
          lastTested: new Date()
        },
        {
          id: '2',
          providerCode: 'paypal' as const,
          displayName: 'PayPal',
          description: 'Accept PayPal and major credit cards',
          isActive: true,
          supportsSubscriptions: true,
          supportsOneTime: true,
          feePercentage: 3.4,
          feeFixedCents: 30,
          logoUrl: '/paypal-logo.png',
          buttonColor: '#0070ba',
          sortOrder: 2,
          credentials: [],
          testStatus: 'pending' as const
        },
        {
          id: '3',
          providerCode: 'googlepay' as const,
          displayName: 'Google Pay',
          description: 'Fast and secure payments with Google Pay',
          isActive: false,
          supportsSubscriptions: false,
          supportsOneTime: true,
          feePercentage: 2.9,
          feeFixedCents: 30,
          logoUrl: '/googlepay-logo.png',
          buttonColor: '#4285f4',
          sortOrder: 3,
          credentials: [],
          testStatus: 'failed' as const
        }
      ];
      
      setProviders(mockProviders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderToggle = async (providerId: string, isActive: boolean) => {
    setSaving(providerId);
    try {
      const response = await fetch(`/api/admin/payment-providers/${providerId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update provider status');
      }

      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, isActive } : p
      ));
      
      setSuccess(`${isActive ? 'Enabled' : 'Disabled'} payment provider successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update provider');
    } finally {
      setSaving(undefined);
    }
  };

  const handleCredentialUpdate = async (providerId: string, credentialKey: string, value: string) => {
    setSaving(`${providerId}-${credentialKey}`);
    try {
      const response = await fetch(`/api/admin/payment-providers/${providerId}/credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          credentialKey,
          value,
          environment: 'production' // You might want to make this configurable
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update credentials');
      }

      setSuccess('Credentials updated successfully');
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update credentials');
    } finally {
      setSaving(undefined);
    }
  };

  const testProvider = async (providerId: string) => {
    setTesting(providerId);
    try {
      const response = await fetch(`/api/admin/payment-providers/${providerId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Provider test failed');
      }

      const result = await response.json();
      
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, testStatus: result.success ? 'success' : 'failed', lastTested: new Date() }
          : p
      ));

      if (result.success) {
        setSuccess(`${result.providerName} test successful`);
      } else {
        setError(`${result.providerName} test failed: ${result.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Provider test failed');
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, testStatus: 'failed', lastTested: new Date() }
          : p
      ));
    } finally {
      setTesting(undefined);
    }
  };

  const toggleSensitiveVisibility = (key: string) => {
    setShowSensitive(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePanelChange = (panel: string) => {
    setExpandedPanels(prev =>
      prev.includes(panel)
        ? prev.filter(p => p !== panel)
        : [...prev, panel]
    );
  };

  const getStatusIcon = (provider: ProviderConfig) => {
    if (!provider.isActive) return <Warning color="warning" />;
    if (provider.testStatus === 'success') return <CheckCircle color="success" />;
    if (provider.testStatus === 'failed') return <ErrorIcon color="error" />;
    return null;
  };

  const getCredentialField = (provider: ProviderConfig, credentialKey: string) => {
    const credential = provider.credentials?.find(c => c.credentialKey === credentialKey);
    return credential?.encryptedValue ? '••••••••••••••••' : '';
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading payment providers...</Box>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Payment Provider Configuration
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchProviders}
        >
          Refresh
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {providers.map((provider) => (
          <Grid item xs={12} md={4} key={provider.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">{provider.displayName}</Typography>
                  {getStatusIcon(provider)}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    label={provider.isActive ? 'Active' : 'Inactive'}
                    color={provider.isActive ? 'success' : 'default'}
                    size="small"
                  />
                  {provider.testStatus && (
                    <Chip
                      label={`Test: ${provider.testStatus}`}
                      color={provider.testStatus === 'success' ? 'success' : 'error'}
                      size="small"
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {provider.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Provider Configuration */}
      {providers.map((provider) => (
        <Accordion
          key={provider.id}
          expanded={expandedPanels.includes(provider.providerCode)}
          onChange={() => handlePanelChange(provider.providerCode)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="h6">{provider.displayName}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={provider.isActive ? 'Active' : 'Inactive'}
                  color={provider.isActive ? 'success' : 'default'}
                  size="small"
                />
                {provider.testStatus && (
                  <Chip
                    label={`Test: ${provider.testStatus}`}
                    color={provider.testStatus === 'success' ? 'success' : 'error'}
                    size="small"
                  />
                )}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Provider Status */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={provider.isActive}
                      onChange={(e) => handleProviderToggle(provider.id, e.target.checked)}
                      disabled={saving === provider.id}
                    />
                  }
                  label={`Enable ${provider.displayName}`}
                />
              </Grid>

              {/* Stripe Configuration */}
              {provider.providerCode === 'stripe' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Publishable Key"
                      value={getCredentialField(provider, 'publishable_key')}
                      onChange={(e) => handleCredentialUpdate(provider.id, 'publishable_key', e.target.value)}
                      type={showSensitive[`${provider.id}-publishable_key`] ? 'text' : 'password'}
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => toggleSensitiveVisibility(`${provider.id}-publishable_key`)}
                            edge="end"
                          >
                            {showSensitive[`${provider.id}-publishable_key`] ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        )
                      }}
                      helperText="Your Stripe publishable key (pk_...)"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Secret Key"
                      value={getCredentialField(provider, 'secret_key')}
                      onChange={(e) => handleCredentialUpdate(provider.id, 'secret_key', e.target.value)}
                      type={showSensitive[`${provider.id}-secret_key`] ? 'text' : 'password'}
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => toggleSensitiveVisibility(`${provider.id}-secret_key`)}
                            edge="end"
                          >
                            {showSensitive[`${provider.id}-secret_key`] ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        )
                      }}
                      helperText="Your Stripe secret key (sk_...)"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Webhook Secret"
                      value={getCredentialField(provider, 'webhook_secret')}
                      onChange={(e) => handleCredentialUpdate(provider.id, 'webhook_secret', e.target.value)}
                      type={showSensitive[`${provider.id}-webhook_secret`] ? 'text' : 'password'}
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => toggleSensitiveVisibility(`${provider.id}-webhook_secret`)}
                            edge="end"
                          >
                            {showSensitive[`${provider.id}-webhook_secret`] ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        )
                      }}
                      helperText="Webhook endpoint secret for verification"
                    />
                  </Grid>
                </>
              )}

              {/* PayPal Configuration */}
              {provider.providerCode === 'paypal' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Client ID"
                      value={getCredentialField(provider, 'client_id')}
                      onChange={(e) => handleCredentialUpdate(provider.id, 'client_id', e.target.value)}
                      type={showSensitive[`${provider.id}-client_id`] ? 'text' : 'password'}
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => toggleSensitiveVisibility(`${provider.id}-client_id`)}
                            edge="end"
                          >
                            {showSensitive[`${provider.id}-client_id`] ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        )
                      }}
                      helperText="Your PayPal application client ID"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Client Secret"
                      value={getCredentialField(provider, 'client_secret')}
                      onChange={(e) => handleCredentialUpdate(provider.id, 'client_secret', e.target.value)}
                      type={showSensitive[`${provider.id}-client_secret`] ? 'text' : 'password'}
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => toggleSensitiveVisibility(`${provider.id}-client_secret`)}
                            edge="end"
                          >
                            {showSensitive[`${provider.id}-client_secret`] ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        )
                      }}
                      helperText="Your PayPal application client secret"
                    />
                  </Grid>
                </>
              )}

              {/* Google Pay Configuration */}
              {provider.providerCode === 'googlepay' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Merchant ID"
                      value={getCredentialField(provider, 'merchant_id')}
                      onChange={(e) => handleCredentialUpdate(provider.id, 'merchant_id', e.target.value)}
                      helperText="Your Google Pay merchant ID"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Merchant Name"
                      value={getCredentialField(provider, 'merchant_name')}
                      onChange={(e) => handleCredentialUpdate(provider.id, 'merchant_name', e.target.value)}
                      helperText="Your business name as shown to customers"
                    />
                  </Grid>
                </>
              )}

              {/* Test Connection */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button
                    variant="outlined"
                    startIcon={<Science />}
                    onClick={() => testProvider(provider.id)}
                    disabled={!provider.isActive || testing === provider.id}
                  >
                    {testing === provider.id ? 'Testing...' : 'Test Connection'}
                  </Button>
                  
                  {provider.lastTested && (
                    <Typography variant="body2" color="text.secondary">
                      Last tested: {new Date(provider.lastTested).toLocaleString()}
                    </Typography>
                  )}
                </Stack>
              </Grid>

              {/* Environment Settings */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Environment Settings
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Important:</strong> Make sure you're using production credentials for live payments.
                    Test your configuration thoroughly before enabling each provider.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default PaymentProviderManager;