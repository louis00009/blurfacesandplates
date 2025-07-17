import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  Chip,
  CircularProgress,
  Stack,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  Save,
  Refresh,
  Visibility,
  VisibilityOff,
  Info,
  RestartAlt
} from '@mui/icons-material';
import { AdminConfiguration, ConfigurationCategory, SystemBranding } from '../../types/admin';

const SystemConfigurationPanel: React.FC = () => {
  const [configurations, setConfigurations] = useState<ConfigurationCategory[]>([]);
  const [branding, setBranding] = useState<SystemBranding>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['payment']);

  useEffect(() => {
    fetchConfigurations();
    fetchBranding();
  }, []);

  const fetchConfigurations = async () => {
    try {
      // Mock data for development - replace with real API call when backend is ready
      const mockData = {
        categories: [
          {
            category: 'payment',
            displayName: 'Payment Settings',
            description: 'Configure payment processing and billing options',
            icon: 'payment',
            subcategories: [
              {
                subcategory: 'general',
                displayName: 'General Payment Settings',
                configs: [
                  {
                    id: '1',
                    configKey: 'default_currency',
                    configValue: 'AUD',
                    displayName: 'Default Currency',
                    description: 'Default currency for payments',
                    dataType: 'string' as const,
                    inputType: 'select' as const,
                    inputOptions: { options: [
                      { value: 'AUD', label: 'Australian Dollar' },
                      { value: 'USD', label: 'US Dollar' }
                    ]},
                    isRequired: true,
                    category: 'payment',
                    subcategory: 'general',
                    sortOrder: 1,
                    requiresRestart: false,
                    isSensitive: false,
                    adminLevelRequired: 'admin' as const,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  {
                    id: '2',
                    configKey: 'test_mode',
                    configValue: 'true',
                    displayName: 'Test Mode',
                    description: 'Enable test mode for payments',
                    dataType: 'boolean' as const,
                    inputType: 'checkbox' as const,
                    isRequired: false,
                    category: 'payment',
                    subcategory: 'general',
                    sortOrder: 2,
                    requiresRestart: true,
                    isSensitive: false,
                    adminLevelRequired: 'admin' as const,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }
                ]
              }
            ]
          },
          {
            category: 'email',
            displayName: 'Email Settings',
            description: 'Configure email templates and SMTP settings',
            icon: 'email',
            subcategories: [
              {
                subcategory: 'smtp',
                displayName: 'SMTP Configuration',
                configs: [
                  {
                    id: '3',
                    configKey: 'smtp_host',
                    configValue: 'smtp.gmail.com',
                    displayName: 'SMTP Host',
                    description: 'SMTP server hostname',
                    dataType: 'string' as const,
                    inputType: 'text' as const,
                    isRequired: true,
                    category: 'email',
                    subcategory: 'smtp',
                    sortOrder: 1,
                    requiresRestart: true,
                    isSensitive: false,
                    adminLevelRequired: 'admin' as const,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  {
                    id: '4',
                    configKey: 'smtp_password',
                    configValue: '',
                    displayName: 'SMTP Password',
                    description: 'SMTP server password',
                    dataType: 'string' as const,
                    inputType: 'text' as const,
                    isRequired: true,
                    category: 'email',
                    subcategory: 'smtp',
                    sortOrder: 2,
                    requiresRestart: true,
                    isSensitive: true,
                    adminLevelRequired: 'admin' as const,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }
                ]
              }
            ]
          }
        ]
      };
      
      setConfigurations(mockData.categories);
      
      // Initialize form data
      const initialData: Record<string, any> = {};
      mockData.categories.forEach((category: ConfigurationCategory) => {
        category.subcategories.forEach(subcategory => {
          subcategory.configs.forEach(config => {
            initialData[config.configKey] = config.configValue;
          });
        });
      });
      setFormData(initialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configurations');
    }
  };

  const fetchBranding = async () => {
    try {
      // Mock branding data for development - replace with real API call when backend is ready
      const mockBranding = {
        id: '1',
        companyName: 'AI Image Anonymizer',
        companyTagline: 'Privacy-First Image Processing',
        logoUrl: '',
        logoDarkUrl: '',
        faviconUrl: '',
        emailHeaderImageUrl: '',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        accentColor: '#ff9800',
        supportEmail: 'support@imageapp.com',
        salesEmail: 'sales@imageapp.com',
        phoneNumber: '+61 2 1234 5678',
        companyAddressLine1: '123 Tech Street',
        companyAddressLine2: 'Suite 100',
        companyCity: 'Sydney',
        companyState: 'NSW',
        companyPostalCode: '2000',
        companyCountry: 'Australia',
        abnNumber: '12 345 678 901',
        taxNumber: 'TAX123456789',
        websiteUrl: 'https://imageapp.com',
        facebookUrl: '',
        twitterUrl: '',
        linkedinUrl: '',
        termsOfServiceUrl: '/terms',
        privacyPolicyUrl: '/privacy',
        refundPolicyUrl: '/refund',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'admin'
      };
      
      setBranding(mockBranding);
    } catch (err) {
      console.error('Failed to load branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (configKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [configKey]: value
    }));
  };

  const handleBrandingChange = (field: string, value: any) => {
    setBranding(prev => prev ? {
      ...prev,
      [field]: value
    } : undefined);
  };

  const saveConfigurations = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/configurations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          configurations: formData,
          branding
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save configurations');
      }

      setSuccess('Configuration saved successfully');
      
      // Check if restart is required
      const requiresRestart = configurations.some(category =>
        category.subcategories.some(subcategory =>
          subcategory.configs.some(config => 
            config.requiresRestart && formData[config.configKey] !== config.configValue
          )
        )
      );

      if (requiresRestart) {
        setSuccess('Configuration saved successfully. System restart may be required for some changes to take effect.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configurations');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async (category: string) => {
    try {
      const response = await fetch(`/api/admin/configurations/reset/${category}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reset configurations');
      }

      await fetchConfigurations();
      setSuccess(`${category} settings reset to defaults`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset configurations');
    }
  };

  const toggleSensitiveVisibility = (configKey: string) => {
    setShowSensitive(prev => ({
      ...prev,
      [configKey]: !prev[configKey]
    }));
  };

  const handlePanelChange = (panel: string) => {
    setExpandedPanels(prev =>
      prev.includes(panel)
        ? prev.filter(p => p !== panel)
        : [...prev, panel]
    );
  };

  const renderConfigInput = (config: AdminConfiguration) => {
    const value = formData[config.configKey] || '';
    const isExpanded = expandedPanels.includes(config.category);

    switch (config.inputType) {
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value === 'true' || value === true}
                onChange={(e) => handleConfigChange(config.configKey, e.target.checked)}
              />
            }
            label={config.displayName}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{config.displayName}</InputLabel>
            <Select
              value={value}
              label={config.displayName}
              onChange={(e) => handleConfigChange(config.configKey, e.target.value)}
            >
              {config.inputOptions?.options?.map((option: any) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label={config.displayName}
            value={value}
            onChange={(e) => handleConfigChange(config.configKey, e.target.value)}
            helperText={config.description}
            required={config.isRequired}
            size="small"
          />
        );

      case 'color':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <input
              type="color"
              value={value}
              onChange={(e) => handleConfigChange(config.configKey, e.target.value)}
              style={{
                width: 50,
                height: 40,
                border: '2px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
            <TextField
              label={config.displayName}
              value={value}
              onChange={(e) => handleConfigChange(config.configKey, e.target.value)}
              helperText={config.description}
              size="small"
              sx={{ flex: 1 }}
            />
          </Box>
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={config.displayName}
            value={value}
            onChange={(e) => handleConfigChange(config.configKey, e.target.value)}
            helperText={config.description}
            required={config.isRequired}
            size="small"
            inputProps={config.validationRules}
          />
        );

      case 'email':
        return (
          <TextField
            fullWidth
            type="email"
            label={config.displayName}
            value={value}
            onChange={(e) => handleConfigChange(config.configKey, e.target.value)}
            helperText={config.description}
            required={config.isRequired}
            size="small"
          />
        );

      case 'text':
      default:
        return (
          <TextField
            fullWidth
            label={config.displayName}
            value={value}
            onChange={(e) => handleConfigChange(config.configKey, e.target.value)}
            helperText={config.description}
            required={config.isRequired}
            size="small"
            type={config.isSensitive && !showSensitive[config.configKey] ? 'password' : 'text'}
            InputProps={config.isSensitive ? {
              endAdornment: (
                <IconButton
                  onClick={() => toggleSensitiveVisibility(config.configKey)}
                  edge="end"
                  size="small"
                >
                  {showSensitive[config.configKey] ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              )
            } : undefined}
          />
        );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          System Configuration
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchConfigurations();
              fetchBranding();
            }}
          >
            Reload
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <Save />}
            onClick={saveConfigurations}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </Stack>
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

      {/* Configuration Sections */}
      {configurations.map((category) => (
        <Accordion
          key={category.category}
          expanded={expandedPanels.includes(category.category)}
          onChange={() => handlePanelChange(category.category)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">{category.displayName}</Typography>
              <Chip
                label={`${category.subcategories.reduce((total, sub) => total + sub.configs.length, 0)} settings`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {category.description}
            </Typography>

            {category.subcategories.map((subcategory, subIndex) => (
              <Box key={subcategory.subcategory} sx={{ mb: 4 }}>
                {subcategory.subcategory && (
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {subcategory.displayName}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<RestartAlt />}
                      onClick={() => resetToDefaults(category.category)}
                    >
                      Reset to Defaults
                    </Button>
                  </Box>
                )}

                <Grid container spacing={3}>
                  {subcategory.configs.map((config) => (
                    <Grid item xs={12} md={config.inputType === 'textarea' ? 12 : 6} key={config.configKey}>
                      <Box>
                        {config.inputType === 'checkbox' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {renderConfigInput(config)}
                            {config.requiresRestart && (
                              <Tooltip title="Requires system restart">
                                <RestartAlt color="warning" fontSize="small" />
                              </Tooltip>
                            )}
                            {config.description && (
                              <Tooltip title={config.description}>
                                <Info color="action" fontSize="small" />
                              </Tooltip>
                            )}
                          </Box>
                        ) : (
                          <Box>
                            {renderConfigInput(config)}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              {config.requiresRestart && (
                                <Chip
                                  label="Requires restart"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  icon={<RestartAlt />}
                                />
                              )}
                              {config.isSensitive && (
                                <Chip
                                  label="Sensitive"
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {subIndex < category.subcategories.length - 1 && <Divider sx={{ mt: 3 }} />}
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* System Branding Section */}
      {branding && (
        <Accordion
          expanded={expandedPanels.includes('branding')}
          onChange={() => handlePanelChange('branding')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">System Branding</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure your company branding, contact information, and appearance settings.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={branding.companyName}
                  onChange={(e) => handleBrandingChange('companyName', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Tagline"
                  value={branding.companyTagline || ''}
                  onChange={(e) => handleBrandingChange('companyTagline', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    style={{
                      width: 50,
                      height: 40,
                      border: '2px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <TextField
                    label="Primary Color"
                    value={branding.primaryColor}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input
                    type="color"
                    value={branding.secondaryColor}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    style={{
                      width: 50,
                      height: 40,
                      border: '2px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <TextField
                    label="Secondary Color"
                    value={branding.secondaryColor}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input
                    type="color"
                    value={branding.accentColor}
                    onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                    style={{
                      width: 50,
                      height: 40,
                      border: '2px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <TextField
                    label="Accent Color"
                    value={branding.accentColor}
                    onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Support Email"
                  type="email"
                  value={branding.supportEmail}
                  onChange={(e) => handleBrandingChange('supportEmail', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website URL"
                  value={branding.websiteUrl || ''}
                  onChange={(e) => handleBrandingChange('websiteUrl', e.target.value)}
                  size="small"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default SystemConfigurationPanel;