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
  Alert,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Logout as LogoutIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { ReceptionistSale, StorekeeperEntry, Settlement, SettlementPayment, Notification } from '../../types/sales-log';
import { Settings, DEFAULT_SETTINGS, Employee, BagPrice } from '../../types';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';
import { AuditService } from '../../services/auditService';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, isSameDay, addDays, subDays } from 'date-fns';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [sales, setSales] = useState<ReceptionistSale[]>([]);
  const [entries, setEntries] = useState<StorekeeperEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [bagPrices, setBagPrices] = useState<BagPrice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day' | 'range'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });
  
  // Filters
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterSaleType, setFilterSaleType] = useState<string>('all');
  const [filterEntryType, setFilterEntryType] = useState<string>('all');
  const [filterSettlementStatus, setFilterSettlementStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ReceptionistSale | null>(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementHistoryDialogOpen, setSettlementHistoryDialogOpen] = useState(false);
  const [selectedSettlementHistory, setSelectedSettlementHistory] = useState<Settlement | null>(null);
  const [settlementPayments, setSettlementPayments] = useState<SettlementPayment[]>([]);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateType, setUpdateType] = useState<'sale' | 'entry'>('sale');
  const [updateItem, setUpdateItem] = useState<ReceptionistSale | StorekeeperEntry | null>(null);
  const [updateField, setUpdateField] = useState('');
  const [updateValue, setUpdateValue] = useState('');
  const [updateReason, setUpdateReason] = useState('');

  useEffect(() => {
    loadData();
    loadNotifications();
    loadEmployees();
  }, [selectedMonth, viewMode, selectedDate, dateRange]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await apiService.getEmployees();
      setEmployees(data.filter(e => e.role === 'Driver'));
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadData = async () => {
    try {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'month') {
        startDate = startOfMonth(selectedMonth);
        endDate = endOfMonth(selectedMonth);
      } else if (viewMode === 'day') {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      } else {
        startDate = startOfDay(dateRange.start);
        endDate = endOfDay(dateRange.end);
      }
      
      const [salesData, entriesData, settlementsData, settingsData, bagPricesData] = await Promise.all([
        apiService.getReceptionistSales(startDate, endDate),
        apiService.getStorekeeperEntries(startDate, endDate),
        apiService.getSettlements(startDate, endDate),
        apiService.getSettings(),
        apiService.getBagPrices(),
      ]);

      setSales(salesData);
      setEntries(entriesData);
      setSettlements(settlementsData);
      setSettings(settingsData || DEFAULT_SETTINGS);
      
      // Filter and sort active bag prices
      const activePrices = bagPricesData.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
      setBagPrices(activePrices);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const session = authService.getCurrentSession();
      if (session) {
        const notifs = await apiService.getNotifications(session.userId, false);
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleOpenSettlement = (sale: ReceptionistSale) => {
    const existingSettlement = settlements.find(s => s.receptionistSaleId === sale.id);
    
    // Check if settlement is fully settled (locked)
    if (existingSettlement && existingSettlement.isSettled) {
      alert('This sale has been fully settled and is locked from further edits.');
      return;
    }
    
    // Clear the input for new incremental payment
    setSettlementAmount('');
    setSelectedSale(sale);
    setSettlementDialogOpen(true);
  };

  const handleSaveSettlement = async () => {
    if (!selectedSale) return;

    const session = authService.getCurrentSession();
    if (!session) {
      alert('Session expired. Please login again.');
      navigate('/login');
      return;
    }

    const paymentAmount = parseFloat(settlementAmount) || 0;
    
    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    // Use expectedAmount from sale (calculated and stored in backend)
    // Fallback to calculation for legacy data
    let expectedAmount = selectedSale.expectedAmount || 0;
    if (expectedAmount === 0) {
      if (selectedSale.priceBreakdown && selectedSale.priceBreakdown.length > 0) {
        expectedAmount = selectedSale.priceBreakdown.reduce((sum, item) => 
          sum + (item.bags * item.amount), 0
        );
      } else {
        expectedAmount = (selectedSale.bagsAtPrice1 * settings.salesPrice1) + 
                       (selectedSale.bagsAtPrice2 * settings.salesPrice2);
      }
    }

    try {
      const existingSettlement = settlements.find(s => s.receptionistSaleId === selectedSale.id);
      
      // Use existing settlement's expectedAmount if it exists (should never change)
      // Otherwise use the calculated expectedAmount from the sale
      const finalExpectedAmount = existingSettlement?.expectedAmount || expectedAmount;
      
      let newSettledAmount: number;
      
      if (existingSettlement) {
        // Add this payment to existing settled amount (INCREMENTAL)
        newSettledAmount = existingSettlement.settledAmount + paymentAmount;
      } else {
        // First payment
        newSettledAmount = paymentAmount;
      }

      const newRemainingBalance = finalExpectedAmount - newSettledAmount;
      const isSettled = newRemainingBalance <= 0;

      // Prevent overpayment
      if (newRemainingBalance < 0) {
        alert(`Payment exceeds remaining balance. Remaining balance: ₦${(finalExpectedAmount - (existingSettlement?.settledAmount || 0)).toLocaleString()}`);
        return;
      }

      let settlementId: number;
      
      if (existingSettlement) {
        await apiService.updateSettlement(existingSettlement.id!, {
          settledAmount: newSettledAmount,
          remainingBalance: newRemainingBalance,
          isSettled: isSettled,
          settledAt: isSettled ? new Date() : undefined,
        });
        settlementId = existingSettlement.id!;
      } else {
        const newSettlement = await apiService.createSettlement({
          date: selectedSale.date,
          receptionistSaleId: selectedSale.id!,
          expectedAmount: finalExpectedAmount,
          settledAmount: newSettledAmount,
          remainingBalance: newRemainingBalance,
          isSettled: isSettled,
          settledBy: session.userId,
          settledAt: isSettled ? new Date() : undefined,
        });
        settlementId = newSettlement.id;
      }

      // Record this individual payment
      await apiService.createSettlementPayment({
        settlementId: settlementId,
        amount: paymentAmount,
        paidBy: session.userId,
        paidAt: new Date().toISOString(),
        notes: `Payment of ₦${paymentAmount.toLocaleString()}`,
      });

      // Create notification for receptionist
      // Note: Notifications API not yet implemented, skipping for now
      // TODO: Implement notifications backend when ready

      setSettlementDialogOpen(false);
      setSelectedSale(null);
      setSettlementAmount('');
      await loadData();
      await loadNotifications();
      
      if (isSettled) {
        alert('Settlement completed! This sale is now fully settled and locked.');
      } else {
        alert(`Payment recorded! Remaining balance: ₦${newRemainingBalance.toLocaleString()}`);
      }
    } catch (error) {
      console.error('Error saving settlement:', error);
      alert('Error saving settlement. Please try again.');
    }
  };

  const handleOpenUpdate = (item: ReceptionistSale | StorekeeperEntry, type: 'sale' | 'entry') => {
    // Check if receptionist sale has any settlement - if yes, block updates
    if (type === 'sale') {
      const settlement = settlements.find(s => s.receptionistSaleId === item.id);
      if (settlement) {
        alert('Cannot update entry after settlement has started. Settlement must be deleted first.');
        return;
      }
    }
    
    // Check if storekeeper entry was already updated once
    if (type === 'entry') {
      // TODO: Add update tracking in backend to check if entry was already updated
      // For now, we'll allow one update per session
      
      // For storekeeper entries, automatically set the field to 'bagsCount' and show current value
      setUpdateField('bagsCount');
      setUpdateValue(''); // Start with empty, user will enter new value
    } else {
      // For receptionist sales, user will select the field
      setUpdateField('');
      setUpdateValue('');
    }
    
    setUpdateItem(item);
    setUpdateType(type);
    setUpdateReason('');
    setUpdateDialogOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (!updateItem || !updateValue || !updateReason) {
      alert('Please fill all fields');
      return;
    }

    // For storekeeper entries, updateField is automatically 'bagsCount'
    const fieldToUpdate = updateType === 'entry' ? 'bagsCount' : updateField;
    
    if (!fieldToUpdate) {
      alert('Please select a field to update');
      return;
    }

    const session = authService.getCurrentSession();
    if (!session) {
      alert('Session expired. Please login again.');
      navigate('/login');
      return;
    }

    try {
      // Get old value - handle price breakdown items
      let oldValue: any;
      if (fieldToUpdate.startsWith('price_')) {
        const priceId = parseInt(fieldToUpdate.replace('price_', ''));
        const sale = updateItem as ReceptionistSale;
        const priceItem = sale.priceBreakdown?.find(p => p.priceId === priceId);
        oldValue = priceItem?.bags || 0;
      } else {
        oldValue = (updateItem as any)[fieldToUpdate];
      }
      
      const newValue = fieldToUpdate.includes('bags') || fieldToUpdate === 'bagsCount' || fieldToUpdate.startsWith('price_')
        ? parseInt(updateValue) 
        : updateValue;

      // Create audit log
      await AuditService.logUpdate(
        updateType === 'sale' ? 'receptionist_sale' : 'storekeeper_entry',
        updateItem.id!,
        fieldToUpdate,
        oldValue,
        newValue,
        updateReason
      );

      // Update the item
      if (updateType === 'sale') {
        const sale = updateItem as ReceptionistSale;
        let updatedSale: any = { ...sale };
        
        // Check if updating a price breakdown item
        if (fieldToUpdate.startsWith('price_')) {
          const priceId = parseInt(fieldToUpdate.replace('price_', ''));
          const price = bagPrices.find(p => p.id === priceId);
          
          if (!price) {
            alert('Price not found. Please try again.');
            return;
          }
          
          // Get or create priceBreakdown array
          let priceBreakdown = sale.priceBreakdown ? [...sale.priceBreakdown] : [];
          
          // Find existing price item or create new one
          const existingIndex = priceBreakdown.findIndex(p => p.priceId === priceId);
          const bagsValue = parseInt(updateValue);
          
          if (existingIndex >= 0) {
            // Update existing price item
            if (bagsValue > 0) {
              priceBreakdown[existingIndex] = {
                ...priceBreakdown[existingIndex],
                bags: bagsValue,
                amount: price.amount,
                label: price.label
              };
            } else {
              // Remove if bags is 0
              priceBreakdown.splice(existingIndex, 1);
            }
          } else if (bagsValue > 0) {
            // Add new price item
            priceBreakdown.push({
              priceId: price.id!,
              amount: price.amount,
              bags: bagsValue,
              label: price.label
            });
          }
          
          // Recalculate totalBags and expectedAmount
          updatedSale.priceBreakdown = priceBreakdown;
          updatedSale.totalBags = priceBreakdown.reduce((sum, item) => sum + item.bags, 0);
          updatedSale.expectedAmount = priceBreakdown.reduce((sum, item) => sum + (item.bags * item.amount), 0);
        } else {
          // Legacy field update (for backward compatibility)
          updatedSale[fieldToUpdate] = newValue;
          if (fieldToUpdate === 'bagsAtPrice1' || fieldToUpdate === 'bagsAtPrice2') {
            updatedSale.totalBags = (updatedSale.bagsAtPrice1 || 0) + (updatedSale.bagsAtPrice2 || 0);
          }
        }
        
        await apiService.updateReceptionistSale(sale.id!, updatedSale);
      } else {
        await apiService.updateStorekeeperEntry(updateItem.id!, { [fieldToUpdate]: newValue });
      }

      setUpdateDialogOpen(false);
      await loadData();
      alert('Update saved successfully');
    } catch (error) {
      console.error('Error updating:', error);
      alert('Error updating. Please try again.');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Apply filters to sales
  const filteredSales = sales.filter(sale => {
    // Driver filter
    if (filterDriver !== 'all' && sale.driverName !== filterDriver) {
      return false;
    }
    
    // Sale type filter
    if (filterSaleType !== 'all' && sale.saleType !== filterSaleType) {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (sale.driverName && sale.driverName.toLowerCase().includes(search)) ||
        sale.saleType.toLowerCase().includes(search) ||
        sale.totalBags.toString().includes(search) ||
        (sale.notes && sale.notes.toLowerCase().includes(search))
      );
    }
    
    return true;
  });

  // Apply filters to entries
  const filteredEntries = entries.filter(entry => {
    // Entry type filter
    if (filterEntryType !== 'all' && entry.entryType !== filterEntryType) {
      return false;
    }
    
    // Driver/Packer filter
    if (filterDriver !== 'all') {
      if (entry.entryType === 'driver_pickup' && entry.driverName !== filterDriver) {
        return false;
      }
      if (entry.entryType === 'packer_production' && entry.packerName !== filterDriver) {
        return false;
      }
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (entry.driverName && entry.driverName.toLowerCase().includes(search)) ||
        (entry.packerName && entry.packerName.toLowerCase().includes(search)) ||
        entry.entryType.toLowerCase().includes(search) ||
        entry.bagsCount.toString().includes(search) ||
        (entry.notes && entry.notes.toLowerCase().includes(search))
      );
    }
    
    return true;
  });

  // Apply filters to settlements
  const filteredSettlements = settlements.filter(settlement => {
    // Settlement status filter
    if (filterSettlementStatus !== 'all') {
      if (filterSettlementStatus === 'settled' && !settlement.isSettled) {
        return false;
      }
      if (filterSettlementStatus === 'pending' && settlement.isSettled) {
        return false;
      }
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const sale = sales.find(s => s.id === settlement.receptionistSaleId);
      return (
        settlement.expectedAmount.toString().includes(search) ||
        settlement.settledAmount.toString().includes(search) ||
        settlement.remainingBalance.toString().includes(search) ||
        (sale && sale.driverName && sale.driverName.toLowerCase().includes(search))
      );
    }
    
    return true;
  });

  return (
    <Box sx={{ 
      p: { xs: 1, sm: 2, md: 3 },
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Paper elevation={3} sx={{ 
        p: { xs: 2, sm: 3 },
        mb: 3,
        background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
        color: 'white',
        borderRadius: 3
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography variant="h4" sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem' },
            fontWeight: 700,
            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            Manager Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          {notifications.length > 0 && (
            <Chip
              icon={<NotificationsIcon />}
              label={notifications.length}
              color="error"
              size="small"
            />
          )}
          <Button
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            fullWidth={false}
            size={window.innerWidth < 600 ? 'small' : 'medium'}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Logout</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Out</Box>
          </Button>
          </Box>
        </Box>
      </Paper>

      {/* View Mode and Date Selector */}
      <Paper elevation={2} sx={{ 
        p: { xs: 1.5, sm: 2 }, 
        mb: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}>
        <Stack spacing={2}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' }, 
            gap: { xs: 2, sm: 2 }
          }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => {
                if (newMode) setViewMode(newMode);
              }}
              size="small"
            >
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="day">Day</ToggleButton>
              <ToggleButton value="range">Range</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {viewMode === 'month' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                Previous Month
              </Button>
              <TextField
                type="month"
                value={format(selectedMonth, 'yyyy-MM')}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(Number);
                  setSelectedMonth(new Date(year, month - 1, 1));
                }}
                InputLabelProps={{ shrink: true }}
              />
              <Button onClick={() => setSelectedMonth(new Date())}>
                Current Month
              </Button>
            </Box>
          )}

          {viewMode === 'day' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                <ChevronLeft />
              </IconButton>
              <TextField
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setSelectedDate(date);
                }}
                InputLabelProps={{ shrink: true }}
              />
              <IconButton onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                <ChevronRight />
              </IconButton>
              <Button onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
            </Box>
          )}

          {viewMode === 'range' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={format(dateRange.start, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setDateRange({ ...dateRange, start: new Date(e.target.value) });
                }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={format(dateRange.end, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: new Date(e.target.value) });
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Filters */}
      <Paper elevation={2} sx={{ 
        p: 2, 
        mb: 3,
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography variant="h6">Filters</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Search by name, type, amount..."
              />
            </Grid>

            {tabValue === 0 && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Driver"
                    select
                    value={filterDriver}
                    onChange={(e) => setFilterDriver(e.target.value)}
                  >
                    <MenuItem value="all">All Drivers</MenuItem>
                    {employees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.name}>
                        {emp.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Sale Type"
                    select
                    value={filterSaleType}
                    onChange={(e) => setFilterSaleType(e.target.value)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="driver">Driver Sale</MenuItem>
                    <MenuItem value="general">General Sales</MenuItem>
                    <MenuItem value="mini_store">Mini Store</MenuItem>
                  </TextField>
                </Grid>
              </>
            )}

            {tabValue === 1 && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Entry Type"
                    select
                    value={filterEntryType}
                    onChange={(e) => setFilterEntryType(e.target.value)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="driver_pickup">Driver Pickup</MenuItem>
                    <MenuItem value="general_sales">General Sales</MenuItem>
                    <MenuItem value="ministore_pickup">Mini Store Pickup</MenuItem>
                    <MenuItem value="packer_production">Packer Production</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Driver/Packer"
                    select
                    value={filterDriver}
                    onChange={(e) => setFilterDriver(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    {employees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.name}>
                        {emp.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </>
            )}

            {tabValue === 2 && (
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Settlement Status"
                  select
                  value={filterSettlementStatus}
                  onChange={(e) => setFilterSettlementStatus(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="settled">Settled</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </TextField>
              </Grid>
            )}
          </Grid>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Receptionist Sales" />
          <Tab label="Storekeeper Entries" />
          <Tab label="Settlements" />
        </Tabs>
      </Paper>

      {/* Receptionist Sales Tab */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Sales by Driver - {viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') : 
                                 viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') : 
                                 `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
            </Typography>
            <Chip 
              label={`${filteredSales.length} ${filteredSales.length === 1 ? 'entry' : 'entries'}`} 
              color="primary" 
              variant="outlined"
            />
          </Box>
          
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card elevation={3} sx={{ 
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                    Total Sales
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {filteredSales.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={3} sx={{ 
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                background: 'linear-gradient(135deg, #5a9a8a 0%, #3f7a6a 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                    Total Bags
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {filteredSales.reduce((sum, s) => sum + s.totalBags, 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={3} sx={{ 
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                background: 'linear-gradient(135deg, #3f7a6a 0%, #5a9a8a 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                    Expected Amount
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatCurrency(filteredSales.reduce((sum, s) => {
                      // Use expectedAmount from sale, fallback to calculation for legacy data
                      let expected = s.expectedAmount || 0;
                      if (expected === 0) {
                        if (s.priceBreakdown && s.priceBreakdown.length > 0) {
                          expected = s.priceBreakdown.reduce((subSum, item) => 
                            subSum + (item.bags * item.amount), 0
                          );
                        } else {
                          expected = (s.bagsAtPrice1 * settings.salesPrice1) + 
                                    (s.bagsAtPrice2 * settings.salesPrice2);
                        }
                      }
                      return sum + expected;
                    }, 0))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {filteredSales.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No sales found matching the filters
              </Typography>
            </Paper>
          ) : (
            <TableContainer 
              component={Paper}
              sx={{
                overflowX: 'auto',
                '& .MuiTableCell-root': {
                  whiteSpace: { xs: 'nowrap', md: 'normal' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }
              }}
            >
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Driver/Type</TableCell>
                    <TableCell>Price Breakdown</TableCell>
                    <TableCell>Total Bags</TableCell>
                    <TableCell>Expected Amount</TableCell>
                    <TableCell>Settlement Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSales.map((sale) => {
                  // Use expected amount from sale (calculated and stored in backend)
                  // Fallback to frontend calculation only for legacy data
                  let expectedAmount = sale.expectedAmount || 0;
                  if (expectedAmount === 0) {
                    // Fallback calculation for old sales without expectedAmount
                    if (sale.priceBreakdown && sale.priceBreakdown.length > 0) {
                      expectedAmount = sale.priceBreakdown.reduce((sum, item) => 
                        sum + (item.bags * item.amount), 0
                      );
                    } else {
                      expectedAmount = (sale.bagsAtPrice1 * settings.salesPrice1) + 
                                     (sale.bagsAtPrice2 * settings.salesPrice2);
                    }
                  }
                  const settlement = settlements.find(s => s.receptionistSaleId === sale.id);
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{format(new Date(sale.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {sale.saleType === 'driver' ? sale.driverName : 
                         sale.saleType === 'general' ? 'General Sales' : 'Mini Store'}
                      </TableCell>
                      <TableCell>
                        {sale.priceBreakdown && sale.priceBreakdown.length > 0 ? (
                          <Box>
                            {sale.priceBreakdown.map((item, idx) => (
                              <Typography key={idx} variant="body2">
                                {item.bags.toLocaleString()} @ ₦{item.amount.toLocaleString()}
                                {item.label ? ` (${item.label})` : ''}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Box>
                            {sale.bagsAtPrice1 > 0 && (
                              <Typography variant="body2">
                                {sale.bagsAtPrice1.toLocaleString()} @ ₦{settings.salesPrice1}
                              </Typography>
                            )}
                            {sale.bagsAtPrice2 > 0 && (
                              <Typography variant="body2">
                                {sale.bagsAtPrice2.toLocaleString()} @ ₦{settings.salesPrice2}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>{sale.totalBags.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(expectedAmount)}</TableCell>
                      <TableCell>
                        {settlement ? (
                          settlement.isSettled ? (
                            <Tooltip title={`Fully Settled - Paid: ${formatCurrency(settlement.settledAmount)}`}>
                              <Chip label="✓ Settled" color="success" size="small" />
                            </Tooltip>
                          ) : (
                            <Tooltip title={`Paid: ${formatCurrency(settlement.settledAmount)} of ${formatCurrency(expectedAmount)}`}>
                              <Chip 
                                label={`₦${settlement.remainingBalance.toLocaleString()} due`} 
                                color="warning" 
                                size="small" 
                              />
                            </Tooltip>
                          )
                        ) : (
                          <Chip label="Not Settled" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {settlement?.isSettled ? (
                            <Tooltip title="Settlement locked (fully settled)">
                              <span>
                                <IconButton size="small" disabled>
                                  <EditIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : (
                            <Tooltip title={settlement ? "Add Payment" : "Start Settlement"}>
                              <IconButton size="small" onClick={() => handleOpenSettlement(sale)} color="primary">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {settlement ? (
                            <>
                              <Tooltip title="Cannot update after settlement started">
                                <span>
                                  <IconButton size="small" disabled>
                                    <VisibilityIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="View Settlement Details">
                                <IconButton 
                                  size="small" 
                                  onClick={async () => {
                                    setSelectedSale(sale);
                                    setSelectedSettlementHistory(settlement);
                                    // Load payment history for this settlement
                                    try {
                                      const payments = await apiService.getSettlementPayments(settlement.id!);
                                      setSettlementPayments(payments);
                                    } catch (error) {
                                      console.error('Error loading payment history:', error);
                                      setSettlementPayments([]);
                                    }
                                    setSettlementHistoryDialogOpen(true);
                                  }}
                                  color="info"
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : (
                            <Tooltip title="Update Entry (Bags)">
                              <IconButton size="small" onClick={() => handleOpenUpdate(sale, 'sale')} color="secondary">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Storekeeper Entries Tab */}
      {tabValue === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Storekeeper Entries - {viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') : 
                                      viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') : 
                                      `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
            </Typography>
            <Chip 
              label={`${filteredEntries.length} ${filteredEntries.length === 1 ? 'entry' : 'entries'}`} 
              color="primary" 
              variant="outlined"
            />
          </Box>
          
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Card elevation={3} sx={{ 
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                    Total Entries
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {filteredEntries.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card elevation={3} sx={{ 
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                background: 'linear-gradient(135deg, #5a9a8a 0%, #3f7a6a 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                    Total Bags
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {filteredEntries.reduce((sum, e) => sum + e.bagsCount, 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          {filteredEntries.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No entries found matching the filters
              </Typography>
            </Paper>
          ) : (
            <TableContainer 
              component={Paper}
              sx={{
                overflowX: 'auto',
                '& .MuiTableCell-root': {
                  whiteSpace: { xs: 'nowrap', md: 'normal' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }
              }}
            >
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Driver/Packer</TableCell>
                    <TableCell>Bags</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {entry.entryType === 'driver_pickup' ? 'Driver Pickup' :
                       entry.entryType === 'general_sales' ? 'General Sales' :
                       entry.entryType === 'ministore_pickup' ? 'Mini Store Pickup' : 'Packer Production'}
                    </TableCell>
                    <TableCell>{entry.driverName || entry.packerName || 'N/A'}</TableCell>
                    <TableCell>{entry.bagsCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Tooltip title="Update Entry">
                        <IconButton size="small" onClick={() => handleOpenUpdate(entry, 'entry')}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Settlements Tab */}
      {tabValue === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Settlements - {viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') : 
                             viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') : 
                             `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
            </Typography>
            <Chip 
              label={`${filteredSettlements.length} ${filteredSettlements.length === 1 ? 'settlement' : 'settlements'}`} 
              color="primary" 
              variant="outlined"
            />
          </Box>
          
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card elevation={3} sx={{ 
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                    Total Settlements
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {filteredSettlements.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={3} sx={{ 
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                background: 'linear-gradient(135deg, #3f7a6a 0%, #5a9a8a 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                    Total Settled
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatCurrency(filteredSettlements.reduce((sum, s) => sum + s.settledAmount, 0))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card elevation={3} sx={{ 
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                },
                background: filteredSettlements.reduce((sum, s) => sum + s.remainingBalance, 0) > 0 
                  ? 'linear-gradient(135deg, #5a9a8a 0%, #3f7a6a 100%)'
                  : 'linear-gradient(135deg, #3f7a6a 0%, #5a9a8a 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                    Remaining Balance
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatCurrency(filteredSettlements.reduce((sum, s) => sum + s.remainingBalance, 0))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          {filteredSettlements.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No settlements found matching the filters
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filteredSettlements.map((settlement) => {
              const sale = sales.find(s => s.id === settlement.receptionistSaleId);
              
              // Get transaction type label
              const getTransactionTypeLabel = (type: string) => {
                switch (type) {
                  case 'driver': return 'Driver Sale';
                  case 'general': return 'General Sales';
                  case 'mini_store': return 'Mini Store Dispatch';
                  default: return type;
                }
              };
              
              return (
                <Grid item xs={12} md={6} key={settlement.id}>
                  <Card elevation={2} sx={{ 
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4
                    },
                    height: '100%'
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'start' }}>
                        <Box>
                          <Typography variant="h6">
                            {sale ? format(new Date(sale.date), 'MMM d, yyyy') : 'Unknown Date'}
                          </Typography>
                          {sale && (
                            <>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                <strong>Type:</strong> {getTransactionTypeLabel(sale.saleType)}
                              </Typography>
                              {sale.saleType === 'driver' && sale.driverName && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Driver:</strong> {sale.driverName}
                                </Typography>
                              )}
                              {sale.saleType === 'mini_store' && (
                                <Typography variant="body2" color="primary.main">
                                  <strong>Mini Store</strong>
                                </Typography>
                              )}
                            </>
                          )}
                        </Box>
                        {settlement.isSettled ? (
                          <Chip label="Settled" color="success" size="small" />
                        ) : (
                          <Chip label="Pending" color="warning" size="small" />
                        )}
                      </Box>
                      
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        {sale && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Total Bags:</strong> {sale.totalBags.toLocaleString()}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Expected:</strong> {formatCurrency(settlement.expectedAmount)}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Settled:</strong> {formatCurrency(settlement.settledAmount)}
                        </Typography>
                        <Typography variant="body2" color={settlement.remainingBalance > 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 'bold' }}>
                          <strong>Balance:</strong> {formatCurrency(settlement.remainingBalance)}
                        </Typography>
                      </Box>
                      
                      {sale && sale.priceBreakdown && sale.priceBreakdown.length > 0 && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <strong>Price Breakdown:</strong>
                          </Typography>
                          {sale.priceBreakdown.map((item, idx) => (
                            <Typography key={idx} variant="body2" sx={{ ml: 2 }}>
                              {item.bags.toLocaleString()} bags @ ₦{item.amount.toLocaleString()}
                              {item.label ? ` (${item.label})` : ''}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* Settlement Dialog */}
      <Dialog 
        open={settlementDialogOpen} 
        onClose={() => setSettlementDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' }
          }
        }}
      >
        <DialogTitle>Add Settlement Payment</DialogTitle>
        <DialogContent>
          {selectedSale && (() => {
            // Use expectedAmount from sale (calculated and stored in backend)
            // Fallback to calculation for legacy data
            let expectedAmount = selectedSale.expectedAmount || 0;
            if (expectedAmount === 0) {
              if (selectedSale.priceBreakdown && selectedSale.priceBreakdown.length > 0) {
                expectedAmount = selectedSale.priceBreakdown.reduce((sum, item) => 
                  sum + (item.bags * item.amount), 0
                );
              } else {
                expectedAmount = (selectedSale.bagsAtPrice1 * settings.salesPrice1) + 
                               (selectedSale.bagsAtPrice2 * settings.salesPrice2);
              }
            }
            const existingSettlement = settlements.find(s => s.receptionistSaleId === selectedSale.id);
            const alreadyPaid = existingSettlement?.settledAmount || 0;
            const remainingBalance = expectedAmount - alreadyPaid;
            
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Alert severity="info">
                  Enter the amount being paid now. This will be added to any previous payments.
                </Alert>
                
                <Typography variant="body2">
                  <strong>Sale Date:</strong> {format(new Date(selectedSale.date), 'MMM d, yyyy')}
                </Typography>
                <Typography variant="body2">
                  <strong>Total Bags:</strong> {selectedSale.totalBags.toLocaleString()}
                </Typography>
                
                {selectedSale.priceBreakdown && selectedSale.priceBreakdown.length > 0 && (
                  <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Price Breakdown:
                    </Typography>
                    {selectedSale.priceBreakdown.map((item, idx) => (
                      <Typography key={idx} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                        • {item.bags.toLocaleString()} bags @ ₦{item.amount.toLocaleString()}
                        {item.label ? ` (${item.label})` : ''}
                        <span style={{ marginLeft: '8px', color: '#666' }}>
                          = ₦{(item.bags * item.amount).toLocaleString()}
                        </span>
                      </Typography>
                    ))}
                  </Box>
                )}
                
                <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" color="primary">
                    Total Expected: {formatCurrency(expectedAmount)}
                  </Typography>
                  {alreadyPaid > 0 && (
                    <>
                      <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                        Already Paid: {formatCurrency(alreadyPaid)}
                      </Typography>
                      <Typography variant="body2" color="warning.main" sx={{ mt: 0.5 }}>
                        <strong>Remaining Balance: {formatCurrency(remainingBalance)}</strong>
                      </Typography>
                    </>
                  )}
                </Box>
                
                <TextField
                  label="Payment Amount (₦)"
                  fullWidth
                  type="number"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  required
                  helperText={`Enter the amount being paid now (Max: ₦${remainingBalance.toLocaleString()})`}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>₦</Typography>,
                  }}
                />
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlementDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveSettlement} variant="contained">
            Save Settlement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Dialog */}
      <Dialog 
        open={updateDialogOpen} 
        onClose={() => setUpdateDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' }
          }
        }}
      >
        <DialogTitle>{updateType === 'sale' ? 'Update Receptionist Sale' : 'Update Storekeeper Entry'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              {updateType === 'sale' 
                ? 'Update the number of bags sold. This can only be done BEFORE any settlement payment.'
                : 'Update the bags count for this storekeeper entry. This action will be recorded in the audit log.'}
            </Alert>
            
            {updateType === 'sale' ? (
              // For receptionist sales, show dropdown to select which field
              <>
                {updateItem && (updateItem as ReceptionistSale).priceBreakdown && (updateItem as ReceptionistSale).priceBreakdown!.length > 0 && (
                  <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Current Price Breakdown:
                    </Typography>
                    {(updateItem as ReceptionistSale).priceBreakdown!.map((item, idx) => (
                      <Typography key={idx} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                        • {item.bags.toLocaleString()} bags @ ₦{item.amount.toLocaleString()}
                        {item.label ? ` (${item.label})` : ''}
                        <span style={{ marginLeft: '8px', color: '#666' }}>
                          = ₦{(item.bags * item.amount).toLocaleString()}
                        </span>
                      </Typography>
                    ))}
                    <Typography variant="body2" sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', fontWeight: 'bold' }}>
                      Total: ₦{(updateItem as ReceptionistSale).expectedAmount?.toLocaleString() || 
                        (updateItem as ReceptionistSale).priceBreakdown!.reduce((sum, item) => sum + (item.bags * item.amount), 0).toLocaleString()}
                    </Typography>
                  </Box>
                )}
                <TextField
                  label="Field to Update"
                  fullWidth
                  select
                  value={updateField}
                  onChange={(e) => {
                    setUpdateField(e.target.value);
                    // Set initial value for the field
                    if (updateItem) {
                      if (e.target.value.startsWith('price_')) {
                        const priceId = parseInt(e.target.value.replace('price_', ''));
                        const sale = updateItem as ReceptionistSale;
                        const priceItem = sale.priceBreakdown?.find(p => p.priceId === priceId);
                        setUpdateValue(priceItem ? String(priceItem.bags) : '0');
                      } else {
                        const currentVal = (updateItem as any)[e.target.value];
                        setUpdateValue(currentVal !== undefined ? String(currentVal) : '');
                      }
                    }
                  }}
                  required
                  helperText="Select which field you want to update"
                >
                  {/* Dynamic bag prices as update options */}
                  {bagPrices.map((price) => (
                    <MenuItem key={price.id} value={`price_${price.id}`}>
                      Bags at ₦{price.amount.toLocaleString()} {price.label ? `(${price.label})` : ''}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="New Value"
                  fullWidth
                  type="number"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  required
                  placeholder="Enter number of bags"
                  helperText={updateField ? (() => {
                    if (updateField.startsWith('price_')) {
                      const priceId = parseInt(updateField.replace('price_', ''));
                      const sale = updateItem as ReceptionistSale;
                      const priceItem = sale.priceBreakdown?.find(p => p.priceId === priceId);
                      return `Current value: ${priceItem?.bags || 0} bags`;
                    }
                    return `Current value: ${(updateItem as any)?.[updateField] || 'N/A'}`;
                  })() : 'Select a field first'}
                  disabled={!updateField}
                />
              </>
            ) : (
              // For storekeeper entries, directly show bags count field (no dropdown)
              <>
                <TextField
                  label="Current Bags Count"
                  fullWidth
                  type="number"
                  value={(updateItem as StorekeeperEntry)?.bagsCount || 0}
                  disabled
                  helperText="Current value"
                />
                <TextField
                  label="New Bags Count"
                  fullWidth
                  type="number"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  required
                  placeholder="Enter new number of bags"
                  inputProps={{ min: 0, step: 1 }}
                  autoFocus
                />
              </>
            )}
            
            <TextField
              label="Reason for Update"
              fullWidth
              multiline
              rows={3}
              value={updateReason}
              onChange={(e) => setUpdateReason(e.target.value)}
              required
              helperText="This will be recorded in the audit log"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUpdate} variant="contained">
            Save Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settlement History Dialog */}
      <Dialog 
        open={settlementHistoryDialogOpen} 
        onClose={() => setSettlementHistoryDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={window.innerWidth < 960}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' }
          }
        }}
      >
        <DialogTitle>Settlement Details</DialogTitle>
        <DialogContent>
          {selectedSettlementHistory && selectedSale && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Alert severity="info">
                This settlement has been {selectedSettlementHistory.isSettled ? 'fully settled' : 'partially settled'}.
              </Alert>

              <Typography variant="h6" sx={{ mt: 2 }}>Sale Information</Typography>
              <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Date:</strong> {format(new Date(selectedSale.date), 'MMM d, yyyy')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Transaction Type:</strong> {
                    selectedSale.saleType === 'driver' ? 'Driver Sale' :
                    selectedSale.saleType === 'general' ? 'General Sales' :
                    selectedSale.saleType === 'mini_store' ? 'Mini Store Dispatch' :
                    selectedSale.saleType
                  }
                </Typography>
                {selectedSale.saleType === 'driver' && selectedSale.driverName && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Driver:</strong> {selectedSale.driverName}
                  </Typography>
                )}
                {selectedSale.saleType === 'mini_store' && (
                  <Typography variant="body2" color="primary.main" sx={{ mb: 1 }}>
                    <strong>Mini Store Transaction</strong>
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Total Bags:</strong> {selectedSale.totalBags.toLocaleString()}
                </Typography>
                {selectedSale.priceBreakdown && selectedSale.priceBreakdown.length > 0 && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Price Breakdown:
                    </Typography>
                    {selectedSale.priceBreakdown.map((item, idx) => (
                      <Typography key={idx} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                        • {item.bags.toLocaleString()} bags @ ₦{item.amount.toLocaleString()}
                        {item.label ? ` (${item.label})` : ''}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>

              <Typography variant="h6" sx={{ mt: 2 }}>Settlement Summary</Typography>
              <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body1" color="primary" sx={{ mb: 1 }}>
                  <strong>Total Expected:</strong> {formatCurrency(selectedSettlementHistory.expectedAmount)}
                </Typography>
                <Typography variant="body1" color="success.main" sx={{ mb: 1 }}>
                  <strong>Total Paid:</strong> {formatCurrency(selectedSettlementHistory.settledAmount)}
                </Typography>
                <Typography variant="body1" color={selectedSettlementHistory.isSettled ? "success.main" : "warning.main"}>
                  <strong>Remaining Balance:</strong> {formatCurrency(selectedSettlementHistory.remainingBalance)}
                </Typography>
                {selectedSettlementHistory.isSettled && (
                  <Typography variant="body2" color="success.main" sx={{ mt: 2 }}>
                    ✓ Fully Settled on {format(new Date(selectedSettlementHistory.settledAt!), 'MMM d, yyyy h:mm a')}
                  </Typography>
                )}
              </Box>

              <Typography variant="h6" sx={{ mt: 3 }}>Payment History</Typography>
              {settlementPayments.length === 0 ? (
                <Alert severity="info">
                  No payment records found.
                </Alert>
              ) : (
                <TableContainer component={Paper} sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Date & Time</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {settlementPayments.map((payment, index) => (
                        <TableRow key={payment.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{format(new Date(payment.paidAt), 'MMM d, yyyy h:mm a')}</TableCell>
                          <TableCell align="right">
                            <Typography color="success.main" fontWeight="bold">
                              {formatCurrency(payment.amount)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2}>
                          <Typography variant="body2" fontWeight="bold">Total</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" fontWeight="bold" color="primary">
                            {formatCurrency(settlementPayments.reduce((sum, p) => sum + p.amount, 0))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlementHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

