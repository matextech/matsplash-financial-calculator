import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  InputAdornment,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  MenuItem,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  AccountBalance as SalaryIcon,
  Person as PersonIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { SalaryPayment, Employee } from '../types';
import { dbService } from '../services/database';
import { FinancialCalculator } from '../services/financialCalculator';
import { format, startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';

export default function Salaries() {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'range'>('day');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalaryPayment | null>(null);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    period: 'daily' as 'daily' | 'weekly' | 'monthly',
    periodStart: new Date(),
    periodEnd: new Date(),
    fixedAmount: '',
    commissionAmount: '',
    totalBags: '',
    totalAmount: '',
    paidDate: new Date(),
    notes: '',
  });

  useEffect(() => {
    loadPayments();
    loadEmployees();
  }, []);

  const loadPayments = async () => {
    const data = await dbService.getSalaryPayments();
    setPayments(data);
  };

  const loadEmployees = async () => {
    const data = await dbService.getEmployees();
    setEmployees(data);
  };

  const getPaymentsForDate = (date: Date): SalaryPayment[] => {
    let filtered = payments.filter(payment => {
      const paidDate = payment.paidDate instanceof Date ? payment.paidDate : new Date(payment.paidDate);
      return isSameDay(paidDate, date);
    });

    // Apply employee filter
    if (filterEmployee !== 'all') {
      filtered = filtered.filter(p => p.employeeId.toString() === filterEmployee);
    }

    // Apply period filter
    if (filterPeriod !== 'all') {
      filtered = filtered.filter(p => p.period === filterPeriod);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.employeeName.toLowerCase().includes(search) ||
        p.totalAmount.toString().includes(search) ||
        (p.notes && p.notes.toLowerCase().includes(search))
      );
    }

    return filtered;
  };

  const getPaymentsForRange = (start: Date, end: Date): SalaryPayment[] => {
    const startDay = startOfDay(start);
    const endDay = endOfDay(end);
    let filtered = payments.filter(payment => {
      const paidDate = payment.paidDate instanceof Date ? payment.paidDate : new Date(payment.paidDate);
      return paidDate >= startDay && paidDate <= endDay;
    });

    // Apply employee filter
    if (filterEmployee !== 'all') {
      filtered = filtered.filter(p => p.employeeId.toString() === filterEmployee);
    }

    // Apply period filter
    if (filterPeriod !== 'all') {
      filtered = filtered.filter(p => p.period === filterPeriod);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.employeeName.toLowerCase().includes(search) ||
        p.totalAmount.toString().includes(search) ||
        (p.notes && p.notes.toLowerCase().includes(search))
      );
    }

    return filtered;
  };

  const currentPayments = viewMode === 'day' 
    ? getPaymentsForDate(selectedDate)
    : getPaymentsForRange(dateRange.start, dateRange.end);

  const totalSalaries = currentPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalFixed = currentPayments.reduce((sum, p) => sum + (p.fixedAmount || 0), 0);
  const totalCommission = currentPayments.reduce((sum, p) => sum + (p.commissionAmount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateForInput = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateFromInput = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleDateChange = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setSelectedDate(new Date());
    } else if (direction === 'prev') {
      setSelectedDate(prev => subDays(prev, 1));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const handleOpen = (payment?: SalaryPayment, date?: Date) => {
    if (payment) {
      setEditingPayment(payment);
      const periodStartDate = payment.periodStart instanceof Date ? payment.periodStart : new Date(payment.periodStart);
      const periodEndDate = payment.periodEnd instanceof Date ? payment.periodEnd : new Date(payment.periodEnd);
      const paidDate = payment.paidDate instanceof Date ? payment.paidDate : new Date(payment.paidDate);
      setFormData({
        employeeId: payment.employeeId.toString(),
        period: payment.period,
        periodStart: periodStartDate,
        periodEnd: periodEndDate,
        fixedAmount: payment.fixedAmount?.toString() || '',
        commissionAmount: payment.commissionAmount?.toString() || '',
        totalBags: payment.totalBags?.toString() || '',
        totalAmount: payment.totalAmount.toString(),
        paidDate: paidDate,
        notes: payment.notes || '',
      });
      console.log('Opening payment for editing:', payment);
    } else {
      setEditingPayment(null);
      const today = new Date();
      setFormData({
        employeeId: '',
        period: 'daily',
        periodStart: today,
        periodEnd: today,
        fixedAmount: '',
        commissionAmount: '',
        totalBags: '',
        totalAmount: '',
        paidDate: date || today,
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingPayment(null);
  };

  const handleEmployeeChange = async (employeeId: string) => {
    const employee = employees.find(e => e.id?.toString() === employeeId);
    if (!employee) return;

    // Calculate salary based on employee type and period
    const totalBags = formData.totalBags ? parseInt(formData.totalBags) : 0;
    const calculatedSalary = FinancialCalculator.calculateEmployeeSalary(
      employee,
      totalBags,
      formData.period
    );

    // Separate fixed and commission for display
    let fixedAmount = 0;
    let commissionAmount = 0;

    if (employee.salaryType === 'fixed' || employee.salaryType === 'both') {
      if (employee.fixedSalary) {
        const divisor = formData.period === 'daily' ? 30 : formData.period === 'weekly' ? 4 : 1;
        fixedAmount = employee.fixedSalary / divisor;
      }
    }

    if (employee.salaryType === 'commission' || employee.salaryType === 'both') {
      if (employee.commissionRate && totalBags > 0) {
        commissionAmount = totalBags * employee.commissionRate;
      }
    }

    setFormData({
      ...formData,
      employeeId,
      fixedAmount: fixedAmount.toFixed(2),
      commissionAmount: commissionAmount.toFixed(2),
      totalAmount: calculatedSalary.toFixed(2),
    });
  };

  const handleSubmit = async () => {
    try {
      const employee = employees.find(e => e.id?.toString() === formData.employeeId);
      if (!employee) {
        alert('Please select an employee');
        return;
      }

      const paymentData: Omit<SalaryPayment, 'id'> = {
        employeeId: parseInt(formData.employeeId),
        employeeName: employee.name,
        period: formData.period,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        fixedAmount: formData.fixedAmount ? parseFloat(formData.fixedAmount) : undefined,
        commissionAmount: formData.commissionAmount ? parseFloat(formData.commissionAmount) : undefined,
        totalBags: formData.totalBags ? parseInt(formData.totalBags) : undefined,
        totalAmount: parseFloat(formData.totalAmount),
        paidDate: formData.paidDate,
        notes: formData.notes?.trim() || undefined,
      };

      console.log('Saving payment:', paymentData);

      if (editingPayment?.id) {
        try {
          await dbService.updateSalaryPayment(editingPayment.id, paymentData);
          console.log('Payment updated successfully');
          handleClose();
          setTimeout(() => {
            loadPayments();
          }, 100);
        } catch (error) {
          console.error('Error updating payment:', error);
          alert(`Error updating payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        try {
          await dbService.addSalaryPayment(paymentData);
          console.log('Payment added successfully');
          handleClose();
          setTimeout(() => {
            loadPayments();
          }, 100);
        } catch (error) {
          console.error('Error adding payment:', error);
          alert(`Error adding payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      alert(`Error saving payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this salary payment?')) {
      try {
        await dbService.deleteSalaryPayment(id);
        loadPayments();
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Error deleting payment. Please try again.');
      }
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Salary Payments</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          size="large"
        >
          Record Payment
        </Button>
      </Box>

      {/* Date Navigation - Day View */}
      {viewMode === 'day' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => handleDateChange('prev')}>
                <ChevronLeft />
              </IconButton>
              <TextField
                type="date"
                value={formatDateForInput(selectedDate)}
                onChange={(e) => setSelectedDate(parseDateFromInput(e.target.value))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              <IconButton onClick={() => handleDateChange('next')}>
                <ChevronRight />
              </IconButton>
              {!isToday(selectedDate) && (
                <Button variant="outlined" size="small" onClick={() => handleDateChange('today')}>
                  Today
                </Button>
              )}
            </Box>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="day">Day View</ToggleButton>
              <ToggleButton value="range">Range View</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>
      )}

      {/* Date Range Selection */}
      {viewMode === 'range' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Start Date"
              type="date"
              value={formatDateForInput(dateRange.start)}
              onChange={(e) => setDateRange({ ...dateRange, start: parseDateFromInput(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={formatDateForInput(dateRange.end)}
              onChange={(e) => setDateRange({ ...dateRange, end: parseDateFromInput(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="day">Day View</ToggleButton>
              <ToggleButton value="range">Range View</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Search Payments"
              fullWidth
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Employee name, amount..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SalaryIcon fontSize="small" />
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
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id?.toString()}>
                  {emp.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Filter by Period"
              fullWidth
              select
              size="small"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
            >
              <MenuItem value="all">All Periods</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>
          </Grid>
          {(searchTerm || filterEmployee !== 'all' || filterPeriod !== 'all') && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setFilterEmployee('all');
                  setFilterPeriod('all');
                }}
                fullWidth
              >
                Clear Filters
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Salaries
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalSalaries)}
              </Typography>
              <Typography variant="body2">
                {currentPayments.length} payment{currentPayments.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Fixed Salaries
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalFixed)}
              </Typography>
              <Typography variant="body2">
                Fixed salary payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Commissions
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalCommission)}
              </Typography>
              <Typography variant="body2">
                Commission payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment List */}
      {currentPayments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No payments found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {viewMode === 'day' 
              ? `No payments recorded for ${format(selectedDate, 'MMM d, yyyy')}`
              : 'No payments found in the selected date range'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {currentPayments.map((payment) => (
            <Grid item xs={12} md={6} key={payment.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {payment.employeeName}
                    </Typography>
                    <Chip 
                      label={payment.period}
                      size="small"
                      color="primary"
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Period
                      </Typography>
                      <Typography variant="body2">
                        {format(new Date(payment.periodStart), 'MMM d')} - {format(new Date(payment.periodEnd), 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                    {payment.fixedAmount && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Fixed Salary
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(payment.fixedAmount)}
                        </Typography>
                      </Box>
                    )}
                    {payment.commissionAmount && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Commission ({payment.totalBags} bags)
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(payment.commissionAmount)}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="body1" fontWeight="bold">
                        Total Amount
                      </Typography>
                      <Typography variant="h6" color="success.main" fontWeight="bold">
                        {formatCurrency(payment.totalAmount)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Paid: {format(new Date(payment.paidDate), 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                    {payment.notes && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        {payment.notes}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpen(payment)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => payment.id && handleDelete(payment.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPayment ? 'Edit Salary Payment' : 'Record Salary Payment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Employee"
              fullWidth
              select
              value={formData.employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              required
            >
              <MenuItem value="">Select Employee</MenuItem>
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id?.toString()}>
                  {emp.name} ({emp.salaryType === 'fixed' ? 'Fixed' : emp.salaryType === 'commission' ? 'Commission' : 'Both'})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Period"
              fullWidth
              select
              value={formData.period}
              onChange={(e) => {
                const newPeriod = e.target.value as 'daily' | 'weekly' | 'monthly';
                const employee = employees.find(e => e.id?.toString() === formData.employeeId);
                if (employee) {
                  handleEmployeeChange(formData.employeeId);
                }
                setFormData({ ...formData, period: newPeriod });
              }}
              required
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>

            <TextField
              label="Period Start"
              type="date"
              fullWidth
              value={formatDateForInput(formData.periodStart)}
              onChange={(e) => {
                const newStart = parseDateFromInput(e.target.value);
                setFormData({ ...formData, periodStart: newStart });
              }}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Period End"
              type="date"
              fullWidth
              value={formatDateForInput(formData.periodEnd)}
              onChange={(e) => {
                const newEnd = parseDateFromInput(e.target.value);
                setFormData({ ...formData, periodEnd: newEnd });
              }}
              InputLabelProps={{ shrink: true }}
              required
            />
            {(employees.find(e => e.id?.toString() === formData.employeeId)?.salaryType === 'commission' || 
              employees.find(e => e.id?.toString() === formData.employeeId)?.salaryType === 'both') && (
              <TextField
                label="Total Bags Sold (for commission)"
                fullWidth
                type="number"
                value={formData.totalBags}
                onChange={(e) => {
                  const bags = e.target.value;
                  const employee = employees.find(e => e.id?.toString() === formData.employeeId);
                  if (employee) {
                    const totalBags = parseInt(bags) || 0;
                    const calculatedSalary = FinancialCalculator.calculateEmployeeSalary(
                      employee,
                      totalBags,
                      formData.period
                    );

                    let fixedAmount = 0;
                    let commissionAmount = 0;

                    if (employee.salaryType === 'fixed' || employee.salaryType === 'both') {
                      if (employee.fixedSalary) {
                        const divisor = formData.period === 'daily' ? 30 : formData.period === 'weekly' ? 4 : 1;
                        fixedAmount = employee.fixedSalary / divisor;
                      }
                    }

                    if (employee.salaryType === 'commission' || employee.salaryType === 'both') {
                      if (employee.commissionRate && totalBags > 0) {
                        commissionAmount = totalBags * employee.commissionRate;
                      }
                    }

                    setFormData({
                      ...formData,
                      totalBags: bags,
                      fixedAmount: fixedAmount.toFixed(2),
                      commissionAmount: commissionAmount.toFixed(2),
                      totalAmount: calculatedSalary.toFixed(2),
                    });
                  } else {
                    setFormData({ ...formData, totalBags: bags });
                  }
                }}
                inputProps={{ min: 0 }}
              />
            )}
            {(employees.find(e => e.id?.toString() === formData.employeeId)?.salaryType === 'fixed' || 
              employees.find(e => e.id?.toString() === formData.employeeId)?.salaryType === 'both') && (
              <TextField
                label="Fixed Amount (₦)"
                fullWidth
                type="number"
                value={formData.fixedAmount}
                onChange={(e) => {
                  const fixed = parseFloat(e.target.value) || 0;
                  const commission = parseFloat(formData.commissionAmount) || 0;
                  setFormData({
                    ...formData,
                    fixedAmount: e.target.value,
                    totalAmount: (fixed + commission).toFixed(2),
                  });
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
              />
            )}
            {(employees.find(e => e.id?.toString() === formData.employeeId)?.salaryType === 'commission' || 
              employees.find(e => e.id?.toString() === formData.employeeId)?.salaryType === 'both') && (
              <TextField
                label="Commission Amount (₦)"
                fullWidth
                type="number"
                value={formData.commissionAmount}
                onChange={(e) => {
                  const fixed = parseFloat(formData.fixedAmount) || 0;
                  const commission = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    commissionAmount: e.target.value,
                    totalAmount: (fixed + commission).toFixed(2),
                  });
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
              />
            )}
            <TextField
              label="Total Amount (₦)"
              fullWidth
              type="number"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
              }}
            />
            <TextField
              label="Paid Date"
              type="date"
              fullWidth
              value={formatDateForInput(formData.paidDate)}
              onChange={(e) => setFormData({ ...formData, paidDate: parseDateFromInput(e.target.value) })}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this payment"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" size="large">
            {editingPayment ? 'Update' : 'Record'} Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
