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
import { Sale, Employee, Settings, DEFAULT_SETTINGS, MaterialPrice, BagPrice } from '../types';
import { apiService } from '../services/apiService';
import { format, startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'range'>('day');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [materialPrices, setMaterialPrices] = useState<MaterialPrice[]>([]);
  const [sachetRollPrices, setSachetRollPrices] = useState<MaterialPrice[]>([]);
  const [packingNylonPrices, setPackingNylonPrices] = useState<MaterialPrice[]>([]);
  const [bagPrices, setBagPrices] = useState<BagPrice[]>([]);
  
  const [formData, setFormData] = useState({
    driverName: '',
    driverEmail: '',
    date: new Date(),
    bagsByPriceId: {} as { [priceId: number]: string }, // Dynamic: priceId -> bags count
    combinedBags: '',
    combinedPrice: '',
    notes: '',
    sachetRollPriceId: '' as string | number,
    packingNylonPriceId: '' as string | number,
  });

  // Initialize date from backend default report date
  useEffect(() => {
    const initDate = async () => {
      try {
        const result = await apiService.getDefaultReportDate();
        const dateStr = result?.date;
        if (dateStr) {
          const [year, month, day] = dateStr.split('-').map(Number);
          const ref = new Date(year, (month ?? 1) - 1, day ?? 1);
          setSelectedDate(ref);
          setDateRange({ start: ref, end: ref });
          setFormData(prev => ({ ...prev, date: ref }));
        } else {
          const today = new Date();
          setSelectedDate(today);
          setDateRange({ start: today, end: today });
        }
      } catch {
        // Fallback to local date if API fails
        const today = new Date();
        setSelectedDate(today);
        setDateRange({ start: today, end: today });
      }
    };
    initDate();
  }, []);

  useEffect(() => {
    loadEmployees();
    loadSettings();
    loadMaterialPrices();
    loadBagPrices();
  }, []);

  // Reload sales when selectedDate or dateRange changes
  useEffect(() => {
    if (!selectedDate && !dateRange) return;
    loadSales();
  }, [selectedDate, dateRange]);

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

  const loadBagPrices = async () => {
    try {
      const prices = await apiService.getBagPrices();
      const pricesArray = Array.isArray(prices) ? prices : (prices?.data || []);
      setBagPrices(pricesArray.filter((p: BagPrice) => p.isActive));
    } catch (error) {
      console.error('Error loading bag prices:', error);
      // Fallback to settings if bag prices fail
      setBagPrices([]);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await apiService.getSettings();
      // apiService returns { success: true, data: {...} } or direct object
      const settingsData = data.data || data;
      setSettings(settingsData);
      // Initialize form with default price
      setFormData(prev => ({
        ...prev,
        combinedPrice: settingsData.salesPrice1?.toString() || DEFAULT_SETTINGS.salesPrice1.toString(),
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
    try {
      let data;
      if (viewMode === 'day' && selectedDate) {
        data = await apiService.getSales(selectedDate, selectedDate);
      } else if (viewMode === 'range' && dateRange) {
        data = await apiService.getSales(dateRange.start, dateRange.end);
      } else {
        // Fallback: load all if no date is set
        data = await apiService.getSales();
      }
      // apiService returns array directly
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await apiService.getEmployees();
      // apiService returns { success: true, data: [...] } or direct array
      const employeesList = Array.isArray(data) ? data : (data.data || []);
      setEmployees(employeesList);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
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

  const currentSales = viewMode === 'day' && selectedDate
    ? getSalesForDate(selectedDate)
    : viewMode === 'range' && dateRange
    ? getSalesForRange(dateRange.start, dateRange.end)
    : [];

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
      // Fetch the default report date for "today"
      apiService.getDefaultReportDate().then(result => {
        const dateStr = result?.date;
        if (dateStr) {
          const [year, month, day] = dateStr.split('-').map(Number);
          const ref = new Date(year, (month ?? 1) - 1, day ?? 1);
          setSelectedDate(ref);
          setDateRange({ start: ref, end: ref });
        } else {
          const today = new Date();
          setSelectedDate(today);
          setDateRange({ start: today, end: today });
        }
      }).catch(() => {
        const today = new Date();
        setSelectedDate(today);
        setDateRange({ start: today, end: today });
      });
    } else if (direction === 'prev' && selectedDate) {
      const newDate = subDays(selectedDate, 1);
      setSelectedDate(newDate);
      setDateRange({ start: newDate, end: newDate });
    } else if (direction === 'next' && selectedDate) {
      const newDate = addDays(selectedDate, 1);
      setSelectedDate(newDate);
      setDateRange({ start: newDate, end: newDate });
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
      
      // Find which bag price this sale matches, or use combined
      const matchingPrice = bagPrices.find(p => p.amount === pricePerBag);
      const isCombined = !matchingPrice;
      
      // Build bagsByPriceId object - set the matching price's bags
      const bagsByPriceId: { [priceId: number]: string } = {};
      if (matchingPrice && matchingPrice.id) {
        bagsByPriceId[matchingPrice.id] = sale.bagsSold.toString();
      }
      
      setFormData({
        driverName: isGeneralSale ? 'General' : sale.driverName,
        driverEmail: sale.driverEmail || '',
        date: saleDate,
        bagsByPriceId: bagsByPriceId,
        combinedBags: isCombined ? sale.bagsSold.toString() : '',
        combinedPrice: isCombined ? pricePerBag.toString() : (bagPrices[0]?.amount || settings.salesPrice1).toString(),
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
        bagsByPriceId: {},
        combinedBags: '',
        combinedPrice: (bagPrices[0]?.amount || settings.salesPrice1).toString(),
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

      const combinedBags = parseBags(formData.combinedBags);
      const combinedPrice = parseFloat(formData.combinedPrice);

      // Find matching employee by name or email (only if not general/factory sale)
      let matchingEmployee: Employee | undefined;
      if (!isGeneralSale && formData.driverName.trim()) {
        matchingEmployee = employees.find(
          emp => emp.name.toLowerCase().trim() === formData.driverName.trim().toLowerCase() ||
                 (formData.driverEmail && emp.email.toLowerCase().trim() === formData.driverEmail.trim().toLowerCase())
        );
        
        // If no match by name/email, try to find by role (Driver)
        if (!matchingEmployee) {
          const driverEmployees = employees.filter(emp => emp.role === 'Driver');
          if (driverEmployees.length === 1) {
            // If only one driver, use it
            matchingEmployee = driverEmployees[0];
          }
        }
      }

      const salesToSave: Omit<Sale, 'id'>[] = [];

      // Process all bag prices dynamically
      for (const price of bagPrices) {
        if (!price.id) continue;
        const bagsCount = parseBags(formData.bagsByPriceId[price.id]);
        if (bagsCount !== null && bagsCount > 0) {
          salesToSave.push({
            driverName: isGeneralSale ? 'General/Factory' : formData.driverName.trim(),
            driverEmail: isGeneralSale ? undefined : formData.driverEmail?.trim() || undefined,
            employeeId: isGeneralSale ? undefined : matchingEmployee?.id,
            bagsSold: bagsCount,
            pricePerBag: price.amount,
            totalAmount: bagsCount * price.amount,
            date: formData.date,
            notes: formData.notes?.trim() || undefined,
            sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
            packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
          });
        }
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

        // Find matching employee by name or email (only if not general/factory sale)
        let matchingEmployee: Employee | undefined;
        if (!isGeneralSaleEdit && formData.driverName.trim()) {
          matchingEmployee = employees.find(
            emp => emp.name.toLowerCase().trim() === formData.driverName.trim().toLowerCase() ||
                   (formData.driverEmail && emp.email.toLowerCase().trim() === formData.driverEmail.trim().toLowerCase())
          );
          
          // If no match by name/email, try to find by role (Driver)
          if (!matchingEmployee) {
            const driverEmployees = employees.filter(emp => emp.role === 'Driver');
            if (driverEmployees.length === 1) {
              // If only one driver, use it
              matchingEmployee = driverEmployees[0];
            }
          }
        }

        // Check if any bag price has bags entered
        let foundBagPriceEntry = false;
        for (const price of bagPrices) {
          if (!price.id) continue;
          const bagsCount = parseBags(formData.bagsByPriceId[price.id]);
          if (bagsCount !== null && bagsCount > 0) {
            saleDataToUpdate = {
              driverName: isGeneralSaleEdit ? 'General/Factory' : formData.driverName.trim(),
              driverEmail: isGeneralSaleEdit ? undefined : formData.driverEmail?.trim() || undefined,
              employeeId: isGeneralSaleEdit ? undefined : matchingEmployee?.id,
              bagsSold: bagsCount,
              pricePerBag: price.amount,
              totalAmount: bagsCount * price.amount,
              date: formData.date,
              notes: formData.notes?.trim() || undefined,
              sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
              packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
            };
            foundBagPriceEntry = true;
            break; // Only update with first found price (single sale edit)
          }
        }

        if (!foundBagPriceEntry && combinedBags !== null) {
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
            await apiService.updateSale(editingSale.id, saleDataToUpdate);
            console.log('Sale updated successfully');
            handleClose();
            setTimeout(() => {
              loadSales();
            }, 100);
            // Dispatch event to refresh dashboard
            window.dispatchEvent(new Event('expensesUpdated'));
          } catch (error: any) {
            console.error('Error updating sale:', error);
            const errorMessage = error?.message || 'Error updating sale. Please try again.';
            alert(errorMessage);
          }
          return;
        } else {
          const priceList = bagPrices.length > 0 
            ? bagPrices.map(p => `₦${p.amount}${p.label ? ` (${p.label})` : ''}`).join(', ')
            : `₦${settings.salesPrice1}, ₦${settings.salesPrice2}`;
          alert(`Please enter at least one sale entry (bags at ${priceList}, or combined).`);
          return;
        }
      } else {
        // Add all sales
        for (const saleData of salesToSave) {
          await apiService.createSale(saleData);
        }
        handleClose();
        setTimeout(() => {
          loadSales();
        }, 100);
        // Dispatch event to refresh dashboard
        window.dispatchEvent(new Event('expensesUpdated'));
      }
    } catch (error: any) {
      console.error('Error saving sale:', error);
      const errorMessage = error?.message || 'Error saving sale. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await apiService.deleteSale(id);
        loadSales();
        // Dispatch event to refresh dashboard
        window.dispatchEvent(new Event('expensesUpdated'));
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
              {selectedDate && (
                <TextField
                  type="date"
                  value={formatDateForInput(selectedDate)}
                  onChange={(e) => setSelectedDate(parseDateFromInput(e.target.value))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 200 }}
                />
              )}
              <IconButton onClick={() => handleDateChange('next')}>
                <ChevronRight />
              </IconButton>
              {selectedDate && !isToday(selectedDate) && (
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

            {/* Dynamic Bag Prices - Show first two active prices */}
            {/* Dynamic Bag Prices - Show ALL active prices */}
            {bagPrices.length > 0 ? (
              bagPrices.map((price, index) => {
                if (!price.id) return null;
                const bagsValue = formData.bagsByPriceId[price.id] || '';
                const bagsCount = parseFloat(bagsValue) || 0;
                const backgroundColor = index % 2 === 0 ? 'success.50' : 'info.50';
                
                return (
                  <Box key={price.id}>
                    <Divider sx={{ my: 2 }}>
                      Bags at ₦{price.amount} {price.label ? `(${price.label})` : ''}
                    </Divider>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor, borderRadius: 1 }}>
                      <TextField
                        label={`Bags Sold at ₦${price.amount}${price.label ? ` (${price.label})` : ''}`}
                        fullWidth
                        type="number"
                        value={bagsValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            bagsByPriceId: {
                              ...formData.bagsByPriceId,
                              [price.id!]: value,
                            },
                          });
                        }}
                        inputProps={{ min: 0, step: 1 }}
                        placeholder="Enter number of bags"
                        helperText={bagsValue ? `${bagsValue} bags × ₦${price.amount} = ${formatCurrency(bagsCount * price.amount)}` : `Optional: Enter bags sold at ₦${price.amount}`}
                      />
                    </Box>
                  </Box>
                );
              })
            ) : (
              // Fallback to settings if no bag prices loaded
              <>
                <Divider>Bags at ₦{settings.salesPrice1}</Divider>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'success.50', borderRadius: 1 }}>
                  <TextField
                    label={`Bags Sold at ₦${settings.salesPrice1}`}
                    fullWidth
                    type="number"
                    value={formData.bagsByPriceId[0] || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        bagsByPriceId: { ...formData.bagsByPriceId, 0: e.target.value },
                      });
                    }}
                    inputProps={{ min: 0, step: 1 }}
                    placeholder="Enter number of bags"
                    helperText={formData.bagsByPriceId[0] ? `${formData.bagsByPriceId[0]} bags × ₦${settings.salesPrice1} = ${formatCurrency((parseFloat(formData.bagsByPriceId[0]) || 0) * settings.salesPrice1)}` : `Optional: Enter bags sold at ₦${settings.salesPrice1}`}
                  />
                </Box>

                <Divider>Bags at ₦{settings.salesPrice2}</Divider>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'info.50', borderRadius: 1 }}>
                  <TextField
                    label={`Bags Sold at ₦${settings.salesPrice2}`}
                    fullWidth
                    type="number"
                    value={formData.bagsByPriceId[1] || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        bagsByPriceId: { ...formData.bagsByPriceId, 1: e.target.value },
                      });
                    }}
                    inputProps={{ min: 0, step: 1 }}
                    placeholder="Enter number of bags"
                    helperText={formData.bagsByPriceId[1] ? `${formData.bagsByPriceId[1]} bags × ₦${settings.salesPrice2} = ${formatCurrency((parseFloat(formData.bagsByPriceId[1]) || 0) * settings.salesPrice2)}` : `Optional: Enter bags sold at ₦${settings.salesPrice2}`}
                  />
                </Box>
              </>
            )}

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
              {/* Show all bag prices with bags entered */}
              {bagPrices.length > 0 ? (
                bagPrices.map((price) => {
                  if (!price.id) return null;
                  const bagsValue = formData.bagsByPriceId[price.id] || '';
                  const bagsCount = Math.floor(parseFloat(bagsValue) || 0);
                  if (bagsCount === 0) return null;
                  return (
                    <Typography key={price.id} variant="body2">
                      ₦{price.amount}{price.label ? ` (${price.label})` : ''}: {bagsCount} bags = {formatCurrency(bagsCount * price.amount)}
                    </Typography>
                  );
                })
              ) : (
                <>
                  <Typography variant="body2">
                    ₦{settings.salesPrice1}: {Math.floor(parseFloat(formData.bagsByPriceId[0] || '0'))} bags = {formatCurrency(Math.floor(parseFloat(formData.bagsByPriceId[0] || '0')) * settings.salesPrice1)}
                  </Typography>
                  <Typography variant="body2">
                    ₦{settings.salesPrice2}: {Math.floor(parseFloat(formData.bagsByPriceId[1] || '0'))} bags = {formatCurrency(Math.floor(parseFloat(formData.bagsByPriceId[1] || '0')) * settings.salesPrice2)}
                  </Typography>
                </>
              )}
              {formData.combinedBags && (
                <Typography variant="body2">
                  ₦{formData.combinedPrice}: {Math.floor(parseFloat(formData.combinedBags || '0'))} bags = {formatCurrency(Math.floor(parseFloat(formData.combinedBags || '0')) * parseFloat(formData.combinedPrice || '0'))}
                </Typography>
              )}
              <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                Grand Total: {formatCurrency(
                  (() => {
                    let total = 0;
                    // Sum all bag prices
                    if (bagPrices.length > 0) {
                      bagPrices.forEach((price) => {
                        if (price.id) {
                          const bagsCount = Math.floor(parseFloat(formData.bagsByPriceId[price.id] || '0') || 0);
                          total += bagsCount * price.amount;
                        }
                      });
                    } else {
                      // Fallback to settings
                      total += Math.floor(parseFloat(formData.bagsByPriceId[0] || '0') || 0) * settings.salesPrice1;
                      total += Math.floor(parseFloat(formData.bagsByPriceId[1] || '0') || 0) * settings.salesPrice2;
                    }
                    // Add combined bags
                    total += Math.floor(parseFloat(formData.combinedBags || '0') || 0) * parseFloat(formData.combinedPrice || '0');
                    return total;
                  })()
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
