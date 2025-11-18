import { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent, Button, SpeedDial, SpeedDialAction, SpeedDialIcon, Fab } from '@mui/material';
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
  AccountBalance as SalariesIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { FinancialCalculator } from '../services/financialCalculator';
import { FinancialReport } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [todayReport, setTodayReport] = useState<FinancialReport | null>(null);
  const [yesterdayReport, setYesterdayReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
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

      setTodayReport(todayData);
      setYesterdayReport(yesterdayData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Expense Breakdown
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Fuel</Typography>
                <Typography fontWeight="bold">
                  {formatCurrency(todayReport?.fuelCosts || 0)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Drivers Fuel</Typography>
                <Typography fontWeight="bold">
                  {formatCurrency(todayReport?.driverPayments || 0)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Materials</Typography>
                <Typography fontWeight="bold">
                  {formatCurrency(todayReport?.materialCosts || 0)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Salaries</Typography>
                <Typography fontWeight="bold">
                  {formatCurrency(todayReport?.totalSalaries || 0)}
                </Typography>
              </Box>
            </Box>
          </Paper>
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

