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
  IconButton,
  MenuItem,
  Chip,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { Expense } from '../types';
import { dbService } from '../services/database';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    type: 'fuel' as 'fuel' | 'driver_payment' | 'material' | 'other',
    description: '',
    amount: '',
    date: new Date(),
    reference: '',
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Smart defaults - remember last inputs
  const [lastExpenseType, setLastExpenseType] = useState<string>('fuel');
  const [lastAmounts, setLastAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [expenses, searchTerm, filterType, dateFilter]);

  const loadExpenses = async () => {
    const data = await dbService.getExpenses();
    setExpenses(data);
    setFilteredExpenses(data);
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(search) ||
        (e.reference && e.reference.toLowerCase().includes(search)) ||
        e.amount.toString().includes(search)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.type === filterType);
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

      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }

    setFilteredExpenses(filtered);
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

  const handleOpen = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      // Ensure date is properly parsed from database
      const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
      setFormData({
        type: expense.type,
        description: expense.description,
        amount: expense.amount.toString(),
        date: expenseDate,
        reference: expense.reference || '',
      });
    } else {
      setEditingExpense(null);
      // Smart defaults - use last values
      setFormData({
        type: lastExpenseType as any,
        description: '',
        amount: lastAmounts[lastExpenseType] || '',
        date: new Date(),
        reference: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingExpense(null);
  };

  const handleSubmit = async () => {
    const expenseData: Omit<Expense, 'id'> = {
      type: formData.type,
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
      reference: formData.reference || undefined,
    };

    try {
      if (editingExpense?.id) {
        await dbService.updateExpense(editingExpense.id, expenseData);
      } else {
        await dbService.addExpense(expenseData);
        // Remember last values for smart defaults
        setLastExpenseType(formData.type);
        setLastAmounts({ ...lastAmounts, [formData.type]: formData.amount });
      }
      handleClose();
      loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense. Please try again.');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fuel':
        return 'error';
      case 'driver_payment':
        return 'warning';
      case 'material':
        return 'info';
      default:
        return 'default';
    }
  };

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setDateFilter('all');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Expenses</Typography>
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
            Add Expense
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search expenses..."
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
              label="Type"
              size="small"
              select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="fuel">Fuel</MenuItem>
              <MenuItem value="driver_payment">Driver Payment</MenuItem>
              <MenuItem value="material">Material</MenuItem>
              <MenuItem value="other">Other</MenuItem>
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
            {(searchTerm || filterType !== 'all' || dateFilter !== 'all') && (
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
          Total Expenses: {formatCurrency(totalExpenses)} ({filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'})
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    {expenses.length === 0 ? 'No expenses found' : 'No expenses match your filters'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Chip 
                      label={expense.type.replace('_', ' ')} 
                      size="small" 
                      color={getTypeColor(expense.type) as any} 
                    />
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.reference || 'N/A'}</TableCell>
                  <TableCell align="right">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell align="center">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingExpense ? 'Edit Expense' : 'Add Expense'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Expense Type"
              fullWidth
              select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              required
            >
              <MenuItem value="fuel">Fuel</MenuItem>
              <MenuItem value="driver_payment">Driver Payment</MenuItem>
              <MenuItem value="material">Material</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <TextField
              label="Description"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="e.g., Fuel for truck #1"
            />
            <TextField
              label="Amount (₦)"
              fullWidth
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
              }}
            />
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={formatDateForInput(formData.date)}
              onChange={(e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) })}
              InputLabelProps={{
                shrink: true,
              }}
              required
            />
            <TextField
              label="Reference (Trip ID, etc.)"
              fullWidth
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Optional: Reference number or trip ID"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingExpense ? 'Update' : 'Add'} Expense
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
