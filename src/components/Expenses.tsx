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
  Divider,
  Chip,
  InputAdornment,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  LocalGasStation as FuelIcon,
  DirectionsCar as DriverIcon,
  Receipt as OtherIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { Expense } from '../types';
import { dbService } from '../services/database';
import { format, startOfDay, endOfDay, isSameDay, parseISO, isToday, addDays, subDays } from 'date-fns';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'range'>('day');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Multi-entry form data
  const [formData, setFormData] = useState({
    date: new Date(),
    fuel: {
      amount: '',
      description: '',
      reference: '',
    },
    driverPayment: {
      amount: '',
      description: '',
      reference: '',
    },
    other: {
      amount: '',
      description: '',
      reference: '',
    },
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const data = await dbService.getExpenses();
    setExpenses(data);
  };

  const getExpensesForDate = (date: Date): Expense[] => {
    return expenses.filter(expense => {
      const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
      return isSameDay(expenseDate, date);
    });
  };

  const getExpensesForRange = (start: Date, end: Date): Expense[] => {
    const startDay = startOfDay(start);
    const endDay = endOfDay(end);
    return expenses.filter(expense => {
      const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
      return expenseDate >= startDay && expenseDate <= endDay;
    });
  };

  const currentExpenses = viewMode === 'day' 
    ? getExpensesForDate(selectedDate)
    : getExpensesForRange(dateRange.start, dateRange.end);

  const groupedExpenses = {
    fuel: currentExpenses.filter(e => {
      const type = e.type || (e as any).type;
      return type === 'fuel' || type === 'generator_fuel';
    }),
    driverFuel: currentExpenses.filter(e => {
      const type = e.type || (e as any).type;
      return type === 'driver_fuel' || type === 'driver_payment';
    }),
    other: currentExpenses.filter(e => {
      const type = e.type || (e as any).type;
      return type === 'other';
    }),
  };
  

  const totalByType = {
    fuel: groupedExpenses.fuel.reduce((sum, e) => sum + (e.amount || 0), 0),
    driverFuel: groupedExpenses.driverFuel.reduce((sum, e) => sum + (e.amount || 0), 0),
    other: groupedExpenses.other.reduce((sum, e) => sum + (e.amount || 0), 0),
  };

  const totalExpenses = totalByType.fuel + totalByType.driverFuel + totalByType.other;
  
  // Debug: Log expenses on load
  useEffect(() => {
    console.log('All expenses loaded:', expenses.length);
    console.log('Expenses by type:', {
      fuel: expenses.filter(e => e.type === 'fuel' || (e as any).type === 'generator_fuel').length,
      driverFuel: expenses.filter(e => e.type === 'driver_fuel' || (e as any).type === 'driver_payment').length,
      other: expenses.filter(e => e.type === 'other').length,
    });
  }, [expenses]);

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

  const handleOpen = (expense?: Expense, date?: Date) => {
    if (expense) {
      setEditingExpense(expense);
      const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
      const expenseType = expense.type || (expense as any).type;
      
      console.log('Opening expense for editing:', {
        id: expense.id,
        type: expenseType,
        amount: expense.amount,
        description: expense.description
      });
      
      setFormData({
        date: expenseDate,
        fuel: expenseType === 'fuel' || expenseType === 'generator_fuel'
          ? { amount: expense.amount.toString(), description: expense.description, reference: expense.reference || '' }
          : { amount: '', description: '', reference: '' },
        driverPayment: expenseType === 'driver_fuel' || expenseType === 'driver_payment'
          ? { amount: expense.amount.toString(), description: expense.description, reference: expense.reference || '' }
          : { amount: '', description: '', reference: '' },
        other: expenseType === 'other'
          ? { amount: expense.amount.toString(), description: expense.description, reference: expense.reference || '' }
          : { amount: '', description: '', reference: '' },
      });
      
      console.log('Form data set:', {
        fuel: expenseType === 'fuel' || expenseType === 'generator_fuel' ? expense.amount : 'empty',
        driverFuel: expenseType === 'driver_fuel' || expenseType === 'driver_payment' ? expense.amount : 'empty',
        other: expenseType === 'other' ? expense.amount : 'empty',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        date: date || selectedDate,
        fuel: { amount: '', description: '', reference: '' },
        driverPayment: { amount: '', description: '', reference: '' },
        other: { amount: '', description: '', reference: '' },
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingExpense(null);
  };

  const handleSubmit = async () => {
    try {
      // Helper function to validate and parse amount
      const parseAmount = (amountStr: string): number | null => {
        if (!amountStr || amountStr.trim() === '') return null;
        const parsed = parseFloat(amountStr);
        return isNaN(parsed) || parsed <= 0 ? null : parsed;
      };

      if (editingExpense?.id) {
        // Update single expense - determine which type based on which field has data
        // Check in order: fuel, driverPayment, other
        let expenseType: 'fuel' | 'driver_fuel' | 'other' | null = null;
        let amount: number | null = null;
        let description = '';
        let reference = '';

        const fuelAmount = parseAmount(formData.fuel.amount);
        const driverAmount = parseAmount(formData.driverPayment.amount);
        const otherAmount = parseAmount(formData.other.amount);

        if (fuelAmount !== null) {
          expenseType = 'fuel';
          amount = fuelAmount;
          description = formData.fuel.description.trim() || 'Generator Fuel';
          reference = formData.fuel.reference?.trim() || '';
        } else if (driverAmount !== null) {
          expenseType = 'driver_fuel';
          amount = driverAmount;
          description = formData.driverPayment.description.trim() || 'Drivers Fuel';
          reference = formData.driverPayment.reference?.trim() || '';
        } else if (otherAmount !== null) {
          expenseType = 'other';
          amount = otherAmount;
          description = formData.other.description.trim() || 'Other expense';
          reference = formData.other.reference?.trim() || '';
        }

        console.log('Editing expense:', {
          originalId: editingExpense.id,
          originalType: editingExpense.type,
          fuelAmount,
          driverAmount,
          otherAmount,
          selectedType: expenseType,
          amount,
          description
        });

        if (expenseType && amount !== null) {
          const updateData = {
            type: expenseType,
            description,
            amount,
            date: formData.date,
            reference: reference || undefined,
          };
          console.log('Updating expense with:', updateData);
          try {
            await dbService.updateExpense(editingExpense.id, updateData);
            console.log('Expense updated successfully');
            handleClose();
            setTimeout(() => {
              loadExpenses();
            }, 100);
          } catch (error) {
            console.error('Error updating expense:', error);
            alert(`Error updating expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          alert('Please enter a valid amount for the expense.');
          return;
        }
      } else {
        // Add multiple expenses - validate and save each type independently
        const expensesToSave: Omit<Expense, 'id'>[] = [];
        
        // Save fuel expense if provided
        const fuelAmount = parseAmount(formData.fuel.amount);
        if (fuelAmount !== null) {
          expensesToSave.push({
            type: 'fuel',
            description: formData.fuel.description.trim() || 'Generator Fuel',
            amount: fuelAmount,
            date: formData.date,
            reference: formData.fuel.reference?.trim() || undefined,
          });
          console.log('Adding generator fuel expense:', { amount: fuelAmount, description: formData.fuel.description });
        }

        // Save driver fuel if provided
        const driverAmount = parseAmount(formData.driverPayment.amount);
        if (driverAmount !== null) {
          expensesToSave.push({
            type: 'driver_fuel',
            description: formData.driverPayment.description.trim() || 'Drivers Fuel',
            amount: driverAmount,
            date: formData.date,
            reference: formData.driverPayment.reference?.trim() || undefined,
          });
          console.log('Adding drivers fuel expense:', { amount: driverAmount, description: formData.driverPayment.description });
        }

        // Save other expense if provided
        const otherAmount = parseAmount(formData.other.amount);
        if (otherAmount !== null) {
          expensesToSave.push({
            type: 'other',
            description: formData.other.description.trim() || 'Other expense',
            amount: otherAmount,
            date: formData.date,
            reference: formData.other.reference?.trim() || undefined,
          });
          console.log('Adding other expense:', { amount: otherAmount, description: formData.other.description });
        }

        if (expensesToSave.length === 0) {
          alert('Please enter at least one expense amount.');
          return;
        }

        console.log('Saving expenses:', expensesToSave);
        
        // Save all expenses sequentially
        for (const expense of expensesToSave) {
          try {
            const id = await dbService.addExpense(expense);
            console.log('Expense saved with ID:', id, expense);
          } catch (error) {
            console.error('Error saving individual expense:', expense, error);
            throw error;
          }
        }

        console.log('All expenses saved successfully');
      }

      handleClose();
      // Reload expenses after a short delay to ensure DB is updated
      setTimeout(() => {
        loadExpenses();
      }, 100);
    } catch (error) {
      console.error('Error saving expenses:', error);
      alert(`Error saving expenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await dbService.deleteExpense(id);
        loadExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense. Please try again.');
      }
    }
  };

  const ExpenseCard = ({ title, icon, expenses, total, color }: {
    title: string;
    icon: React.ReactNode;
    expenses: Expense[];
    total: number;
    color: string;
  }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ color, mr: 1 }}>{icon}</Box>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <Chip label={formatCurrency(total)} color="primary" size="small" />
        </Box>
        {expenses.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No {title.toLowerCase()} expenses
          </Typography>
        ) : (
          <Stack spacing={1}>
            {expenses.map((expense) => (
              <Paper key={expense.id} variant="outlined" sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {expense.description}
                    </Typography>
                    {expense.reference && (
                      <Typography variant="caption" color="text.secondary">
                        Ref: {expense.reference}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
                    {formatCurrency(expense.amount)}
                  </Typography>
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpen(expense)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => expense.id && handleDelete(expense.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Daily Expenses</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          size="large"
        >
          Add Expenses
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

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generator Fuel
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalByType.fuel)}
              </Typography>
              <Typography variant="body2">
                {groupedExpenses.fuel.length} expense{groupedExpenses.fuel.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Drivers Fuel
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalByType.driverFuel)}
              </Typography>
              <Typography variant="body2">
                {groupedExpenses.driverFuel.length} expense{groupedExpenses.driverFuel.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Expenses
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalExpenses)}
              </Typography>
              <Typography variant="body2">
                {currentExpenses.length} total expense{currentExpenses.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Expense Lists */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <ExpenseCard
            title="Generator Fuel"
            icon={<FuelIcon />}
            expenses={groupedExpenses.fuel}
            total={totalByType.fuel}
            color="error.main"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ExpenseCard
            title="Drivers Fuel"
            icon={<DriverIcon />}
            expenses={groupedExpenses.driverFuel}
            total={totalByType.driverFuel}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ExpenseCard
            title="Other Expenses"
            icon={<OtherIcon />}
            expenses={groupedExpenses.other}
            total={totalByType.other}
            color="primary.main"
          />
        </Grid>
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingExpense ? 'Edit Expense' : 'Add Daily Expenses'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={formatDateForInput(formData.date)}
              onChange={(e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) })}
              InputLabelProps={{ shrink: true }}
              required
            />

            <Divider>Generator Fuel</Divider>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'error.50', borderRadius: 1 }}>
              <TextField
                label="Generator Fuel Amount (₦)"
                fullWidth
                type="number"
                value={formData.fuel.amount}
                onChange={(e) => setFormData({
                  ...formData,
                  fuel: { ...formData.fuel, amount: e.target.value }
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
                placeholder="Enter generator fuel amount"
              />
              <TextField
                label="Description"
                fullWidth
                value={formData.fuel.description}
                onChange={(e) => setFormData({
                  ...formData,
                  fuel: { ...formData.fuel, description: e.target.value }
                })}
                placeholder="e.g., Generator fuel for factory"
              />
              <TextField
                label="Reference (Optional)"
                fullWidth
                value={formData.fuel.reference}
                onChange={(e) => setFormData({
                  ...formData,
                  fuel: { ...formData.fuel, reference: e.target.value }
                })}
                placeholder="Trip ID, receipt number, etc."
              />
            </Box>

            <Divider>Drivers Fuel</Divider>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'info.50', borderRadius: 1 }}>
              <TextField
                label="Drivers Fuel Amount (₦)"
                fullWidth
                type="number"
                value={formData.driverPayment.amount}
                onChange={(e) => setFormData({
                  ...formData,
                  driverPayment: { ...formData.driverPayment, amount: e.target.value }
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
                placeholder="Enter drivers fuel amount"
              />
              <TextField
                label="Description"
                fullWidth
                value={formData.driverPayment.description}
                onChange={(e) => setFormData({
                  ...formData,
                  driverPayment: { ...formData.driverPayment, description: e.target.value }
                })}
                placeholder="e.g., Fuel for driver vehicles"
              />
              <TextField
                label="Reference (Optional)"
                fullWidth
                value={formData.driverPayment.reference}
                onChange={(e) => setFormData({
                  ...formData,
                  driverPayment: { ...formData.driverPayment, reference: e.target.value }
                })}
                placeholder="Trip ID, driver name, etc."
              />
            </Box>

            <Divider>Other Expenses</Divider>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
              <TextField
                label="Other Expense Amount (₦)"
                fullWidth
                type="number"
                value={formData.other.amount}
                onChange={(e) => setFormData({
                  ...formData,
                  other: { ...formData.other, amount: e.target.value }
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
                placeholder="Enter other expense amount"
              />
              <TextField
                label="Description"
                fullWidth
                value={formData.other.description}
                onChange={(e) => setFormData({
                  ...formData,
                  other: { ...formData.other, description: e.target.value }
                })}
                placeholder="e.g., Maintenance, supplies, etc."
              />
              <TextField
                label="Reference (Optional)"
                fullWidth
                value={formData.other.reference}
                onChange={(e) => setFormData({
                  ...formData,
                  other: { ...formData.other, reference: e.target.value }
                })}
                placeholder="Receipt number, invoice, etc."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" size="large">
            {editingExpense ? 'Update' : 'Save Expenses'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
