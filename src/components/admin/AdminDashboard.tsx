import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Dashboard,
  Settings,
  Receipt,
  Email,
  Payment,
  People,
  Analytics,
  LocalOffer,
  Security,
  Palette,
  CreditCard,
  TrendingUp,
  AttachMoney,
  PersonAdd,
  ShoppingCart
} from '@mui/icons-material';
import { AdminStats } from '../../types/admin';
import SystemConfigurationPanel from './SystemConfigurationPanel';
import SubscriptionPlanManager from './SubscriptionPlanManager';
import PaymentProviderManager from './PaymentProviderManager';
import TemplateManager from './TemplateManager';
import CouponManager from './CouponManager';
import UserSubscriptionManager from './UserSubscriptionManager';
import PaymentAnalytics from './PaymentAnalytics';

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [stats, setStats] = useState<AdminStats>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const tabs = [
    { label: 'Dashboard', icon: <Dashboard />, component: 'dashboard' },
    { label: 'System Config', icon: <Settings />, component: 'config' },
    { label: 'Subscription Plans', icon: <ShoppingCart />, component: 'plans' },
    { label: 'Payment Providers', icon: <CreditCard />, component: 'providers' },
    { label: 'Templates', icon: <Receipt />, component: 'templates' },
    { label: 'Coupons', icon: <LocalOffer />, component: 'coupons' },
    { label: 'User Subscriptions', icon: <People />, component: 'subscriptions' },
    { label: 'Analytics', icon: <Analytics />, component: 'analytics' }
  ];

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Mock data for development - replace with real API call when backend is ready
      const mockStats = {
        totalUsers: 1247,
        activeSubscriptions: 892,
        totalRevenue: 28450.75,
        monthlyRevenue: 4567.25,
        conversionRate: 14.8,
        churnRate: 3.2,
        averageRevenuePerUser: 31.90,
        popularPlan: 'Permanent Access',
        recentPayments: 156,
        failedPayments: 8
      };
      
      setStats(mockStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const renderDashboardOverview = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    return (
      <Box>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <People sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats?.totalUsers || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Users
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
                  <PersonAdd sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats?.activeSubscriptions || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Subscriptions
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
                      ${stats?.monthlyRevenue?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monthly Revenue
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
                  <TrendingUp sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stats?.conversionRate?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Conversion Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <List dense>
                  <ListItem button onClick={() => setSelectedTab(2)}>
                    <ListItemIcon>
                      <ShoppingCart />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Manage Subscription Plans"
                      secondary="Add, edit, or deactivate subscription plans"
                    />
                  </ListItem>
                  <ListItem button onClick={() => setSelectedTab(4)}>
                    <ListItemIcon>
                      <Email />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Edit Email Templates"
                      secondary="Customize email notifications and receipts"
                    />
                  </ListItem>
                  <ListItem button onClick={() => setSelectedTab(5)}>
                    <ListItemIcon>
                      <LocalOffer />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Create Coupon Codes"
                      secondary="Generate discount codes for promotions"
                    />
                  </ListItem>
                  <ListItem button onClick={() => setSelectedTab(3)}>
                    <ListItemIcon>
                      <Payment />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Payment Provider Settings"
                      secondary="Configure Stripe, PayPal, and Google Pay"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Status
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">Payment Processing</Typography>
                    <Chip label="Healthy" color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">Email Service</Typography>
                    <Chip label="Healthy" color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">Database</Typography>
                    <Chip label="Healthy" color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Storage</Typography>
                    <Chip label="Healthy" color="success" size="small" />
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Popular Plan:</strong> {stats?.popularPlan || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Avg Revenue/User:</strong> ${stats?.averageRevenuePerUser?.toFixed(2) || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderTabContent = () => {
    switch (tabs[selectedTab].component) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'config':
        return <SystemConfigurationPanel />;
      case 'plans':
        return <SubscriptionPlanManager />;
      case 'providers':
        return <PaymentProviderManager />;
      case 'templates':
        return <TemplateManager />;
      case 'coupons':
        return <CouponManager />;
      case 'subscriptions':
        return <UserSubscriptionManager />;
      case 'analytics':
        return <PaymentAnalytics />;
      default:
        return renderDashboardOverview();
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight="bold">
              Admin Dashboard
            </Typography>
            <Button
              variant="outlined"
              color="inherit"
              onClick={onClose}
            >
              Back to App
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="xl">
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ minHeight: 64 }}
              />
            ))}
          </Tabs>
        </Container>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 3 }}>
        <Container maxWidth="xl">
          {renderTabContent()}
        </Container>
      </Box>
    </Box>
  );
};

export default AdminDashboard;