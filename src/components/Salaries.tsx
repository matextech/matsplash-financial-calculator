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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  AccountBalance as SalaryIcon,
  Person as PersonIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { SalaryPayment, Employee, Sale } from '../types';
import { dbService } from '../services/database';
import { FinancialCalculator } from '../services/financialCalculator';
import { format, startOfDay, endOfDay, isSameDay, isToday, addDays, subDays, startOfMonth, endOfMonth, getDate, addMonths, setDate } from 'date-fns';

interface PaymentCycleData {
  period: 'first' | 'second';
  workStart: Date;
  workEnd: Date;
  payDate: Date;
  employees: {
    employee: Employee;
    totalBags: number;
    commission: number;
    fixedAmount: number;
    totalAmount: number;
    sales: Sale[];
    isPaid: boolean;
    paymentId?: number;
  }[];
}

export default function Salaries() {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'cycles' | 'day' | 'range'>('cycles');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalaryPayment | null>(null);
  const [paymentCycles, setPaymentCycles] = useState<PaymentCycleData[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<{ period: 'first' | 'second'; month: Date } | null>(null);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    period: 'first_half' as 'first_half' | 'second_half' | 'daily' | 'weekly' | 'monthly',
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

  // Reload payments when switching to day/range view
  useEffect(() => {
    if (viewMode === 'day' || viewMode === 'range') {
      loadPayments();
      // Reset selected cycle when leaving cycles view
      setSelectedCycle(null);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'cycles') {
      loadPaymentCycles();
    }
  }, [viewMode, employees, payments]);

  // Determine current cycle based on today's date
  useEffect(() => {
    if (viewMode === 'cycles' && paymentCycles.length > 0 && !selectedCycle) {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // If we're past the 15th, we're in the second period of current month
      // If we're before the 15th, we're in the first period of current month
      let defaultCycle: { period: 'first' | 'second'; month: Date } | null = null;
      
      if (currentDay <= 15) {
        // First period (1st-15th, paid on 18th)
        defaultCycle = { period: 'first', month: currentMonth };
      } else {
        // Second period (16th-end, paid on 5th of next month)
        defaultCycle = { period: 'second', month: currentMonth };
      }
      
      // Check if this cycle exists in paymentCycles
      const cycleExists = paymentCycles.some(cycle => {
        const cycleMonth = new Date(cycle.workStart.getFullYear(), cycle.workStart.getMonth(), 1);
        return cycle.period === defaultCycle?.period && 
               cycleMonth.getTime() === defaultCycle.month.getTime();
      });
      
      if (cycleExists && defaultCycle) {
        setSelectedCycle(defaultCycle);
      } else if (paymentCycles.length > 0) {
        // Fallback to first available cycle
        const firstCycle = paymentCycles[0];
        const firstCycleMonth = new Date(firstCycle.workStart.getFullYear(), firstCycle.workStart.getMonth(), 1);
        setSelectedCycle({ period: firstCycle.period, month: firstCycleMonth });
      }
    }
  }, [viewMode, paymentCycles]);

  const loadPayments = async () => {
    const data = await dbService.getSalaryPayments();
    setPayments(data);
  };

  const loadEmployees = async () => {
    const data = await dbService.getEmployees();
    setEmployees(data);
  };

  const getPaymentCycles = (month: Date): { first: PaymentCycleData; second: PaymentCycleData } => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Period 1: 1st-15th, paid on 18th
    const period1Start = new Date(year, monthIndex, 1);
    const period1End = new Date(year, monthIndex, 15);
    const period1PayDate = new Date(year, monthIndex, 18);
    
    // Period 2: 16th-end, paid on 5th of next month
    const period2Start = new Date(year, monthIndex, 16);
    const period2End = endOfMonth(month);
    const period2PayDate = new Date(year, monthIndex + 1, 5);
    
    return {
      first: {
        period: 'first',
        workStart: period1Start,
        workEnd: period1End,
        payDate: period1PayDate,
        employees: [],
      },
      second: {
        period: 'second',
        workStart: period2Start,
        workEnd: period2End,
        payDate: period2PayDate,
        employees: [],
      },
    };
  };

  const loadPaymentCycles = async () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    // Get cycles for previous, current, and next month (to see all available cycles)
    const months = [previousMonth, currentMonth, nextMonth];
    const cycles: PaymentCycleData[] = [];
    
    for (const month of months) {
      const { first, second } = getPaymentCycles(month);
      
      // Load employee data for each period
      for (const cycle of [first, second]) {
        const cycleEmployees = [];
        
        for (const employee of employees) {
          if (!employee.id) continue;
          // Include all employees with fixed or commission salaries
          if (employee.salaryType !== 'commission' && employee.salaryType !== 'both' && employee.salaryType !== 'fixed') continue;
          
          // Get commission based on employee role
          // Drivers: from sales, Packers: from packer entries
          let commissionInfo;
          if (employee.role === 'Packers') {
            commissionInfo = await FinancialCalculator.calculateCommissionFromPackerEntries(
              employee.id,
              startOfDay(cycle.workStart),
              endOfDay(cycle.workEnd)
            );
          } else {
            // Default to sales for drivers and other roles
            commissionInfo = await FinancialCalculator.calculateCommissionFromSales(
              employee.id,
              startOfDay(cycle.workStart),
              endOfDay(cycle.workEnd)
            );
          }
          
          // Calculate fixed salary for the period (if applicable)
          let fixedAmount = 0;
          if (employee.salaryType === 'fixed' || employee.salaryType === 'both') {
            if (employee.fixedSalary) {
              // For payment cycles, calculate exactly half of monthly salary
              // Period 1 (1st-15th) and Period 2 (16th-end) each get exactly half
              fixedAmount = employee.fixedSalary / 2;
            }
          }
          
          const totalAmount = fixedAmount + commissionInfo.commission;
          
          // Check if payment already exists for this period
          const existingPayment = payments.find(p => 
            p.employeeId === employee.id &&
            p.periodStart.getTime() === cycle.workStart.getTime() &&
            p.periodEnd.getTime() === cycle.workEnd.getTime()
          );
          
          // Include employee if they have sales, fixed salary, or existing payment
          if (commissionInfo.totalBags > 0 || fixedAmount > 0 || existingPayment) {
            cycleEmployees.push({
              employee,
              totalBags: commissionInfo.totalBags,
              commission: commissionInfo.commission,
              fixedAmount,
              totalAmount,
              sales: commissionInfo.sales,
              isPaid: !!existingPayment,
              paymentId: existingPayment?.id,
            });
          }
        }
        
        cycle.employees = cycleEmployees;
        cycles.push(cycle);
      }
    }
    
    setPaymentCycles(cycles);
  };

  const getPaymentsForDate = (date: Date): SalaryPayment[] => {
    let filtered = payments.filter(payment => {
      const paidDate = payment.paidDate instanceof Date ? payment.paidDate : new Date(payment.paidDate);
      return isSameDay(paidDate, date);
    });

    if (filterEmployee !== 'all') {
      filtered = filtered.filter(p => p.employeeId.toString() === filterEmployee);
    }

    if (filterPeriod !== 'all') {
      filtered = filtered.filter(p => p.period === filterPeriod);
    }

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

    if (filterEmployee !== 'all') {
      filtered = filtered.filter(p => p.employeeId.toString() === filterEmployee);
    }

    if (filterPeriod !== 'all') {
      filtered = filtered.filter(p => p.period === filterPeriod);
    }

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
    : viewMode === 'range'
    ? getPaymentsForRange(dateRange.start, dateRange.end)
    : [];

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

  const handleCreatePaymentFromCycle = (cycleData: PaymentCycleData, employeeData: typeof cycleData.employees[0]) => {
    const employee = employeeData.employee;
    setFormData({
      employeeId: employee.id?.toString() || '',
      period: cycleData.period === 'first' ? 'first_half' : 'second_half',
      periodStart: cycleData.workStart,
      periodEnd: cycleData.workEnd,
      fixedAmount: employeeData.fixedAmount.toFixed(2),
      commissionAmount: employeeData.commission.toFixed(2),
      totalBags: employeeData.totalBags.toString(),
      totalAmount: employeeData.totalAmount.toFixed(2),
      paidDate: cycleData.payDate,
      notes: `Payment for ${format(cycleData.workStart, 'MMM d')} - ${format(cycleData.workEnd, 'MMM d, yyyy')} (${cycleData.period === 'first' ? '1st-15th, paid on 18th' : '16th-end, paid on 5th'})`,
    });
    setOpen(true);
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
    } else {
      setEditingPayment(null);
      const today = new Date();
      setFormData({
        employeeId: '',
        period: 'first_half',
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

    const totalBags = formData.totalBags ? parseInt(formData.totalBags) : 0;
    const calculatedSalary = FinancialCalculator.calculateEmployeeSalary(
      employee,
      totalBags,
      formData.period
    );

    let fixedAmount = 0;
    let commissionAmount = 0;

    if (employee.salaryType === 'fixed' || employee.salaryType === 'both') {
      if (employee.fixedSalary) {
        // For payment cycles, use exactly half
        if (formData.period === 'first_half' || formData.period === 'second_half') {
          fixedAmount = employee.fixedSalary / 2;
        } else {
          const divisor = formData.period === 'daily' ? 30 : formData.period === 'weekly' ? 4 : 1;
          fixedAmount = employee.fixedSalary / divisor;
        }
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

      if (editingPayment?.id) {
        await dbService.updateSalaryPayment(editingPayment.id, paymentData);
        handleClose();
        setTimeout(() => {
          loadPayments();
          if (viewMode === 'cycles') loadPaymentCycles();
        }, 100);
      } else {
        await dbService.addSalaryPayment(paymentData);
        handleClose();
        setTimeout(() => {
          loadPayments();
          if (viewMode === 'cycles') loadPaymentCycles();
        }, 100);
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
        if (viewMode === 'cycles') loadPaymentCycles();
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

      {/* View Mode Toggle */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="cycles">
              <CalendarIcon sx={{ mr: 1 }} />
              Payment Cycles
            </ToggleButton>
            <ToggleButton value="day">Day View</ToggleButton>
            <ToggleButton value="range">Range View</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Payment Cycles View */}
      {viewMode === 'cycles' && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Payment Schedule:</strong> Work done between 1st-15th is paid on the 18th. 
              Work done between 16th-end is paid on the 5th of the following month.
            </Typography>
          </Alert>

          {/* Cycle Selector */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body1" fontWeight="medium">
                Select Payment Cycle:
              </Typography>
              <TextField
                select
                value={selectedCycle ? `${selectedCycle.period}-${selectedCycle.month.getTime()}` : ''}
                onChange={(e) => {
                  const [period, monthTime] = e.target.value.split('-');
                  const month = new Date(parseInt(monthTime));
                  setSelectedCycle({ period: period as 'first' | 'second', month });
                }}
                sx={{ minWidth: 300 }}
                size="small"
              >
                {paymentCycles.map((cycle, idx) => {
                  const cycleMonth = new Date(cycle.workStart.getFullYear(), cycle.workStart.getMonth(), 1);
                  const value = `${cycle.period}-${cycleMonth.getTime()}`;
                  const label = `${cycle.period === 'first' ? 'Period 1' : 'Period 2'}: ${format(cycle.workStart, 'MMM d')} - ${format(cycle.workEnd, 'MMM d, yyyy')} (Pay: ${format(cycle.payDate, 'MMM d, yyyy')})`;
                  return (
                    <MenuItem key={idx} value={value}>
                      {label}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Box>
          </Paper>

          {selectedCycle && paymentCycles.filter(cycle => {
            const cycleMonth = new Date(cycle.workStart.getFullYear(), cycle.workStart.getMonth(), 1);
            return cycle.period === selectedCycle.period && 
                   cycleMonth.getTime() === selectedCycle.month.getTime();
          }).map((cycle, idx) => {
            const isPastDue = cycle.payDate < new Date() && cycle.employees.some(e => !e.isPaid);
            const pendingCount = cycle.employees.filter(e => !e.isPaid).length;
            const totalPending = cycle.employees.filter(e => !e.isPaid).reduce((sum, e) => sum + e.totalAmount, 0);
            
            return (
              <Card key={idx} sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {cycle.period === 'first' ? 'Period 1' : 'Period 2'}: {format(cycle.workStart, 'MMM d')} - {format(cycle.workEnd, 'MMM d, yyyy')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Work Period: {format(cycle.workStart, 'MMM d, yyyy')} to {format(cycle.workEnd, 'MMM d, yyyy')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Payment Due: {format(cycle.payDate, 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      {isPastDue && (
                        <Chip label="Past Due" color="error" size="small" sx={{ mb: 1, display: 'block' }} />
                      )}
                      <Chip 
                        label={`${pendingCount} Pending`} 
                        color={pendingCount > 0 ? 'warning' : 'success'} 
                        size="small"
                        icon={pendingCount > 0 ? <PendingIcon /> : <CheckCircleIcon />}
                      />
                      <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                        {formatCurrency(totalPending)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Pending
                      </Typography>
                    </Box>
                  </Box>

                  {cycle.employees.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      No employees with sales or fixed salaries for this period
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Employee</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell align="right">Bags Sold</TableCell>
                            <TableCell align="right">Fixed Salary</TableCell>
                            <TableCell align="right">Commission</TableCell>
                            <TableCell align="right">Total Amount</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {cycle.employees.map((empData) => (
                            <TableRow key={empData.employee.id} hover>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {empData.employee.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {empData.employee.email}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={empData.employee.role || 'General'}
                                  size="small"
                                  color={
                                    empData.employee.role === 'Driver'
                                      ? 'secondary'
                                      : empData.employee.role === 'Packers'
                                      ? 'info'
                                      : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell align="right">
                                {empData.totalBags.toLocaleString()}
                              </TableCell>
                              <TableCell align="right">
                                {empData.fixedAmount > 0 ? formatCurrency(empData.fixedAmount) : '-'}
                              </TableCell>
                              <TableCell align="right">
                                {empData.commission > 0 ? formatCurrency(empData.commission) : '-'}
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  {formatCurrency(empData.totalAmount)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {empData.isPaid ? (
                                  <Chip
                                    label="Paid"
                                    color="success"
                                    size="small"
                                    icon={<CheckCircleIcon />}
                                  />
                                ) : (
                                  <Chip
                                    label="Pending"
                                    color="warning"
                                    size="small"
                                    icon={<PendingIcon />}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {empData.isPaid ? (
                                  <Tooltip title="View Payment">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        const payment = payments.find(p => p.id === empData.paymentId);
                                        if (payment) handleOpen(payment);
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => handleCreatePaymentFromCycle(cycle, empData)}
                                  >
                                    Create Payment
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {selectedCycle && paymentCycles.filter(cycle => {
            const cycleMonth = new Date(cycle.workStart.getFullYear(), cycle.workStart.getMonth(), 1);
            return cycle.period === selectedCycle.period && 
                   cycleMonth.getTime() === selectedCycle.month.getTime();
          }).length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No cycle selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please select a payment cycle from the dropdown above
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <>
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
            </Box>
          </Paper>

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
                  <MenuItem value="first_half">First Half (1st-15th)</MenuItem>
                  <MenuItem value="second_half">Second Half (16th-end)</MenuItem>
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
                No payments recorded for {format(selectedDate, 'MMM d, yyyy')}
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
        </>
      )}

      {/* Range View */}
      {viewMode === 'range' && (
        <>
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
            </Box>
          </Paper>

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
                  <MenuItem value="first_half">First Half (1st-15th)</MenuItem>
                  <MenuItem value="second_half">Second Half (16th-end)</MenuItem>
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
                No payments recorded in the selected date range
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
        </>
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
                const newPeriod = e.target.value as 'first_half' | 'second_half' | 'daily' | 'weekly' | 'monthly';
                const employee = employees.find(e => e.id?.toString() === formData.employeeId);
                if (employee) {
                  handleEmployeeChange(formData.employeeId);
                }
                setFormData({ ...formData, period: newPeriod });
              }}
              required
            >
              <MenuItem value="first_half">First Half (1st-15th, paid on 18th)</MenuItem>
              <MenuItem value="second_half">Second Half (16th-end, paid on 5th)</MenuItem>
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
                        // For payment cycles, use exactly half
                        if (formData.period === 'first_half' || formData.period === 'second_half') {
                          fixedAmount = employee.fixedSalary / 2;
                        } else {
                          const divisor = formData.period === 'daily' ? 30 : formData.period === 'weekly' ? 4 : 1;
                          fixedAmount = employee.fixedSalary / divisor;
                        }
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
