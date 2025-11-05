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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  IconButton,
  InputAdornment,
  Tooltip,
  Chip,
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { SalaryPayment, Employee } from '../types';
import { dbService } from '../services/database';
import { FinancialCalculator } from '../services/financialCalculator';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export default function Salaries() {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadPayments();
    loadEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payments, searchTerm, filterEmployee, filterPeriod, dateFilter]);

  const loadPayments = async () => {
    const data = await dbService.getSalaryPayments();
    setPayments(data);
    setFilteredPayments(data);
  };

  const loadEmployees = async () => {
    const data = await dbService.getEmployees();
    setEmployees(data);
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.employeeName.toLowerCase().includes(search) ||
        p.totalAmount.toString().includes(search) ||
        (p.notes && p.notes.toLowerCase().includes(search))
      );
    }

    // Employee filter
    if (filterEmployee !== 'all') {
      filtered = filtered.filter(p => p.employeeId.toString() === filterEmployee);
    }

    // Period filter
    if (filterPeriod !== 'all') {
      filtered = filtered.filter(p => p.period === filterPeriod);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      let startDate: Date;
      let endDate: Date = endOfDay(today);

      switch (dateFilter) {
        case 'today':
          startDate = startOfDay(today);
          break;
        case 'week':
          startDate = startOfDay(subDays(today, 7));
          break;
        case 'month':
          startDate = startOfDay(subDays(today, 30));
          break;
        default:
          startDate = startOfDay(subDays(today, 365));
      }

      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.paidDate);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }

    setFilteredPayments(filtered);
  };

  // Helper function to format date for input (YYYY-MM-DD) without timezone issues
  const formatDateForInput = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to parse date from input (YYYY-MM-DD) without timezone issues
  const parseDateFromInput = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleOpen = (payment?: SalaryPayment) => {
    if (payment) {
      setEditingPayment(payment);
      // Ensure dates are properly parsed from database
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
        paidDate: today,
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
        // Commission is now a fixed rate per bag (e.g., ₦15 per bag for drivers, ₦4 per bag for packers)
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
      notes: formData.notes || undefined,
    };

    try {
      if (editingPayment?.id) {
        await dbService.updateSalaryPayment(editingPayment.id, paymentData);
      } else {
        await dbService.addSalaryPayment(paymentData);
      }
      handleClose();
      loadPayments();
    } catch (error) {
      console.error('Error saving salary payment:', error);
      alert('Error saving salary payment. Please try again.');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalPaid = filteredPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const clearFilters = () => {
    setSearchTerm('');
    setFilterEmployee('all');
    setFilterPeriod('all');
    setDateFilter('all');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Salary Payments</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Record Payment
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search payments..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
            <TextField
              label="Employee"
              size="small"
              select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">All Employees</MenuItem>
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id?.toString()}>
                  {emp.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Period"
              size="small"
              select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">All Periods</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>
            <TextField
              label="Date Range"
              size="small"
              select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Last 7 Days</MenuItem>
              <MenuItem value="month">Last 30 Days</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </TextField>
            {(searchTerm || filterEmployee !== 'all' || filterPeriod !== 'all' || dateFilter !== 'all') && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h6">
          Total Salaries Paid: {formatCurrency(totalPaid)} ({filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'})
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Paid Date</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Period</TableCell>
              <TableCell align="right">Fixed</TableCell>
              <TableCell align="right">Commission</TableCell>
              <TableCell>Total Bags</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary">
                    {payments.length === 0 ? 'No salary payments found' : 'No payments match your filters'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id} hover>
                  <TableCell>{format(new Date(payment.paidDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{payment.employeeName}</TableCell>
                  <TableCell>
                    <Chip label={payment.period} size="small" />
                  </TableCell>
                  <TableCell align="right">{payment.fixedAmount ? formatCurrency(payment.fixedAmount) : 'N/A'}</TableCell>
                  <TableCell align="right">{payment.commissionAmount ? formatCurrency(payment.commissionAmount) : 'N/A'}</TableCell>
                  <TableCell>{payment.totalBags || 'N/A'}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">{formatCurrency(payment.totalAmount)}</Typography>
                  </TableCell>
                  <TableCell align="center">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id?.toString()}>
                  {emp.name} ({emp.role || 'General'}) - {emp.salaryType}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Payment Period"
              fullWidth
              select
              value={formData.period}
              onChange={(e) => {
                const newPeriod = e.target.value as any;
                setFormData({ ...formData, period: newPeriod });
                if (formData.employeeId) {
                  handleEmployeeChange(formData.employeeId);
                }
              }}
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
                const newDate = parseDateFromInput(e.target.value);
                setFormData({ ...formData, periodStart: newDate });
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
                const newDate = parseDateFromInput(e.target.value);
                setFormData({ ...formData, periodEnd: newDate });
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
                  const newBags = e.target.value;
                  setFormData({ ...formData, totalBags: newBags });
                  if (formData.employeeId) {
                    handleEmployeeChange(formData.employeeId);
                  }
                }}
                inputProps={{ min: 0 }}
              />
            )}
            <TextField
              label="Fixed Amount (₦)"
              fullWidth
              type="number"
              value={formData.fixedAmount}
              onChange={(e) => {
                const newFixed = e.target.value;
                const newTotal = (parseFloat(newFixed) + parseFloat(formData.commissionAmount || '0')).toFixed(2);
                setFormData({ ...formData, fixedAmount: newFixed, totalAmount: newTotal });
              }}
              disabled={!formData.employeeId}
              InputProps={{
                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
              }}
            />
            <TextField
              label="Commission Amount (₦)"
              fullWidth
              type="number"
              value={formData.commissionAmount}
              onChange={(e) => {
                const newCommission = e.target.value;
                const newTotal = (parseFloat(formData.fixedAmount || '0') + parseFloat(newCommission)).toFixed(2);
                setFormData({ ...formData, commissionAmount: newCommission, totalAmount: newTotal });
              }}
              disabled={!formData.employeeId}
              InputProps={{
                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
              }}
            />
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
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingPayment ? 'Update' : 'Record'} Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
