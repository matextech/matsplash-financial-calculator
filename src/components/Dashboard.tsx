import { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent, Button, SpeedDial, SpeedDialAction, SpeedDialIcon, Fab, Alert, Chip } from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  AccountBalance, 
  ShoppingCart,
  LocalGasStation,
  People,
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  Inventory as MaterialsIcon,
  AccountBalance as SalariesIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { FinancialCalculator } from '../services/financialCalculator';
import { FinancialReport } from '../types';
import { InventoryService, InventoryStatus } from '../services/inventoryService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [todayReport, setTodayReport] = useState<FinancialReport | null>(null);
  const [yesterdayReport, setYesterdayReport] = useState<FinancialReport | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Reload inventory when component mounts or when navigating back
    const interval = setInterval(() => {
      loadInventoryStatus();
    }, 30000); // Refresh every 30 seconds

    // Refresh when window gains focus (user returns to tab)
    const handleFocus = () => {
      loadInventoryStatus();
      loadDashboardData(); // Also refresh expense data
    };
    window.addEventListener('focus', handleFocus);

    // Listen for expense updates
    const handleExpensesUpdated = () => {
      console.log('Expenses updated, refreshing dashboard...');
      loadDashboardData();
    };
    window.addEventListener('expensesUpdated', handleExpensesUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('expensesUpdated', handleExpensesUpdated);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const yesterday = subDays(today, 1);

      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);

      const [todayData, yesterdayData] = await Promise.all([
        FinancialCalculator.generateReport('daily', todayStart, todayEnd),
        FinancialCalculator.generateReport('daily', yesterdayStart, yesterdayEnd)
      ]);

      console.log('Dashboard - Today Report:', todayData);
      console.log('Dashboard - Expense Breakdown:', {
        fuelCosts: todayData.fuelCosts,
        driverPayments: todayData.driverPayments,
        materialCosts: todayData.materialCosts,
        totalSalaries: todayData.totalSalaries
      });

      setTodayReport(todayData);
      setYesterdayReport(yesterdayData);
      await loadInventoryStatus();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryStatus = async () => {
    try {
      const status = await InventoryService.getInventoryStatus(10000); // Alert when below 10,000 bags
      setInventoryStatus(status);
    } catch (error) {
      console.error('Error loading inventory status:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  const profitChange = todayReport && yesterdayReport
    ? todayReport.profit - yesterdayReport.profit
    : 0;

  const revenueChange = todayReport && yesterdayReport
    ? todayReport.totalRevenue - yesterdayReport.totalRevenue
    : 0;

  const stats = [
    {
      title: 'Today\'s Revenue',
      value: formatCurrency(todayReport?.totalRevenue || 0),
      change: revenueChange,
      icon: <ShoppingCart sx={{ fontSize: 40 }} />,
      color: '#1976d2'
    },
    {
      title: 'Today\'s Profit',
      value: formatCurrency(todayReport?.profit || 0),
      change: profitChange,
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: profitChange >= 0 ? '#2e7d32' : '#d32f2f'
    },
    {
      title: 'Today\'s Expenses',
      value: formatCurrency(todayReport?.totalExpenses || 0),
      icon: <AccountBalance sx={{ fontSize: 40 }} />,
      color: '#ed6c02'
    },
    {
      title: 'Profit Margin',
      value: `${(todayReport?.profitMargin || 0).toFixed(1)}%`,
      icon: <TrendingDown sx={{ fontSize: 40 }} />,
      color: '#9c27b0'
    }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {format(new Date(), 'EEEE, MMMM d, yyyy')}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {stat.title}
                    </Typography>
                    <Typography variant="h5" component="div">
                      {stat.value}
                    </Typography>
                    {stat.change !== undefined && (
                      <Typography
                        variant="body2"
                        sx={{ color: stat.change >= 0 ? 'success.main' : 'error.main', mt: 1 }}
                      >
                        {stat.change >= 0 ? '+' : ''}{formatCurrency(stat.change)} from yesterday
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ color: stat.color }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Inventory Status Alert */}
      {inventoryStatus && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Alert 
              severity={inventoryStatus.needsRestock ? 'warning' : 'success'}
              icon={inventoryStatus.needsRestock ? <WarningIcon /> : <CheckCircleIcon />}
              sx={{ mb: 2 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Material Inventory Status
                  </Typography>
                  <Typography variant="body2">
                    {inventoryStatus.needsRestock 
                      ? `⚠️ Low inventory! Only ${inventoryStatus.totalRemainingBags.toLocaleString()} bags remaining. Restock needed.`
                      : `✓ Inventory healthy: ${inventoryStatus.totalRemainingBags.toLocaleString()} bags available for production.`
                    }
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<MaterialsIcon />}
                  onClick={() => navigate('/materials')}
                >
                  View Materials
                </Button>
              </Box>
            </Alert>
          </Grid>
        </Grid>
      )}

      {/* Inventory Details */}
      {inventoryStatus && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MaterialsIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Material Inventory</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Sachet Rolls
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {inventoryStatus.sachetRolls.totalRolls} rolls ({inventoryStatus.sachetRolls.totalBagsCapacity.toLocaleString()} bags)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Remaining Capacity
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {inventoryStatus.sachetRolls.remainingBags.toLocaleString()} bags
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Packing Nylon
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {inventoryStatus.packingNylon.totalPackages} packages ({inventoryStatus.packingNylon.totalBagsCapacity.toLocaleString()} bags)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Remaining Capacity
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {inventoryStatus.packingNylon.remainingBags.toLocaleString()} bags
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        Total Remaining
                      </Typography>
                      <Typography variant="h6" color="primary.main" fontWeight="bold">
                        {inventoryStatus.totalRemainingBags.toLocaleString()} bags
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Total Used
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {inventoryStatus.totalUsedBags.toLocaleString()} bags
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ShoppingCart />}
                  onClick={() => navigate('/sales')}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Record Sale
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<MoneyIcon />}
                  onClick={() => navigate('/expenses')}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Add Expense
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<MaterialsIcon />}
                  onClick={() => navigate('/materials')}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Record Material Purchase
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SalariesIcon />}
                  onClick={() => navigate('/salaries')}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Record Salary Payment
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Expense Breakdown - Always shown when todayReport is available */}
      {todayReport && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={inventoryStatus ? 12 : 6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Expense Breakdown
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Fuel</Typography>
                  <Typography fontWeight="bold">
                    {formatCurrency(todayReport.fuelCosts || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Drivers Fuel</Typography>
                  <Typography fontWeight="bold">
                    {formatCurrency(todayReport.driverPayments || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Materials</Typography>
                  <Typography fontWeight="bold">
                    {formatCurrency(todayReport.materialCosts || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Salaries</Typography>
                  <Typography fontWeight="bold">
                    {formatCurrency(todayReport.totalSalaries || 0)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
          {!inventoryStatus && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ShoppingCart />}
                    onClick={() => navigate('/sales')}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Record Sale
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<MoneyIcon />}
                    onClick={() => navigate('/expenses')}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Add Expense
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<MaterialsIcon />}
                    onClick={() => navigate('/materials')}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Record Material Purchase
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<SalariesIcon />}
                    onClick={() => navigate('/salaries')}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Record Salary Payment
                  </Button>
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Speed Dial for Quick Actions */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
      >
        <SpeedDialAction
          icon={<ShoppingCart />}
          tooltipTitle="Record Sale"
          onClick={() => {
            setSpeedDialOpen(false);
            navigate('/sales');
          }}
        />
        <SpeedDialAction
          icon={<MoneyIcon />}
          tooltipTitle="Add Expense"
          onClick={() => {
            setSpeedDialOpen(false);
            navigate('/expenses');
          }}
        />
        <SpeedDialAction
          icon={<MaterialsIcon />}
          tooltipTitle="Add Material"
          onClick={() => {
            setSpeedDialOpen(false);
            navigate('/materials');
          }}
        />
        <SpeedDialAction
          icon={<SalariesIcon />}
          tooltipTitle="Record Salary"
          onClick={() => {
            setSpeedDialOpen(false);
            navigate('/salaries');
          }}
        />
      </SpeedDial>
    </Box>
  );
}

