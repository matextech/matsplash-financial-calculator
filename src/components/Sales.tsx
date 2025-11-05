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
import { Sale } from '../types';
import { dbService } from '../services/database';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({
    driverName: '',
    driverEmail: '',
    bagsSold: '',
    pricePerBag: '50',
    date: new Date(),
    notes: '',
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Smart defaults
  const [lastPricePerBag, setLastPricePerBag] = useState<string>('50');

  useEffect(() => {
    loadSales();
    loadEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sales, searchTerm, filterDriver, dateFilter]);

  const loadSales = async () => {
    const data = await dbService.getSales();
    setSales(data);
    setFilteredSales(data);
  };

  const loadEmployees = async () => {
    const data = await dbService.getEmployees();
    setEmployees(data);
  };

  const applyFilters = () => {
    let filtered = [...sales];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.driverName.toLowerCase().includes(search) ||
        (s.driverEmail && s.driverEmail.toLowerCase().includes(search)) ||
        s.bagsSold.toString().includes(search) ||
        (s.notes && s.notes.toLowerCase().includes(search))
      );
    }

    // Driver filter
    if (filterDriver !== 'all') {
      filtered = filtered.filter(s => 
        s.driverEmail === filterDriver || s.driverName === filterDriver
      );
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

      filtered = filtered.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= startDate && saleDate <= endDate;
      });
    }

    setFilteredSales(filtered);
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

  const handleOpen = (sale?: Sale) => {
    if (sale) {
      setEditingSale(sale);
      // Ensure date is properly parsed from database
      const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
      setFormData({
        driverName: sale.driverName,
        driverEmail: sale.driverEmail || '',
        bagsSold: sale.bagsSold.toString(),
        pricePerBag: sale.pricePerBag.toString(),
        date: saleDate,
        notes: sale.notes || '',
      });
    } else {
      setEditingSale(null);
      setFormData({
        driverName: '',
        driverEmail: '',
        bagsSold: '',
        pricePerBag: lastPricePerBag,
        date: new Date(),
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingSale(null);
  };

  const handleSubmit = async () => {
    const bagsSold = parseInt(formData.bagsSold);
    const pricePerBag = parseFloat(formData.pricePerBag);
    const totalAmount = bagsSold * pricePerBag;

    const saleData: Omit<Sale, 'id'> = {
      driverName: formData.driverName,
      driverEmail: formData.driverEmail || undefined,
      bagsSold,
      pricePerBag,
      totalAmount,
      date: formData.date,
      notes: formData.notes || undefined,
    };

    try {
      if (editingSale?.id) {
        await dbService.updateSale(editingSale.id, saleData);
      } else {
        await dbService.addSale(saleData);
        setLastPricePerBag(formData.pricePerBag);
      }
      handleClose();
      loadSales();
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Error saving sale. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await dbService.deleteSale(id);
        loadSales();
      } catch (error) {
        console.error('Error deleting sale:', error);
        alert('Error deleting sale. Please try again.');
      }
    }
  };

  const handleDriverChange = (email: string) => {
    const employee = employees.find(e => e.email === email);
    if (employee) {
      setFormData({
        ...formData,
        driverEmail: email,
        driverName: employee.name,
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalBags = filteredSales.reduce((sum, s) => sum + s.bagsSold, 0);
  const clearFilters = () => {
    setSearchTerm('');
    setFilterDriver('all');
    setDateFilter('all');
  };

  // Get unique drivers for filter
  const uniqueDrivers = Array.from(new Set(sales.map(s => s.driverEmail || s.driverName).filter(Boolean)));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Sales</Typography>
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
            Record Sale
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search sales..."
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
              label="Driver"
              size="small"
              select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">All Drivers</MenuItem>
              {uniqueDrivers.map((driver) => (
                <MenuItem key={driver} value={driver}>
                  {driver}
                </MenuItem>
              ))}
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
            {(searchTerm || filterDriver !== 'all' || dateFilter !== 'all') && (
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

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1, backgroundColor: 'success.light', color: 'success.contrastText' }}>
          <Typography variant="h6">Total Revenue</Typography>
          <Typography variant="h4">{formatCurrency(totalSales)}</Typography>
          <Typography variant="body2">{filteredSales.length} {filteredSales.length === 1 ? 'sale' : 'sales'}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, backgroundColor: 'info.light', color: 'info.contrastText' }}>
          <Typography variant="h6">Total Bags Sold</Typography>
          <Typography variant="h4">{totalBags}</Typography>
          <Typography variant="body2">
            Avg: {filteredSales.length > 0 ? (totalBags / filteredSales.length).toFixed(0) : 0} bags/sale
          </Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell>Bags Sold</TableCell>
              <TableCell>Price per Bag</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    {sales.length === 0 ? 'No sales found' : 'No sales match your filters'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <TableRow key={sale.id} hover>
                  <TableCell>{format(new Date(sale.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{sale.driverName}</TableCell>
                  <TableCell>
                    <Chip label={sale.bagsSold} size="small" color="primary" />
                  </TableCell>
                  <TableCell>{formatCurrency(sale.pricePerBag)}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">{formatCurrency(sale.totalAmount)}</Typography>
                  </TableCell>
                  <TableCell>{sale.notes || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpen(sale)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => sale.id && handleDelete(sale.id)} color="error">
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
          {editingSale ? 'Edit Sale' : 'Record Sale'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {employees.length > 0 && (
              <TextField
                label="Driver (Select from employees)"
                fullWidth
                select
                value={formData.driverEmail}
                onChange={(e) => handleDriverChange(e.target.value)}
                helperText="Select a driver to auto-fill name"
              >
                <MenuItem value="">Manual Entry</MenuItem>
                {employees.filter(e => e.role === 'Driver' || e.role === 'General').map((emp) => (
                  <MenuItem key={emp.id} value={emp.email}>
                    {emp.name} ({emp.email})
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Driver Name"
              fullWidth
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              required
            />
            <TextField
              label="Bags Sold"
              fullWidth
              type="number"
              value={formData.bagsSold}
              onChange={(e) => setFormData({ ...formData, bagsSold: e.target.value })}
              required
              helperText="Typically 300-800 bags per day"
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Price per Bag (₦)"
              fullWidth
              type="number"
              value={formData.pricePerBag}
              onChange={(e) => setFormData({ ...formData, pricePerBag: e.target.value })}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
              }}
            />
            <TextField
              label="Sale Date"
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
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
            {formData.bagsSold && formData.pricePerBag && (
              <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="body1" fontWeight="bold">
                  Total Amount: {formatCurrency(parseInt(formData.bagsSold) * parseFloat(formData.pricePerBag))}
                </Typography>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSale ? 'Update' : 'Record'} Sale
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
