import { useEffect, useState, Fragment } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  LocalShipping as ShippingIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { Employee, Sale } from '../types';
import { dbService } from '../services/database';
import { FinancialCalculator } from '../services/financialCalculator';
import { format, startOfDay, endOfDay, subDays, subMonths, subWeeks } from 'date-fns';

interface CommissionData {
  employee: Employee;
  totalBags: number;
  commission: number;
  sales: Sale[];
  salesCount: number;
}

export default function Commissions() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [commissionData, setCommissionData] = useState<CommissionData[]>([]);
  const [filteredData, setFilteredData] = useState<CommissionData[]>([]);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<number>>(new Set());
  
  // Filters
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [commissionData, filterEmployee, filterRole, dateRange, customStartDate, customEndDate, searchTerm]);

  const loadData = async () => {
    const employeesData = await dbService.getEmployees();
    setEmployees(employeesData);

    // Calculate commission for each employee with commission rates
    const commissionPromises = employeesData
      .filter(emp => emp.salaryType === 'commission' || emp.salaryType === 'both')
      .map(async (emp) => {
        if (!emp.id) return null;
        try {
          const commissionInfo = await FinancialCalculator.calculateCommissionFromSales(emp.id);
          return {
            employee: emp,
            totalBags: commissionInfo.totalBags,
            commission: commissionInfo.commission,
            sales: commissionInfo.sales,
            salesCount: commissionInfo.sales.length,
          };
        } catch (error) {
          console.error(`Error loading commission for employee ${emp.id}:`, error);
          return null;
        }
      });

    const results = await Promise.all(commissionPromises);
    const validResults = results.filter((r): r is CommissionData => r !== null);
    setCommissionData(validResults);
  };

  const getDateRange = (): { start?: Date; end?: Date } => {
    const today = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'week':
        return { start: startOfDay(subDays(today, 7)), end: endOfDay(today) };
      case 'month':
        return { start: startOfDay(subDays(today, 30)), end: endOfDay(today) };
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: startOfDay(new Date(customStartDate)),
            end: endOfDay(new Date(customEndDate)),
          };
        }
        return {};
      default:
        return {};
    }
  };

  const applyFilters = async () => {
    let filtered = [...commissionData];
    const { start, end } = getDateRange();

    // Filter by employee
    if (filterEmployee !== 'all') {
      filtered = filtered.filter(item => item.employee.id?.toString() === filterEmployee);
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(item => item.employee.role === filterRole);
    }

    // Filter by date range - recalculate commission for the date range
    if (start && end) {
      const filteredWithDates = await Promise.all(
        filtered.map(async (item) => {
          if (!item.employee.id) return null;
          try {
            const commissionInfo = await FinancialCalculator.calculateCommissionFromSales(
              item.employee.id,
              start,
              end
            );
            return {
              ...item,
              totalBags: commissionInfo.totalBags,
              commission: commissionInfo.commission,
              sales: commissionInfo.sales,
              salesCount: commissionInfo.sales.length,
            };
          } catch (error) {
            console.error(`Error calculating commission for employee ${item.employee.id}:`, error);
            return null;
          }
        })
      );
      filtered = filteredWithDates.filter((r): r is CommissionData => r !== null);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.employee.name.toLowerCase().includes(search) ||
        item.employee.email.toLowerCase().includes(search) ||
        item.totalBags.toString().includes(search) ||
        item.commission.toString().includes(search)
      );
    }

    // Sort by commission (highest first)
    filtered.sort((a, b) => b.commission - a.commission);
    setFilteredData(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toggleEmployeeExpansion = (employeeId: number) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const clearFilters = () => {
    setFilterEmployee('all');
    setFilterRole('all');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchTerm('');
  };

  const totalCommission = filteredData.reduce((sum, item) => sum + item.commission, 0);
  const totalBags = filteredData.reduce((sum, item) => sum + item.totalBags, 0);
  const totalSales = filteredData.reduce((sum, item) => sum + item.salesCount, 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Employee Commissions</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={showFilters ? <FilterIcon /> : <FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          {(filterEmployee !== 'all' || filterRole !== 'all' || dateRange !== 'all' || searchTerm) && (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Search"
                fullWidth
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, bags, commission..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Filter by Employee"
                fullWidth
                select
                size="small"
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
              >
                <MenuItem value="all">All Employees</MenuItem>
                {employees
                  .filter(emp => emp.salaryType === 'commission' || emp.salaryType === 'both')
                  .map((emp) => (
                    <MenuItem key={emp.id} value={emp.id?.toString()}>
                      {emp.name}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Filter by Role"
                fullWidth
                select
                size="small"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="Driver">Driver</MenuItem>
                <MenuItem value="Packers">Packers</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="General">General</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Date Range"
                fullWidth
                select
                size="small"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </TextField>
            </Grid>
            {dateRange === 'custom' && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Start Date"
                    type="date"
                    fullWidth
                    size="small"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="End Date"
                    type="date"
                    fullWidth
                    size="small"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Paper>
      </Collapse>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Commission</Typography>
              </Box>
              <Typography variant="h4">
                {formatCurrency(totalCommission)}
              </Typography>
              <Typography variant="body2">
                {filteredData.length} employee{filteredData.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShippingIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Bags Sold</Typography>
              </Box>
              <Typography variant="h4">
                {totalBags.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                bags across all sales
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Sales</Typography>
              </Box>
              <Typography variant="h4">
                {totalSales}
              </Typography>
              <Typography variant="body2">
                sale{totalSales !== 1 ? 's' : ''} recorded
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Commission Table */}
      {filteredData.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No commission data found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {commissionData.length === 0
              ? 'No employees with commission rates found. Add employees with commission-based salaries.'
              : 'No data matches your current filters. Try adjusting your filters.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Commission Rate</TableCell>
                <TableCell align="right">Bags Sold</TableCell>
                <TableCell align="right">Sales Count</TableCell>
                <TableCell align="right">Total Commission</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((item) => {
                const isExpanded = expandedEmployees.has(item.employee.id || 0);
                return (
                  <Fragment key={item.employee.id || `employee-${item.employee.email}`}>
                    <TableRow hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {item.employee.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.employee.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.employee.role || 'General'}
                          size="small"
                          color={
                            item.employee.role === 'Driver'
                              ? 'secondary'
                              : item.employee.role === 'Packers'
                              ? 'info'
                              : item.employee.role === 'Manager'
                              ? 'primary'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {item.employee.commissionRate
                          ? `₦${item.employee.commissionRate.toFixed(2)}/bag`
                          : 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {item.totalBags.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.salesCount}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          {formatCurrency(item.commission)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={isExpanded ? 'Hide Details' : 'Show Details'}>
                          <IconButton
                            size="small"
                            onClick={() => item.employee.id && toggleEmployeeExpansion(item.employee.id)}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    {isExpanded && item.sales.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 2, backgroundColor: 'grey.50' }}>
                          <Box>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                              Sales Details ({item.sales.length} sale{item.sales.length !== 1 ? 's' : ''})
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Date</TableCell>
                                  <TableCell align="right">Bags</TableCell>
                                  <TableCell align="right">Price/Bag</TableCell>
                                  <TableCell align="right">Total Amount</TableCell>
                                  <TableCell align="right">Commission</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {item.sales
                                  .sort((a, b) => {
                                    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
                                    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
                                    return dateB.getTime() - dateA.getTime();
                                  })
                                  .map((sale) => {
                                    const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
                                    const saleCommission = sale.bagsSold * (item.employee.commissionRate || 0);
                                    return (
                                      <TableRow key={sale.id}>
                                        <TableCell>{format(saleDate, 'MMM d, yyyy')}</TableCell>
                                        <TableCell align="right">{sale.bagsSold.toLocaleString()}</TableCell>
                                        <TableCell align="right">₦{sale.pricePerBag.toLocaleString()}</TableCell>
                                        <TableCell align="right">{formatCurrency(sale.totalAmount)}</TableCell>
                                        <TableCell align="right">
                                          <Typography variant="body2" color="success.main">
                                            {formatCurrency(saleCommission)}
                                          </Typography>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

