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
import { apiService } from '../services/apiService';

interface CommissionSummary {
  employeeId: number;
  employeeName: string;
  role: string;
  totalBags: number;
  commission: number;
}

interface SalarySummary {
  pendingPayments: number;
  totalPendingAmount: number;
  paidThisMonth: number;
  totalPaidAmount: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [todayReport, setTodayReport] = useState<FinancialReport | null>(null);
  const [yesterdayReport, setYesterdayReport] = useState<FinancialReport | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | null>(null);
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary[]>([]);
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null);
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

  // Add error boundary for dashboard loading
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Dashboard error:', event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
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

      console.log('📊 Dashboard - Today Report:', JSON.stringify(todayData, null, 2));
      console.log('📊 Dashboard - Expense Breakdown:', JSON.stringify({
        fuelCosts: todayData.fuelCosts,
        driverPayments: todayData.driverPayments,
        materialCosts: todayData.materialCosts,
        totalSalaries: todayData.totalSalaries
      }, null, 2));

      setTodayReport(todayData);
      setYesterdayReport(yesterdayData);
      await Promise.all([
        loadInventoryStatus(),
        loadCommissionSummary(),
        loadSalarySummary()
      ]);
      
      console.log('✅ Dashboard data loaded successfully:', JSON.stringify({
        todayRevenue: todayData.totalRevenue,
        todayExpenses: todayData.totalExpenses,
        todayProfit: todayData.profit,
        hasData: todayData.totalRevenue > 0 || todayData.totalExpenses > 0
      }, null, 2));
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      // Set empty report so UI can still render
      setTodayReport({
        period: 'daily',
        startDate: startOfDay(new Date()),
        endDate: endOfDay(new Date()),
        totalRevenue: 0,
        totalExpenses: 0,
        totalSalaries: 0,
        materialCosts: 0,
        fuelCosts: 0,
        driverPayments: 0,
        profit: 0,
        profitMargin: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryStatus = async () => {
    try {
      // Get threshold from settings, default to 4000
      let threshold = 4000; // Default threshold
      try {
        const settings = await apiService.getSettings();
        threshold = settings?.inventoryLowThreshold || 4000;
        console.log('📊 Inventory threshold loaded:', threshold);
      } catch (settingsError) {
        console.warn('⚠️ Could not load settings, using default threshold (4000):', settingsError);
        // Continue with default threshold
      }
      
      const status = await InventoryService.getInventoryStatus(threshold);
      setInventoryStatus(status);
      console.log('✅ Inventory status loaded:', JSON.stringify({
        totalRemainingBags: status.totalRemainingBags,
        needsRestock: status.needsRestock
      }, null, 2));
    } catch (error) {
      console.error('❌ Error loading inventory status:', error);
      // Don't set inventory status on error, so it just won't show
      // This allows the dashboard to still display other data
    }
  };

  const loadCommissionSummary = async () => {
    try {
      const employees = await apiService.getEmployees();
      const employeesList = Array.isArray(employees) ? employees : (employees.data || []);
      
      // Normalize employee data - handle both snake_case and camelCase
      // The backend should transform, but handle both formats as fallback
      const normalizedEmployees = employeesList.map(emp => {
        const normalized = {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          role: emp.role,
          salaryType: emp.salaryType || emp.salary_type || 'commission',
          commissionRate: emp.commissionRate !== undefined && emp.commissionRate !== null 
            ? emp.commissionRate 
            : (emp.commission_rate !== undefined && emp.commission_rate !== null ? emp.commission_rate : null),
          fixedSalary: emp.fixedSalary !== undefined && emp.fixedSalary !== null
            ? emp.fixedSalary
            : (emp.fixed_salary !== undefined && emp.fixed_salary !== null ? emp.fixed_salary : undefined),
          createdAt: emp.createdAt || emp.created_at,
          updatedAt: emp.updatedAt || emp.updated_at,
        };
        return normalized;
      });
      
      console.log('📊 Dashboard - Normalized employees sample:', normalizedEmployees[0]);
      console.log('📊 Dashboard - Employees with commission:', normalizedEmployees.filter(e => (e.salaryType === 'commission' || e.salaryType === 'both') && e.commissionRate));
      
      const commissionPromises = normalizedEmployees
        .filter(emp => (emp.salaryType === 'commission' || emp.salaryType === 'both') && emp.commissionRate && emp.id)
        .map(async (emp) => {
          try {
            let commissionInfo;
            if (emp.role === 'Packers' || emp.role === 'Packer') {
              commissionInfo = await FinancialCalculator.calculateCommissionFromPackerEntries(emp.id!);
            } else {
              commissionInfo = await FinancialCalculator.calculateCommissionFromSales(emp.id!);
            }
            
            return {
              employeeId: emp.id!,
              employeeName: emp.name,
              role: emp.role || 'General',
              totalBags: commissionInfo.totalBags || 0,
              commission: commissionInfo.commission || 0,
            };
          } catch (error) {
            console.error(`Error loading commission for ${emp.name}:`, error);
            return null;
          }
        });
      
      const results = await Promise.all(commissionPromises);
      const validResults = results.filter((r): r is CommissionSummary => r !== null);
      // Sort by commission descending and show all (up to 10), including those with 0 commission
      validResults.sort((a, b) => b.commission - a.commission);
      // Show all employees with commission rates, not just top 5
      setCommissionSummary(validResults.slice(0, 10));
    } catch (error) {
      console.error('❌ Error loading commission summary:', error);
      setCommissionSummary([]);
    }
  };

  const loadSalarySummary = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const [allPayments, employees] = await Promise.all([
        apiService.getSalaryPayments(),
        apiService.getEmployees()
      ]);
      
      const paymentsList = Array.isArray(allPayments) ? allPayments : [];
      const employeesList = Array.isArray(employees) ? employees : (employees.data || []);
      
      // Get payments for current month
      const thisMonthPayments = paymentsList.filter(p => {
        const paidDate = p.paidDate instanceof Date ? p.paidDate : new Date(p.paidDate);
        return paidDate >= startOfMonth && paidDate <= endOfMonth;
      });
      
      // Calculate pending payments (employees with fixed/commission salaries but no payment this month)
      const employeesWithSalaries = employeesList.filter(
        emp => (emp.salaryType === 'fixed' || emp.salaryType === 'commission' || emp.salaryType === 'both') && emp.id
      );
      
      const paidEmployeeIds = new Set(thisMonthPayments.map(p => p.employeeId));
      const pendingCount = employeesWithSalaries.filter(emp => !paidEmployeeIds.has(emp.id!)).length;
      
      // For pending amount, we'd need to calculate expected salaries, but for now show count
      const summary: SalarySummary = {
        pendingPayments: pendingCount,
        totalPendingAmount: 0, // Would need to calculate expected salaries
        paidThisMonth: thisMonthPayments.length,
        totalPaidAmount: thisMonthPayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
      };
      
      setSalarySummary(summary);
    } catch (error) {
      console.error('❌ Error loading salary summary:', error);
      setSalarySummary(null);
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
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography variant="h6">Loading dashboard data...</Typography>
      </Box>
    );
  }

  // Show error state if data failed to load
  if (!todayReport && !loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Failed to load dashboard data
          </Typography>
          <Typography variant="body2">
            Please refresh the page or check your connection. If the problem persists, check the browser console for errors.
          </Typography>
          <Button variant="contained" onClick={loadDashboardData} sx={{ mt: 2 }}>
            Retry
          </Button>
        </Alert>
      </Box>
    );
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
      color: '#1976d2',
      showChange: true
    },
    {
      title: 'Today\'s Profit',
      value: formatCurrency(todayReport?.profit || 0),
      change: profitChange,
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: (todayReport?.profit || 0) >= 0 ? '#2e7d32' : '#d32f2f',
      showChange: true
    },
    {
      title: 'Today\'s Expenses',
      value: formatCurrency(todayReport?.totalExpenses || 0),
      icon: <AccountBalance sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      showChange: false
    },
    {
      title: 'Profit Margin',
      value: `${(todayReport?.profitMargin || 0).toFixed(1)}%`,
      icon: <TrendingDown sx={{ fontSize: 40 }} />,
      color: (todayReport?.profitMargin || 0) >= 0 ? '#2e7d32' : '#d32f2f',
      showChange: false
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
                    {stat.showChange && stat.change !== undefined && yesterdayReport && (
                      <Typography
                        variant="body2"
                        sx={{ color: stat.change >= 0 ? 'success.main' : 'error.main', mt: 1 }}
                      >
                        {stat.change >= 0 ? '+' : ''}{formatCurrency(stat.change)} from yesterday
                      </Typography>
                    )}
                    {!todayReport || (todayReport.totalRevenue === 0 && todayReport.totalExpenses === 0) ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                        No data for today yet
                      </Typography>
                    ) : null}
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

      {/* Commissions & Salaries Section */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Commissions Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Commissions</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/commissions')}
              >
                View All
              </Button>
            </Box>
            {commissionSummary.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  No employees with commission rates found. Add employees with commission-based salaries to see commission data here.
                </Typography>
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Employees with Commissions (All Time)
                  </Typography>
                  {commissionSummary.map((item, idx) => (
                    <Box key={item.employeeId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, pb: 1, borderBottom: idx < commissionSummary.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {item.employeeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.role} • {item.totalBags.toLocaleString()} bags
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold" color={item.commission > 0 ? "success.main" : "text.secondary"}>
                        {formatCurrency(item.commission)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" fontWeight="bold">
                      Total Commissions
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      {formatCurrency(commissionSummary.reduce((sum, item) => sum + item.commission, 0))}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Salaries Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Salaries</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/salaries')}
              >
                View All
              </Button>
            </Box>
            {!salarySummary ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Loading salary information...
                </Typography>
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="warning.contrastText" fontWeight="bold">
                        {salarySummary.pendingPayments}
                      </Typography>
                      <Typography variant="body2" color="warning.contrastText">
                        Pending Payments
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.contrastText" fontWeight="bold">
                        {salarySummary.paidThisMonth}
                      </Typography>
                      <Typography variant="body2" color="success.contrastText">
                        Paid This Month
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Paid This Month
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color="success.main">
                      {formatCurrency(salarySummary.totalPaidAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Today's Salaries
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatCurrency(todayReport?.totalSalaries || 0)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Expense Breakdown - Always shown when todayReport is available */}
      {todayReport && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={inventoryStatus ? 12 : 6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Expense Breakdown
              </Typography>
              {todayReport.totalExpenses === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    No expenses recorded for today. Add expenses to see the breakdown here.
                  </Typography>
                </Alert>
              ) : (
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
              )}
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

