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
  MenuItem,
  Autocomplete,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  ShoppingCart as SalesIcon,
  Person as PersonIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  LocalShipping,
} from '@mui/icons-material';
import { Sale, Employee } from '../types';
import { dbService } from '../services/database';
import { format, startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'range'>('day');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  
  const [formData, setFormData] = useState({
    driverName: '',
    driverEmail: '',
    date: new Date(),
    bagsAt250: '',
    bagsAt270: '',
    combinedBags: '',
    combinedPrice: '250',
    notes: '',
  });

  // Smart defaults
  const [lastPricePerBag, setLastPricePerBag] = useState<string>('250');

  useEffect(() => {
    loadSales();
    loadEmployees();
  }, []);

  const loadSales = async () => {
    const data = await dbService.getSales();
    setSales(data);
  };

  const loadEmployees = async () => {
    const data = await dbService.getEmployees();
    setEmployees(data);
  };

  const getSalesForDate = (date: Date): Sale[] => {
    let filtered = sales.filter(sale => {
      const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
      return isSameDay(saleDate, date);
    });

    // Apply driver filter
    if (filterDriver !== 'all') {
      filtered = filtered.filter(s => 
        s.driverEmail === filterDriver || s.driverName === filterDriver
      );
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.driverName.toLowerCase().includes(search) ||
        (s.driverEmail && s.driverEmail.toLowerCase().includes(search)) ||
        s.bagsSold.toString().includes(search) ||
        (s.notes && s.notes.toLowerCase().includes(search))
      );
    }

    return filtered;
  };

  const getSalesForRange = (start: Date, end: Date): Sale[] => {
    const startDay = startOfDay(start);
    const endDay = endOfDay(end);
    let filtered = sales.filter(sale => {
      const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
      return saleDate >= startDay && saleDate <= endDay;
    });

    // Apply driver filter
    if (filterDriver !== 'all') {
      filtered = filtered.filter(s => 
        s.driverEmail === filterDriver || s.driverName === filterDriver
      );
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.driverName.toLowerCase().includes(search) ||
        (s.driverEmail && s.driverEmail.toLowerCase().includes(search)) ||
        s.bagsSold.toString().includes(search) ||
        (s.notes && s.notes.toLowerCase().includes(search))
      );
    }

    return filtered;
  };

  const currentSales = viewMode === 'day' 
    ? getSalesForDate(selectedDate)
    : getSalesForRange(dateRange.start, dateRange.end);

  // Group sales by driver
  const salesByDriver = currentSales.reduce((acc, sale) => {
    const key = sale.driverEmail || sale.driverName || 'Unknown';
    if (!acc[key]) {
      acc[key] = {
        driverName: sale.driverName,
        driverEmail: sale.driverEmail,
        sales: [],
        totalBags: 0,
        totalAmount: 0,
      };
    }
    acc[key].sales.push(sale);
    acc[key].totalBags += sale.bagsSold;
    acc[key].totalAmount += sale.totalAmount;
    return acc;
  }, {} as Record<string, { driverName: string; driverEmail?: string; sales: Sale[]; totalBags: number; totalAmount: number }>);

  const totalBags = currentSales.reduce((sum, s) => sum + s.bagsSold, 0);
  const totalRevenue = currentSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const averageBagsPerSale = currentSales.length > 0 ? totalBags / currentSales.length : 0;
  const averagePricePerBag = totalBags > 0 ? totalRevenue / totalBags : 0;

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

  const handleOpen = (sale?: Sale, date?: Date) => {
    if (sale) {
      setEditingSale(sale);
      const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
      // When editing, we'll show the sale in the combined field since we can't split it
      const pricePerBag = sale.pricePerBag;
      setFormData({
        driverName: sale.driverName,
        driverEmail: sale.driverEmail || '',
        date: saleDate,
        bagsAt250: pricePerBag === 250 ? sale.bagsSold.toString() : '',
        bagsAt270: pricePerBag === 270 ? sale.bagsSold.toString() : '',
        combinedBags: (pricePerBag !== 250 && pricePerBag !== 270) ? sale.bagsSold.toString() : '',
        combinedPrice: (pricePerBag !== 250 && pricePerBag !== 270) ? pricePerBag.toString() : '250',
        notes: sale.notes || '',
      });
      console.log('Opening sale for editing:', sale);
    } else {
      setEditingSale(null);
      setFormData({
        driverName: '',
        driverEmail: '',
        date: date || selectedDate,
        bagsAt250: '',
        bagsAt270: '',
        combinedBags: '',
        combinedPrice: '250',
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingSale(null);
  };

  const handleDriverSelect = (driver: Employee | null) => {
    if (driver) {
      setFormData({
        ...formData,
        driverName: driver.name,
        driverEmail: driver.email,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.driverName.trim()) {
        alert('Please select or enter a driver name.');
        return;
      }

      // Helper function to validate and parse bags
      const parseBags = (bagsStr: string): number | null => {
        if (!bagsStr || bagsStr.trim() === '') return null;
        const parsed = parseInt(bagsStr);
        return isNaN(parsed) || parsed <= 0 ? null : parsed;
      };

      const bagsAt250 = parseBags(formData.bagsAt250);
      const bagsAt270 = parseBags(formData.bagsAt270);
      const combinedBags = parseBags(formData.combinedBags);
      const combinedPrice = parseFloat(formData.combinedPrice);

      const salesToSave: Omit<Sale, 'id'>[] = [];

      // Save bags at ₦250 if provided
      if (bagsAt250 !== null) {
        salesToSave.push({
          driverName: formData.driverName.trim(),
          driverEmail: formData.driverEmail?.trim() || undefined,
          bagsSold: bagsAt250,
          pricePerBag: 250,
          totalAmount: bagsAt250 * 250,
          date: formData.date,
          notes: formData.notes?.trim() || undefined,
        });
        console.log('Adding sale at ₦250:', bagsAt250, 'bags');
      }

      // Save bags at ₦270 if provided
      if (bagsAt270 !== null) {
        salesToSave.push({
          driverName: formData.driverName.trim(),
          driverEmail: formData.driverEmail?.trim() || undefined,
          bagsSold: bagsAt270,
          pricePerBag: 270,
          totalAmount: bagsAt270 * 270,
          date: formData.date,
          notes: formData.notes?.trim() || undefined,
        });
        console.log('Adding sale at ₦270:', bagsAt270, 'bags');
      }

      // Save combined bags if provided (for other prices or when only one entry is used)
      if (combinedBags !== null) {
        if (isNaN(combinedPrice) || combinedPrice <= 0) {
          alert('Please enter a valid price for combined bags.');
          return;
        }
        salesToSave.push({
          driverName: formData.driverName.trim(),
          driverEmail: formData.driverEmail?.trim() || undefined,
          bagsSold: combinedBags,
          pricePerBag: combinedPrice,
          totalAmount: combinedBags * combinedPrice,
          date: formData.date,
          notes: formData.notes?.trim() || undefined,
        });
        console.log('Adding combined sale:', combinedBags, 'bags at ₦' + combinedPrice);
      }

      if (salesToSave.length === 0) {
        alert('Please enter at least one sale entry (bags at ₦250, ₦270, or combined).');
        return;
      }

      if (editingSale?.id) {
        // When editing, update the single sale - determine which entry was used
        let saleDataToUpdate: Omit<Sale, 'id'> | null = null;

        if (bagsAt250 !== null) {
          saleDataToUpdate = {
            driverName: formData.driverName.trim(),
            driverEmail: formData.driverEmail?.trim() || undefined,
            bagsSold: bagsAt250,
            pricePerBag: 250,
            totalAmount: bagsAt250 * 250,
            date: formData.date,
            notes: formData.notes?.trim() || undefined,
          };
        } else if (bagsAt270 !== null) {
          saleDataToUpdate = {
            driverName: formData.driverName.trim(),
            driverEmail: formData.driverEmail?.trim() || undefined,
            bagsSold: bagsAt270,
            pricePerBag: 270,
            totalAmount: bagsAt270 * 270,
            date: formData.date,
            notes: formData.notes?.trim() || undefined,
          };
        } else if (combinedBags !== null) {
          if (isNaN(combinedPrice) || combinedPrice <= 0) {
            alert('Please enter a valid price for combined bags.');
            return;
          }
          saleDataToUpdate = {
            driverName: formData.driverName.trim(),
            driverEmail: formData.driverEmail?.trim() || undefined,
            bagsSold: combinedBags,
            pricePerBag: combinedPrice,
            totalAmount: combinedBags * combinedPrice,
            date: formData.date,
            notes: formData.notes?.trim() || undefined,
          };
        }

        if (saleDataToUpdate) {
          console.log('Updating sale with:', saleDataToUpdate);
          try {
            await dbService.updateSale(editingSale.id, saleDataToUpdate);
            console.log('Sale updated successfully');
            handleClose();
            setTimeout(() => {
              loadSales();
            }, 100);
          } catch (error) {
            console.error('Error updating sale:', error);
            alert(`Error updating sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          return;
        } else {
          alert('Please enter at least one sale entry (bags at ₦250, ₦270, or combined).');
          return;
        }
      } else {
        // Add all sales
        for (const saleData of salesToSave) {
          await dbService.addSale(saleData);
        }
        if (salesToSave.length > 0) {
          setLastPricePerBag(salesToSave[0].pricePerBag.toString());
        }
        console.log(`${salesToSave.length} sale(s) added successfully`);
        handleClose();
        setTimeout(() => {
          loadSales();
        }, 100);
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      alert(`Error saving sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const driverOptions = employees.filter(e => e.role === 'Driver' || !e.role);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Daily Sales</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          size="large"
        >
          Record Sale
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
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Search Sales"
              fullWidth
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Driver name, email, bags..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SalesIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Filter by Driver"
              fullWidth
              select
              size="small"
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
            >
              <MenuItem value="all">All Drivers</MenuItem>
              {Array.from(new Set(sales.map(s => s.driverEmail || s.driverName).filter(Boolean))).map((driver, idx) => (
                <MenuItem key={idx} value={driver}>
                  {driver}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {(searchTerm || filterDriver !== 'all') && (
            <Grid item xs={12} sm={12} md={4}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setFilterDriver('all');
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
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Revenue
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalRevenue)}
              </Typography>
              <Typography variant="body2">
                {currentSales.length} sale{currentSales.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Bags
              </Typography>
              <Typography variant="h4">
                {totalBags.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                Avg: {averageBagsPerSale.toFixed(1)} per sale
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Avg Price/Bag
              </Typography>
              <Typography variant="h4">
                {formatCurrency(averagePricePerBag)}
              </Typography>
              <Typography variant="body2">
                {currentSales.length} sale{currentSales.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Drivers
              </Typography>
              <Typography variant="h4">
                {Object.keys(salesByDriver).length}
              </Typography>
              <Typography variant="body2">
                {viewMode === 'day' ? 'Today' : 'In range'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sales by Driver */}
      {currentSales.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No sales found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {viewMode === 'day' 
              ? `No sales recorded for ${format(selectedDate, 'MMM d, yyyy')}`
              : 'No sales found in the selected date range'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {Object.entries(salesByDriver).map(([key, driverData]) => (
            <Grid item xs={12} md={6} key={key}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {driverData.driverName}
                    </Typography>
                    <Chip 
                      label={`${driverData.sales.length} sale${driverData.sales.length !== 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Bags
                      </Typography>
                      <Typography variant="h6">
                        {driverData.totalBags.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Revenue
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {formatCurrency(driverData.totalAmount)}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1}>
                    {driverData.sales.map((sale) => (
                      <Paper key={sale.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {sale.bagsSold} bags @ {formatCurrency(sale.pricePerBag)}/bag
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(sale.date), 'MMM d, yyyy')}
                            </Typography>
                            {sale.notes && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {sale.notes}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ textAlign: 'right', mr: 1 }}>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              {formatCurrency(sale.totalAmount)}
                            </Typography>
                          </Box>
                          <Box>
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
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSale ? 'Edit Sale' : 'Record Sale'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={formatDateForInput(formData.date)}
              onChange={(e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) })}
              InputLabelProps={{ shrink: true }}
              required
            />

            <Autocomplete
              options={driverOptions}
              getOptionLabel={(option) => option.name}
              value={driverOptions.find(e => e.email === formData.driverEmail) || null}
              onChange={(_, newValue) => handleDriverSelect(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Driver (Optional)"
                  placeholder="Start typing or select from list"
                />
              )}
              freeSolo
              onInputChange={(_, value) => {
                setFormData({ ...formData, driverName: value });
              }}
            />

            <TextField
              label="Driver Name"
              fullWidth
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              required
              placeholder="Enter driver name if not in list above"
            />

            <TextField
              label="Driver Email (Optional)"
              fullWidth
              value={formData.driverEmail}
              onChange={(e) => setFormData({ ...formData, driverEmail: e.target.value })}
              type="email"
              placeholder="driver@example.com"
            />

            <Divider>Bags at ₦250</Divider>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'success.50', borderRadius: 1 }}>
              <TextField
                label="Bags Sold at ₦250"
                fullWidth
                type="number"
                value={formData.bagsAt250}
                onChange={(e) => setFormData({ ...formData, bagsAt250: e.target.value })}
                inputProps={{ min: 0 }}
                placeholder="Enter number of bags"
                helperText={formData.bagsAt250 ? `${formData.bagsAt250} bags × ₦250 = ${formatCurrency(parseInt(formData.bagsAt250 || '0') * 250)}` : 'Optional: Enter bags sold at ₦250'}
              />
            </Box>

            <Divider>Bags at ₦270</Divider>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'info.50', borderRadius: 1 }}>
              <TextField
                label="Bags Sold at ₦270"
                fullWidth
                type="number"
                value={formData.bagsAt270}
                onChange={(e) => setFormData({ ...formData, bagsAt270: e.target.value })}
                inputProps={{ min: 0 }}
                placeholder="Enter number of bags"
                helperText={formData.bagsAt270 ? `${formData.bagsAt270} bags × ₦270 = ${formatCurrency(parseInt(formData.bagsAt270 || '0') * 270)}` : 'Optional: Enter bags sold at ₦270'}
              />
            </Box>

            <Divider>Combined Entry (Other Prices)</Divider>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
              <TextField
                label="Bags Sold"
                fullWidth
                type="number"
                value={formData.combinedBags}
                onChange={(e) => setFormData({ ...formData, combinedBags: e.target.value })}
                inputProps={{ min: 0 }}
                placeholder="Enter number of bags"
                helperText="Use this if bags are sold at a different price, or if only one price point is available"
              />
              <TextField
                label="Price per Bag (₦)"
                fullWidth
                type="number"
                value={formData.combinedPrice}
                onChange={(e) => setFormData({ ...formData, combinedPrice: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
                helperText={formData.combinedBags && formData.combinedPrice ? `Total: ${formatCurrency(parseInt(formData.combinedBags || '0') * parseFloat(formData.combinedPrice || '0'))}` : 'Enter price per bag for combined entry'}
              />
            </Box>

            <Box sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 1, mt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Total Summary:</strong>
              </Typography>
              <Typography variant="body2">
                ₦250: {parseInt(formData.bagsAt250 || '0')} bags = {formatCurrency(parseInt(formData.bagsAt250 || '0') * 250)}
              </Typography>
              <Typography variant="body2">
                ₦270: {parseInt(formData.bagsAt270 || '0')} bags = {formatCurrency(parseInt(formData.bagsAt270 || '0') * 270)}
              </Typography>
              {formData.combinedBags && (
                <Typography variant="body2">
                  ₦{formData.combinedPrice}: {parseInt(formData.combinedBags || '0')} bags = {formatCurrency(parseInt(formData.combinedBags || '0') * parseFloat(formData.combinedPrice || '0'))}
                </Typography>
              )}
              <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                Grand Total: {formatCurrency(
                  parseInt(formData.bagsAt250 || '0') * 250 +
                  parseInt(formData.bagsAt270 || '0') * 270 +
                  parseInt(formData.combinedBags || '0') * parseFloat(formData.combinedPrice || '0')
                )}
              </Typography>
            </Box>

            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this sale"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" size="large">
            {editingSale ? 'Update' : 'Record'} Sale
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
