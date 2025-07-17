import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
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
  Avatar,
  Pagination,
  InputAdornment
} from '@mui/material';
import {
  Search,
  FilterList,
  Visibility,
  Edit,
  Block,
  CheckCircle,
  Email,
  Receipt,
  Refresh,
  FileDownload,
  People,
  TrendingUp,
  AttachMoney,
  Warning
} from '@mui/icons-material';
import { UserSubscription, SubscriptionPlan } from '../../types/payment';

interface UserSubscriptionWithDetails extends UserSubscription {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  plan: SubscriptionPlan;
  createdAt: Date;
}

const UserSubscriptionManager: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscriptionWithDetails>();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    cancelled: 0,
    revenue: 0
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
    fetchStats();
  }, [page, searchTerm, statusFilter, planFilter]);

  const fetchSubscriptions = async () => {
    try {
      // Mock data for development - replace with real API call when backend is ready
      const mockSubscriptions = [
        {
          id: '1',
          userId: 'user1',
          planId: '1',
          status: 'active' as const,
          startsAt: new Date('2024-01-01'),
          expiresAt: new Date('2025-01-01'),
          cancelledAt: undefined,
          amountPaidAUD: 24.95,
          amountPaidUSD: 19.95,
          currencyPaid: 'AUD',
          paymentId: 'pay_123',
          autoRenew: false,
          deviceCount: 2,
          createdAt: new Date('2024-01-01'),
          user: {
            id: 'user1',
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            avatar: ''
          },
          plan: {
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
            features: ['Unlimited processing', 'Advanced AI', 'Priority support'],
            removesBranding: true,
            moneyBackGuaranteeDays: 30,
            isActive: true,
            isFeatured: false,
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        {
          id: '2',
          userId: 'user2',
          planId: '2',
          status: 'active' as const,
          startsAt: new Date('2024-01-15'),
          expiresAt: undefined,
          cancelledAt: undefined,
          amountPaidAUD: 49.95,
          currencyPaid: 'AUD',
          paymentId: 'pay_456',
          autoRenew: false,
          deviceCount: 1,
          createdAt: new Date('2024-01-15'),
          user: {
            id: 'user2',
            email: 'jane.smith@example.com',
            firstName: 'Jane',
            lastName: 'Smith'
          },
          plan: {
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
            features: ['Everything in 1-Year plan', 'Lifetime updates', 'Premium support'],
            removesBranding: true,
            moneyBackGuaranteeDays: 30,
            isActive: true,
            isFeatured: true,
            sortOrder: 2,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        {
          id: '3',
          userId: 'user3',
          planId: '1',
          status: 'expired' as const,
          startsAt: new Date('2023-01-01'),
          expiresAt: new Date('2024-01-01'),
          cancelledAt: undefined,
          amountPaidAUD: 24.95,
          currencyPaid: 'AUD',
          paymentId: 'pay_789',
          autoRenew: false,
          deviceCount: 1,
          createdAt: new Date('2023-01-01'),
          user: {
            id: 'user3',
            email: 'bob.wilson@example.com',
            firstName: 'Bob',
            lastName: 'Wilson'
          },
          plan: {
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
            features: ['Unlimited processing', 'Advanced AI', 'Priority support'],
            removesBranding: true,
            moneyBackGuaranteeDays: 30,
            isActive: true,
            isFeatured: false,
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      ];

      // Apply filters (simplified for demo)
      let filteredSubscriptions = mockSubscriptions;
      
      if (statusFilter !== 'all') {
        filteredSubscriptions = filteredSubscriptions.filter(sub => sub.status === statusFilter);
      }
      
      if (searchTerm) {
        filteredSubscriptions = filteredSubscriptions.filter(sub => 
          sub.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sub.user.firstName && sub.user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (sub.user.lastName && sub.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      setSubscriptions(filteredSubscriptions);
      setTotalPages(Math.ceil(filteredSubscriptions.length / 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      // Mock plans data for development
      const mockPlans: SubscriptionPlan[] = [
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
          features: ['Unlimited processing', 'Advanced AI', 'Priority support'],
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
          features: ['Everything in 1-Year plan', 'Lifetime updates', 'Premium support'],
          removesBranding: true,
          moneyBackGuaranteeDays: 30,
          isActive: true,
          isFeatured: true,
          sortOrder: 2
        }
      ];
      setPlans(mockPlans);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const fetchStats = async () => {
    try {
      // Mock stats data for development
      const mockStats = {
        total: 3,
        active: 2,
        expired: 1,
        cancelled: 0,
        revenue: 99.85
      };
      setStats(mockStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleStatusChange = async (subscriptionId: string, newStatus: string, reason?: string) => {
    try {
      const response = await fetch(`/api/admin/user-subscriptions/${subscriptionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription status');
      }

      setSuccess('Subscription status updated successfully');
      await fetchSubscriptions();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
    }
  };

  const handleRefund = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/admin/user-subscriptions/${subscriptionId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      setSuccess('Refund processed successfully');
      await fetchSubscriptions();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    }
  };

  const sendEmail = async (userId: string, templateType: string) => {
    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId, templateType })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setSuccess('Email sent successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    }
  };

  const exportSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/user-subscriptions/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          filters: {
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            plan: planFilter !== 'all' ? planFilter : undefined
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export subscriptions');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subscriptions-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Subscriptions exported successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export subscriptions');
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'cancelled': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getExpiryStatus = (subscription: UserSubscriptionWithDetails) => {
    if (!subscription.expiresAt) return null;
    
    const now = new Date();
    const expiryDate = new Date(subscription.expiresAt);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { label: 'Expired', color: 'error' as const };
    if (daysUntilExpiry <= 7) return { label: `${daysUntilExpiry}d left`, color: 'warning' as const };
    if (daysUntilExpiry <= 30) return { label: `${daysUntilExpiry}d left`, color: 'info' as const };
    
    return null;
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading subscriptions...</Box>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          User Subscription Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchSubscriptions();
              fetchStats();
            }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={exportSubscriptions}
          >
            Export
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

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <People sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ fontSize: 32, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.active}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Warning sx={{ fontSize: 32, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.expired}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expired
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Block sx={{ fontSize: 32, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.cancelled}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cancelled
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AttachMoney sx={{ fontSize: 32, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    ${stats.revenue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Revenue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Plan</InputLabel>
                <Select
                  value={planFilter}
                  label="Plan"
                  onChange={(e) => setPlanFilter(e.target.value)}
                >
                  <MenuItem value="all">All Plans</MenuItem>
                  {plans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPlanFilter('all');
                  setPage(1);
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subscriptions.map((subscription) => {
              const expiryStatus = getExpiryStatus(subscription);
              return (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={subscription.user.avatar}
                        sx={{ width: 32, height: 32 }}
                      >
                        {subscription.user.firstName?.[0] || subscription.user.email[0].toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography fontWeight="medium">
                          {subscription.user.firstName && subscription.user.lastName
                            ? `${subscription.user.firstName} ${subscription.user.lastName}`
                            : subscription.user.email}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {subscription.user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="medium">
                      {subscription.plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      AU${subscription.plan.priceAUD}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <Chip
                        label={subscription.status.toUpperCase()}
                        color={getStatusColor(subscription.status)}
                        size="small"
                      />
                      {expiryStatus && (
                        <Chip
                          label={expiryStatus.label}
                          color={expiryStatus.color}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      Started: {formatDate(subscription.startsAt)}
                    </Typography>
                    <Typography variant="body2">
                      {subscription.expiresAt 
                        ? `Expires: ${formatDate(subscription.expiresAt)}`
                        : 'Lifetime Access'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="medium">
                      AU${subscription.amountPaidAUD?.toFixed(2) || '0.00'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedSubscription(subscription);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Subscription">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedSubscription(subscription);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Send Email">
                        <IconButton
                          size="small"
                          onClick={() => sendEmail(subscription.user.id, 'subscription_reminder')}
                        >
                          <Email />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Receipt">
                        <IconButton
                          size="small"
                          onClick={() => window.open(`/api/admin/subscriptions/${subscription.id}/receipt`, '_blank')}
                        >
                          <Receipt />
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

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, newPage) => setPage(newPage)}
          color="primary"
        />
      </Box>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Subscription Details</DialogTitle>
        <DialogContent>
          {selectedSubscription && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>User Information</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography><strong>Name:</strong> {selectedSubscription.user.firstName} {selectedSubscription.user.lastName}</Typography>
                  <Typography><strong>Email:</strong> {selectedSubscription.user.email}</Typography>
                  <Typography><strong>User ID:</strong> {selectedSubscription.user.id}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Subscription Details</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography><strong>Plan:</strong> {selectedSubscription.plan.name}</Typography>
                  <Typography><strong>Status:</strong> {selectedSubscription.status}</Typography>
                  <Typography><strong>Amount:</strong> AU${selectedSubscription.amountPaidAUD?.toFixed(2)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Dates</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography><strong>Started:</strong> {formatDate(selectedSubscription.startsAt)}</Typography>
                  <Typography><strong>Expires:</strong> {selectedSubscription.expiresAt ? formatDate(selectedSubscription.expiresAt) : 'Never'}</Typography>
                  <Typography><strong>Created:</strong> {formatDate(selectedSubscription.createdAt)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Actions</Typography>
                <Stack spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => sendEmail(selectedSubscription.user.id, 'subscription_reminder')}
                  >
                    Send Reminder Email
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => window.open(`/api/admin/subscriptions/${selectedSubscription.id}/receipt`, '_blank')}
                  >
                    Download Receipt
                  </Button>
                  {selectedSubscription.status === 'active' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleStatusChange(selectedSubscription.id, 'cancelled', 'Admin cancellation')}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </Stack>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Subscription</DialogTitle>
        <DialogContent>
          {selectedSubscription && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedSubscription.status}
                    label="Status"
                    onChange={(e) => setSelectedSubscription({
                      ...selectedSubscription,
                      status: e.target.value as any
                    })}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  type="date"
                  value={selectedSubscription.expiresAt ? new Date(selectedSubscription.expiresAt).toISOString().split('T')[0] : ''}
                  onChange={(e) => setSelectedSubscription({
                    ...selectedSubscription,
                    expiresAt: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  InputLabelProps={{ shrink: true }}
                  helperText="Leave empty for lifetime access"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedSubscription) {
                handleStatusChange(selectedSubscription.id, selectedSubscription.status);
                setEditDialogOpen(false);
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserSubscriptionManager;