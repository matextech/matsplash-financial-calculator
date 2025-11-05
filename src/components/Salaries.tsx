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
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { SalaryPayment, Employee } from '../types';
import { dbService } from '../services/database';
import { FinancialCalculator } from '../services/financialCalculator';
import { format } from 'date-fns';

export default function Salaries() {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
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

  const handleOpen = () => {
    setFormData({
      employeeId: '',
      period: 'daily',
      periodStart: new Date(),
      periodEnd: new Date(),
      fixedAmount: '',
      commissionAmount: '',
      totalBags: '',
      totalAmount: '',
      paidDate: new Date(),
      notes: '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
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

    // Separate fixed and commission
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
        const pricePerBag = 50; // Default price
        commissionAmount = (totalBags * pricePerBag * employee.commissionRate) / 100;
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
      await dbService.addSalaryPayment(paymentData);
      handleClose();
      loadPayments();
    } catch (error) {
      console.error('Error saving salary payment:', error);
      alert('Error saving salary payment. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Salary Payments</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Record Payment
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h6">
          Total Salaries Paid: {formatCurrency(totalPaid)}
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Paid Date</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Fixed</TableCell>
              <TableCell>Commission</TableCell>
              <TableCell>Total Bags</TableCell>
              <TableCell>Total Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">No salary payments found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.paidDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{payment.employeeName}</TableCell>
                  <TableCell>{payment.period}</TableCell>
                  <TableCell>{payment.fixedAmount ? formatCurrency(payment.fixedAmount) : 'N/A'}</TableCell>
                  <TableCell>{payment.commissionAmount ? formatCurrency(payment.commissionAmount) : 'N/A'}</TableCell>
                  <TableCell>{payment.totalBags || 'N/A'}</TableCell>
                  <TableCell>{formatCurrency(payment.totalAmount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Record Salary Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Employee"
              fullWidth
              select
              value={formData.employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
            >
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id?.toString()}>
                  {emp.name} ({emp.salaryType})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Payment Period"
              fullWidth
              select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Period Start"
                value={formData.periodStart}
                onChange={(newValue) => newValue && setFormData({ ...formData, periodStart: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Period End"
                value={formData.periodEnd}
                onChange={(newValue) => newValue && setFormData({ ...formData, periodEnd: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
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
            />
            <TextField
              label="Total Amount (₦)"
              fullWidth
              type="number"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              required
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Paid Date"
                value={formData.paidDate}
                onChange={(newValue) => newValue && setFormData({ ...formData, paidDate: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
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
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

