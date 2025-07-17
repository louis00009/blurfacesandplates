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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Grid,
  Switch,
  FormControlLabel,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ContentCopy,
  Visibility,
  VisibilityOff,
  LocalOffer,
  TrendingUp,
  People,
  AttachMoney
} from '@mui/icons-material';
import { CouponCode } from '../../types/payment';

const CouponManager: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponCode>();
  const [formData, setFormData] = useState<Partial<CouponCode>>({});

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      // Mock data for development - replace with real API call when backend is ready
      const mockCoupons = [
        {
          id: '1',
          code: 'WELCOME20',
          name: 'Welcome Discount',
          description: '20% off for new customers',
          discountType: 'percentage' as const,
          discountValue: 20,
          maxDiscountAmount: 10,
          usageLimit: 100,
          usageCount: 25,
          userUsageLimit: 1,
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2024-12-31'),
          applicablePlans: ['1', '2'],
          isActive: true
        },
        {
          id: '2',
          code: 'SAVE5AUD',
          name: 'Fixed Discount',
          description: 'Save $5 on any purchase',
          discountType: 'fixed_amount' as const,
          discountValue: 5,
          usageLimit: 50,
          usageCount: 12,
          userUsageLimit: 1,
          validFrom: new Date('2024-01-01'),
          validUntil: undefined,
          applicablePlans: ['1'],
          isActive: true
        },
        {
          id: '3',
          code: 'EXPIRED10',
          name: 'Expired Coupon',
          description: 'This coupon has expired',
          discountType: 'percentage' as const,
          discountValue: 10,
          usageLimit: 20,
          usageCount: 20,
          userUsageLimit: 1,
          validFrom: new Date('2023-01-01'),
          validUntil: new Date('2023-12-31'),
          applicablePlans: ['1', '2'],
          isActive: false
        }
      ];
      
      setCoupons(mockCoupons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (coupon?: CouponCode) => {
    if (coupon) {
      setSelectedCoupon(coupon);
      setFormData({ ...coupon });
    } else {
      setSelectedCoupon(undefined);
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        maxDiscountAmount: undefined,
        usageLimit: undefined,
        usageCount: 0,
        userUsageLimit: 1,
        isActive: true,
        validFrom: new Date(),
        validUntil: undefined,
        applicablePlans: [],
        name: ''
      });
    }
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = selectedCoupon 
        ? `/api/admin/coupons/${selectedCoupon.id}`
        : '/api/admin/coupons';
      
      const method = selectedCoupon ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${selectedCoupon ? 'update' : 'create'} coupon`);
      }

      setSuccess(`Coupon ${selectedCoupon ? 'updated' : 'created'} successfully`);
      setEditDialogOpen(false);
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save coupon');
    }
  };

  const handleDelete = async () => {
    if (!selectedCoupon) return;

    try {
      const response = await fetch(`/api/admin/coupons/${selectedCoupon.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete coupon');
      }

      setSuccess('Coupon deleted successfully');
      setDeleteDialogOpen(false);
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete coupon');
    }
  };

  const toggleCouponStatus = async (coupon: CouponCode) => {
    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to toggle coupon status');
      }

      setSuccess(`Coupon ${coupon.isActive ? 'deactivated' : 'activated'} successfully`);
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle coupon status');
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess('Coupon code copied to clipboard');
  };

  const generateCouponCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setFormData({ ...formData, code: result });
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'No expiry';
    return new Date(date).toLocaleDateString('en-AU');
  };

  const formatDiscount = (coupon: CouponCode) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}%`;
    } else {
      return `AU$${coupon.discountValue.toFixed(2)}`;
    }
  };

  const getCouponStatus = (coupon: CouponCode) => {
    if (!coupon.isActive) return { label: 'Inactive', color: 'default' as const };
    
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;
    
    if (validFrom > now) return { label: 'Scheduled', color: 'info' as const };
    if (validUntil && validUntil < now) return { label: 'Expired', color: 'error' as const };
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return { label: 'Used Up', color: 'error' as const };
    
    return { label: 'Active', color: 'success' as const };
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading coupons...</Box>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Coupon Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleEdit()}
        >
          Create Coupon
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalOffer sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {coupons.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Coupons
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {coupons.filter(c => c.isActive && getCouponStatus(c).label === 'Active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Coupons
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <People sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {coupons.reduce((sum, c) => sum + c.usageCount, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Uses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AttachMoney sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {coupons.filter(c => c.discountType === 'percentage').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Percentage Discounts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Coupons Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Validity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.map((coupon) => {
              const status = getCouponStatus(coupon);
              return (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
                        {coupon.code}
                      </Typography>
                      <Tooltip title="Copy code">
                        <IconButton 
                          size="small" 
                          onClick={() => copyCouponCode(coupon.code)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {coupon.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="medium">
                      {formatDiscount(coupon)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {coupon.usageCount}
                      {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                    </Typography>
                    {coupon.userUsageLimit && (
                      <Typography variant="body2" color="text.secondary">
                        {coupon.userUsageLimit} per user
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      From: {formatDate(coupon.validFrom)}
                    </Typography>
                    <Typography variant="body2">
                      Until: {formatDate(coupon.validUntil)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Edit Coupon">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(coupon)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={coupon.isActive ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          onClick={() => toggleCouponStatus(coupon)}
                        >
                          {coupon.isActive ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Coupon">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedCoupon(coupon);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
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
          {selectedCoupon ? 'Edit Coupon' : 'Create New Coupon'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Coupon Code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={generateCouponCode}
                      >
                        Generate
                      </Button>
                    </InputAdornment>
                  )
                }}
                helperText="8-12 characters, letters and numbers only"
              />
            </Grid>
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Discount Type</InputLabel>
                <Select
                  value={formData.discountType || 'percentage'}
                  label="Discount Type"
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed_amount' })}
                >
                  <MenuItem value="percentage">Percentage</MenuItem>
                  <MenuItem value="fixed_amount">Fixed Amount</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Discount Value"
                type="number"
                value={formData.discountValue || 0}
                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: formData.discountType === 'fixed_amount' ? <InputAdornment position="start">AU$</InputAdornment> : undefined,
                  endAdornment: formData.discountType === 'percentage' ? <InputAdornment position="end">%</InputAdornment> : undefined
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Maximum Discount (Optional)"
                type="number"
                value={formData.maxDiscountAmount || ''}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">AU$</InputAdornment>
                }}
                helperText="Maximum discount amount for percentage coupons"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Usage Limit (Optional)"
                type="number"
                value={formData.usageLimit || ''}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                helperText="Total number of times this coupon can be used"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Per User Limit (Optional)"
                type="number"
                value={formData.userUsageLimit || ''}
                onChange={(e) => setFormData({ ...formData, userUsageLimit: e.target.value ? parseInt(e.target.value) : 1 })}
                helperText="Maximum uses per user"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Valid From"
                type="date"
                value={formData.validFrom ? new Date(formData.validFrom).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, validFrom: new Date(e.target.value) })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Valid Until (Optional)"
                type="date"
                value={formData.validUntil ? new Date(formData.validUntil).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value ? new Date(e.target.value) : undefined })}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for no expiry"
              />
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
            {selectedCoupon ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Coupon</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the coupon "{selectedCoupon?.code}"?
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

export default CouponManager;