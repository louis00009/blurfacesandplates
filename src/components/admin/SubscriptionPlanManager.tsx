import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Grid
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Settings,
  TrendingUp,
  AttachMoney
} from '@mui/icons-material';
import { SubscriptionPlan } from '../../types/payment';

const SubscriptionPlanManager: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>();
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      // Mock data for development - replace with real API call when backend is ready
      const mockPlans = [
        {
          id: '1',
          planCode: 'YEAR_ACCESS',
          name: '1-Year Access',
          description: 'Full access to all features for one year',
          priceAUD: 24.95,
          priceUSD: 19.95,
          currencyDefault: 'AUD',
          durationMonths: 12,
          isLifetime: false,
          deviceLimit: 3,
          usageLimit: 10000,
          features: [
            'Unlimited image processing',
            'Advanced AI detection',
            'Batch processing',
            'Priority support'
          ],
          removesBranding: true,
          moneyBackGuaranteeDays: 30,
          isActive: true,
          isFeatured: false,
          sortOrder: 1
        },
        {
          id: '2',
          planCode: 'LIFETIME_ACCESS',
          name: 'Permanent Access',
          description: 'One-time payment for lifetime access',
          priceAUD: 49.95,
          priceUSD: 39.95,
          currencyDefault: 'AUD',
          durationMonths: undefined,
          isLifetime: true,
          deviceLimit: 5,
          usageLimit: 999999,
          features: [
            'Everything in 1-Year plan',
            'Lifetime updates',
            'Premium support',
            'Commercial license',
            'API access'
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
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan?: SubscriptionPlan) => {
    if (plan) {
      setSelectedPlan(plan);
      setFormData({ ...plan });
    } else {
      setSelectedPlan(undefined);
      setFormData({
        planCode: '',
        name: '',
        description: '',
        priceAUD: 0,
        priceUSD: 0,
        currencyDefault: 'AUD',
        durationMonths: undefined,
        isLifetime: false,
        deviceLimit: 1,
        usageLimit: 1000,
        features: [],
        removesBranding: false,
        moneyBackGuaranteeDays: 30,
        isActive: true,
        isFeatured: false,
        sortOrder: plans.length + 1
      });
    }
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = selectedPlan 
        ? `/api/admin/subscription-plans/${selectedPlan.id}`
        : '/api/admin/subscription-plans';
      
      const method = selectedPlan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${selectedPlan ? 'update' : 'create'} plan`);
      }

      setSuccess(`Plan ${selectedPlan ? 'updated' : 'created'} successfully`);
      setEditDialogOpen(false);
      await fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/api/admin/subscription-plans/${selectedPlan.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete plan');
      }

      setSuccess('Plan deleted successfully');
      setDeleteDialogOpen(false);
      await fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  const togglePlanStatus = async (plan: SubscriptionPlan) => {
    try {
      const response = await fetch(`/api/admin/subscription-plans/${plan.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to toggle plan status');
      }

      setSuccess(`Plan ${plan.isActive ? 'deactivated' : 'activated'} successfully`);
      await fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle plan status');
    }
  };

  const addFeature = () => {
    const features = Array.isArray(formData.features) ? formData.features : [];
    setFormData({
      ...formData,
      features: [...features, '']
    });
  };

  const updateFeature = (index: number, value: string) => {
    const features = Array.isArray(formData.features) ? [...formData.features] : [];
    features[index] = value;
    setFormData({
      ...formData,
      features
    });
  };

  const removeFeature = (index: number) => {
    const features = Array.isArray(formData.features) ? [...formData.features] : [];
    features.splice(index, 1);
    setFormData({
      ...formData,
      features
    });
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading...</Box>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Subscription Plans
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleEdit()}
        >
          Add New Plan
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

      {/* Plans Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Features</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight="medium">{plan.name}</Typography>
                    {plan.isFeatured && (
                      <Chip label="Popular" color="primary" size="small" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {plan.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="medium">
                    AUD ${plan.priceAUD.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {plan.durationMonths ? `${plan.durationMonths} months` : 'Lifetime'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={plan.isActive ? 'Active' : 'Inactive'}
                    color={plan.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {Array.isArray(plan.features) ? plan.features.length : 0} features
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit Plan">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={plan.isActive ? 'Deactivate' : 'Activate'}>
                      <IconButton
                        size="small"
                        onClick={() => togglePlanStatus(plan)}
                      >
                        {plan.isActive ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Plan">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPlan ? 'Edit Plan' : 'Create New Plan'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Plan Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={formData.priceAUD || 0}
                onChange={(e) => setFormData({ ...formData, priceAUD: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>AUD $</Typography>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duration (months)"
                type="number"
                value={formData.durationMonths || ''}
                onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value ? parseInt(e.target.value) : undefined })}
                helperText="Leave empty for lifetime access"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sort Order"
                type="number"
                value={formData.sortOrder || 0}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive || false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isFeatured || false}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  />
                }
                label="Popular Plan"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Features
              </Typography>
              {Array.isArray(formData.features) && formData.features.map((feature, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="Enter feature description"
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => removeFeature(index)}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={addFeature}
              >
                Add Feature
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
          >
            {selectedPlan ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Plan</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the plan "{selectedPlan?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionPlanManager;