import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  MenuItem,
  TextField,
  Button,
  Card,
  CardContent,
} from '@mui/material';
// Using HTML5 date input to fix bundling issue
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  format,
} from 'date-fns';
import { FinancialCalculator } from '../services/financialCalculator';
import { FinancialReport } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Reports() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('daily');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    loadReport();
  }, [period, startDate, endDate]);

  // Initialize start/end dates from backend default report date
  useEffect(() => {
    const initDates = async () => {
      try {
        const result = await apiService.getDefaultReportDate();
        const dateStr = result?.date;
        if (dateStr) {
          const [year, month, day] = dateStr.split('-').map(Number);
          const ref = new Date(year, (month ?? 1) - 1, day ?? 1);
          setStartDate(ref);
          setEndDate(ref);
        }
      } catch {
        // Ignore and keep local defaults
      }
    };
    initDates();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      // Use simple date handling - just get start/end of day
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      if (import.meta.env?.DEV) {
        console.log('Reports - Loading report:', {
          period,
          start: start.toISOString(),
          end: end.toISOString(),
          startDateStr: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
          endDateStr: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
        });
      }
      
      const reportData = await FinancialCalculator.generateReport(period, start, end);
      setReport(reportData);
      
      // Load historical data for charts
      await loadHistoricalData(period, start, end);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async (
    periodType: string,
    currentStart: Date,
    currentEnd: Date
  ) => {
    const dataPoints: any[] = [];
    const periods = 7; // Show last 7 periods

    for (let i = periods - 1; i >= 0; i--) {
      let periodStart: Date;
      let periodEnd: Date;

      switch (periodType) {
        case 'daily':
          periodStart = startOfDay(subDays(currentStart, i));
          periodEnd = endOfDay(subDays(currentStart, i));
          break;
        case 'weekly':
          periodStart = startOfWeek(subWeeks(currentStart, i));
          periodEnd = endOfWeek(subWeeks(currentStart, i));
          break;
        case 'monthly':
          periodStart = startOfMonth(subMonths(currentStart, i));
          periodEnd = endOfMonth(subMonths(currentStart, i));
          break;
        case 'quarterly':
          periodStart = startOfQuarter(subQuarters(currentStart, i));
          periodEnd = endOfQuarter(subQuarters(currentStart, i));
          break;
        case 'yearly':
          periodStart = startOfYear(subYears(currentStart, i));
          periodEnd = endOfYear(subYears(currentStart, i));
          break;
        default:
          periodStart = startOfDay(subDays(currentStart, i));
          periodEnd = endOfDay(subDays(currentStart, i));
      }

      try {
        const periodReport = await FinancialCalculator.generateReport(
          periodType as any,
          periodStart,
          periodEnd
        );
        dataPoints.push({
          period: format(periodStart, periodType === 'daily' ? 'MMM d' : periodType === 'yearly' ? 'yyyy' : 'MMM yyyy'),
          revenue: periodReport.totalRevenue,
          expenses: periodReport.totalExpenses,
          profit: periodReport.profit,
        });
      } catch (error) {
        console.error('Error loading historical data:', error);
      }
    }

    setHistoricalData(dataPoints);
  };

  const handlePeriodChange = (newPeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') => {
    setPeriod(newPeriod);
    const today = new Date();
    
    switch (newPeriod) {
      case 'daily':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'weekly':
        setStartDate(startOfWeek(today));
        setEndDate(endOfWeek(today));
        break;
      case 'monthly':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case 'quarterly':
        setStartDate(startOfQuarter(today));
        setEndDate(endOfQuarter(today));
        break;
      case 'yearly':
        setStartDate(startOfYear(today));
        setEndDate(endOfYear(today));
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const expenseData = report ? [
    { name: 'Generator Fuel', value: report.fuelCosts },
    { name: 'Drivers Fuel', value: report.driverPayments },
    { name: 'Materials', value: report.materialCosts },
    { name: 'Salaries', value: report.totalSalaries },
  ] : [];

  if (loading) {
    return <Typography>Loading report...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Financial Reports
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Period"
          select
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value as any)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
          <MenuItem value="quarterly">Quarterly</MenuItem>
          <MenuItem value="yearly">Yearly</MenuItem>
        </TextField>
        <TextField
          label="Start Date"
          type="date"
          size="small"
          value={startDate.toISOString().split('T')[0]}
          onChange={(e) => setStartDate(new Date(e.target.value))}
          InputLabelProps={{ shrink: true }}
          sx={{ mr: 1 }}
        />
        <TextField
          label="End Date"
          type="date"
          size="small"
          value={endDate.toISOString().split('T')[0]}
          onChange={(e) => setEndDate(new Date(e.target.value))}
          InputLabelProps={{ shrink: true }}
          sx={{ mr: 1 }}
        />
        <Button variant="contained" onClick={loadReport}>
          Refresh
        </Button>
      </Box>

      {report && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {formatCurrency(report.totalRevenue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Expenses
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {formatCurrency(report.totalExpenses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Profit
                  </Typography>
                  <Typography variant="h5" color={report.profit >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(report.profit)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Profit Margin
                  </Typography>
                  <Typography variant="h5" color={report.profitMargin >= 0 ? 'success.main' : 'error.main'}>
                    {report.profitMargin.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Expense Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Expense Details
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Generator Fuel</Typography>
                    <Typography fontWeight="bold">{formatCurrency(report.fuelCosts)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Drivers Fuel</Typography>
                    <Typography fontWeight="bold">{formatCurrency(report.driverPayments)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Material Costs</Typography>
                    <Typography fontWeight="bold">{formatCurrency(report.materialCosts)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Salaries</Typography>
                    <Typography fontWeight="bold">{formatCurrency(report.totalSalaries)}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Revenue & Expenses Trend
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke="#82ca9d" name="Expenses" />
                    <Line type="monotone" dataKey="profit" stroke="#ffc658" name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Revenue vs Expenses Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    <Bar dataKey="expenses" fill="#82ca9d" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

