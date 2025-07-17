import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  CreditCard,
  People,
  Receipt,
  Download,
  Refresh,
  DateRange
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { RevenueAnalytics, PlanAnalytics, PaymentMethodAnalytics } from '../../types/admin';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const PaymentAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [timeRange, setTimeRange] = useState('30d');
  const [revenueData, setRevenueData] = useState<RevenueAnalytics[]>([]);
  const [planData, setPlanData] = useState<PlanAnalytics[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodAnalytics[]>([]);
  const [topTransactions, setTopTransactions] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalTransactions: 0,
    transactionGrowth: 0,
    averageOrderValue: 0,
    aovGrowth: 0,
    conversionRate: 0,
    conversionGrowth: 0,
    refundRate: 0,
    refundGrowth: 0,
    churnRate: 0,
    churnGrowth: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Mock data for development - replace with real API calls when backend is ready
      const mockKpis = {
        totalRevenue: 28450.75,
        revenueGrowth: 12.5,
        totalTransactions: 156,
        transactionGrowth: 8.3,
        averageOrderValue: 35.20,
        aovGrowth: 5.2,
        conversionRate: 14.8,
        conversionGrowth: 2.1,
        refundRate: 2.3,
        refundGrowth: -0.5,
        churnRate: 3.2,
        churnGrowth: -1.2
      };

      const mockRevenueData = [
        { date: '2024-01-01', revenue: 1200, paymentCount: 45, conversionRate: 12.5 },
        { date: '2024-01-02', revenue: 1450, paymentCount: 52, conversionRate: 13.2 },
        { date: '2024-01-03', revenue: 1100, paymentCount: 38, conversionRate: 11.8 },
        { date: '2024-01-04', revenue: 1600, paymentCount: 58, conversionRate: 14.5 },
        { date: '2024-01-05', revenue: 1350, paymentCount: 47, conversionRate: 13.8 },
        { date: '2024-01-06', revenue: 1750, paymentCount: 62, conversionRate: 15.2 },
        { date: '2024-01-07', revenue: 1500, paymentCount: 54, conversionRate: 14.1 }
      ];

      const mockPlanData = [
        { planName: '1-Year Access', subscriptions: 892, revenue: 22178.40, conversionRate: 14.2 },
        { planName: 'Permanent Access', subscriptions: 445, revenue: 22227.75, conversionRate: 15.8 }
      ];

      const mockPaymentMethodData = [
        { method: 'Credit Card', count: 1205, revenue: 24567.80, successRate: 96.5 },
        { method: 'PayPal', count: 432, revenue: 8901.25, successRate: 94.2 },
        { method: 'Google Pay', count: 156, revenue: 2981.70, successRate: 97.8 }
      ];

      const mockTopTransactions = [
        {
          id: 'txn_001',
          user: { email: 'john.doe@example.com' },
          plan: { name: 'Permanent Access' },
          amount: 49.95,
          paymentMethod: 'Credit Card',
          createdAt: '2024-01-07',
          status: 'completed'
        },
        {
          id: 'txn_002',
          user: { email: 'jane.smith@example.com' },
          plan: { name: '1-Year Access' },
          amount: 24.95,
          paymentMethod: 'PayPal',
          createdAt: '2024-01-07',
          status: 'completed'
        },
        {
          id: 'txn_003',
          user: { email: 'bob.wilson@example.com' },
          plan: { name: 'Permanent Access' },
          amount: 49.95,
          paymentMethod: 'Google Pay',
          createdAt: '2024-01-06',
          status: 'completed'
        }
      ];

      setKpis(mockKpis);
      setRevenueData(mockRevenueData);
      setPlanData(mockPlanData);
      setPaymentMethodData(mockPaymentMethodData);
      setTopTransactions(mockTopTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch('/api/admin/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ timeRange })
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (value: number) => {
    return value >= 0 ? 'success.main' : 'error.main';
  };

  const getGrowthIcon = (value: number) => {
    return value >= 0 ? <TrendingUp /> : <TrendingDown />;
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading analytics...</Box>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Payment Analytics
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAnalytics}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportReport}
          >
            Export
          </Button>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(kpis.totalRevenue)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ color: getGrowthColor(kpis.revenueGrowth), mr: 0.5 }}>
                      {getGrowthIcon(kpis.revenueGrowth)}
                    </Box>
                    <Typography color={getGrowthColor(kpis.revenueGrowth)} variant="body2">
                      {formatPercentage(kpis.revenueGrowth)}
                    </Typography>
                  </Box>
                </Box>
                <AttachMoney sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Transactions
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {kpis.totalTransactions.toLocaleString()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ color: getGrowthColor(kpis.transactionGrowth), mr: 0.5 }}>
                      {getGrowthIcon(kpis.transactionGrowth)}
                    </Box>
                    <Typography color={getGrowthColor(kpis.transactionGrowth)} variant="body2">
                      {formatPercentage(kpis.transactionGrowth)}
                    </Typography>
                  </Box>
                </Box>
                <Receipt sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Average Order Value
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(kpis.averageOrderValue)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ color: getGrowthColor(kpis.aovGrowth), mr: 0.5 }}>
                      {getGrowthIcon(kpis.aovGrowth)}
                    </Box>
                    <Typography color={getGrowthColor(kpis.aovGrowth)} variant="body2">
                      {formatPercentage(kpis.aovGrowth)}
                    </Typography>
                  </Box>
                </Box>
                <CreditCard sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Conversion Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {kpis.conversionRate.toFixed(1)}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ color: getGrowthColor(kpis.conversionGrowth), mr: 0.5 }}>
                      {getGrowthIcon(kpis.conversionGrowth)}
                    </Box>
                    <Typography color={getGrowthColor(kpis.conversionGrowth)} variant="body2">
                      {formatPercentage(kpis.conversionGrowth)}
                    </Typography>
                  </Box>
                </Box>
                <People sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Refund Rate
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {kpis.refundRate.toFixed(1)}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Box sx={{ color: getGrowthColor(-kpis.refundGrowth), mr: 0.5 }}>
                    {getGrowthIcon(-kpis.refundGrowth)}
                  </Box>
                  <Typography color={getGrowthColor(-kpis.refundGrowth)} variant="body2">
                    {formatPercentage(kpis.refundGrowth)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Churn Rate
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {kpis.churnRate.toFixed(1)}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Box sx={{ color: getGrowthColor(-kpis.churnGrowth), mr: 0.5 }}>
                    {getGrowthIcon(-kpis.churnGrowth)}
                  </Box>
                  <Typography color={getGrowthColor(-kpis.churnGrowth)} variant="body2">
                    {formatPercentage(kpis.churnGrowth)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Trend */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue Trend
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip formatter={(value: any) => formatCurrency(value as number)} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Methods */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Methods
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.method}: ${entry.count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Plan Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subscription Plan Performance
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="planName" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="subscriptions" fill="#8884d8" name="Subscriptions" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue (AUD)" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Transactions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent High-Value Transactions
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {transaction.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{transaction.user?.email || 'N/A'}</TableCell>
                    <TableCell>{transaction.plan?.name || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                    <TableCell>{transaction.paymentMethod}</TableCell>
                    <TableCell>
                      {new Date(transaction.createdAt).toLocaleDateString('en-AU')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status}
                        color={transaction.status === 'completed' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentAnalytics;