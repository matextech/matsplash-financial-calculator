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
import { Sale, Employee, Settings, DEFAULT_SETTINGS, MaterialPrice } from '../types';
import { dbService } from '../services/database';
import { apiService } from '../services/apiService';
import { format, startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
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
  const [materialPrices, setMaterialPrices] = useState<MaterialPrice[]>([]);
  const [sachetRollPrices, setSachetRollPrices] = useState<MaterialPrice[]>([]);
  const [packingNylonPrices, setPackingNylonPrices] = useState<MaterialPrice[]>([]);
  
  const [formData, setFormData] = useState({
    driverName: '',
    driverEmail: '',
    date: new Date(),
    bagsAtPrice1: '',
    bagsAtPrice2: '',
    combinedBags: '',
    combinedPrice: '',
    notes: '',
    sachetRollPriceId: '' as string | number,
    packingNylonPriceId: '' as string | number,
  });

  useEffect(() => {
    loadSales();
    loadEmployees();
    loadSettings();
    loadMaterialPrices();
  }, []);

  const loadMaterialPrices = async () => {
    try {
      const prices = await apiService.getMaterialPrices();
      // Handle API response - it might be wrapped in data property or be an array directly
      const pricesArray = Array.isArray(prices) ? prices : (prices?.data || []);
      setMaterialPrices(pricesArray);
      setSachetRollPrices(pricesArray.filter((p: MaterialPrice) => p.type === 'sachet_roll' && p.isActive));
      setPackingNylonPrices(pricesArray.filter((p: MaterialPrice) => p.type === 'packing_nylon' && p.isActive));
    } catch (error) {
      // Material prices route might not be available yet - that's OK, just use empty arrays
      // This is a non-critical feature, so we don't need to show errors to the user
      setMaterialPrices([]);
      setSachetRollPrices([]);
      setPackingNylonPrices([]);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await dbService.getSettings();
      setSettings(data);
      // Initialize form with default price
      setFormData(prev => ({
        ...prev,
        combinedPrice: data.salesPrice1.toString(),
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(DEFAULT_SETTINGS);
      setFormData(prev => ({
        ...prev,
        combinedPrice: DEFAULT_SETTINGS.salesPrice1.toString(),
      }));
    }
  };

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
        s.driverName === filterDriver
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
        s.driverName === filterDriver
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
      // Check if this is a general/factory sale
      const isGeneralSale = sale.driverName === 'General/Factory' || !sale.employeeId;
      
      setFormData({
        driverName: isGeneralSale ? 'General' : sale.driverName,
        driverEmail: sale.driverEmail || '',
        date: saleDate,
        bagsAtPrice1: pricePerBag === settings.salesPrice1 ? sale.bagsSold.toString() : '',
        bagsAtPrice2: pricePerBag === settings.salesPrice2 ? sale.bagsSold.toString() : '',
        combinedBags: (pricePerBag !== settings.salesPrice1 && pricePerBag !== settings.salesPrice2) ? sale.bagsSold.toString() : '',
        combinedPrice: (pricePerBag !== settings.salesPrice1 && pricePerBag !== settings.salesPrice2) ? pricePerBag.toString() : settings.salesPrice1.toString(),
        notes: sale.notes || '',
        sachetRollPriceId: sale.sachetRollPriceId || '',
        packingNylonPriceId: sale.packingNylonPriceId || '',
      });
      console.log('Opening sale for editing:', sale);
    } else {
      setEditingSale(null);
      setFormData({
        driverName: '',
        driverEmail: '',
        date: date || selectedDate,
        bagsAtPrice1: '',
        bagsAtPrice2: '',
        combinedBags: '',
        combinedPrice: settings.salesPrice1.toString(),
        notes: '',
        sachetRollPriceId: '',
        packingNylonPriceId: '',
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
      // Allow general/factory sales without a driver
      const isGeneralSale = formData.driverName.trim().toLowerCase() === 'general' || 
                           formData.driverName.trim().toLowerCase() === 'factory' ||
                           formData.driverName.trim() === '';
      
      if (!isGeneralSale && !formData.driverName.trim()) {
        alert('Please select or enter a driver name, or enter "General" for factory sales.');
        return;
      }

      // Helper function to validate and parse bags
      const parseBags = (bagsStr: string): number | null => {
        if (!bagsStr || bagsStr.trim() === '') return null;
        // Use parseFloat first to handle any decimals, then Math.floor to ensure whole numbers
        // This prevents any rounding issues
        const parsed = Math.floor(parseFloat(bagsStr));
        return isNaN(parsed) || parsed <= 0 ? null : parsed;
      };

      const bagsAtPrice1 = parseBags(formData.bagsAtPrice1);
      const bagsAtPrice2 = parseBags(formData.bagsAtPrice2);
      const combinedBags = parseBags(formData.combinedBags);
      const combinedPrice = parseFloat(formData.combinedPrice);

      // Find matching employee by name (only if not general/factory sale)
      let matchingEmployee: Employee | undefined;
      if (!isGeneralSale && formData.driverName.trim()) {
        matchingEmployee = employees.find(
          emp => emp.name.toLowerCase().trim() === formData.driverName.toLowerCase().trim()
        );
      }

      const salesToSave: Omit<Sale, 'id'>[] = [];

      // Save bags at Price 1 if provided
      if (bagsAtPrice1 !== null) {
        salesToSave.push({
          driverName: isGeneralSale ? 'General/Factory' : formData.driverName.trim(),
          driverEmail: isGeneralSale ? undefined : formData.driverEmail?.trim() || undefined,
          employeeId: isGeneralSale ? undefined : matchingEmployee?.id,
          bagsSold: bagsAtPrice1,
          pricePerBag: settings.salesPrice1,
          totalAmount: bagsAtPrice1 * settings.salesPrice1,
          date: formData.date,
          notes: formData.notes?.trim() || undefined,
          sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
          packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
        });
        console.log(`Adding sale at ₦${settings.salesPrice1}:`, bagsAtPrice1, 'bags', isGeneralSale ? '(General/Factory sale)' : matchingEmployee ? `(linked to employee ${matchingEmployee.id})` : '(no employee match)');
      }

      // Save bags at Price 2 if provided
      if (bagsAtPrice2 !== null) {
        salesToSave.push({
          driverName: isGeneralSale ? 'General/Factory' : formData.driverName.trim(),
          driverEmail: isGeneralSale ? undefined : formData.driverEmail?.trim() || undefined,
          employeeId: isGeneralSale ? undefined : matchingEmployee?.id,
          bagsSold: bagsAtPrice2,
          pricePerBag: settings.salesPrice2,
          totalAmount: bagsAtPrice2 * settings.salesPrice2,
          date: formData.date,
          notes: formData.notes?.trim() || undefined,
          sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
          packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
        });
        console.log(`Adding sale at ₦${settings.salesPrice2}:`, bagsAtPrice2, 'bags', isGeneralSale ? '(General/Factory sale)' : matchingEmployee ? `(linked to employee ${matchingEmployee.id})` : '(no employee match)');
      }

      // Save combined bags if provided (for other prices or when only one entry is used)
      if (combinedBags !== null) {
        if (isNaN(combinedPrice) || combinedPrice <= 0) {
          alert('Please enter a valid price for combined bags.');
          return;
        }
        salesToSave.push({
          driverName: isGeneralSale ? 'General/Factory' : formData.driverName.trim(),
          driverEmail: isGeneralSale ? undefined : formData.driverEmail?.trim() || undefined,
          employeeId: isGeneralSale ? undefined : matchingEmployee?.id,
          bagsSold: combinedBags,
          pricePerBag: combinedPrice,
          totalAmount: combinedBags * combinedPrice,
          date: formData.date,
          notes: formData.notes?.trim() || undefined,
          sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
          packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
        });
        console.log('Adding combined sale:', combinedBags, 'bags at ₦' + combinedPrice, isGeneralSale ? '(General/Factory sale)' : matchingEmployee ? `(linked to employee ${matchingEmployee.id})` : '(no employee match)');
      }

      if (salesToSave.length === 0) {
        alert(`Please enter at least one sale entry (bags at ₦${settings.salesPrice1}, ₦${settings.salesPrice2}, or combined).`);
        return;
      }

      if (editingSale?.id) {
        // When editing, update the single sale - determine which entry was used
        let saleDataToUpdate: Omit<Sale, 'id'> | null = null;

        // Check if this is a general/factory sale
        const isGeneralSaleEdit = formData.driverName.trim().toLowerCase() === 'general' || 
                                  formData.driverName.trim().toLowerCase() === 'factory' ||
                                  formData.driverName.trim() === '';

        // Find matching employee by name (only if not general/factory sale)
        let matchingEmployee: Employee | undefined;
        if (!isGeneralSaleEdit && formData.driverName.trim()) {
          matchingEmployee = employees.find(
            emp => emp.name.toLowerCase().trim() === formData.driverName.toLowerCase().trim()
          );
        }

        if (bagsAtPrice1 !== null) {
          saleDataToUpdate = {
            driverName: isGeneralSaleEdit ? 'General/Factory' : formData.driverName.trim(),
            driverEmail: isGeneralSaleEdit ? undefined : formData.driverEmail?.trim() || undefined,
            employeeId: isGeneralSaleEdit ? undefined : matchingEmployee?.id,
            bagsSold: bagsAtPrice1,
            pricePerBag: settings.salesPrice1,
            totalAmount: bagsAtPrice1 * settings.salesPrice1,
            date: formData.date,
            notes: formData.notes?.trim() || undefined,
          };
        } else if (bagsAtPrice2 !== null) {
          saleDataToUpdate = {
            driverName: isGeneralSaleEdit ? 'General/Factory' : formData.driverName.trim(),
            driverEmail: isGeneralSaleEdit ? undefined : formData.driverEmail?.trim() || undefined,
            employeeId: isGeneralSaleEdit ? undefined : matchingEmployee?.id,
            bagsSold: bagsAtPrice2,
            pricePerBag: settings.salesPrice2,
            totalAmount: bagsAtPrice2 * settings.salesPrice2,
            date: formData.date,
            notes: formData.notes?.trim() || undefined,
            sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
            packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
          };
        } else if (combinedBags !== null) {
          if (isNaN(combinedPrice) || combinedPrice <= 0) {
            alert('Please enter a valid price for combined bags.');
            return;
          }
          saleDataToUpdate = {
            driverName: isGeneralSaleEdit ? 'General/Factory' : formData.driverName.trim(),
            driverEmail: isGeneralSaleEdit ? undefined : formData.driverEmail?.trim() || undefined,
            employeeId: isGeneralSaleEdit ? undefined : matchingEmployee?.id,
            bagsSold: combinedBags,
            pricePerBag: combinedPrice,
            totalAmount: combinedBags * combinedPrice,
            date: formData.date,
            notes: formData.notes?.trim() || undefined,
            sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
            packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
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
          alert(`Please enter at least one sale entry (bags at ₦${settings.salesPrice1}, ₦${settings.salesPrice2}, or combined).`);
          return;
        }
      } else {
        // Add all sales
        for (const saleData of salesToSave) {
          await dbService.addSale(saleData);
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
              {Array.from(new Set(sales.map(s => s.driverName).filter(Boolean))).map((driverName, idx) => (
                <MenuItem key={idx} value={driverName}>
                  {driverName}
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
              label="Driver Name (or 'General' for factory sales)"
              fullWidth
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              placeholder="Enter driver name, or 'General'/'Factory' for factory sales"
              helperText="Leave empty or enter 'General'/'Factory' for sales at the factory without a specific driver"
            />

            <TextField
              label="Driver Email (Optional)"
              fullWidth
              value={formData.driverEmail}
              onChange={(e) => setFormData({ ...formData, driverEmail: e.target.value })}
              type="email"
              placeholder="driver@example.com"
            />

            <Divider>Bags at ₦{settings.salesPrice1}</Divider>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'success.50', borderRadius: 1 }}>
              <TextField
                label={`Bags Sold at ₦${settings.salesPrice1}`}
                fullWidth
                type="number"
                value={formData.bagsAtPrice1}
                onChange={(e) => {
                  const value = e.target.value;
                  // Preserve the exact value as string, only validate on submit
                  setFormData({ ...formData, bagsAtPrice1: value });
                }}
                inputProps={{ min: 0, step: 1 }}
                placeholder="Enter number of bags"
                helperText={formData.bagsAtPrice1 ? `${formData.bagsAtPrice1} bags × ₦${settings.salesPrice1} = ${formatCurrency(Math.floor(parseFloat(formData.bagsAtPrice1 || '0')) * settings.salesPrice1)}` : `Optional: Enter bags sold at ₦${settings.salesPrice1}`}
              />
            </Box>

            <Divider>Bags at ₦{settings.salesPrice2}</Divider>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'info.50', borderRadius: 1 }}>
              <TextField
                label={`Bags Sold at ₦${settings.salesPrice2}`}
                fullWidth
                type="number"
                value={formData.bagsAtPrice2}
                onChange={(e) => {
                  const value = e.target.value;
                  // Preserve the exact value as string, only validate on submit
                  setFormData({ ...formData, bagsAtPrice2: value });
                }}
                inputProps={{ min: 0, step: 1 }}
                placeholder="Enter number of bags"
                helperText={formData.bagsAtPrice2 ? `${formData.bagsAtPrice2} bags × ₦${settings.salesPrice2} = ${formatCurrency(Math.floor(parseFloat(formData.bagsAtPrice2 || '0')) * settings.salesPrice2)}` : `Optional: Enter bags sold at ₦${settings.salesPrice2}`}
              />
            </Box>

            <Divider>Combined Entry (Other Prices)</Divider>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
              <TextField
                label="Bags Sold"
                fullWidth
                type="number"
                value={formData.combinedBags}
                onChange={(e) => {
                  const value = e.target.value;
                  // Preserve the exact value as string, only validate on submit
                  setFormData({ ...formData, combinedBags: value });
                }}
                inputProps={{ min: 0, step: 1 }}
                placeholder="Enter number of bags"
                helperText="Use this if bags are sold at a different price, or if only one price point is available"
              />
              <TextField
                label="Price per Bag (₦)"
                fullWidth
                type="number"
                value={formData.combinedPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  // Preserve the exact value as string
                  setFormData({ ...formData, combinedPrice: value });
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 1 }}
                helperText={formData.combinedBags && formData.combinedPrice ? `Total: ${formatCurrency(Math.floor(parseFloat(formData.combinedBags || '0')) * parseFloat(formData.combinedPrice || '0'))}` : 'Enter price per bag for combined entry'}
              />
            </Box>

            <Box sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 1, mt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Total Summary:</strong>
              </Typography>
              <Typography variant="body2">
                ₦{settings.salesPrice1}: {Math.floor(parseFloat(formData.bagsAtPrice1 || '0'))} bags = {formatCurrency(Math.floor(parseFloat(formData.bagsAtPrice1 || '0')) * settings.salesPrice1)}
              </Typography>
              <Typography variant="body2">
                ₦{settings.salesPrice2}: {Math.floor(parseFloat(formData.bagsAtPrice2 || '0'))} bags = {formatCurrency(Math.floor(parseFloat(formData.bagsAtPrice2 || '0')) * settings.salesPrice2)}
              </Typography>
              {formData.combinedBags && (
                <Typography variant="body2">
                  ₦{formData.combinedPrice}: {Math.floor(parseFloat(formData.combinedBags || '0'))} bags = {formatCurrency(Math.floor(parseFloat(formData.combinedBags || '0')) * parseFloat(formData.combinedPrice || '0'))}
                </Typography>
              )}
              <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                Grand Total: {formatCurrency(
                  Math.floor(parseFloat(formData.bagsAtPrice1 || '0')) * settings.salesPrice1 +
                  Math.floor(parseFloat(formData.bagsAtPrice2 || '0')) * settings.salesPrice2 +
                  Math.floor(parseFloat(formData.combinedBags || '0')) * parseFloat(formData.combinedPrice || '0')
                )}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }}>Material Prices (for Profit Calculations)</Divider>
            
            {sachetRollPrices && sachetRollPrices.length > 0 && (
              <TextField
                label="Sachet Roll Price Model (Optional)"
                fullWidth
                select
                value={formData.sachetRollPriceId || ''}
                onChange={(e) => setFormData({ ...formData, sachetRollPriceId: e.target.value ? parseInt(e.target.value) : '' })}
                helperText="Select which sachet roll price model to use for profit calculations"
              >
                <MenuItem value="">Use default from settings</MenuItem>
                {sachetRollPrices.map((price) => (
                  <MenuItem key={price.id} value={price.id}>
                    {price.label || 'Unnamed'} - ₦{price.cost.toLocaleString()} per roll ({price.bagsPerUnit} bags) = ₦{(price.cost / price.bagsPerUnit).toFixed(2)}/bag
                  </MenuItem>
                ))}
              </TextField>
            )}

            {packingNylonPrices && packingNylonPrices.length > 0 && (
              <TextField
                label="Packing Nylon Price Model (Optional)"
                fullWidth
                select
                value={formData.packingNylonPriceId || ''}
                onChange={(e) => setFormData({ ...formData, packingNylonPriceId: e.target.value ? parseInt(e.target.value) : '' })}
                helperText="Select which packing nylon price model to use for profit calculations"
              >
                <MenuItem value="">Use default from settings</MenuItem>
                {packingNylonPrices.map((price) => (
                  <MenuItem key={price.id} value={price.id}>
                    {price.label || 'Unnamed'} - ₦{price.cost.toLocaleString()} per package ({price.bagsPerUnit} bags) = ₦{(price.cost / price.bagsPerUnit).toFixed(2)}/bag
                  </MenuItem>
                ))}
              </TextField>
            )}

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
